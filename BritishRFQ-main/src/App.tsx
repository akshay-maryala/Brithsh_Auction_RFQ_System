import React, { useState, useEffect, createContext, useContext } from 'react';
import { format, parseISO, isAfter } from 'date-fns';
import { 
  Gavel, 
  Clock, 
  ShieldAlert, 
  TrendingDown, 
  History, 
  Plus, 
  ChevronRight, 
  ArrowLeft,
  Building2,
  Truck,
  Calendar,
  Download,
  LogOut,
  User as UserIcon,
  Briefcase,
  Lock,
  Mail,
  Bell,
  Users,
  X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

type Role = 'BUYER' | 'SUPPLIER' | 'PENDING';

interface User {
  id: number;
  email: string;
  role: Role;
  company_name?: string;
  phone?: string;
  address?: string;
  is_verified?: boolean;
}

interface RFQ {
  id: number;
  reference_id: string;
  name: string;
  origin: string;
  destination: string;
  cargo_details?: string;
  weight?: string;
  volume?: string;
  start_time: string;
  close_time: string;
  forced_close_time: string;
  pickup_date: string;
  trigger_window_x: number;
  extension_duration_y: number;
  status: 'ACTIVE' | 'CLOSED' | 'FORCE_CLOSED';
  lowest_bid?: number;
  my_lowest_bid?: number;
}

interface Bid {
  id: number;
  supplier_id: number;
  carrier_name: string;
  transit_time: string;
  validity: string;
  total_amount: number;
  rank: number;
  cost_breakdown: {
    freight: number;
    origin: number;
    destination: number;
  };
}

interface ActivityLog {
  id: number;
  event_type: string;
  details: string;
  reason?: string;
  created_at: string;
}

interface Notification {
  id: string;
  type: string;
  rfqId: number;
  rfqName: string;
  amount: number;
  carrier: string;
  timestamp: Date;
}

interface MyBid {
  rfq_id: number;
  rfq_name: string;
  reference_id: string;
  auction_status: string;
  my_bid_amount: number;
  bid_time: string;
  lowest_bid: number;
}

// --- Auth Context ---

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  onboard: (role: Role, company: string, phone: string, address: string) => Promise<void>;
} | null>(null);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    if (!res.ok) throw new Error("Invalid credentials");
    const data = await res.json();
    setUser(data);
  };

  const signup = async (email: string, pass: string) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    if (!res.ok) throw new Error("Signup failed");
    const data = await res.json();
    setUser(data);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  const onboard = async (role: Role, company: string, phone: string, address: string) => {
    const res = await fetch('/api/auth/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, company_name: company, phone, address })
    });
    if (!res.ok) throw new Error("Onboarding failed");
    const data = await res.json();
    setUser(data);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, onboard }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

// --- Components ---

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) await login(email, password);
      else await signup(email, password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center royal-bg p-4 overflow-hidden relative">
      <div className="absolute inset-0 bg-royal-sapphire/20 backdrop-blur-[2px]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="british-card w-full max-w-md p-10 border-t-8 border-heritage-gold relative z-10 shadow-[0_20px_50px_rgba(0,35,102,0.3)]"
      >
        <div className="text-center mb-10">
          <div className="inline-block p-4 rounded-full bg-royal-sapphire/5 border border-heritage-gold/20 mb-6">
            <Gavel className="text-heritage-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]" size={48} />
          </div>
          <h1 className="text-4xl font-bold text-royal-sapphire tracking-tight">British RFQ</h1>
          <p className="text-slate-400 font-serif italic mt-2">Elite Auction House & Logistics</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="british-label">Official Email</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-3 text-slate-300 group-focus-within:text-heritage-gold transition-colors" size={18} />
              <input 
                type="email" 
                className="british-input pl-10 border-slate-100 hover:border-heritage-silver focus:border-heritage-gold" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div>
            <label className="british-label">Secure Password</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-3 text-slate-300 group-focus-within:text-heritage-gold transition-colors" size={18} />
              <input 
                type="password" 
                className="british-input pl-10 border-slate-100 hover:border-heritage-silver focus:border-heritage-gold" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
            </div>
            {isLogin && (
              <div className="flex justify-end mt-2">
                <button 
                  type="button"
                  onClick={() => alert("Please contact the Royal Registrar at registrar@britishrfq.com to reset your credentials.")}
                  className="text-[10px] text-heritage-gold hover:text-royal-sapphire font-serif italic tracking-wider"
                >
                  Forgot Credentials?
                </button>
              </div>
            )}
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-heritage-burgundy/5 border-l-2 border-heritage-burgundy p-3"
            >
              <p className="text-heritage-burgundy text-[10px] font-bold uppercase tracking-widest">{error}</p>
            </motion.div>
          )}

          <button type="submit" className="british-button w-full py-4 text-lg bg-royal-sapphire hover:bg-royal-sapphire/90 border-heritage-gold/50 shadow-lg">
            {isLogin ? "Enter the Auction House" : "Register as Member"}
          </button>
        </form>

        <div className="mt-10 text-center border-t border-slate-50 pt-6">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs text-royal-sapphire hover:text-heritage-gold font-serif italic underline underline-offset-8 transition-all"
          >
            {isLogin ? "Request Membership Access" : "Already a Member? Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const OnboardingPage = () => {
  const [role, setRole] = useState<Role>('BUYER');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const { onboard } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onboard(role, company, phone, address);
  };

  return (
    <div className="min-h-screen flex items-center justify-center royal-bg p-4 relative">
      <div className="absolute inset-0 bg-royal-sapphire/20 backdrop-blur-[2px]" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="british-card w-full max-w-3xl p-12 border-l-8 border-heritage-gold relative z-10 shadow-2xl"
      >
        <h2 className="text-5xl font-bold text-royal-sapphire mb-2 tracking-tight">Member Onboarding</h2>
        <p className="text-slate-400 font-serif italic mb-12 text-xl">Define your role in the British Auction House</p>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <button 
              type="button"
              onClick={() => setRole('BUYER')}
              className={cn(
                "p-8 text-left transition-all border-2 rounded-sm relative group overflow-hidden",
                role === 'BUYER' ? "border-royal-sapphire bg-royal-sapphire/5" : "border-slate-100 hover:border-heritage-silver"
              )}
            >
              {role === 'BUYER' && <div className="absolute top-0 right-0 w-12 h-12 bg-heritage-gold/10 rounded-bl-full" />}
              <Briefcase className={cn("mb-4 transition-colors", role === 'BUYER' ? "text-royal-sapphire" : "text-slate-300")} size={32} />
              <h3 className="text-2xl font-bold mb-2 text-royal-sapphire">Buyer</h3>
              <p className="text-sm text-slate-500 font-serif italic">Create RFQs, manage auctions, and select elite suppliers.</p>
            </button>

            <button 
              type="button"
              onClick={() => setRole('SUPPLIER')}
              className={cn(
                "p-8 text-left transition-all border-2 rounded-sm relative group overflow-hidden",
                role === 'SUPPLIER' ? "border-royal-sapphire bg-royal-sapphire/5" : "border-slate-100 hover:border-heritage-silver"
              )}
            >
              {role === 'SUPPLIER' && <div className="absolute top-0 right-0 w-12 h-12 bg-heritage-gold/10 rounded-bl-full" />}
              <Truck className={cn("mb-4 transition-colors", role === 'SUPPLIER' ? "text-royal-sapphire" : "text-slate-300")} size={32} />
              <h3 className="text-2xl font-bold mb-2 text-royal-sapphire">Supplier</h3>
              <p className="text-sm text-slate-500 font-serif italic">Browse active RFQs, submit competitive bids, and win contracts.</p>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/50 p-8 border border-slate-100 rounded-sm">
            <div className="md:col-span-2">
              <label className="british-label">Company / Organization Name</label>
              <input 
                type="text" 
                className="british-input" 
                placeholder="e.g. Royal Logistics Ltd."
                value={company}
                onChange={e => setCompany(e.target.value)}
                required 
              />
            </div>
            <div>
              <label className="british-label">Contact Phone</label>
              <input 
                type="tel" 
                className="british-input" 
                placeholder="+44 20 7946 0000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required 
              />
            </div>
            <div>
              <label className="british-label">Business Address</label>
              <input 
                type="text" 
                className="british-input" 
                placeholder="London, UK"
                value={address}
                onChange={e => setAddress(e.target.value)}
                required 
              />
            </div>
          </div>

          <button type="submit" className="british-button w-full py-5 text-xl bg-royal-sapphire hover:bg-royal-sapphire/90 border-heritage-gold shadow-xl">
            Complete Royal Registration
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [view, setView] = useState<'LIST' | 'DETAILS' | 'MY_BIDS'>('LIST');
  const [selectedRfqId, setSelectedRfqId] = useState<number | null>(null);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [details, setDetails] = useState<{ rfq: RFQ; bids: Bid[]; logs: ActivityLog[] } | null>(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showRfqModal, setShowRfqModal] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [myBids, setMyBids] = useState<MyBid[]>([]);
  const [myBidsPagination, setMyBidsPagination] = useState({ totalPages: 1, currentPage: 1 });
  
  // Wizard State
  const [rfqStep, setRfqStep] = useState(1);
  const [rfqForm, setRfqForm] = useState({
    name: '',
    reference_id: '',
    origin: '',
    destination: '',
    cargo_details: '',
    weight: '',
    volume: '',
    pickup_date: '',
    start_time: '',
    close_time: '',
    forced_close_time: '',
    x: '5',
    y: '10'
  });

  const updateRfqForm = (field: string, value: string) => {
    setRfqForm(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'NEW_BID') {
          // Only show notification for buyers or if it's a significant event
          if (user?.role === 'BUYER') {
            const newNotification: Notification = {
              id: Math.random().toString(36).substr(2, 9),
              ...data,
              timestamp: new Date()
            };
            setNotifications(prev => [newNotification, ...prev].slice(0, 5));
          }
          
          // Refresh RFQ list to show new lowest bid
          fetchRfqs();
          
          // If viewing this RFQ, refresh details (rankings, logs, etc.)
          if (selectedRfqId === data.rfqId) {
            fetchDetails(data.rfqId);
          }
        } else if (data.type === 'AUCTION_EXTENDED') {
          // Refresh RFQ list to show new close time
          fetchRfqs();
          
          // If viewing this RFQ, refresh details
          if (selectedRfqId === data.rfqId) {
            fetchDetails(data.rfqId);
          }
        } else if (data.type === 'AUCTION_CLOSED') {
          // Refresh RFQ list to show new status
          fetchRfqs();
          
          // If viewing this RFQ, refresh details
          if (selectedRfqId === data.rfqId) {
            fetchDetails(data.rfqId);
          }
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    };

    return () => ws.close();
  }, [selectedRfqId, user]);

  useEffect(() => {
    fetchRfqs();
    const interval = setInterval(fetchRfqs, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedRfqId) {
      fetchDetails(selectedRfqId);
      const interval = setInterval(() => fetchDetails(selectedRfqId), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedRfqId]);

  const fetchRfqs = async () => {
    try {
      const res = await fetch('/api/rfqs');
      const data = await res.json();
      if (Array.isArray(data)) setRfqs(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDetails = async (id: number) => {
    try {
      const res = await fetch(`/api/rfqs/${id}`);
      const data = await res.json();
      if (data && data.rfq) setDetails(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyBids = async (page = 1) => {
    try {
      const res = await fetch(`/api/my-bids?page=${page}&limit=10`);
      const data = await res.json();
      if (data && data.data) {
        setMyBids(data.data);
        setMyBidsPagination({
          totalPages: data.pagination.totalPages,
          currentPage: data.pagination.currentPage
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRfq = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/rfqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...rfqForm,
          trigger_window_x: parseInt(rfqForm.x),
          extension_duration_y: parseInt(rfqForm.y)
        })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }
      const newRfq = await res.json();
      setShowRfqModal(false);
      setRfqStep(1);
      setRfqForm({
        name: '',
        reference_id: '',
        origin: '',
        destination: '',
        cargo_details: '',
        weight: '',
        volume: '',
        pickup_date: '',
        start_time: '',
        close_time: '',
        forced_close_time: '',
        x: '5',
        y: '10'
      });
      fetchRfqs();
      // Automatically select the new RFQ and show details
      setSelectedRfqId(newRfq.id);
      setView('DETAILS');
      fetchDetails(newRfq.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitBid = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedRfqId) return;
    const formData = new FormData(e.currentTarget);
    const payload = {
      transit_time: formData.get('transit_time'),
      validity: formData.get('validity'),
      total_amount: parseFloat(formData.get('total_amount') as string),
      cost_breakdown: {
        freight: parseFloat(formData.get('freight') as string),
        origin: parseFloat(formData.get('origin') as string),
        destination: parseFloat(formData.get('destination') as string)
      }
    };

    try {
      const res = await fetch(`/api/rfqs/${selectedRfqId}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }
      setShowBidModal(false);
      fetchDetails(selectedRfqId);
    } catch (err) {
      console.error(err);
    }
  };

  const exportToCsv = () => {
    if (!details || !details.bids.length) return;
    const headers = ["Rank", "Carrier", "Total Amount", "Transit Time", "Validity", "Freight", "Origin", "Destination"];
    const rows = details.bids.map(bid => [
      `L${bid.rank}`,
      bid.carrier_name,
      bid.total_amount,
      bid.transit_time,
      bid.validity,
      bid.cost_breakdown.freight,
      bid.cost_breakdown.origin,
      bid.cost_breakdown.destination
    ]);
    const csvContent = [headers.join(","), ...rows.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `RFQ_Bids_${details.rfq.reference_id}.csv`);
    link.click();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-royal-sapphire text-white py-6 px-8 flex justify-between items-center border-b-4 border-heritage-gold sticky top-0 z-50 shadow-2xl">
        <div className="flex items-center gap-4">
          <Gavel className="text-heritage-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]" size={32} />
          <div>
            <h1 className="text-3xl font-bold leading-none tracking-tight">British RFQ</h1>
            <p className="text-[10px] uppercase tracking-widest text-heritage-silver font-bold mt-1">Auction House • {user?.company_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold uppercase tracking-widest text-heritage-gold/60">Logged in as</p>
            <p className="font-serif italic text-heritage-silver">{user?.email}</p>
          </div>
          <div className="relative group">
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-heritage-gold relative">
              <Bell size={24} />
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-heritage-burgundy rounded-full border-2 border-royal-sapphire animate-pulse" />
              )}
            </button>
            {/* Notification Dropdown */}
            <div className="absolute right-0 mt-2 w-80 bg-white shadow-2xl rounded-sm border border-heritage-silver/30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
              <div className="p-4 bg-royal-sapphire/5 border-b border-heritage-silver/20 flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-widest text-royal-sapphire">Recent Notifications</h4>
                <button onClick={() => setNotifications([])} className="text-[10px] text-slate-400 hover:text-royal-sapphire">Clear All</button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <div key={n.id} className="p-4 border-b border-slate-50 hover:bg-royal-sapphire/5 transition-colors cursor-pointer" onClick={() => {
                      setSelectedRfqId(n.rfqId);
                      setView('DETAILS');
                    }}>
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-bold text-royal-sapphire">New Bid Received</p>
                        <span className="text-[10px] text-slate-400">{format(n.timestamp, 'HH:mm')}</span>
                      </div>
                      <p className="text-xs text-slate-600 mb-1">
                        <span className="font-bold">{n.carrier}</span> bid <span className="text-heritage-green font-bold">£{n.amount}</span> on <span className="italic">"{n.rfqName}"</span>
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Bell className="mx-auto text-slate-200 mb-2" size={32} />
                    <p className="text-xs text-slate-400 font-serif italic">No new notifications</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          {user?.role === 'SUPPLIER' && (
            <button 
              onClick={() => {
                setView('MY_BIDS');
                fetchMyBids(1);
              }}
              className={cn(
                "p-2 rounded-full transition-colors relative",
                view === 'MY_BIDS' ? "bg-heritage-gold text-royal-sapphire" : "hover:bg-white/10 text-heritage-gold"
              )}
              title="My Bids"
            >
              <History size={24} />
            </button>
          )}
          <button onClick={logout} className="p-2 hover:bg-white/10 rounded-full transition-colors text-heritage-gold">
            <LogOut size={24} />
          </button>
        </div>
      </header>

      {/* Floating Notification Toast */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-4">
        <AnimatePresence>
          {notifications.slice(0, 1).map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className="bg-royal-sapphire text-white p-6 rounded-sm shadow-2xl border-l-4 border-heritage-gold w-80 relative"
            >
              <button 
                onClick={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))}
                className="absolute top-2 right-2 text-white/40 hover:text-white"
              >
                <X size={16} />
              </button>
              <div className="flex items-center gap-3 mb-3">
                <TrendingDown className="text-heritage-gold" size={20} />
                <p className="text-xs font-bold uppercase tracking-widest">New Bid Alert</p>
              </div>
              <p className="text-sm font-serif italic mb-4">
                {n.carrier} has just submitted a bid of <span className="text-heritage-gold font-bold">£{n.amount}</span> for {n.rfqName}.
              </p>
              <button 
                onClick={() => {
                  setSelectedRfqId(n.rfqId);
                  setView('DETAILS');
                  setNotifications(prev => prev.filter(notif => notif.id !== n.id));
                }}
                className="text-[10px] font-bold uppercase tracking-widest text-heritage-gold hover:underline"
              >
                View Details
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8">
        {view === 'LIST' ? (
          <div className="space-y-10">
            <div className="flex justify-between items-end border-b border-heritage-silver/20 pb-6">
              <div>
                <h2 className="text-5xl font-bold text-royal-sapphire tracking-tight">Active Auctions</h2>
                <p className="text-slate-400 font-serif italic mt-2 text-lg">
                  {user?.role === 'BUYER' ? "Manage your elite RFQs and monitor supplier performance." : "Browse active opportunities and submit your competitive quotes."}
                </p>
              </div>
              {user?.role === 'BUYER' && (
                <button 
                  onClick={() => {
                    setRfqStep(1);
                    setShowRfqModal(true);
                  }}
                  className="british-button flex items-center gap-2 bg-heritage-gold hover:bg-heritage-gold/90 border-heritage-silver shadow-lg"
                >
                  <Plus size={20} /> Initiate New RFQ
                </button>
              )}
            </div>

            <div className="british-card overflow-hidden">
              <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-slate-50">
                  {rfqs.length > 0 ? (
                    rfqs.map((rfq) => (
                      <tr key={rfq.id} className="hover:bg-royal-sapphire/5 transition-colors group">
                        <td className="p-6">
                          <p className="font-bold text-royal-sapphire text-lg">{rfq.name}</p>
                          <p className="text-xs text-slate-400 font-mono tracking-wider">{rfq.reference_id}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">
                            <span className="text-heritage-gold">{rfq.origin}</span>
                            <ChevronRight size={10} className="text-heritage-silver" />
                            <span className="text-royal-sapphire">{rfq.destination}</span>
                          </div>
                        </td>
                        <td className="p-6">
                          <p className="text-2xl font-bold text-heritage-green">
                            {rfq.lowest_bid ? `£${Number(rfq.lowest_bid).toLocaleString()}` : "—"}
                          </p>
                        </td>
                        {user?.role === 'SUPPLIER' && (
                          <td className="p-6">
                            <p className="text-lg font-bold text-royal-sapphire">
                              {rfq.my_lowest_bid ? `£${Number(rfq.my_lowest_bid).toLocaleString()}` : "—"}
                            </p>
                          </td>
                        )}
                        <td className="p-6">
                          <p className="font-serif italic text-royal-sapphire">{format(parseISO(rfq.close_time), 'HH:mm:ss')}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{format(parseISO(rfq.close_time), 'MMM d')}</p>
                        </td>
                        <td className="p-6">
                          <p className="font-serif italic text-heritage-burgundy">{format(parseISO(rfq.forced_close_time), 'HH:mm')}</p>
                        </td>
                        <td className="p-6">
                          <span className={cn(
                            "status-pill",
                            rfq.status === 'ACTIVE' ? "bg-heritage-green/5 text-heritage-green border-heritage-green/20" : 
                            rfq.status === 'CLOSED' ? "bg-slate-50 text-slate-500 border-slate-200" : "bg-heritage-burgundy/5 text-heritage-burgundy border-heritage-burgundy/20"
                          )}>
                            {rfq.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-6 text-right">
                          <button 
                            onClick={() => {
                              setSelectedRfqId(rfq.id);
                              setView('DETAILS');
                            }}
                            className="p-3 rounded-full hover:bg-royal-sapphire/10 text-slate-300 group-hover:text-heritage-gold transition-all"
                          >
                            <ChevronRight size={24} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={user?.role === 'SUPPLIER' ? 7 : 6} className="p-20 text-center">
                        <div className="max-w-md mx-auto">
                          <div className="w-20 h-20 bg-royal-sapphire/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-heritage-silver/20">
                            <Gavel className="text-heritage-silver" size={32} />
                          </div>
                          <h3 className="text-2xl font-bold text-royal-sapphire mb-2">No Active Auctions</h3>
                          <p className="text-slate-500 font-serif italic mb-8">
                            {user?.role === 'BUYER' 
                              ? "Your registry is currently empty. Initiate your first RFQ to begin the procurement process." 
                              : "There are no active procurement opportunities available at this time. Please check back later."}
                          </p>
                          {user?.role === 'BUYER' && (
                            <button 
                              onClick={() => {
                                setRfqStep(1);
                                setShowRfqModal(true);
                              }}
                              className="british-button inline-flex items-center gap-2"
                            >
                              <Plus size={18} /> Create First RFQ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : view === 'MY_BIDS' ? (
          <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
            <button 
              onClick={() => setView('LIST')}
              className="flex items-center gap-2 text-slate-400 hover:text-royal-sapphire transition-colors font-serif italic group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
            </button>

            <div className="flex justify-between items-end border-b border-heritage-silver/20 pb-6">
              <div>
                <h2 className="text-5xl font-bold text-royal-sapphire tracking-tight">My Bidding History</h2>
                <p className="text-slate-400 font-serif italic mt-2 text-lg">
                  Track your participation and performance across all elite RFQs.
                </p>
              </div>
            </div>

            <div className="british-card overflow-hidden">
              <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-slate-50">
                  {myBids.length > 0 ? (
                    myBids.map((bid) => (
                      <tr key={bid.rfq_id} className="hover:bg-royal-sapphire/5 transition-colors group">
                        <td className="p-6">
                          <p className="font-bold text-royal-sapphire text-lg">{bid.rfq_name}</p>
                          <p className="text-xs text-slate-400 font-mono tracking-wider">{bid.reference_id}</p>
                        </td>
                        <td className="p-6">
                          <p className="text-2xl font-bold text-royal-sapphire">£{Number(bid.my_bid_amount).toLocaleString()}</p>
                        </td>
                        <td className="p-6">
                          <p className={cn(
                            "text-xl font-bold",
                            bid.my_bid_amount <= bid.lowest_bid ? "text-heritage-green" : "text-heritage-burgundy"
                          )}>
                            £{Number(bid.lowest_bid).toLocaleString()}
                            {bid.my_bid_amount <= bid.lowest_bid && <span className="ml-2 text-[10px] uppercase bg-heritage-green text-white px-2 py-0.5 rounded-full">L1</span>}
                          </p>
                        </td>
                        <td className="p-6">
                          <span className={cn(
                            "status-pill",
                            bid.auction_status === 'ACTIVE' ? "bg-heritage-green/5 text-heritage-green border-heritage-green/20" : 
                            bid.auction_status === 'CLOSED' ? "bg-slate-50 text-slate-500 border-slate-200" : "bg-heritage-burgundy/5 text-heritage-burgundy border-heritage-burgundy/20"
                          )}>
                            {bid.auction_status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-6">
                          <p className="font-serif italic text-slate-500">{format(parseISO(bid.bid_time), 'MMM d, yyyy HH:mm')}</p>
                        </td>
                        <td className="p-6 text-right">
                          <button 
                            onClick={() => {
                              setSelectedRfqId(bid.rfq_id);
                              setView('DETAILS');
                            }}
                            className="p-3 rounded-full hover:bg-royal-sapphire/10 text-slate-300 group-hover:text-heritage-gold transition-all"
                          >
                            <ChevronRight size={24} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-20 text-center">
                        <div className="max-w-md mx-auto">
                          <History className="mx-auto text-slate-200 mb-4" size={48} />
                          <h3 className="text-xl font-bold text-royal-sapphire">No Bids Yet</h3>
                          <p className="text-slate-400 font-serif italic mt-2">You haven't participated in any auctions yet. Head back to the dashboard to find opportunities.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              {myBidsPagination.totalPages > 1 && (
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center gap-2">
                  {Array.from({ length: myBidsPagination.totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => fetchMyBids(i + 1)}
                      className={cn(
                        "w-8 h-8 rounded-sm text-xs font-bold transition-all",
                        myBidsPagination.currentPage === i + 1 
                          ? "bg-royal-sapphire text-white shadow-md" 
                          : "bg-white text-royal-sapphire border border-slate-200 hover:border-heritage-gold"
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
            <button 
              onClick={() => setView('LIST')}
              className="flex items-center gap-2 text-slate-400 hover:text-royal-sapphire transition-colors font-serif italic group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
            </button>

            {details && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-10">
                  <div className="british-card p-10 border-l-8 border-royal-sapphire">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-5xl font-bold text-royal-sapphire tracking-tight">{details.rfq.name}</h2>
                        <p className="text-slate-400 font-serif italic mt-2 text-xl">Official Registry Ref: {details.rfq.reference_id}</p>
                      </div>
                      {details.rfq.status === 'ACTIVE' && user?.role === 'SUPPLIER' && (
                        <button 
                          onClick={() => setShowBidModal(true)}
                          className="british-button py-4 px-10 text-lg bg-heritage-gold hover:bg-heritage-gold/90 border-heritage-silver shadow-xl"
                        >
                          Submit Competitive Bid
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-10 mt-12 pt-10 border-t border-slate-100">
                      <div>
                        <label className="british-label">Origin & Destination</label>
                        <p className="font-serif italic text-royal-sapphire text-xl">
                          {details.rfq.origin} <span className="text-heritage-gold mx-2">→</span> {details.rfq.destination}
                        </p>
                      </div>
                      <div>
                        <label className="british-label">Pickup Date</label>
                        <p className="font-serif italic text-heritage-green text-xl flex items-center gap-3">
                          <Calendar className="text-heritage-silver" size={20} /> {format(parseISO(details.rfq.pickup_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div>
                        <label className="british-label">Current Close</label>
                        <p className="font-serif italic text-royal-sapphire text-xl flex items-center gap-3">
                          <Clock className="text-heritage-gold" size={20} /> {format(parseISO(details.rfq.close_time), 'HH:mm:ss')}
                        </p>
                      </div>
                      <div>
                        <label className="british-label">Forced Close</label>
                        <p className="font-serif italic text-heritage-burgundy text-xl flex items-center gap-3">
                          <ShieldAlert className="text-heritage-burgundy/50" size={20} /> {format(parseISO(details.rfq.forced_close_time), 'HH:mm')}
                        </p>
                      </div>
                      <div>
                        <label className="british-label">Auction Config (X/Y)</label>
                        <p className="font-serif italic text-heritage-gold text-xl">
                          {details.rfq.trigger_window_x}m <span className="text-slate-300">/</span> {details.rfq.extension_duration_y}m
                        </p>
                      </div>
                      <div>
                        <label className="british-label">Cargo (W/V)</label>
                        <p className="font-serif italic text-slate-600 text-xl">
                          {details.rfq.weight || '—'} <span className="text-slate-300">/</span> {details.rfq.volume || '—'}
                        </p>
                      </div>
                    </div>

                    {details.rfq.cargo_details && (
                      <div className="mt-10 pt-10 border-t border-slate-100">
                        <label className="british-label">Detailed Cargo Manifest</label>
                        <p className="text-slate-600 font-serif italic whitespace-pre-wrap leading-relaxed">{details.rfq.cargo_details}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-end">
                      <h3 className="text-3xl font-bold text-royal-sapphire flex items-center gap-3">
                        <TrendingDown className="text-heritage-gold" size={28} /> Supplier Rankings
                      </h3>
                      <div className="flex items-center gap-4">
                        {user?.role === 'SUPPLIER' && (
                          <div className={cn(
                            "px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-widest flex items-center gap-2",
                            details.bids.some(b => b.supplier_id === user.id) 
                              ? "bg-royal-sapphire text-heritage-gold border border-heritage-gold shadow-md" 
                              : "bg-heritage-burgundy/10 text-heritage-burgundy border border-heritage-burgundy/20"
                          )}>
                            {details.bids.some(b => b.supplier_id === user.id) ? (
                              <>
                                <UserIcon size={14} /> 
                                My Rank: L{details.bids.find(b => b.supplier_id === user.id)?.rank}
                              </>
                            ) : (
                              <>
                                <ShieldAlert size={14} /> 
                                No Bid Submitted
                              </>
                            )}
                          </div>
                        )}
                        {user?.role === 'BUYER' && (
                          <button onClick={exportToCsv} className="text-sm font-serif italic text-royal-sapphire hover:text-heritage-gold flex items-center gap-1 transition-colors">
                            <Download size={14} /> Export Data
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="british-card overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <tbody className="divide-y divide-slate-50">
                          {details.bids.map((bid) => {
                            const isMyBid = user?.role === 'SUPPLIER' && bid.supplier_id === user.id;
                            return (
                              <tr key={bid.id} className={cn(
                                "transition-colors",
                                bid.rank === 1 ? "bg-heritage-gold/5" : "",
                                isMyBid ? "bg-royal-sapphire/[0.03] border-l-4 border-heritage-gold" : ""
                              )}>
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <span className={cn(
                                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border",
                                      bid.rank === 1 ? "bg-heritage-gold text-white border-heritage-gold shadow-lg" : 
                                      bid.rank === 2 ? "bg-heritage-silver text-royal-sapphire border-heritage-silver" :
                                      "bg-slate-100 text-slate-500 border-slate-200",
                                      isMyBid && bid.rank !== 1 ? "bg-royal-sapphire text-white border-royal-sapphire" : ""
                                    )}>
                                      L{bid.rank}
                                    </span>
                                    {isMyBid && (
                                      <span className="text-[10px] font-bold text-heritage-gold uppercase tracking-tighter">You</span>
                                    )}
                                  </div>
                                </td>
                                <td className={cn(
                                  "p-4 font-bold",
                                  isMyBid ? "text-royal-sapphire" : "text-slate-700"
                                )}>
                                  {bid.carrier_name}
                                  {isMyBid && <p className="text-[10px] text-heritage-gold italic font-serif">Your Official Quote</p>}
                                </td>
                                <td className="p-4 text-heritage-green font-bold text-lg">£{Number(bid.total_amount).toLocaleString()}</td>
                                <td className="p-4 text-royal-sapphire text-sm font-serif italic">{bid.transit_time} days</td>
                                <td className="p-4 text-royal-sapphire text-sm italic">{bid.validity} days</td>
                                <td className="p-4">
                                  <div className="text-[10px] text-slate-400 leading-tight font-mono space-y-1">
                                    <p>F: <span className="text-royal-sapphire font-bold">£{bid.cost_breakdown.freight}</span></p>
                                    <p>O: <span className="text-royal-sapphire font-bold">£{bid.cost_breakdown.origin}</span></p>
                                    <p>D: <span className="text-royal-sapphire font-bold">£{bid.cost_breakdown.destination}</span></p>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {user?.role === 'SUPPLIER' && !details.bids.some(b => b.supplier_id === user.id) && (
                            <tr>
                              <td colSpan={6} className="p-16 text-center bg-slate-50/50">
                                <ShieldAlert className="mx-auto text-heritage-burgundy/30 mb-4" size={48} />
                                <p className="text-royal-sapphire font-bold text-xl tracking-tight">You have not submitted a bid for this RFQ.</p>
                                <p className="text-slate-500 font-serif italic mt-1">Submit a competitive quote to join the rankings.</p>
                                {details.rfq.status === 'ACTIVE' && (
                                  <button 
                                    onClick={() => setShowBidModal(true)}
                                    className="british-button mt-8 px-10 bg-heritage-gold hover:bg-heritage-gold/90 border-heritage-silver"
                                  >
                                    Submit Initial Bid
                                  </button>
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="space-y-10">
                  <div className="british-card p-8 bg-royal-sapphire text-white border-heritage-gold shadow-2xl">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-heritage-gold mb-8 border-b border-heritage-gold/20 pb-4">Auction Intelligence</h3>
                    <div className="space-y-8">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-heritage-gold border border-white/10 shadow-inner">
                          <TrendingDown size={28} />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-heritage-silver font-bold">Current Lowest</p>
                          <p className="text-4xl font-bold text-heritage-gold">
                            {details.rfq.lowest_bid ? `£${Number(details.rfq.lowest_bid).toLocaleString()}` : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-heritage-silver border border-white/10 shadow-inner">
                          <Users size={28} />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-heritage-silver font-bold">Active Participants</p>
                          <p className="text-4xl font-bold text-white tracking-tight">{new Set(details.bids.map(b => b.carrier_name)).size}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-3xl font-bold text-royal-sapphire flex items-center gap-3">
                      <History className="text-heritage-gold" size={28} /> Activity Log
                    </h3>
                    <div className="british-card p-8 h-[600px] overflow-y-auto space-y-8 bg-white border-t-4 border-royal-sapphire">
                      {details.logs.map((log) => (
                        <div key={log.id} className="relative pl-10 border-l-2 border-slate-100 pb-2 group">
                          <div className={cn(
                            "absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-125",
                            log.event_type === 'TIME_EXTENSION' ? "bg-heritage-gold" : "bg-royal-sapphire"
                          )} />
                          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                            {format(parseISO(log.created_at), 'HH:mm:ss • MMM d')}
                          </p>
                          <p className="font-bold text-royal-sapphire text-sm mt-1">{log.event_type.replace('_', ' ')}</p>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed font-serif italic">{log.details}</p>
                          {log.reason && (
                            <p className="text-[10px] text-heritage-gold font-serif italic mt-3 bg-royal-sapphire/5 p-3 rounded-sm border-l-2 border-heritage-gold">
                              Reason: {log.reason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* RFQ Modal Wizard */}
      {showRfqModal && (
        <div className="fixed inset-0 bg-royal-sapphire/40 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="british-card w-full max-w-2xl p-10 border-t-8 border-heritage-gold shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-3xl font-bold text-royal-sapphire tracking-tight">Create Elite RFQ</h3>
                <p className="text-xs text-slate-400 font-serif italic mt-1">Step {rfqStep} of 3: {
                  rfqStep === 1 ? "Basic Information" : rfqStep === 2 ? "Route & Cargo Details" : "Auction Settings"
                }</p>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map(s => (
                  <div key={s} className={cn(
                    "w-10 h-1.5 rounded-full transition-all duration-500",
                    s <= rfqStep ? "bg-heritage-gold shadow-[0_0_8px_rgba(212,175,55,0.4)]" : "bg-slate-200"
                  )} />
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateRfq} className="space-y-8">
              {rfqStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <label className="british-label">RFQ Name / Title</label>
                    <input 
                      className="british-input text-lg font-serif italic" 
                      placeholder="e.g. Trans-Atlantic Route Q2" 
                      value={rfqForm.name}
                      onChange={e => updateRfqForm('name', e.target.value)}
                      required 
                    />
                  </div>
                  <div>
                    <label className="british-label">Official Reference ID</label>
                    <input 
                      className="british-input font-mono tracking-wider" 
                      placeholder="RFQ-2026-001" 
                      value={rfqForm.reference_id}
                      onChange={e => updateRfqForm('reference_id', e.target.value)}
                      required 
                    />
                  </div>
                </div>
              )}

              {rfqStep === 2 && (
                <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <label className="british-label">Origin Port/City</label>
                    <input 
                      className="british-input" 
                      placeholder="London, UK" 
                      value={rfqForm.origin}
                      onChange={e => updateRfqForm('origin', e.target.value)}
                      required 
                    />
                  </div>
                  <div>
                    <label className="british-label">Destination Port/City</label>
                    <input 
                      className="british-input" 
                      placeholder="New York, USA" 
                      value={rfqForm.destination}
                      onChange={e => updateRfqForm('destination', e.target.value)}
                      required 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="british-label">Cargo Manifest & Details</label>
                    <textarea 
                      className="british-input h-32 font-serif italic leading-relaxed" 
                      placeholder="Describe the cargo in detail..."
                      value={rfqForm.cargo_details}
                      onChange={e => updateRfqForm('cargo_details', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="british-label">Total Weight</label>
                    <input 
                      className="british-input" 
                      placeholder="e.g. 5000kg" 
                      value={rfqForm.weight}
                      onChange={e => updateRfqForm('weight', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="british-label">Total Volume</label>
                    <input 
                      className="british-input" 
                      placeholder="e.g. 20m3" 
                      value={rfqForm.volume}
                      onChange={e => updateRfqForm('volume', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {rfqStep === 3 && (
                <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <label className="british-label">Scheduled Pickup Date</label>
                    <input 
                      type="date" 
                      className="british-input" 
                      value={rfqForm.pickup_date}
                      onChange={e => updateRfqForm('pickup_date', e.target.value)}
                      required 
                    />
                  </div>
                  <div>
                    <label className="british-label">Auction Start Time</label>
                    <input 
                      type="datetime-local" 
                      className="british-input" 
                      value={rfqForm.start_time}
                      onChange={e => updateRfqForm('start_time', e.target.value)}
                      required 
                    />
                  </div>
                  <div>
                    <label className="british-label">Initial Bid Close Time</label>
                    <input 
                      type="datetime-local" 
                      className="british-input" 
                      value={rfqForm.close_time}
                      onChange={e => updateRfqForm('close_time', e.target.value)}
                      required 
                    />
                  </div>
                  <div>
                    <label className="british-label">Absolute Forced Close</label>
                    <input 
                      type="datetime-local" 
                      className="british-input" 
                      value={rfqForm.forced_close_time}
                      onChange={e => updateRfqForm('forced_close_time', e.target.value)}
                      required 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 col-span-2 p-6 bg-royal-sapphire/5 rounded-sm border border-royal-sapphire/10">
                    <div>
                      <label className="british-label text-royal-sapphire">Trigger Window (X min)</label>
                      <input 
                        type="number" 
                        className="british-input bg-white" 
                        value={rfqForm.x}
                        onChange={e => updateRfqForm('x', e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="british-label text-royal-sapphire">Extension Duration (Y min)</label>
                      <input 
                        type="number" 
                        className="british-input bg-white" 
                        value={rfqForm.y}
                        onChange={e => updateRfqForm('y', e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-10 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => {
                    if (rfqStep === 1) setShowRfqModal(false);
                    else setRfqStep(rfqStep - 1);
                  }} 
                  className="px-8 py-3 text-slate-400 font-serif italic hover:text-royal-sapphire transition-all flex items-center gap-2 group"
                >
                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                  {rfqStep === 1 ? "Cancel Initiation" : "Previous Step"}
                </button>
                
                {rfqStep < 3 ? (
                  <button 
                    type="button" 
                    onClick={() => setRfqStep(rfqStep + 1)}
                    className="british-button px-10"
                  >
                    Continue to Next Step
                  </button>
                ) : (
                  <button type="submit" className="british-button bg-heritage-gold hover:bg-heritage-gold/90 border-heritage-silver px-12 shadow-xl">
                    Publish Official Auction
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {showBidModal && (
        <div className="fixed inset-0 bg-royal-sapphire/40 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="british-card w-full max-w-lg p-10 border-t-8 border-heritage-gold shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-3xl font-bold text-royal-sapphire mb-8 tracking-tight">Submit Competitive Quote</h3>
            <form onSubmit={handleSubmitBid} className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="british-label">Total Bid Amount (£)</label>
                  <input name="total_amount" type="number" step="0.01" className="british-input text-3xl font-bold text-heritage-green py-4" placeholder="0.00" required />
                </div>
                <div>
                  <label className="british-label">Transit Time (Days)</label>
                  <input name="transit_time" className="british-input font-serif italic" placeholder="e.g. 14" required />
                </div>
                <div>
                  <label className="british-label">Validity (Days)</label>
                  <input name="validity" className="british-input font-serif italic" placeholder="e.g. 30" required />
                </div>
                <div className="col-span-2 grid grid-cols-3 gap-4 p-6 bg-royal-sapphire/5 rounded-sm border border-royal-sapphire/10">
                  <div>
                    <label className="british-label text-royal-sapphire">Freight</label>
                    <input name="freight" type="number" step="0.01" className="british-input text-sm bg-white" required />
                  </div>
                  <div>
                    <label className="british-label text-royal-sapphire">Origin</label>
                    <input name="origin" type="number" step="0.01" className="british-input text-sm bg-white" required />
                  </div>
                  <div>
                    <label className="british-label text-royal-sapphire">Dest.</label>
                    <input name="destination" type="number" step="0.01" className="british-input text-sm bg-white" required />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-10 pt-8 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowBidModal(false)}
                  className="px-8 py-3 text-slate-400 font-serif italic hover:text-royal-sapphire transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="british-button bg-heritage-gold hover:bg-heritage-gold/90 border-heritage-silver px-10 shadow-lg">
                  Register Official Bid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );
};

const AuthConsumer = () => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-parchment">
      <div className="text-center">
        <Gavel className="mx-auto text-heritage-gold animate-bounce mb-4" size={48} />
        <p className="font-serif italic text-heritage-navy">Preparing the Auction House...</p>
      </div>
    </div>
  );

  if (!user) return <AuthPage />;
  if (user.role === 'PENDING') return <OnboardingPage />;
  
  return <Dashboard />;
};

export default App;