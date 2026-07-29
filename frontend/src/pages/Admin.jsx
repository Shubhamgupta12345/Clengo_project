import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import api from "@/lib/api";
import { API } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Download, Filter, Search, ShoppingBag, IndianRupee, AlertCircle, Users, Loader2, CheckCircle2, X, MessageCircleWarning, MapPin, Plus, Trash2, MessageCircle, Tags, Percent, Settings2, ShieldOff, Ban, CalendarClock, Pencil, Star } from "lucide-react";
import { toast } from "sonner";
import { waLink, adminContactCustomerText } from "@/lib/whatsapp";

const STATUS_LIST = ["pending", "picked_up", "in_process", "out_for_delivery", "completed", "cancelled"];
const STATUS_LABELS = {
  pending: "Pending", picked_up: "Picked up", in_process: "In process",
  out_for_delivery: "Out for delivery", completed: "Completed", cancelled: "Cancelled",
};
const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  picked_up: "bg-blue-100 text-blue-800 border-blue-200",
  in_process: "bg-indigo-100 text-indigo-800 border-indigo-200",
  out_for_delivery: "bg-purple-100 text-purple-800 border-purple-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

export default function Admin() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState("orders"); // orders | complaints | pincodes

  if (loading) return <div className="min-h-screen bg-[#F4F5F7]"><Navbar /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== "admin") return (
    <div className="min-h-screen bg-[#F4F5F7]" data-testid="admin-forbidden">
      <Navbar />
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <AlertCircle size={40} className="mx-auto text-red-500" />
        <h1 className="mt-4 font-heading text-2xl font-bold">Admin access only</h1>
        <p className="mt-2 text-sm text-black/60">Your account ({user.email}) does not have admin permissions.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F5F7]" data-testid="admin-page">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.24em] font-bold text-[#D4A017]">Admin Control</p>
            <h1 className="mt-1 font-heading text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Clengo Operations</h1>
          </div>
        </div>

        <StatsCards />

        <div className="mt-6 md:mt-8 flex gap-1 sm:gap-2 border-b border-black/10 overflow-x-auto">
          {[
            { key: "orders", label: "Orders", icon: ShoppingBag },
            { key: "complaints", label: "Complaints", icon: MessageCircleWarning },
            { key: "feedback", label: "Feedback", icon: Star },
            { key: "pincodes", label: "Serviceable Areas", icon: MapPin },
            { key: "catalog", label: "Catalog", icon: Tags },
            { key: "offers", label: "Offers", icon: Percent },
            { key: "settings", label: "Settings", icon: Settings2 },
            { key: "blocklist", label: "Blocklist", icon: ShieldOff },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              data-testid={`admin-tab-${t.key}`}
              className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === t.key ? "border-[#D4A017] text-black" : "border-transparent text-black/50 hover:text-black"}`}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "orders" && <OrdersTab />}
          {tab === "complaints" && <ComplaintsTab />}
          {tab === "feedback" && <FeedbackTab />}
          {tab === "pincodes" && <PincodesTab />}
          {tab === "catalog" && <CatalogTab />}
          {tab === "offers" && <OffersTab />}
          {tab === "settings" && <SettingsTab />}
          {tab === "blocklist" && <BlocklistTab />}
        </div>
      </div>
    </div>
  );
}

function StatsCards() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get("/admin/stats").then(({ data }) => setStats(data)).catch(() => {});
  }, []);
  if (!stats) return null;
  const cards = [
    { label: "Total Orders", value: stats.total_orders, icon: ShoppingBag, color: "text-[#D4A017]" },
    { label: "Pending", value: stats.pending, icon: AlertCircle, color: "text-amber-600" },
    { label: "In Process", value: stats.in_process, icon: Loader2, color: "text-blue-600" },
    { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-green-600" },
    { label: "Revenue", value: `₹${stats.revenue.toLocaleString('en-IN')}`, icon: IndianRupee, color: "text-[#D4A017]" },
    { label: "Users", value: stats.total_users, icon: Users, color: "text-purple-600" },
    { label: "Open Complaints", value: stats.open_complaints, icon: MessageCircleWarning, color: "text-red-600" },
    { label: "Avg Rating", value: stats.avg_rating ? `${stats.avg_rating} ★ (${stats.feedback_count})` : "No ratings yet", icon: Star, color: "text-[#D4A017]" },
  ];
  return (
    <div className="mt-5 md:mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-2 sm:gap-3" data-testid="admin-stats">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-lg border border-black/5 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-1">
            <c.icon size={14} className={`${c.color} shrink-0`} />
            <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-black/40 font-bold truncate">{c.label}</p>
          </div>
          <p className="mt-2 md:mt-3 font-heading text-xl sm:text-2xl font-bold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", pincode: "", service: "", date_from: "", date_to: "", search: "" });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rescheduling, setRescheduling] = useState(null); // order being rescheduled

  const load = async () => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const { data } = await api.get("/admin/orders", { params });
    setOrders(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const applyFilters = () => load();
  const clearFilters = () => { setFilters({ status: "", pincode: "", service: "", date_from: "", date_to: "", search: "" }); setTimeout(load, 0); };

  const exportExcel = async () => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    const url = `${API}/admin/orders/export?${params.toString()}`;
    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const dl = document.createElement("a");
      dl.href = URL.createObjectURL(blob);
      dl.download = `clengo_orders_${Date.now()}.xlsx`;
      dl.click();
      toast.success("Excel exported");
    } catch (e) { toast.error("Export failed"); }
  };

  const updateStatus = async (order_id, status) => {
    try {
      const { data } = await api.patch(`/admin/orders/${order_id}/status`, { status });
      setOrders((prev) => prev.map((o) => o.order_id === order_id ? data : o));
      if (selectedOrder?.order_id === order_id) setSelectedOrder(data);
      toast.success(`Marked ${STATUS_LABELS[status]}`);
    } catch (e) { toast.error("Failed to update"); }
  };

  const cancelOrder = async (order_id) => {
    if (!window.confirm("Cancel this order? This cannot be undone.")) return;
    const reason = window.prompt("Reason for cancellation? (optional)") || "";
    try {
      const { data } = await api.post(`/admin/orders/${order_id}/cancel`, { reason });
      setOrders((prev) => prev.map((o) => o.order_id === order_id ? data : o));
      if (selectedOrder?.order_id === order_id) setSelectedOrder(data);
      toast.success("Order cancelled");
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed to cancel order"); }
  };

  const rescheduleOrder = async (order_id, pickup_date, pickup_slot) => {
    try {
      const { data } = await api.post(`/admin/orders/${order_id}/reschedule`, { pickup_date, pickup_slot });
      setOrders((prev) => prev.map((o) => o.order_id === order_id ? data : o));
      if (selectedOrder?.order_id === order_id) setSelectedOrder(data);
      setRescheduling(null);
      toast.success("Pickup rescheduled");
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed to reschedule"); }
  };

  return (
    <div>
      <div className="bg-white rounded-lg border border-black/5 p-4" data-testid="orders-filters">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] rounded-md border border-black/10 px-3 py-2 bg-white">
            <Search size={14} className="text-black/40" />
            <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search order ID, name, email, phone" className="flex-1 outline-none text-sm" data-testid="filter-search" />
          </div>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="rounded-md border border-black/10 px-3 py-2 text-sm bg-white" data-testid="filter-status">
            <option value="">All statuses</option>
            {STATUS_LIST.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <select value={filters.service} onChange={(e) => setFilters({ ...filters, service: e.target.value })} className="rounded-md border border-black/10 px-3 py-2 text-sm bg-white" data-testid="filter-service">
            <option value="">All services</option>
            <option value="wash">Wash</option>
            <option value="wash_iron">Wash & Iron</option>
            <option value="iron">Iron</option>
            <option value="dryclean">Dry Clean</option>
          </select>
          <input value={filters.pincode} onChange={(e) => setFilters({ ...filters, pincode: e.target.value })} placeholder="Pincode" className="rounded-md border border-black/10 px-3 py-2 text-sm w-28" data-testid="filter-pincode" />
          <input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} className="rounded-md border border-black/10 px-3 py-2 text-sm" data-testid="filter-date-from" />
          <input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} className="rounded-md border border-black/10 px-3 py-2 text-sm" data-testid="filter-date-to" />
          <button onClick={applyFilters} className="px-4 py-2 rounded-md bg-[#111] text-white text-sm font-semibold hover:bg-[#D4A017] hover:text-black inline-flex items-center gap-2" data-testid="apply-filters-btn">
            <Filter size={14} /> Apply
          </button>
          <button onClick={clearFilters} className="px-3 py-2 rounded-md border border-black/10 text-sm hover:bg-black/5" data-testid="clear-filters-btn">Clear</button>
          <button onClick={exportExcel} className="px-4 py-2 rounded-md bg-[#D4A017] text-black text-sm font-bold hover:bg-black hover:text-white inline-flex items-center gap-2 ml-auto" data-testid="export-excel-btn">
            <Download size={14} /> Export Excel
          </button>
        </div>
      </div>

      <div className="mt-4 bg-white rounded-lg border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F6F2] text-[10px] uppercase tracking-widest text-black/50">
              <tr>
                <th className="text-left px-4 py-3">Order ID</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Pincode</th>
                <th className="text-left px-4 py-3">Pickup</th>
                <th className="text-left px-4 py-3">Items</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-black/40"><Loader2 className="animate-spin inline mr-2" size={16} /> Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-black/40">No orders match your filters</td></tr>
              ) : orders.map((o) => (
                <tr key={o.order_id} className="hover:bg-black/[0.02]" data-testid={`admin-order-row-${o.order_id}`}>
                  <td className="px-4 py-3 font-mono text-xs font-bold">
                    <button onClick={() => setSelectedOrder(o)} className="text-[#D4A017] hover:underline" data-testid={`view-order-${o.order_id}`}>{o.order_id}</button>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{o.user_name}</p>
                    <p className="text-xs text-black/50">{o.contact_phone}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{o.pickup_pincode}</td>
                  <td className="px-4 py-3 text-xs">{o.pickup_date}<br/><span className="text-black/50">{o.pickup_slot}</span></td>
                  <td className="px-4 py-3 text-xs">{o.total_items} pcs</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">₹{o.total_amount.toFixed(0)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2 justify-end">
                      <a
                        href={waLink(o.contact_phone.replace(/\D/g, "").length === 10 ? `91${o.contact_phone.replace(/\D/g, "")}` : o.contact_phone.replace(/\D/g, ""), adminContactCustomerText(o))}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`admin-whatsapp-${o.order_id}`}
                        title="WhatsApp customer"
                        className="w-8 h-8 rounded-full bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors inline-flex items-center justify-center"
                      >
                        <MessageCircle size={14} />
                      </a>
                      {o.status !== "completed" && o.status !== "cancelled" ? (
                        <>
                          <button
                            onClick={() => updateStatus(o.order_id, "completed")}
                            data-testid={`mark-complete-${o.order_id}`}
                            className="px-3 py-1.5 text-xs font-bold rounded-full border-2 border-[#D4A017] text-[#B88A14] hover:bg-[#D4A017] hover:text-black transition-colors"
                          >
                            Mark Complete
                          </button>
                          <button
                            onClick={() => setRescheduling(o)}
                            data-testid={`reschedule-order-${o.order_id}`}
                            title="Delay / reschedule pickup"
                            className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors inline-flex items-center justify-center"
                          >
                            <CalendarClock size={14} />
                          </button>
                          <button
                            onClick={() => cancelOrder(o.order_id)}
                            data-testid={`cancel-order-${o.order_id}`}
                            title="Cancel order"
                            className="w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors inline-flex items-center justify-center"
                          >
                            <Ban size={14} />
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-black/30 uppercase tracking-widest">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdate={updateStatus} onCancel={cancelOrder} onReschedule={() => setRescheduling(selectedOrder)} />}
      {rescheduling && <RescheduleModal order={rescheduling} onClose={() => setRescheduling(null)} onSave={rescheduleOrder} />}
    </div>
  );
}

function OrderDetailModal({ order, onClose, onUpdate, onCancel, onReschedule }) {
  const canModify = order.status !== "completed" && order.status !== "cancelled";
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose} data-testid="order-detail-modal">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6 border-b border-black/10">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-black/40 font-bold">Order</p>
            <p className="font-mono text-base sm:text-lg font-bold break-all">{order.order_id}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {canModify && (
              <>
                <button onClick={onReschedule} className="px-3 py-1.5 text-xs font-bold rounded-full border border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white transition-colors inline-flex items-center gap-1.5" data-testid="modal-reschedule-btn">
                  <CalendarClock size={13} /> Reschedule
                </button>
                <button onClick={() => onCancel(order.order_id)} className="px-3 py-1.5 text-xs font-bold rounded-full border border-red-200 text-red-700 hover:bg-red-600 hover:text-white transition-colors inline-flex items-center gap-1.5" data-testid="modal-cancel-btn">
                  <Ban size={13} /> Cancel order
                </button>
              </>
            )}
            <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full" data-testid="close-modal-btn"><X size={18} /></button>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-5 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Detail label="Customer" value={`${order.user_name} · ${order.user_email}`} />
            <Detail label="Phone" value={order.contact_phone} />
            <Detail label="Pickup date/slot" value={`${order.pickup_date} · ${order.pickup_slot}`} />
            <Detail label="Pincode" value={order.pickup_pincode} />
            <Detail label="Address" value={order.pickup_address} full />
            {order.notes && <Detail label="Notes" value={order.notes} full />}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-black/40 font-bold">Items</p>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {order.items.map((it, i) => (
                  <tr key={i} className="border-b border-black/5">
                    <td className="py-2">{it.item_name} <span className="text-[10px] uppercase text-[#D4A017] ml-1">{it.service}</span></td>
                    <td className="py-2 text-right">× {it.quantity}</td>
                    <td className="py-2 text-right font-mono">₹{it.subtotal}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={2} className="py-3 font-bold">Total (COD)</td>
                  <td className="py-3 text-right font-bold font-mono">₹{order.total_amount.toFixed(0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {order.feedback_rating && (
            <div className="rounded-xl bg-[#FDF6E3] border border-[#D4A017]/30 p-4" data-testid="modal-feedback">
              <p className="text-[10px] uppercase tracking-widest text-black/40 font-bold">Customer feedback</p>
              <div className="mt-1 flex items-center gap-0.5 text-[#D4A017]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill={i < order.feedback_rating ? "#D4A017" : "none"} />
                ))}
              </div>
              {order.feedback_comment && <p className="mt-2 text-sm">"{order.feedback_comment}"</p>}
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-black/40 font-bold mb-2">Update status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_LIST.map((s) => (
                <button
                  key={s}
                  onClick={() => onUpdate(order.order_id, s)}
                  data-testid={`modal-set-status-${s}`}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${order.status === s ? "bg-[#D4A017] text-black border-[#D4A017]" : "bg-white text-black/60 border-black/10 hover:border-[#D4A017]"}`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, full }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-[10px] uppercase tracking-widest text-black/40 font-bold">{label}</p>
      <p className="mt-1">{value}</p>
    </div>
  );
}

const SLOTS = [
  "08:00 AM - 10:00 AM",
  "10:00 AM - 12:00 PM",
  "12:00 PM - 02:00 PM",
  "04:00 PM - 06:00 PM",
  "06:00 PM - 08:00 PM",
];

function RescheduleModal({ order, onClose, onSave }) {
  const [date, setDate] = useState(order.pickup_date || "");
  const [slot, setSlot] = useState(order.pickup_slot || SLOTS[0]);
  return (
    <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose} data-testid="reschedule-modal">
      <div className="bg-white rounded-2xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-black/10">
          <p className="font-heading font-bold">Delay / reschedule pickup</p>
          <button onClick={onClose} className="p-1.5 hover:bg-black/5 rounded-full"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-black/50">Order <span className="font-mono font-bold">{order.order_id}</span></p>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-black/60">New pickup date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full mt-1 rounded-md border border-black/10 px-3 py-2 text-sm" data-testid="reschedule-date-input" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-black/60">New pickup slot</label>
            <select value={slot} onChange={(e) => setSlot(e.target.value)} className="w-full mt-1 rounded-md border border-black/10 px-3 py-2 text-sm bg-white" data-testid="reschedule-slot-select">
              {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button
            onClick={() => date && onSave(order.order_id, date, slot)}
            disabled={!date}
            className="w-full py-2.5 bg-[#111] text-white rounded-md text-sm font-bold hover:bg-[#D4A017] hover:text-black disabled:opacity-40"
            data-testid="reschedule-save-btn"
          >
            Save new schedule
          </button>
        </div>
      </div>
    </div>
  );
}

function ComplaintsTab() {
  const [complaints, setComplaints] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState({});

  const load = async () => {
    setLoading(true);
    const params = statusFilter ? { status: statusFilter } : {};
    const { data } = await api.get("/admin/complaints", { params });
    setComplaints(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, [statusFilter]);

  const respond = async (id) => {
    const text = responding[id];
    if (!text) return;
    try {
      const { data } = await api.patch(`/admin/complaints/${id}`, { admin_response: text, status: "resolved" });
      setComplaints((prev) => prev.map((c) => c.complaint_id === id ? data : c));
      setResponding((r) => ({ ...r, [id]: "" }));
      toast.success("Response saved");
    } catch (e) { toast.error("Failed"); }
  };

  return (
    <div>
      <div className="bg-white rounded-lg border border-black/5 p-4 flex items-center gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-black/10 px-3 py-2 text-sm bg-white" data-testid="complaint-status-filter">
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
        <span className="text-xs text-black/50">{complaints.length} complaint(s)</span>
      </div>
      <div className="mt-4 space-y-3">
        {loading ? <p className="text-sm text-black/40">Loading...</p> : complaints.length === 0 ? <p className="text-sm text-black/40 bg-white rounded-lg border border-black/5 p-6 text-center">No complaints</p> : complaints.map((c) => (
          <div key={c.complaint_id} className="bg-white rounded-lg border border-black/5 p-5" data-testid={`admin-complaint-${c.complaint_id}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold">{c.complaint_id}</span>
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${c.status === "resolved" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{c.status}</span>
                </div>
                <p className="mt-2 font-semibold">{c.subject}</p>
                <p className="text-xs text-black/50">Order: <span className="font-mono">{c.order_id}</span> · {c.user_email}</p>
                <p className="mt-3 text-sm">{c.message}</p>
                {c.admin_response && <div className="mt-3 text-xs bg-[#FDF6E3] border border-[#D4A017]/30 rounded-lg p-3"><b>Your response:</b> {c.admin_response}</div>}
              </div>
            </div>
            {c.status !== "resolved" && (
              <div className="mt-4 flex gap-2">
                <input
                  value={responding[c.complaint_id] || ""}
                  onChange={(e) => setResponding({ ...responding, [c.complaint_id]: e.target.value })}
                  placeholder="Write a response..."
                  className="flex-1 rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-[#D4A017]"
                  data-testid={`complaint-response-input-${c.complaint_id}`}
                />
                <button onClick={() => respond(c.complaint_id)} className="px-4 py-2 bg-[#D4A017] text-black rounded-md text-sm font-bold hover:bg-black hover:text-white" data-testid={`complaint-respond-btn-${c.complaint_id}`}>
                  Resolve & respond
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PincodesTab() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ pincode: "", city: "", area: "", active: true });

  const load = () => api.get("/admin/pincodes").then(({ data }) => setItems(data));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(form.pincode)) { toast.error("Enter a valid 6-digit pincode"); return; }
    try {
      await api.post("/admin/pincodes", form);
      toast.success("Saved");
      setForm({ pincode: "", city: "", area: "", active: true });
      load();
    } catch (e) { toast.error("Failed"); }
  };
  const remove = async (pc) => {
    if (!window.confirm(`Delete pincode ${pc}?`)) return;
    await api.delete(`/admin/pincodes/${pc}`);
    load();
  };
  const toggle = async (item) => {
    await api.post("/admin/pincodes", { ...item, active: !item.active });
    load();
  };

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="md:col-span-2 bg-white rounded-lg border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F6F2] text-[10px] uppercase tracking-widest text-black/50">
              <tr><th className="text-left px-4 py-3">Pincode</th><th className="text-left px-4 py-3">City</th><th className="text-left px-4 py-3">Area</th><th className="text-left px-4 py-3">Active</th><th className="text-right px-4 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {items.map((p) => (
                <tr key={p.pincode} data-testid={`pincode-row-${p.pincode}`}>
                  <td className="px-4 py-3 font-mono font-bold">{p.pincode}</td>
                  <td className="px-4 py-3">{p.city}</td>
                  <td className="px-4 py-3">{p.area}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggle(p)} className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${p.active ? "bg-green-100 text-green-700 border-green-200" : "bg-black/5 text-black/50 border-black/10"}`}>{p.active ? "Active" : "Inactive"}</button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(p.pincode)} className="p-2 hover:text-red-600" data-testid={`delete-pincode-${p.pincode}`}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <form onSubmit={add} className="bg-white rounded-lg border border-black/5 p-5 h-fit space-y-3" data-testid="add-pincode-form">
        <h3 className="font-heading font-bold">Add / Update pincode</h3>
        <input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="Pincode (6 digits)" className="w-full rounded-md border border-black/10 px-3 py-2 text-sm" data-testid="new-pincode-input" required />
        <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="w-full rounded-md border border-black/10 px-3 py-2 text-sm" required />
        <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Area" className="w-full rounded-md border border-black/10 px-3 py-2 text-sm" required />
        <button type="submit" className="w-full py-2.5 bg-[#111] text-white rounded-md text-sm font-bold hover:bg-[#D4A017] hover:text-black inline-flex items-center justify-center gap-2" data-testid="save-pincode-btn">
          <Plus size={14} /> Save pincode
        </button>
      </form>
    </div>
  );
}

// ============ Catalog (services & pricing) ============
const CATEGORIES = ["daily", "ethnic", "household", "premium"];
const ICONS = ["shirt", "footprints", "sparkles", "briefcase", "bed"];
const EMPTY_ITEM = { item_id: "", name: "", category: "daily", icon: "shirt", prices: { wash: "", wash_iron: "", iron: "", dryclean: "" } };

function CatalogTab() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_ITEM);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/catalog");
    setItems(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const edit = (item) => setForm({ ...item, prices: { wash: "", wash_iron: "", iron: "", dryclean: "", ...item.prices } });
  const resetForm = () => setForm(EMPTY_ITEM);

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Item name is required"); return; }
    const payload = {
      item_id: form.item_id || undefined,
      name: form.name.trim(),
      category: form.category,
      icon: form.icon,
      prices: {
        wash: Number(form.prices.wash) || 0,
        wash_iron: Number(form.prices.wash_iron) || 0,
        iron: Number(form.prices.iron) || 0,
        dryclean: Number(form.prices.dryclean) || 0,
      },
    };
    try {
      await api.post("/admin/catalog", payload);
      toast.success(form.item_id ? "Item updated" : "Item added");
      resetForm();
      load();
    } catch (e) { toast.error("Failed to save item"); }
  };

  const remove = async (item_id) => {
    if (!window.confirm("Remove this article from the catalog?")) return;
    try {
      await api.delete(`/admin/catalog/${item_id}`);
      toast.success("Item removed");
      load();
    } catch (e) { toast.error("Failed to remove item"); }
  };

  return (
    <div className="grid md:grid-cols-3 gap-4" data-testid="catalog-tab">
      <div className="md:col-span-2 bg-white rounded-lg border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F6F2] text-[10px] uppercase tracking-widest text-black/50">
              <tr>
                <th className="text-left px-4 py-3">Item</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-right px-4 py-3">Wash</th>
                <th className="text-right px-4 py-3">Wash+Iron</th>
                <th className="text-right px-4 py-3">Iron</th>
                <th className="text-right px-4 py-3">Dry clean</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-black/40"><Loader2 className="animate-spin inline mr-2" size={16} /> Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-black/40">No services yet</td></tr>
              ) : items.map((it) => (
                <tr key={it.item_id} data-testid={`catalog-row-${it.item_id}`}>
                  <td className="px-4 py-3 font-medium">{it.name}</td>
                  <td className="px-4 py-3 capitalize text-xs text-black/60">{it.category}</td>
                  <td className="px-4 py-3 text-right font-mono">₹{it.prices.wash}</td>
                  <td className="px-4 py-3 text-right font-mono">₹{it.prices.wash_iron ?? 0}</td>
                  <td className="px-4 py-3 text-right font-mono">₹{it.prices.iron}</td>
                  <td className="px-4 py-3 text-right font-mono">₹{it.prices.dryclean}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => edit(it)} className="p-2 hover:text-[#B88A14]" data-testid={`edit-catalog-${it.item_id}`}><Pencil size={14} /></button>
                      <button onClick={() => remove(it.item_id)} className="p-2 hover:text-red-600" data-testid={`delete-catalog-${it.item_id}`}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <form onSubmit={save} className="bg-white rounded-lg border border-black/5 p-5 h-fit space-y-3" data-testid="catalog-form">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold">{form.item_id ? "Edit article" : "Add new article"}</h3>
          {form.item_id && <button type="button" onClick={resetForm} className="text-xs text-black/40 hover:text-black">Cancel edit</button>}
        </div>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Item name (e.g. Shirt)" className="w-full rounded-md border border-black/10 px-3 py-2 text-sm" data-testid="catalog-name-input" required />
        <div className="grid grid-cols-2 gap-2">
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-md border border-black/10 px-3 py-2 text-sm bg-white capitalize" data-testid="catalog-category-select">
            {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
          <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="w-full rounded-md border border-black/10 px-3 py-2 text-sm bg-white">
            {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-black/50">Wash ₹</label>
            <input type="number" min="0" value={form.prices.wash} onChange={(e) => setForm({ ...form, prices: { ...form.prices, wash: e.target.value } })} className="w-full mt-1 rounded-md border border-black/10 px-2 py-2 text-sm" data-testid="catalog-price-wash" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-black/50">Wash &amp; Iron ₹</label>
            <input type="number" min="0" value={form.prices.wash_iron} onChange={(e) => setForm({ ...form, prices: { ...form.prices, wash_iron: e.target.value } })} className="w-full mt-1 rounded-md border border-black/10 px-2 py-2 text-sm" data-testid="catalog-price-wash-iron" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-black/50">Iron ₹</label>
            <input type="number" min="0" value={form.prices.iron} onChange={(e) => setForm({ ...form, prices: { ...form.prices, iron: e.target.value } })} className="w-full mt-1 rounded-md border border-black/10 px-2 py-2 text-sm" data-testid="catalog-price-iron" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-black/50">Dry clean ₹</label>
            <input type="number" min="0" value={form.prices.dryclean} onChange={(e) => setForm({ ...form, prices: { ...form.prices, dryclean: e.target.value } })} className="w-full mt-1 rounded-md border border-black/10 px-2 py-2 text-sm" data-testid="catalog-price-dryclean" />
          </div>
        </div>
        <button type="submit" className="w-full py-2.5 bg-[#111] text-white rounded-md text-sm font-bold hover:bg-[#D4A017] hover:text-black inline-flex items-center justify-center gap-2" data-testid="save-catalog-btn">
          <Plus size={14} /> {form.item_id ? "Save changes" : "Add article"}
        </button>
      </form>
    </div>
  );
}

// ============ Offers ============
const EMPTY_OFFER = { offer_id: "", threshold: "", discount: "", label: "", active: true };

function OffersTab() {
  const [offers, setOffers] = useState([]);
  const [form, setForm] = useState(EMPTY_OFFER);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/admin/offers");
    setOffers(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const edit = (o) => setForm({ ...o });
  const resetForm = () => setForm(EMPTY_OFFER);

  const save = async (e) => {
    e.preventDefault();
    if (!form.threshold || !form.discount) { toast.error("Threshold and discount are required"); return; }
    const payload = {
      offer_id: form.offer_id || undefined,
      threshold: Number(form.threshold),
      discount: Number(form.discount),
      label: form.label || `Save ₹${Number(form.discount)} on orders above ₹${Number(form.threshold)}`,
      active: !!form.active,
    };
    try {
      await api.post("/admin/offers", payload);
      toast.success(form.offer_id ? "Offer updated" : "Offer added");
      resetForm();
      load();
    } catch (e) { toast.error("Failed to save offer"); }
  };

  const remove = async (offer_id) => {
    if (!window.confirm("Remove this offer?")) return;
    try {
      await api.delete(`/admin/offers/${offer_id}`);
      toast.success("Offer removed");
      load();
    } catch (e) { toast.error("Failed to remove offer"); }
  };

  const toggleActive = async (o) => {
    try {
      await api.post("/admin/offers", { ...o, active: !o.active });
      load();
    } catch (e) { toast.error("Failed to update offer"); }
  };

  return (
    <div className="grid md:grid-cols-3 gap-4" data-testid="offers-tab">
      <div className="md:col-span-2 bg-white rounded-lg border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F6F2] text-[10px] uppercase tracking-widest text-black/50">
              <tr>
                <th className="text-left px-4 py-3">Offer</th>
                <th className="text-right px-4 py-3">Min. order</th>
                <th className="text-right px-4 py-3">Discount</th>
                <th className="text-left px-4 py-3">Active</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 text-black/40"><Loader2 className="animate-spin inline mr-2" size={16} /> Loading...</td></tr>
              ) : offers.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-black/40">No offers yet</td></tr>
              ) : offers.map((o) => (
                <tr key={o.offer_id} data-testid={`offer-row-${o.offer_id}`}>
                  <td className="px-4 py-3">{o.label}</td>
                  <td className="px-4 py-3 text-right font-mono">₹{o.threshold}</td>
                  <td className="px-4 py-3 text-right font-mono">₹{o.discount}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(o)} className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${o.active ? "bg-green-100 text-green-700 border-green-200" : "bg-black/5 text-black/50 border-black/10"}`}>{o.active ? "Active" : "Inactive"}</button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => edit(o)} className="p-2 hover:text-[#B88A14]" data-testid={`edit-offer-${o.offer_id}`}><Pencil size={14} /></button>
                      <button onClick={() => remove(o.offer_id)} className="p-2 hover:text-red-600" data-testid={`delete-offer-${o.offer_id}`}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <form onSubmit={save} className="bg-white rounded-lg border border-black/5 p-5 h-fit space-y-3" data-testid="offer-form">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold">{form.offer_id ? "Edit offer" : "Add new offer"}</h3>
          {form.offer_id && <button type="button" onClick={resetForm} className="text-xs text-black/40 hover:text-black">Cancel edit</button>}
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-black/50">Minimum order value ₹</label>
          <input type="number" min="0" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} className="w-full mt-1 rounded-md border border-black/10 px-3 py-2 text-sm" placeholder="e.g. 349" data-testid="offer-threshold-input" required />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-black/50">Discount ₹</label>
          <input type="number" min="0" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="w-full mt-1 rounded-md border border-black/10 px-3 py-2 text-sm" placeholder="e.g. 100" data-testid="offer-discount-input" required />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-black/50">Label (optional)</label>
          <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="w-full mt-1 rounded-md border border-black/10 px-3 py-2 text-sm" placeholder="Save ₹100 on orders above ₹349" data-testid="offer-label-input" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} data-testid="offer-active-checkbox" /> Active (shown on home page)
        </label>
        <button type="submit" className="w-full py-2.5 bg-[#111] text-white rounded-md text-sm font-bold hover:bg-[#D4A017] hover:text-black inline-flex items-center justify-center gap-2" data-testid="save-offer-btn">
          <Plus size={14} /> {form.offer_id ? "Save changes" : "Add offer"}
        </button>
      </form>
    </div>
  );
}

// ============ Settings ============
function SettingsTab() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/admin/settings").then(({ data }) => setForm(data)).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch("/admin/settings", {
        min_order_value: Number(form.min_order_value),
        company_name: form.company_name,
        company_about: form.company_about,
        contact_email: form.contact_email,
      });
      setForm(data);
      toast.success("Settings saved");
    } catch (e) { toast.error("Failed to save settings"); }
    setSaving(false);
  };

  if (!form) return <p className="text-sm text-black/40">Loading...</p>;

  return (
    <form onSubmit={save} className="max-w-xl bg-white rounded-lg border border-black/5 p-5 space-y-4" data-testid="settings-form">
      <h3 className="font-heading font-bold">Store settings</h3>
      <div>
        <label className="text-[10px] uppercase tracking-widest font-bold text-black/50">Minimum order value (₹)</label>
        <input type="number" min="0" value={form.min_order_value} onChange={(e) => setForm({ ...form, min_order_value: e.target.value })} className="w-full mt-1 rounded-md border border-black/10 px-3 py-2 text-sm" data-testid="settings-min-order-input" />
        <p className="mt-1 text-xs text-black/40">Customers must reach this amount before they can place an order.</p>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest font-bold text-black/50">Company name</label>
        <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="w-full mt-1 rounded-md border border-black/10 px-3 py-2 text-sm" data-testid="settings-company-name-input" />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest font-bold text-black/50">Contact email</label>
        <input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="w-full mt-1 rounded-md border border-black/10 px-3 py-2 text-sm" data-testid="settings-contact-email-input" />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest font-bold text-black/50">About</label>
        <textarea value={form.company_about} onChange={(e) => setForm({ ...form, company_about: e.target.value })} rows={5} className="w-full mt-1 rounded-md border border-black/10 px-3 py-2 text-sm" data-testid="settings-about-input" />
      </div>
      <button type="submit" disabled={saving} className="py-2.5 px-6 bg-[#111] text-white rounded-md text-sm font-bold hover:bg-[#D4A017] hover:text-black disabled:opacity-50" data-testid="save-settings-btn">
        {saving ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}

// ============ Blocklist ============
function BlocklistTab() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ email: "", reason: "" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/admin/blocklist");
    setItems(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) { toast.error("Enter an email address"); return; }
    try {
      await api.post("/admin/blocklist", { email: form.email.trim(), reason: form.reason });
      toast.success("Email blocked");
      setForm({ email: "", reason: "" });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed to block email"); }
  };

  const remove = async (email) => {
    if (!window.confirm(`Unblock ${email}?`)) return;
    await api.delete(`/admin/blocklist/${encodeURIComponent(email)}`);
    toast.success("Email unblocked");
    load();
  };

  return (
    <div className="grid md:grid-cols-3 gap-4" data-testid="blocklist-tab">
      <div className="md:col-span-2 bg-white rounded-lg border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F6F2] text-[10px] uppercase tracking-widest text-black/50">
              <tr><th className="text-left px-4 py-3">Email</th><th className="text-left px-4 py-3">Reason</th><th className="text-right px-4 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                <tr><td colSpan={3} className="text-center py-10 text-black/40"><Loader2 className="animate-spin inline mr-2" size={16} /> Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-10 text-black/40">No blocked emails</td></tr>
              ) : items.map((b) => (
                <tr key={b.email} data-testid={`blocklist-row-${b.email}`}>
                  <td className="px-4 py-3 font-mono text-xs">{b.email}</td>
                  <td className="px-4 py-3 text-black/60">{b.reason || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(b.email)} className="p-2 hover:text-red-600" data-testid={`unblock-${b.email}`}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <form onSubmit={add} className="bg-white rounded-lg border border-black/5 p-5 h-fit space-y-3" data-testid="add-blocklist-form">
        <h3 className="font-heading font-bold">Block an email</h3>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@example.com" className="w-full rounded-md border border-black/10 px-3 py-2 text-sm" data-testid="new-blocklist-email-input" required />
        <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason (optional)" className="w-full rounded-md border border-black/10 px-3 py-2 text-sm" data-testid="new-blocklist-reason-input" />
        <button type="submit" className="w-full py-2.5 bg-[#111] text-white rounded-md text-sm font-bold hover:bg-[#D4A017] hover:text-black inline-flex items-center justify-center gap-2" data-testid="save-blocklist-btn">
          <Ban size={14} /> Block email
        </button>
      </form>
    </div>
  );
}

// ============ Feedback ============
function FeedbackTab() {
  const [items, setItems] = useState([]);
  const [ratingFilter, setRatingFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = ratingFilter ? { max_rating: ratingFilter } : {};
    const { data } = await api.get("/admin/feedback", { params });
    setItems(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, [ratingFilter]);

  return (
    <div data-testid="feedback-tab">
      <div className="bg-white rounded-lg border border-black/5 p-4 flex items-center gap-3 flex-wrap">
        <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} className="rounded-md border border-black/10 px-3 py-2 text-sm bg-white" data-testid="feedback-rating-filter">
          <option value="">All ratings</option>
          <option value="2">2★ and below</option>
          <option value="3">3★ and below</option>
        </select>
        <span className="text-xs text-black/50">{items.length} review(s)</span>
      </div>
      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-black/40">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-black/40 bg-white rounded-lg border border-black/5 p-6 text-center">No feedback yet</p>
        ) : items.map((f) => (
          <div key={f.order_id} className="bg-white rounded-lg border border-black/5 p-5" data-testid={`feedback-row-${f.order_id}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-0.5 text-[#D4A017]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill={i < f.feedback_rating ? "#D4A017" : "none"} />
                  ))}
                </div>
                <p className="mt-2 text-xs text-black/50">
                  Order <span className="font-mono font-bold">{f.order_id}</span> · {f.user_name} ({f.user_email})
                </p>
                {f.feedback_comment && <p className="mt-2 text-sm">"{f.feedback_comment}"</p>}
              </div>
              <div className="text-right text-xs text-black/40">
                {f.feedback_at && new Date(f.feedback_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                <br />₹{f.total_amount?.toFixed?.(0) ?? f.total_amount}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
