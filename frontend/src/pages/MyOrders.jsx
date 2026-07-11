import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/lib/api";
import { useAuth, loginWithGoogle } from "@/context/AuthContext";
import { ShoppingBag, ArrowRight, Package, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const STATUS_META = {
  pending: { label: "Pending pickup", color: "bg-amber-100 text-amber-800 border-amber-200" },
  picked_up: { label: "Picked up", color: "bg-blue-100 text-blue-800 border-blue-200" },
  in_process: { label: "In process", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  out_for_delivery: { label: "Out for delivery", color: "bg-purple-100 text-purple-800 border-purple-200" },
  completed: { label: "Delivered", color: "bg-green-100 text-green-800 border-green-200" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200" },
};

const TIMELINE = ["pending", "picked_up", "in_process", "out_for_delivery", "completed"];

export default function MyOrders() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [fetching, setFetching] = useState(true);
  const navigate = useNavigate();
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    api.get("/orders/me").then(({ data }) => setOrders(data)).finally(() => setFetching(false));
  }, [user, loading]);

  const copyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopied(id);
    toast.success("Order ID copied");
    setTimeout(() => setCopied(null), 1500);
  };

  if (loading) return <div className="min-h-screen bg-[#FDFDFB]"><Navbar /></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FDFDFB]" data-testid="my-orders-signin-gate">
        <Navbar />
        <div className="max-w-lg mx-auto px-6 py-24 text-center">
          <ShoppingBag size={48} className="mx-auto text-[#D4A017]" />
          <h1 className="mt-6 font-heading text-3xl font-bold">Sign in to see your orders</h1>
          <button onClick={loginWithGoogle} className="mt-6 px-6 py-3 bg-[#111] text-white rounded-full font-semibold hover:bg-[#D4A017] hover:text-black transition-colors" data-testid="signin-my-orders-btn">
            Sign in with Google
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFB]" data-testid="my-orders-page">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 md:py-14">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight">My orders</h1>
            <p className="mt-3 text-black/60">Track every pickup, wash and delivery.</p>
          </div>
          <button onClick={() => navigate("/order")} data-testid="book-new-order-btn" className="inline-flex items-center gap-2 px-5 py-3 bg-[#D4A017] text-black rounded-full font-semibold hover:bg-black hover:text-white transition-colors">
            <ShoppingBag size={16} /> Book new order
          </button>
        </div>

        {fetching ? (
          <p className="mt-10 text-black/50">Loading your orders...</p>
        ) : orders.length === 0 ? (
          <div className="mt-16 rounded-3xl bg-white border border-black/5 p-12 text-center">
            <Package size={40} className="mx-auto text-black/20" />
            <p className="mt-4 text-black/60">No orders yet. Book your first pickup!</p>
          </div>
        ) : (
          <div className="mt-10 space-y-4">
            {orders.map((o) => (
              <OrderCard key={o.order_id} order={o} onCopy={copyId} copied={copied === o.order_id} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

function OrderCard({ order, onCopy, copied }) {
  const meta = STATUS_META[order.status] || STATUS_META.pending;
  const stepIndex = TIMELINE.indexOf(order.status);
  const services = [...new Set(order.items.map(i => i.service))].join(", ");

  return (
    <div className="rounded-3xl bg-white border border-black/5 p-6 md:p-7 hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-shadow" data-testid={`order-card-${order.order_id}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <p className="text-[10px] uppercase tracking-[0.24em] font-bold text-black/40">Order ID</p>
            <button onClick={() => onCopy(order.order_id)} className="flex items-center gap-1 font-mono font-bold text-sm hover:text-[#D4A017]" data-testid={`copy-order-id-${order.order_id}`}>
              {order.order_id}
              {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} className="opacity-50" />}
            </button>
          </div>
          <p className="mt-2 text-xs text-black/50">
            {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · {order.total_items} items · <span className="uppercase tracking-wider">{services}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border ${meta.color}`} data-testid={`order-status-${order.order_id}`}>{meta.label}</span>
          <span className="font-heading text-2xl font-bold">₹{order.total_amount.toFixed(0)}</span>
        </div>
      </div>

      {/* Timeline */}
      {order.status !== "cancelled" && (
        <div className="mt-6 flex items-center">
          {TIMELINE.map((s, i) => (
            <div key={s} className="flex-1 flex items-center">
              <div className={`w-3 h-3 rounded-full ${i <= stepIndex ? "bg-[#D4A017]" : "bg-black/10"}`} />
              {i < TIMELINE.length - 1 && (
                <div className={`flex-1 h-0.5 ${i < stepIndex ? "bg-[#D4A017]" : "bg-black/10"}`} />
              )}
            </div>
          ))}
        </div>
      )}

      <details className="mt-5 group">
        <summary className="text-sm font-semibold text-black/60 cursor-pointer hover:text-black flex items-center gap-1" data-testid={`toggle-details-${order.order_id}`}>
          View details
        </summary>
        <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-widest text-black/40 font-bold">Pickup</p>
            <p className="mt-1">{order.pickup_address}</p>
            <p className="text-black/50">{order.pickup_pincode} · {order.pickup_date} · {order.pickup_slot}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-black/40 font-bold">Items</p>
            <ul className="mt-1 text-black/70">
              {order.items.map((it, i) => (
                <li key={i}>{it.item_name} × {it.quantity} <span className="text-[10px] uppercase tracking-wider text-[#D4A017]">{it.service}</span> — ₹{it.subtotal}</li>
              ))}
            </ul>
          </div>
        </div>
        <Link to="/complaint" state={{ orderId: order.order_id }} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#B88A14] hover:text-[#D4A017]" data-testid={`raise-complaint-${order.order_id}`}>
          Raise a complaint <ArrowRight size={12} />
        </Link>
      </details>
    </div>
  );
}
