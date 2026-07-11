import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { User, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { user, loading, refreshUser } = useAuth();
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setPhone(user.phone || "");
      setAddress(user.address || "");
      setPincode(user.pincode || "");
    }
  }, [user]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch("/users/me", { phone, address, pincode });
      await refreshUser();
      toast.success("Profile updated");
    } catch (err) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return <div className="min-h-screen bg-[#FDFDFB]"><Navbar /></div>;

  return (
    <div className="min-h-screen bg-[#FDFDFB]" data-testid="profile-page">
      <Navbar />
      <div className="max-w-2xl mx-auto px-5 sm:px-6 py-8 md:py-14">
        <div className="rounded-3xl bg-white border border-black/5 p-6 sm:p-8">
          <div className="flex items-center gap-4">
            {user.picture ? (
              <img src={user.picture} alt={user.name} className="w-16 h-16 rounded-full ring-2 ring-[#D4A017]/30" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#FDF6E3] flex items-center justify-center">
                <User size={26} className="text-[#D4A017]" />
              </div>
            )}
            <div>
              <h1 className="font-heading text-2xl font-bold">{user.name}</h1>
              <p className="text-sm text-black/50">{user.email}</p>
              {user.role === "admin" && <span className="mt-1 inline-block text-[10px] uppercase tracking-widest bg-[#D4A017] text-black px-2 py-0.5 rounded-full font-bold">Admin</span>}
            </div>
          </div>

          <form onSubmit={save} className="mt-8 space-y-5">
            <div>
              <label className="text-xs uppercase tracking-widest font-bold text-black/60">Phone number</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#D4A017] text-sm" data-testid="profile-phone-input" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-bold text-black/60">Default pincode</label>
              <input value={pincode} onChange={(e) => setPincode(e.target.value)} maxLength={6} className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#D4A017] text-sm" data-testid="profile-pincode-input" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-bold text-black/60">Address</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#D4A017] text-sm resize-none" data-testid="profile-address-input" />
            </div>
            <button type="submit" disabled={saving} data-testid="profile-save-btn" className="px-6 py-3 bg-[#111] text-white rounded-full font-semibold hover:bg-[#D4A017] hover:text-black transition-colors inline-flex items-center gap-2 disabled:opacity-60">
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save profile
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
