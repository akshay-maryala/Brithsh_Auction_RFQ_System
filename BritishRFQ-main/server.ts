import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { addMinutes, isAfter, isBefore, parseISO, differenceInMinutes } from "date-fns";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { WebSocketServer, WebSocket } from "ws";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "british-auction-secret-key-123";

// Database configuration using PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function initDb() {
  const client = await pool.connect();
  try {
    console.log("Starting database initialization...");
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT CHECK (role IN ('BUYER', 'SUPPLIER', 'PENDING')) DEFAULT 'PENDING',
        company_name TEXT,
        phone TEXT,
        address TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Users table created or already exists");

    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE");
    console.log("Users table migration checked");

    await client.query(`
      CREATE TABLE IF NOT EXISTS rfqs (
        id SERIAL PRIMARY KEY,
        creator_id INTEGER REFERENCES users(id),
        reference_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        cargo_details TEXT,
        weight TEXT,
        volume TEXT,
        start_time TIMESTAMP NOT NULL,
        close_time TIMESTAMP NOT NULL,
        forced_close_time TIMESTAMP NOT NULL,
        pickup_date DATE NOT NULL,
        trigger_window_x INTEGER DEFAULT 5,
        extension_duration_y INTEGER DEFAULT 10,
        status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED', 'FORCE_CLOSED')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("RFQs table created or already exists");

    await client.query("ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT ''");
    await client.query("ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS destination TEXT NOT NULL DEFAULT ''");
    await client.query("ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS cargo_details TEXT");
    await client.query("ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS weight TEXT");
    await client.query("ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS volume TEXT");
    console.log("RFQs table migration checked");

    await client.query(`
      CREATE TABLE IF NOT EXISTS bids (
        id SERIAL PRIMARY KEY,
        rfq_id INTEGER REFERENCES rfqs(id) ON DELETE CASCADE,
        supplier_id INTEGER REFERENCES users(id),
        carrier_name TEXT NOT NULL,
        transit_time TEXT NOT NULL,
        validity TEXT NOT NULL,
        total_amount DECIMAL(15, 2) NOT NULL,
        cost_breakdown JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Bids table created or already exists");

    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        rfq_id INTEGER REFERENCES rfqs(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        details TEXT,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Activity logs table created or already exists");

    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Database initialization error:", err);
  } finally {
    client.release();
  }
}

// Middleware
const authenticateToken = (req: any, res: Response, next: NextFunction) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;
    next();
  });
};

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  await initDb();

  // --- Auth Routes ---

  app.post("/api/auth/signup", async (req, res) => {
    const { email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id",
        [email, hashedPassword]
      );
      const user = { id: result.rows[0].id, email, role: 'PENDING' };
      const token = jwt.sign(user, JWT_SECRET);
      res.cookie("token", token, { httpOnly: true, secure: true, sameSite: 'none' });
      res.status(201).json(user);
    } catch (err) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const payload = { id: user.id, email: user.email, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET);
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: 'none' });
    res.json(payload);
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out" });
  });

  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    const result = await pool.query("SELECT id, email, role, company_name, phone, address, is_verified FROM users WHERE id = $1", [req.user.id]);
    res.json(result.rows[0]);
  });

  app.post("/api/auth/onboard", authenticateToken, async (req: any, res) => {
    const { role, company_name, phone, address } = req.body;
    await pool.query("UPDATE users SET role = $1, company_name = $2, phone = $3, address = $4 WHERE id = $5", [role, company_name, phone, address, req.user.id]);
    const result = await pool.query("SELECT id, email, role, company_name, phone, address, is_verified FROM users WHERE id = $1", [req.user.id]);
    const user = result.rows[0];
    const token = jwt.sign(user as any, JWT_SECRET);
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: 'none' });
    res.json(user);
  });

  // --- RFQ Routes ---

  app.get("/api/rfqs", authenticateToken, async (req: any, res) => {
    try {
      let rows;
      if (req.user.role === 'BUYER') {
        const result = await pool.query(`
          SELECT r.*, 
          (SELECT MIN(total_amount) FROM bids WHERE rfq_id = r.id) as lowest_bid
          FROM rfqs r 
          WHERE r.creator_id = $1
          ORDER BY r.created_at DESC
        `, [req.user.id]);
        rows = result.rows;
      } else {
        const result = await pool.query(`
          SELECT r.*, 
          (SELECT MIN(total_amount) FROM bids WHERE rfq_id = r.id) as lowest_bid,
          (SELECT MIN(total_amount) FROM bids WHERE rfq_id = r.id AND supplier_id = $1) as my_lowest_bid
          FROM rfqs r 
          WHERE r.status = 'ACTIVE' OR EXISTS(SELECT 1 FROM bids WHERE rfq_id = r.id AND supplier_id = $2)
          ORDER BY r.created_at DESC
        `, [req.user.id, req.user.id]);
        rows = result.rows;
      }
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/my-bids", authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'SUPPLIER') return res.status(403).json({ error: "Access denied" });
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    try {
      const countResult = await pool.query(`
        SELECT COUNT(DISTINCT rfq_id) FROM bids WHERE supplier_id = $1
      `, [req.user.id]);
      const totalItems = parseInt(countResult.rows[0].count);

      const result = await pool.query(`
        SELECT 
          r.id as rfq_id,
          r.name as rfq_name,
          r.reference_id,
          r.status as auction_status,
          b.total_amount as my_bid_amount,
          b.created_at as bid_time,
          (SELECT MIN(total_amount) FROM bids WHERE rfq_id = r.id) as lowest_bid
        FROM bids b
        JOIN rfqs r ON b.rfq_id = r.id
        WHERE b.supplier_id = $1
        AND b.id IN (
          SELECT MAX(id) FROM bids WHERE supplier_id = $1 GROUP BY rfq_id
        )
        ORDER BY b.created_at DESC
        LIMIT $2 OFFSET $3
      `, [req.user.id, limit, offset]);

      res.json({
        data: result.rows,
        pagination: {
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
          currentPage: page,
          limit
        }
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/rfqs/:id", authenticateToken, async (req: any, res) => {
    try {
      const rfqId = req.params.id;
      const rfqResult = await pool.query("SELECT * FROM rfqs WHERE id = $1", [rfqId]);
      const rfq = rfqResult.rows[0];
      if (!rfq) return res.status(404).json({ error: "RFQ not found" });

      // Security: Suppliers can only see details of active RFQs or ones they bid on
      if (req.user.role === 'SUPPLIER' && rfq.status !== 'ACTIVE') {
        const hasBidResult = await pool.query("SELECT 1 FROM bids WHERE rfq_id = $1 AND supplier_id = $2", [rfqId, req.user.id]);
        if (hasBidResult.rowCount === 0) return res.status(403).json({ error: "Access denied" });
      }

      const bidsResult = await pool.query(`
        SELECT b.*, u.company_name as carrier_name,
        (SELECT COUNT(DISTINCT total_amount) FROM bids b2 WHERE b2.rfq_id = b.rfq_id AND b2.total_amount < b.total_amount) + 1 as rank
        FROM bids b
        JOIN users u ON b.supplier_id = u.id
        WHERE b.rfq_id = $1 
        ORDER BY b.total_amount ASC
      `, [rfqId]);

      const logsResult = await pool.query("SELECT * FROM activity_logs WHERE rfq_id = $1 ORDER BY created_at DESC", [rfqId]);

      res.json({
        rfq,
        bids: bidsResult.rows,
        logs: logsResult.rows
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/rfqs", authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'BUYER') return res.status(403).json({ error: "Only buyers can create RFQs" });
    
    const { name, reference_id, origin, destination, cargo_details, weight, volume, start_time, close_time, forced_close_time, pickup_date, x, y } = req.body;
    
    if (isAfter(parseISO(close_time), parseISO(forced_close_time))) {
      return res.status(400).json({ error: "Forced Bid Close Time must be later than Bid Close Time." });
    }

    try {
      const result = await pool.query(
        `INSERT INTO rfqs (creator_id, name, reference_id, origin, destination, cargo_details, weight, volume, start_time, close_time, forced_close_time, pickup_date, trigger_window_x, extension_duration_y) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
        [req.user.id, name, reference_id, origin, destination, cargo_details, weight, volume, start_time, close_time, forced_close_time, pickup_date, x, y]
      );
      
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/rfqs/:id/bids", authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'SUPPLIER') return res.status(403).json({ error: "Only suppliers can bid" });
    
    const rfqId = req.params.id;
    const { transit_time, validity, total_amount, cost_breakdown } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const now = new Date();
      const rfqResult = await client.query("SELECT * FROM rfqs WHERE id = $1 FOR UPDATE", [rfqId]);
      const rfq = rfqResult.rows[0];

      if (!rfq || rfq.status !== 'ACTIVE') {
        throw new Error("Auction is not active.");
      }

      const closeTime = new Date(rfq.close_time);
      const startTime = new Date(rfq.start_time);

      if (isBefore(now, startTime) || isAfter(now, closeTime)) {
        throw new Error("Bidding is currently closed for this RFQ.");
      }

      // Capture state BEFORE bid
      const beforeBidsResult = await client.query(`
        SELECT supplier_id, MIN(total_amount) as min_amount 
        FROM bids WHERE rfq_id = $1 GROUP BY supplier_id ORDER BY min_amount ASC
      `, [rfqId]);
      const beforeBids = beforeBidsResult.rows;
      
      const oldL1 = beforeBids[0]?.supplier_id;
      const oldRanks = beforeBids.map(r => r.supplier_id);

      // Insert new bid
      await client.query(
        "INSERT INTO bids (rfq_id, supplier_id, carrier_name, transit_time, validity, total_amount, cost_breakdown) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [rfqId, req.user.id, req.user.company_name || 'Unknown', transit_time, validity, total_amount, JSON.stringify(cost_breakdown)]
      );

      // Capture state AFTER bid
      const afterBidsResult = await client.query(`
        SELECT supplier_id, MIN(total_amount) as min_amount 
        FROM bids WHERE rfq_id = $1 GROUP BY supplier_id ORDER BY min_amount ASC
      `, [rfqId]);
      const afterBids = afterBidsResult.rows;
      
      const newL1 = afterBids[0]?.supplier_id;
      const newRanks = afterBids.map(r => r.supplier_id);

      // Evaluate Triggers
      const minutesToClose = differenceInMinutes(closeTime, now);
      let extensionReason = "";

      if (minutesToClose <= rfq.trigger_window_x) {
        // Trigger 1: Any Bid Received in Last X Minutes
        extensionReason = "Bid received within trigger window.";

        // Trigger 2: Any Supplier Rank Change in Last X Minutes
        if (JSON.stringify(oldRanks) !== JSON.stringify(newRanks)) {
          extensionReason = "Supplier rank change detected in trigger window.";
        }

        // Trigger 3: Lowest Bidder (L1) Rank Change in Last X Minutes
        if (oldL1 !== newL1) {
          extensionReason = "L1 (Lowest Bidder) rank change detected.";
        }
      }

      let extended = false;
      let finalNewCloseTime: Date | null = null;
      if (extensionReason) {
        let newCloseTime = addMinutes(closeTime, rfq.extension_duration_y);
        const forcedClose = new Date(rfq.forced_close_time);

        if (isAfter(newCloseTime, forcedClose)) {
          newCloseTime = forcedClose;
          extensionReason += " (Capped at Forced Close Time)";
        }

        await client.query("UPDATE rfqs SET close_time = $1 WHERE id = $2", [newCloseTime.toISOString(), rfqId]);
        await client.query(
          "INSERT INTO activity_logs (rfq_id, event_type, details, reason) VALUES ($1, $2, $3, $4)",
          [rfqId, "TIME_EXTENSION", `Extended to ${newCloseTime.toISOString()}`, extensionReason]
        );
        extended = true;
        finalNewCloseTime = newCloseTime;
      } else {
        await client.query(
          "INSERT INTO activity_logs (rfq_id, event_type, details) VALUES ($1, $2, $3)",
          [rfqId, "BID_SUBMISSION", `Bid of ${total_amount} submitted by ${req.user.company_name || 'Supplier'}`]
        );
      }

      await client.query('COMMIT');
      
      // Broadcast to all users
      (app as any).broadcast({
        type: 'NEW_BID',
        rfqId: rfq.id,
        rfqName: rfq.name,
        amount: total_amount,
        carrier: req.user.company_name || 'A supplier'
      });

      if (extended && finalNewCloseTime) {
        (app as any).broadcast({
          type: 'AUCTION_EXTENDED',
          rfqId: rfq.id,
          rfqName: rfq.name,
          newCloseTime: finalNewCloseTime.toISOString()
        });
      }

      res.status(201).json({ message: "Bid submitted successfully", extension: extended });
    } catch (err) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: (err as Error).message });
    } finally {
      client.release();
    }
  });

  // Background Task: Close Auctions
  setInterval(async () => {
    try {
      const result = await pool.query(`
        UPDATE rfqs 
        SET status = CASE 
          WHEN CURRENT_TIMESTAMP >= forced_close_time THEN 'FORCE_CLOSED'
          ELSE 'CLOSED'
        END
        WHERE status = 'ACTIVE' AND CURRENT_TIMESTAMP >= close_time
        RETURNING id, name, status
      `);

      if (result.rowCount && result.rowCount > 0) {
        result.rows.forEach(rfq => {
          (app as any).broadcast({
            type: 'AUCTION_CLOSED',
            rfqId: rfq.id,
            rfqName: rfq.name,
            status: rfq.status
          });
        });
      }
    } catch (err) {
      console.error("Scheduler Error:", err);
    }
  }, 10000);

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  const PORT = 3000;
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // --- WebSocket Setup ---
  const wss = new WebSocketServer({ server });
  const userConnections = new Map<number, WebSocket[]>();

  function parseCookies(cookieHeader: string | undefined) {
    const list: any = {};
    if (!cookieHeader) return list;
    cookieHeader.split(';').forEach(cookie => {
      let [name, ...rest] = cookie.split('=');
      name = name.trim();
      if (!name) return;
      const value = rest.join('=').trim();
      if (!value) return;
      list[name] = decodeURIComponent(value);
    });
    return list;
  }

  wss.on('connection', (ws, req) => {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.token;

    if (!token) {
      ws.close();
      return;
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        ws.close();
        return;
      }

      const userId = user.id;
      const connections = userConnections.get(userId) || [];
      userConnections.set(userId, [...connections, ws]);

      ws.on('close', () => {
        const currentConnections = userConnections.get(userId) || [];
        userConnections.set(userId, currentConnections.filter(c => c !== ws));
      });
    });
  });

  function broadcast(message: any) {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  function notifyUser(userId: number, message: any) {
    const connections = userConnections.get(userId) || [];
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  // Expose notifyUser and broadcast to app for use in routes
  (app as any).notifyUser = notifyUser;
  (app as any).broadcast = broadcast;
}

startServer();

