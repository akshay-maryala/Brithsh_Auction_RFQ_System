# 🏛️ British Auction RFQ System

<p align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/aqua.png" width="100%">
</p>

<p align="center">
  <h1 align="center">BRITISH AUCTION RFQ SYSTEM</h1>
  <p align="center">
    <i>Elite Logistics Procurement & Real-Time Reverse Auction Engine</i>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <br>
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/Build-Passing-brightgreen.svg?style=flat-square" alt="Build Status">
</p>

---

## 📖 Overview

The **British Auction RFQ System** is an enterprise-grade logistics procurement platform designed for high-stakes freight bidding. It implements a **Reverse British Auction** model where suppliers compete in real-time to offer the lowest price for shipping contracts.

The system is engineered with strict temporal constraints, including **Dynamic Time Extensions** (to prevent last-second "sniping") and **Forced-Close Windows** to ensure operational deadlines are met.

---

## ✨ Core Features

*   **👑 Role-Based Access Control (RBAC):** Distinct workflows for **Buyers** (Auctioneers) and **Suppliers** (Bidders).
*   **⏱️ Real-Time Auction Logic:** Descending price competition with live WebSocket updates for rankings and activity logs.
*   **🛡️ Anti-Sniping Engine:** Automatic auction extensions when bids are placed within the final minutes of a window.
*   **📦 Dynamic JSONB Quoting:** Flexible cost breakdown structures (Freight, Origin, Destination charges) stored as structured JSON.
*   **📊 Live Supplier Rankings:** Instant "L1, L2, L3" ranking visibility for both buyers and suppliers.
*   **📜 Audit-Ready Activity Logs:** Comprehensive event tracking for every bid, extension, and status change.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | Node.js, Express, TypeScript |
| **Frontend** | React 19, Vite, Tailwind CSS 4, Framer Motion |
| **Database** | PostgreSQL with JSONB support |
| **Real-time** | WebSockets (ws) for live bid broadcasting |
| **Icons** | Lucide React |

---

## 🏗️ System Architecture

The system follows a modern asynchronous architecture:

1.  **Node.js API Layer:** Express handles high-concurrency bid submissions with minimal latency, written in Type-Safe TypeScript.
2.  **Database Strategy:** PostgreSQL handles relational data, while `JSONB` columns store flexible cost breakdowns, allowing for varied quoting structures without schema migrations.
3.  **Concurrency Control:** Row-level locking and atomic updates ensure bid integrity during rapid-fire competition.
4.  **Real-time Updates:** WebSocket integration provides instant feedback on bid rankings and auction status.
   ---
   ##  Architecture Diagram
   ```mermaid
 %%{init: {'theme': 'base', 'themeVariables': { 'lineColor': '#64748B'}}}%%
graph LR
    %% Theme: Royal Navy, Gold, Slate, and Crimson
    classDef client fill:#0C1D36,stroke:#D4AF37,stroke-width:2px,color:#FFF,rx:6,ry:6
    classDef gateway fill:#334155,stroke:#94A3B8,stroke-width:2px,color:#FFF
    classDef service fill:#1E293B,stroke:#64748B,stroke-width:2px,color:#FFF,rx:6,ry:6
    classDef engine fill:#7F1D1D,stroke:#FCA5A5,stroke-width:3px,color:#FFF,rx:8,ry:8
    classDef db fill:#FDFBF7,stroke:#D4AF37,stroke-width:3px,color:#0C1D36,rx:10,ry:10

    subgraph Client_Tier [Client Tier - React SPA]
        A[🖥️ Buyer Dashboard]:::client
        B[🚚 Supplier Dashboard]:::client
    end

    subgraph Application_Tier [Application Tier - Node.js / Express]
        C{🛡️ Auth & RBAC}:::gateway
        
        D[⚙️ API Controllers]:::service
        E((📡 WebSockets)):::service
        
        F[⚡ Auction Engine]:::engine
        G[⏱️ Cron Scheduler]:::service
    end

    subgraph Data_Tier [Data Tier - Supabase PostgreSQL]
        H[(👤 Users)]:::db
        I[(📋 RFQs & State)]:::db
        J[(💰 Bids)]:::db
        K[(📝 Logs)]:::db
    end

    %% Client to App Flow
    A -->|HTTP| C
    B -->|HTTP| C
    A -.->|wss:// Live Sync| E
    B -.->|wss:// Live Sync| E

    %% Internal App Flow
    C -->|Validated| D
    D -->|Bid Logic| F

    %% Engine to DB (The Critical Path)
    F -->|1. Row Lock| I
    F -->|2. Insert Bid| J
    F -->|3. Update Time| I
    F -->|4. Audit| K

    %% Async & Background Tasks
    F -.->|Broadcast Extension| E
    G -->|Poll Expired| I
    G -.->|Broadcast Close| E
```
---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
*   Node.js 20+
*   PostgreSQL Instance

### 2. Repository Setup
```bash
# Clone the repository
git clone https://github.com/your-org/british-rfq-system.git
cd british-rfq-system

# Set up Virtual Environment
# On Windows: .venv\Scripts\activate

# Install Backend Dependencies
pip install -r requirements.txt

# Install Frontend Dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/rfq_db
JWT_SECRET=your_royal_secret_key
```

### 4. Launching the System
```bash
# Start the Development Server (Express + Vite)
npm run dev
```

---

## 🖼️ UI Previews

### Dashboard View
![Dashboard View](assets/dashboard.png)

### Auction Details & Real-Time Bidding
![Auction Details](assets/auction.png)

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

<p align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/aqua.png" width="100%">
</p>
