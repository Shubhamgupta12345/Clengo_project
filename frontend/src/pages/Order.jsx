import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PincodeChecker from "@/components/PincodeChecker";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Minus, Plus, ShoppingBag, MapPin, Calendar, Clock, Phone, ArrowRight, CheckCircle2, Sparkles, Droplets, Wind, Shirt, ChevronRight, Loader2, Tag } from "lucide-react";
import { useClengoWhatsApp, waLink, orderConfirmationText } from "@/lib/whatsapp";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { useOffers, useSettings, bestOfferFor } from "@/lib/hooks";

const SERVICES = [
  { key: "wash", label: "Wash & Fold", icon: Droplets, tag: "Everyday" },
  { key: "wash_iron", label: "Wash & Iron", icon: Shirt, tag: "Combo" },
  { key: "iron", label: "Steam Iron", icon: Wind, tag: "Crisp" },
  { key: "dryclean", label: "Dry Clean", icon: Sparkles, tag: "Premium" },
];

const SLOTS = [
  "08:00 AM - 10:00 AM",
  "10:00 AM - 12:00 PM",
  "12:00 PM - 02:00 PM",
  "04:00 PM - 06:00 PM",
  "06:00 PM - 08:00 PM",
];

export default function Order() {
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const clengoWa = useClengoWhatsApp();
  const offers = useOffers();
  const settings = useSettings();
  const minOrderValue = settings.min_order_value ?? 199;

  const [step, setStep] = useState(1); // 1: pincode, 2: service+items, 3: pickup, 4: confirm
  const [pincode, setPincode] = useState(user?.pincode || "");
  const [pincodeArea, setPincodeArea] = useState(null);
  const [service, setService] = useState("wash");
  const [catalog, setCatalog] = useState([]);
  const [cart, setCart] = useState({}); // key = `${itemId}__${service}` -> qty
  const [address, setAddress] = useState(user?.address || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupSlot, setPickupSlot] = useState(SLOTS[1]);
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);

  useEffect(() => {
    api.get("/catalog").then(({ data }) => setCatalog(data));
  }, []);

  useEffect(() => {
    if (user) {
      setPincode((p) => p || user.pincode || "");
      setAddress((a) => a || user.address || "");
      setPhone((ph) => ph || user.phone || "");
    }
  }, [user]);

  const cartLines = useMemo(() => {
    const lines = [];
    Object.entries(cart).forEach(([key, qty]) => {
      if (qty <= 0) return;
      const [itemId, svc] = key.split("__");
      const item = catalog.find((c) => c.item_id === itemId);
      if (!item) return;
      const unit = item.prices[svc] ?? 0;
      lines.push({
        item_id: itemId,
        item_name: item.name,
        service: svc,
        quantity: qty,
        unit_price: unit,
        subtotal: unit * qty,
      });
    });
    return lines;
  }, [cart, catalog]);

  const totalItems = cartLines.reduce((s, l) => s + l.quantity, 0);
  const subtotalAmount = cartLines.reduce((s, l) => s + l.subtotal, 0);
  const bestOffer = bestOfferFor(subtotalAmount, offers);
  const discount = bestOffer ? bestOffer.discount : 0;
  const totalAmount = Math.max(0, subtotalAmount - discount);
  const minShortfall = Math.max(0, minOrderValue - subtotalAmount);

  const cartKey = (itemId) => `${itemId}__${service}`;
  const qtyOf = (itemId) => cart[cartKey(itemId)] || 0;
  const setQty = (itemId, q) => setCart((c) => ({ ...c, [cartKey(itemId)]: Math.max(0, q) }));

  const canProceed = {
    2: !!(pincode && pincodeArea),
    3: totalItems > 0 && subtotalAmount >= minOrderValue,
    4: !!(address && phone && pickupDate && pickupSlot),
  };

  const placeOrder = async () => {
    if (!user) { loginWithGoogle(); return; }
    setPlacing(true);
    try {
      // Save profile fields if changed
      if (address !== user.address || phone !== user.phone || pincode !== user.pincode) {
        await api.patch("/users/me", { address, phone, pincode });
        await refreshUser();
      }
      const { data } = await api.post("/orders", {
        items: cartLines,
        pickup_address: address,
        pickup_pincode: pincode,
        pickup_date: pickupDate,
        pickup_slot: pickupSlot,
        contact_phone: phone,
        notes,
      });
      setPlacedOrder(data);
      toast.success("Order placed successfully!");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  // Order placed screen
  if (placedOrder) {
    return (
      <div className="min-h-screen bg-[#FDFDFB]" data-testid="order-confirmation-page">
        <Navbar />
        <div className="max-w-3xl mx-auto px-5 sm:px-6 md:px-10 py-10 md:py-16">
          <div className="rounded-3xl bg-white border border-black/5 shadow-[0_20px_60px_rgb(0,0,0,0.06)] p-6 sm:p-8 md:p-10 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 size={40} className="text-green-600" />
            </div>
            <h1 className="mt-5 md:mt-6 font-heading text-3xl sm:text-4xl font-bold">Order confirmed!</h1>
            <p className="mt-3 text-sm sm:text-base text-black/60">Freshness is on the way. Save your Order ID for tracking.</p>

            <div className="mt-6 md:mt-8 inline-block px-6 sm:px-8 py-4 sm:py-5 rounded-2xl bg-[#FDF6E3] border-2 border-dashed border-[#D4A017]">
              <p className="text-[10px] uppercase tracking-[0.24em] font-bold text-[#B88A14]">Your Order ID</p>
              <p className="mt-2 font-mono text-xl sm:text-2xl md:text-3xl font-bold text-black break-all" data-testid="placed-order-id">{placedOrder.order_id}</p>
            </div>

            <div className="mt-6 md:mt-8 grid grid-cols-2 gap-4 text-left text-sm max-w-lg mx-auto">
              <div><p className="text-black/50 text-xs uppercase tracking-wider">Total items</p><p className="mt-1 font-semibold">{placedOrder.total_items}</p></div>
              <div><p className="text-black/50 text-xs uppercase tracking-wider">Amount (COD)</p><p className="mt-1 font-semibold">₹{placedOrder.total_amount.toFixed(0)}</p></div>
              <div><p className="text-black/50 text-xs uppercase tracking-wider">Pickup date</p><p className="mt-1 font-semibold">{placedOrder.pickup_date}</p></div>
              <div><p className="text-black/50 text-xs uppercase tracking-wider">Slot</p><p className="mt-1 font-semibold text-sm">{placedOrder.pickup_slot}</p></div>
            </div>

            <div className="mt-8 md:mt-10 flex flex-col sm:flex-row justify-center gap-3">
              <a
                href={waLink(clengoWa, orderConfirmationText(placedOrder))}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="whatsapp-confirm-order-btn"
                className="px-6 py-3 bg-[#25D366] text-white rounded-full font-bold hover:bg-[#128C7E] transition-colors inline-flex items-center justify-center gap-2"
              >
                <WhatsAppIcon size={16} /> Confirm on WhatsApp
              </a>
              <button onClick={() => navigate("/my-orders")} data-testid="view-my-orders-btn" className="px-6 py-3 bg-[#111] text-white rounded-full font-semibold hover:bg-[#D4A017] hover:text-black transition-colors">
                Track my orders
              </button>
              <button onClick={() => { setPlacedOrder(null); setStep(1); setCart({}); }} data-testid="book-another-btn" className="px-6 py-3 bg-[#D4A017]/10 text-[#B88A14] rounded-full font-semibold hover:bg-[#D4A017] hover:text-black transition-colors">
                Book another
              </button>
            </div>
            <p className="mt-4 text-xs text-black/50">💡 Tap "Confirm on WhatsApp" to quickly share your order details with our team — you'll get faster updates!</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFB]" data-testid="order-page">
      <Navbar />
      <div className="max-w-6xl mx-auto px-5 sm:px-6 md:px-10 py-8 md:py-14">
        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">Book a pickup</h1>
        <p className="mt-3 text-sm sm:text-base text-black/60">Four quick steps. No payment now — pay cash on delivery.</p>

        {/* STEP DOTS */}
        <div className="mt-6 md:mt-8 flex items-center gap-1.5 sm:gap-2 flex-wrap" data-testid="step-indicator">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-1.5 sm:gap-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? "bg-[#D4A017] text-black" : "bg-black/5 text-black/40"}`}>{s}</div>
              <span className={`text-[10px] sm:text-xs uppercase tracking-wider font-semibold ${step >= s ? "text-black" : "text-black/40"}`}>
                {["Serviceability", "Items", "Pickup", "Confirm"][s - 1]}
              </span>
              {s < 4 && <ChevronRight size={14} className="text-black/20 mx-0.5 sm:mx-1" />}
            </div>
          ))}
        </div>

        {/* STEP 1: pincode */}
        {step === 1 && (
          <div className="mt-10 max-w-2xl" data-testid="step-1-pincode">
            <div className="rounded-3xl bg-white border border-black/5 p-5 sm:p-6 md:p-8 shadow-sm">
              <h2 className="font-heading text-xl sm:text-2xl font-semibold">Where should we pick up?</h2>
              <p className="mt-2 text-sm text-black/60">Enter your pincode to check if we service your area.</p>
              <div className="mt-6">
                <PincodeChecker
                  onServiceable={(pc, area) => { setPincode(pc); setPincodeArea(area); }}
                />
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!canProceed[2]}
                data-testid="step-1-next-btn"
                className="mt-6 px-6 py-3 bg-[#111] text-white rounded-full font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#D4A017] hover:text-black transition-colors inline-flex items-center gap-2"
              >
                Next: Choose items <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: items */}
        {step === 2 && (
          <div className="mt-10 grid lg:grid-cols-3 gap-6" data-testid="step-2-items">
            <div className="lg:col-span-2 space-y-6">
              {/* Service selector */}
              <div className="rounded-3xl bg-white border border-black/5 p-4 sm:p-6">
                <p className="text-xs uppercase tracking-[0.24em] font-bold text-black/50">Choose service</p>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {SERVICES.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setService(s.key)}
                      data-testid={`service-select-${s.key}`}
                      className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 text-left transition-colors duration-300 ${service === s.key ? "border-[#D4A017] bg-[#FDF6E3]" : "border-black/5 bg-[#F7F6F2] hover:border-[#D4A017]/40"}`}
                    >
                      <s.icon size={18} className={`sm:w-[22px] sm:h-[22px] ${service === s.key ? "text-[#D4A017]" : "text-black/40"}`} />
                      <p className="mt-2 sm:mt-3 text-xs sm:text-base font-semibold leading-tight">{s.label}</p>
                      <p className="hidden sm:block text-[10px] uppercase tracking-widest text-black/40 mt-0.5">{s.tag}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Catalog */}
              <div className="rounded-3xl bg-white border border-black/5 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.24em] font-bold text-black/50">Select items</p>
                  <p className="text-xs text-black/40">Tap + to add</p>
                </div>
                <div className="mt-4 divide-y divide-black/5">
                  {catalog.map((item) => {
                    const q = qtyOf(item.item_id);
                    const price = item.prices[service];
                    if (price == null || price === 0) return null;
                    return (
                      <div key={item.item_id} className="py-4 flex items-center justify-between gap-3" data-testid={`catalog-item-${item.item_id}`}>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-xs text-black/50 mt-0.5">₹{price} per piece · <span className="uppercase tracking-wider">{item.category}</span></p>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <button
                            onClick={() => setQty(item.item_id, q - 1)}
                            disabled={q === 0}
                            data-testid={`qty-minus-${item.item_id}`}
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-black/10 flex items-center justify-center hover:border-[#D4A017] hover:text-[#D4A017] disabled:opacity-30 transition-colors"
                          ><Minus size={14} /></button>
                          <span className="w-6 sm:w-8 text-center font-mono font-bold" data-testid={`qty-${item.item_id}`}>{q}</span>
                          <button
                            onClick={() => setQty(item.item_id, q + 1)}
                            data-testid={`qty-plus-${item.item_id}`}
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#D4A017] text-black flex items-center justify-center hover:bg-[#B88A14] active:scale-95 transition-transform"
                          ><Plus size={14} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Cart Summary */}
            <div className="lg:col-span-1">
              <div className="rounded-3xl bg-[#111] text-white p-6 sticky top-24" data-testid="cart-summary">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={18} className="text-[#D4A017]" />
                  <p className="font-heading font-semibold">Your bag</p>
                </div>
                {cartLines.length === 0 ? (
                  <p className="mt-6 text-sm text-white/50">No items yet. Start adding from the list.</p>
                ) : (
                  <ul className="mt-6 space-y-3 max-h-80 overflow-y-auto pr-1">
                    {cartLines.map((l) => (
                      <li key={`${l.item_id}__${l.service}`} className="flex items-center justify-between text-sm">
                        <span>
                          <span className="font-medium">{l.item_name}</span>
                          <span className="text-white/40"> × {l.quantity}</span>
                          <span className="text-[10px] ml-1 uppercase tracking-wider text-[#D4A017]">{l.service}</span>
                        </span>
                        <span className="font-mono">₹{l.subtotal}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-6 pt-5 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Subtotal ({totalItems} items)</span>
                    <span className="font-mono">₹{subtotalAmount.toFixed(0)}</span>
                  </div>
                  {bestOffer && (
                    <div className="flex items-center justify-between text-xs text-[#D4A017] font-semibold" data-testid="cart-discount">
                      <span className="inline-flex items-center gap-1"><Tag size={11} /> Offer applied</span>
                      <span className="font-mono">− ₹{discount.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-xs uppercase tracking-widest text-white/50">You pay</span>
                    <span className="font-heading text-2xl font-bold" data-testid="cart-total">₹{totalAmount.toFixed(0)}</span>
                  </div>
                  {minShortfall > 0 && (
                    <p className="text-[11px] text-amber-400 mt-2" data-testid="min-order-warning">
                      Add ₹{minShortfall.toFixed(0)} more to reach the ₹{minOrderValue} minimum order.
                    </p>
                  )}
                  {!bestOffer && subtotalAmount > 0 && offers.filter(o => o.active).length > 0 && (
                    <p className="text-[11px] text-white/50 mt-2" data-testid="next-offer-hint">
                      💡 {nextOfferHint(subtotalAmount, offers)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setStep(3)}
                  disabled={totalItems === 0 || subtotalAmount < minOrderValue}
                  data-testid="step-2-next-btn"
                  className="mt-6 w-full py-3.5 bg-[#D4A017] text-black rounded-full font-bold hover:bg-white transition-colors disabled:opacity-40"
                >
                  Continue to pickup
                </button>
                <button onClick={() => setStep(1)} className="mt-3 w-full text-xs text-white/50 hover:text-white">← Back</button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: pickup */}
        {step === 3 && (
          <div className="mt-10 grid lg:grid-cols-3 gap-6" data-testid="step-3-pickup">
            <div className="lg:col-span-2 rounded-3xl bg-white border border-black/5 p-8">
              <h2 className="font-heading text-2xl font-semibold">Pickup details</h2>

              {!user && (
                <div className="mt-4 rounded-2xl bg-[#FDF6E3] border border-[#D4A017]/30 p-4 text-sm">
                  Please sign in to save this order to your account.
                  <button onClick={loginWithGoogle} className="ml-2 underline font-semibold text-[#B88A14]" data-testid="signin-cta-checkout">Sign in with Google →</button>
                </div>
              )}

              <div className="mt-6 grid md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs uppercase tracking-widest font-bold text-black/60">Contact phone</label>
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-black/10 px-4 py-3 focus-within:border-[#D4A017]">
                    <Phone size={16} className="text-black/40" />
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9XXXXXXXXX" className="flex-1 bg-transparent outline-none text-sm" data-testid="input-phone" />
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest font-bold text-black/60">Pincode</label>
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-black/10 px-4 py-3">
                    <MapPin size={16} className="text-black/40" />
                    <input value={pincode} readOnly className="flex-1 bg-transparent outline-none text-sm" data-testid="input-pincode-readonly" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs uppercase tracking-widest font-bold text-black/60">Full address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    placeholder="Flat / House no., Building, Street, Landmark"
                    className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#D4A017] text-sm resize-none"
                    data-testid="input-address"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest font-bold text-black/60">Pickup date</label>
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-black/10 px-4 py-3">
                    <Calendar size={16} className="text-black/40" />
                    <input
                      type="date"
                      value={pickupDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="flex-1 bg-transparent outline-none text-sm"
                      data-testid="input-pickup-date"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest font-bold text-black/60">Pickup slot</label>
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-black/10 px-4 py-3">
                    <Clock size={16} className="text-black/40" />
                    <select value={pickupSlot} onChange={(e) => setPickupSlot(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" data-testid="input-pickup-slot">
                      {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs uppercase tracking-widest font-bold text-black/60">Notes (optional)</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any special instructions?" className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#D4A017] text-sm resize-none" data-testid="input-notes" />
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button onClick={() => setStep(2)} className="text-sm text-black/50 hover:text-black">← Back</button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!canProceed[4]}
                  data-testid="step-3-next-btn"
                  className="px-6 py-3 bg-[#111] text-white rounded-full font-semibold disabled:opacity-40 hover:bg-[#D4A017] hover:text-black transition-colors inline-flex items-center gap-2"
                >
                  Review order <ArrowRight size={16} />
                </button>
              </div>
            </div>

            <MiniCart lines={cartLines} totalItems={totalItems} subtotalAmount={subtotalAmount} discount={discount} totalAmount={totalAmount} bestOffer={bestOffer} />
          </div>
        )}

        {/* STEP 4: confirm */}
        {step === 4 && (
          <div className="mt-10 grid lg:grid-cols-3 gap-6" data-testid="step-4-confirm">
            <div className="lg:col-span-2 rounded-3xl bg-white border border-black/5 p-8">
              <h2 className="font-heading text-2xl font-semibold">Review & confirm</h2>
              <div className="mt-6 space-y-5 text-sm">
                <SummaryRow label="Pickup at" value={`${address}, Pincode ${pincode}`} />
                <SummaryRow label="Contact" value={phone} />
                <SummaryRow label="Date & Slot" value={`${pickupDate} · ${pickupSlot}`} />
                {notes && <SummaryRow label="Notes" value={notes} />}
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold text-black/50">Items</p>
                  <ul className="mt-2 divide-y divide-black/5 border border-black/5 rounded-2xl">
                    {cartLines.map((l) => (
                      <li key={`${l.item_id}__${l.service}`} className="flex items-center justify-between px-4 py-3">
                        <span>{l.item_name} × {l.quantity} <span className="text-[10px] ml-1 uppercase tracking-wider text-[#D4A017]">{l.service}</span></span>
                        <span className="font-mono">₹{l.subtotal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-4 flex items-center justify-between border-t border-black/10">
                  <span className="font-heading text-lg font-semibold">Subtotal</span>
                  <span className="font-mono">₹{subtotalAmount.toFixed(0)}</span>
                </div>
                {bestOffer && (
                  <div className="flex items-center justify-between text-[#B88A14]" data-testid="review-discount">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold"><Tag size={13} /> Offer discount</span>
                    <span className="font-mono font-semibold">− ₹{discount.toFixed(0)}</span>
                  </div>
                )}
                <div className="pt-3 flex items-center justify-between border-t border-black/10">
                  <span className="font-heading text-lg font-semibold">Total (COD)</span>
                  <span className="font-heading text-3xl font-bold text-[#D4A017]" data-testid="final-total">₹{totalAmount.toFixed(0)}</span>
                </div>
                <p className="text-xs text-black/40">No online payment. Pay cash to our delivery agent when your fresh clothes reach you.</p>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button onClick={() => setStep(3)} className="text-sm text-black/50 hover:text-black">← Back</button>
                <button
                  onClick={placeOrder}
                  disabled={placing || !user}
                  data-testid="place-order-btn"
                  className="px-8 py-3.5 bg-[#D4A017] text-black rounded-full font-bold hover:bg-black hover:text-white transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {placing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  {user ? "Place order (COD)" : "Sign in to place order"}
                </button>
              </div>
            </div>

            <MiniCart lines={cartLines} totalItems={totalItems} subtotalAmount={subtotalAmount} discount={discount} totalAmount={totalAmount} bestOffer={bestOffer} />
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

function nextOfferHint(subtotal, offers) {
  const upcoming = offers.filter(o => o.active && subtotal < o.threshold).sort((a, b) => a.threshold - b.threshold)[0];
  if (!upcoming) return null;
  const need = upcoming.threshold - subtotal;
  return `Add ₹${need.toFixed(0)} more to unlock ₹${upcoming.discount} off!`;
}

function SummaryRow({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest font-bold text-black/50">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function MiniCart({ lines, totalItems, subtotalAmount, discount, totalAmount, bestOffer }) {
  return (
    <div className="lg:col-span-1">
      <div className="rounded-3xl bg-[#F7F6F2] border border-black/5 p-6 sticky top-24">
        <p className="text-xs uppercase tracking-[0.24em] font-bold text-black/50">Order summary</p>
        <ul className="mt-4 space-y-2 text-sm max-h-64 overflow-y-auto">
          {lines.map((l) => (
            <li key={`${l.item_id}__${l.service}`} className="flex items-center justify-between">
              <span>{l.item_name} × {l.quantity}</span>
              <span className="font-mono text-black/60">₹{l.subtotal}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 pt-4 border-t border-black/10 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-black/50">Subtotal ({totalItems})</span>
            <span className="font-mono">₹{subtotalAmount.toFixed(0)}</span>
          </div>
          {bestOffer && (
            <div className="flex items-center justify-between text-xs text-[#B88A14] font-semibold">
              <span className="inline-flex items-center gap-1"><Tag size={11} /> Offer</span>
              <span className="font-mono">− ₹{discount.toFixed(0)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-black/10">
            <span className="text-sm font-semibold">You pay</span>
            <span className="font-heading text-xl font-bold">₹{totalAmount.toFixed(0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
