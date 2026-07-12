import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ShoppingBag, ArrowRight, Package, Copy, Check, XCircle, Star, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useClengoWhatsApp, waLink, orderConfirmationText } from "@/lib/whatsapp";
import WhatsAppIcon from "@/components/WhatsAppIcon";

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

  const refetch = async () => {
    const { data } = await api.get("/orders/me");
    setOrders(data);
  };

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    refetch().finally(() => setFetching(false));
  }, [user, loading]);

  const copyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopied(id);
    toast.success("Order ID copied");
    setTimeout(() => setCopied(null), 1500);
  };

  const cancelOrder = async (order_id) => {
    const reason = window.prompt("Reason for cancellation? (optional)");
    if (reason === null) return;
    try {
      const { data } = await api.post(`/orders/${order_id}/cancel`, { reason });
      setOrders(prev => prev.map(o => o.order_id === order_id ? data : o));
      toast.success("Order cancelled");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to cancel");
    }
  };

  const submitFeedback = async (order_id, rating, comment) => {
    try {
      const { data } = await api.post(`/orders/${order_id}/feedback`, { rating, comment });
      setOrders(prev => prev.map(o => o.order_id === order_id ? data : o));
      toast.success("Thanks for your feedback!");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to submit feedback");
    }
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
      <div className="max-w-6xl mx-auto px-5 sm:px-6 md:px-10 py-8 md:py-14">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">My orders</h1>
            <p className="mt-3 text-sm sm:text-base text-black/60">Track every pickup, wash and delivery.</p>
          </div>
          <button onClick={() => navigate("/order")} data-testid="book-new-order-btn" className="inline-flex items-center gap-2 px-5 py-3 bg-[#D4A017] text-black rounded-full font-semibold hover:bg-black hover:text-white transition-colors w-full md:w-auto justify-center">
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
              <OrderCard key={o.order_id} order={o} onCopy={copyId} copied={copied === o.order_id} onCancel={cancelOrder} onFeedback={submitFeedback} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

function OrderCard({ order, onCopy, copied, onCancel, onFeedback }) {
  const meta = STATUS_META[order.status] || STATUS_META.pending;
  const stepIndex = TIMELINE.indexOf(order.status);
  const services = [...new Set(order.items.map(i => i.service))].join(", ");
  const clengoWa = useClengoWhatsApp();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Cancellation window: pending orders only, within 3 hours of creation
  const createdAt = new Date(order.created_at);
  const hoursSince = (Date.now() - createdAt.getTime()) / 3600000;
  const canCancel = order.status === "pending" && hoursSince < 3;
  const cancelSecondsLeft = Math.max(0, 3 * 3600 - Math.floor((Date.now() - createdAt.getTime()) / 1000));
  const canRate = order.status === "completed" && !order.feedback_rating;

  return (
    <div className="rounded-3xl bg-white border border-black/5 p-5 sm:p-6 md:p-7 hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-shadow" data-testid={`order-card-${order.order_id}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <p className="text-[10px] uppercase tracking-[0.24em] font-bold text-black/40">Order ID</p>
            <button onClick={() => onCopy(order.order_id)} className="flex items-center gap-1 font-mono font-bold text-xs sm:text-sm hover:text-[#D4A017] break-all" data-testid={`copy-order-id-${order.order_id}`}>
              {order.order_id}
              {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} className="opacity-50" />}
            </button>
          </div>
          <p className="mt-2 text-xs text-black/50">
            {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · {order.total_items} items · <span className="uppercase tracking-wider">{services}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-widest border ${meta.color}`} data-testid={`order-status-${order.order_id}`}>{meta.label}</span>
          <span className="font-heading text-xl sm:text-2xl font-bold">₹{order.total_amount.toFixed(0)}</span>
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
            {order.discount > 0 && (
              <p className="mt-2 text-xs text-[#B88A14] font-semibold">Discount applied: − ₹{order.discount}</p>
            )}
          </div>
        </div>
        {order.feedback_rating && (
          <div className="mt-4 rounded-xl bg-green-50 border border-green-200 p-3">
            <p className="text-xs uppercase tracking-widest text-green-700 font-bold flex items-center gap-1">
              <Check size={12} /> Your rating
            </p>
            <div className="mt-1 flex items-center gap-0.5 text-[#D4A017]">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill={i < order.feedback_rating ? "#D4A017" : "none"} />
              ))}
            </div>
            {order.feedback_comment && <p className="mt-1 text-xs text-green-800">"{order.feedback_comment}"</p>}
          </div>
        )}
        {order.status === "cancelled" && order.cancel_reason && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
            <b>Cancelled</b> ({order.cancelled_by}): {order.cancel_reason}
          </div>
        )}
        <div className="mt-4 flex items-center gap-4 flex-wrap">
          <Link to="/complaint" state={{ orderId: order.order_id }} className="inline-flex items-center gap-1 text-xs font-semibold text-[#B88A14] hover:text-[#D4A017]" data-testid={`raise-complaint-${order.order_id}`}>
            Raise a complaint <ArrowRight size={12} />
          </Link>
          <a
            href={waLink(clengoWa, orderConfirmationText(order))}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`whatsapp-order-${order.order_id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#25D366] hover:text-[#128C7E]"
          >
            <WhatsAppIcon size={12} /> Chat about this order
          </a>
          {canCancel && (
            <button
              onClick={() => onCancel(order.order_id)}
              data-testid={`cancel-order-${order.order_id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
            >
              <XCircle size={12} /> Cancel order ({Math.floor(cancelSecondsLeft / 60)}m left)
            </button>
          )}
          {canRate && (
            <button
              onClick={() => setFeedbackOpen(true)}
              data-testid={`rate-order-${order.order_id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#D4A017] hover:text-[#B88A14]"
            >
              <Star size={12} /> Rate this order
            </button>
          )}
        </div>
      </details>
      {feedbackOpen && (
        <FeedbackModal
          order={order}
          onClose={() => setFeedbackOpen(false)}
          onSubmit={(rating, comment) => { onFeedback(order.order_id, rating, comment); setFeedbackOpen(false); }}
        />
      )}
    </div>
  );
}
