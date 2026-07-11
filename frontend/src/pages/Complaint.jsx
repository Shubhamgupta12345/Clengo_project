import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/lib/api";
import { useAuth, loginWithGoogle } from "@/context/AuthContext";
import { MessageCircleWarning, Send, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ComplaintPage() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [orderId, setOrderId] = useState(location.state?.orderId || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myComplaints, setMyComplaints] = useState([]);

  useEffect(() => {
    if (!user) return;
    api.get("/complaints/me").then(({ data }) => setMyComplaints(data));
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    if (!orderId || !subject || !message) return;
    setSubmitting(true);
    try {
      const { data } = await api.post("/complaints", { order_id: orderId, subject, message });
      setMyComplaints((c) => [data, ...c]);
      setOrderId(""); setSubject(""); setMessage("");
      toast.success("Complaint raised. We'll get back to you soon.");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to submit complaint");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#FDFDFB]"><Navbar /></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FDFDFB]">
        <Navbar />
        <div className="max-w-lg mx-auto px-6 py-24 text-center">
          <MessageCircleWarning size={48} className="mx-auto text-[#D4A017]" />
          <h1 className="mt-6 font-heading text-3xl font-bold">Sign in to raise a complaint</h1>
          <button onClick={loginWithGoogle} className="mt-6 px-6 py-3 bg-[#111] text-white rounded-full font-semibold hover:bg-[#D4A017] hover:text-black">
            Sign in with Google
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFB]" data-testid="complaint-page">
      <Navbar />
      <div className="max-w-5xl mx-auto px-5 sm:px-6 md:px-10 py-8 md:py-14 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="rounded-3xl bg-white border border-black/5 p-6 sm:p-8">
          <div className="w-12 h-12 rounded-2xl bg-[#FDF6E3] flex items-center justify-center">
            <MessageCircleWarning size={22} className="text-[#D4A017]" />
          </div>
          <h1 className="mt-5 font-heading text-3xl font-bold">Raise a complaint</h1>
          <p className="mt-2 text-sm text-black/60">Please include your Order ID. We take every feedback seriously.</p>

          <form onSubmit={submit} className="mt-6 space-y-5">
            <div>
              <label className="text-xs uppercase tracking-widest font-bold text-black/60">Order ID</label>
              <input
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="CLG-XXXXXX-XXXXXX"
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#D4A017] text-sm font-mono"
                data-testid="complaint-order-id-input"
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-bold text-black/60">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Item missing from delivery"
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#D4A017] text-sm"
                data-testid="complaint-subject-input"
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-bold text-black/60">Feedback / details</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Tell us what happened..."
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#D4A017] text-sm resize-none"
                data-testid="complaint-message-input"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              data-testid="submit-complaint-btn"
              className="w-full py-3.5 bg-[#111] text-white rounded-full font-bold hover:bg-[#D4A017] hover:text-black transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              Submit complaint
            </button>
          </form>
        </div>

        <div>
          <h2 className="font-heading text-2xl font-bold">Your complaints</h2>
          {myComplaints.length === 0 ? (
            <p className="mt-4 text-black/50 text-sm">You haven't raised any complaints. Great news!</p>
          ) : (
            <ul className="mt-6 space-y-4" data-testid="my-complaints-list">
              {myComplaints.map((c) => (
                <li key={c.complaint_id} className="rounded-2xl bg-white border border-black/5 p-5" data-testid={`complaint-${c.complaint_id}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-black/50">{c.complaint_id}</span>
                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full ${c.status === "resolved" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{c.status}</span>
                  </div>
                  <p className="mt-2 font-semibold">{c.subject}</p>
                  <p className="text-xs text-black/50">Order: <span className="font-mono">{c.order_id}</span></p>
                  <p className="mt-3 text-sm text-black/70">{c.message}</p>
                  {c.admin_response && (
                    <div className="mt-3 rounded-xl bg-[#FDF6E3] border border-[#D4A017]/30 p-3">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-[#B88A14] flex items-center gap-1"><CheckCircle2 size={11} /> Clengo response</p>
                      <p className="mt-1 text-sm">{c.admin_response}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
