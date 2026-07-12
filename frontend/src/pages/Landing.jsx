import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PincodeChecker from "@/components/PincodeChecker";
import Logo from "@/components/Logo";
import { Sparkles, Shirt, Wind, Droplets, Truck, Clock, Shield, Star, ArrowRight, CheckCircle2, Tag, Info, MapPin } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSettings, useOffers, usePincodes } from "@/lib/hooks";

const services = [
  {
    key: "wash",
    title: "Wash & Fold",
    price: "from ₹20/pc",
    desc: "Everyday freshness — machine wash, gentle dry, neatly folded, delivered in 48hrs.",
    icon: Droplets,
    img: "https://images.unsplash.com/photo-1567857171318-944337972f90?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NjZ8MHwxfHNlYXJjaHwxfHx3YXNoaW5nJTIwbWFjaGluZSUyMHdhdGVyJTIwYnViYmxlcyUyMGNsZWFufGVufDB8fHx8MTc4MzE2MTA4Mnww&ixlib=rb-4.1.0&q=85",
  },
  {
    key: "iron",
    title: "Steam Iron",
    price: "from ₹10/pc",
    desc: "Crease-free crispness. Professional steam pressing for shirts, sarees and everything in between.",
    icon: Wind,
    img: "https://images.unsplash.com/photo-1633680889715-2c9752bf0840",
  },
  {
    key: "dryclean",
    title: "Premium Dry Clean",
    price: "from ₹90/pc",
    desc: "Delicate care for suits, sarees, sherwanis and heirloom fabrics. Solvent-based, sun-fresh.",
    icon: Sparkles,
    img: "https://images.unsplash.com/photo-1699797467199-6bdf301649e8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NDh8MHwxfHNlYXJjaHwyfHxjbGVhbiUyMGZvbGRlZCUyMGNsb3RoZXMlMjBzdW5saWdodHxlbnwwfHx8fDE3ODM3NzczNDl8MA&ixlib=rb-4.1.0&q=85",
  },
];

const steps = [
  { n: "01", title: "Check pincode & Book", desc: "Enter your area, choose items and pickup slot in under 2 minutes." },
  { n: "02", title: "We pick up", desc: "Our courier arrives at your door — you hand over the bundle, we handle everything else." },
  { n: "03", title: "Cleaned to perfection", desc: "Sorted, cleaned, ironed and packaged with love by our partner laundry houses." },
  { n: "04", title: "Doorstep delivery", desc: "Fresh clothes reach you in 48-72 hours. Pay cash on delivery. Simple." },
];

const promises = [
  { icon: Truck, label: "Free pickup & drop" },
  { icon: Clock, label: "48 hr turnaround" },
  { icon: Shield, label: "Damage protection" },
  { icon: Star, label: "4.8 ★ rated service" },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const settings = useSettings();
  const offers = useOffers();
  const pincodes = usePincodes();

  const activeOffers = offers.filter(o => o.active).sort((a, b) => a.threshold - b.threshold);

  return (
    <div className="min-h-screen bg-[#FDFDFB]" data-testid="landing-page">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#D4A017]/10 blur-3xl pointer-events-none" />
        <div className="absolute top-40 -left-32 w-[400px] h-[400px] rounded-full bg-[#FDF6E3] blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-5 sm:px-6 md:px-10 pt-10 md:pt-24 pb-14 md:pb-20 grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 items-center relative">
          <div className="md:col-span-7 animate-fade-up min-w-0">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-[#D4A017]/10 border border-[#D4A017]/20 max-w-full">
              <span className="w-2 h-2 rounded-full bg-[#D4A017] animate-pulse shrink-0" />
              <span className="text-[10px] sm:text-xs tracking-[0.18em] sm:tracking-[0.2em] uppercase font-bold text-[#B88A14] truncate">Serving Delhi · Noida · Gurgaon</span>
            </div>

            <h1 className="mt-5 md:mt-6 font-heading font-extrabold text-[2.6rem] leading-[1.05] sm:text-5xl md:text-7xl tracking-tight md:leading-[1.02]">
              Laundry, but make it <span className="text-[#D4A017] text-shadow-gold">effortless.</span>
            </h1>

            <p className="mt-5 md:mt-6 max-w-xl text-base md:text-lg text-black/60 leading-relaxed">
              Wash, iron & premium dry clean — picked up from your door, delivered fresh in 48 hours.
              Cash on delivery, unique order tracking, and a real human on call when you need us.
            </p>

            <div className="mt-8 md:mt-10 max-w-lg">
              <p className="text-[10px] sm:text-xs tracking-[0.24em] uppercase font-bold text-black/50 mb-3">Check serviceability</p>
              <PincodeChecker onServiceable={() => {}} />
            </div>

            <div className="mt-8 md:mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {promises.map((p) => (
                <div key={p.label} className="flex items-center gap-2.5 text-xs sm:text-sm text-black/70">
                  <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-black/5 flex items-center justify-center shrink-0">
                    <p.icon size={16} className="text-[#D4A017]" />
                  </div>
                  <span className="font-medium">{p.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-5 relative animate-fade-up min-w-0" style={{animationDelay: '0.15s', animationFillMode: 'both'}}>
            <div className="relative rounded-[2.5rem] overflow-hidden aspect-[4/5] shadow-[0_30px_80px_rgb(0,0,0,0.12)] border border-black/5">
              <img
                src="https://images.unsplash.com/photo-1709477542164-ae852db0d019?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHwyfHxoYXBweSUyMHBlcnNvbiUyMGRvaW5nJTIwbGF1bmRyeXxlbnwwfHx8fDE3ODI3MjczNzd8MA&ixlib=rb-4.1.0&q=85"
                alt="Happy person doing laundry"
                className="w-full h-full object-cover"
              />
              {/* Floating badge - rating */}
              <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 shadow-lg border border-black/5 animate-float">
                <div className="flex items-center gap-2">
                  <div className="flex text-[#D4A017]">
                    {[...Array(5)].map((_, i) => (<Star key={i} size={14} fill="#D4A017" />))}
                  </div>
                  <span className="text-sm font-bold">4.8</span>
                </div>
                <p className="text-[10px] uppercase tracking-wider text-black/50 mt-0.5">12,400+ reviews</p>
              </div>
              {/* Floating badge - price */}
              <div className="absolute bottom-8 right-6 bg-[#111] text-white rounded-2xl px-4 py-3 shadow-xl animate-float-slow">
                <p className="text-[10px] uppercase tracking-wider text-[#D4A017]">Starts at</p>
                <p className="font-heading text-2xl font-bold leading-none mt-1">₹20<span className="text-xs font-normal text-white/60">/piece</span></p>
              </div>
              {/* Bubble */}
              <div className="absolute -top-3 -right-3 w-24 h-24 rounded-full bg-[#D4A017]/20 backdrop-blur-md border border-[#D4A017]/30 animate-float" />
            </div>
          </div>
        </div>
      </section>

      {/* OFFERS STRIP */}
      {activeOffers.length > 0 && (
        <section className="bg-[#111] text-white py-3 md:py-4 overflow-hidden border-y border-white/5" data-testid="offers-strip">
          <div className="flex whitespace-nowrap animate-marquee">
            {[...activeOffers, ...activeOffers, ...activeOffers].map((o, i) => (
              <span key={i} className="inline-flex items-center gap-2 px-5 sm:px-8 text-xs sm:text-sm">
                <Tag size={14} className="text-[#D4A017] shrink-0" />
                <span className="text-white/90">{o.label || `Save ₹${o.discount} on orders above ₹${o.threshold}`}</span>
                <span className="text-[#D4A017] mx-4">✦</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* SERVICES */}
      <section className="max-w-7xl mx-auto px-5 sm:px-6 md:px-10 py-14 md:py-20" data-testid="services-section">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 md:mb-12">
          <div>
            <p className="text-[10px] sm:text-xs tracking-[0.24em] uppercase font-bold text-[#D4A017]">What we do</p>
            <h2 className="mt-3 font-heading text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight max-w-2xl">
              Three services. Zero compromises.
            </h2>
          </div>
          <p className="text-sm sm:text-base text-black/60 max-w-md">
            From the shirt you wear every day to the saree passed down for generations — we treat every fabric with the care it deserves.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
          {services.map((s, i) => (
            <div
              key={s.key}
              data-testid={`service-card-${s.key}`}
              className="group relative rounded-3xl bg-[#F7F6F2] border border-black/5 overflow-hidden hover:-translate-y-1 hover:border-[#D4A017]/40 transition-[transform,border-color,box-shadow] duration-300 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)]"
              style={{animationDelay: `${i * 0.1}s`}}
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img src={s.img} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute top-4 left-4 w-11 h-11 rounded-2xl bg-white/95 backdrop-blur-md flex items-center justify-center shadow-md">
                  <s.icon size={20} className="text-[#D4A017]" />
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="font-heading text-2xl font-semibold">{s.title}</h3>
                  <span className="text-xs font-mono text-[#D4A017] font-bold">{s.price}</span>
                </div>
                <p className="text-sm text-black/60 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-[#111] text-white py-14 md:py-20 relative overflow-hidden" data-testid="how-it-works-section">
        <div className="absolute inset-0 grain-overlay opacity-40 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-5 sm:px-6 md:px-10 relative">
          <div className="max-w-2xl">
            <p className="text-[10px] sm:text-xs tracking-[0.24em] uppercase font-bold text-[#D4A017]">How it works</p>
            <h2 className="mt-3 font-heading text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
              Four steps. From dirty to divine.
            </h2>
          </div>

          <div className="mt-10 md:mt-14 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={step.n} className="relative">
                <div className="font-mono text-xs text-[#D4A017] tracking-widest">{step.n}</div>
                <h3 className="mt-3 font-heading text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm text-white/60 leading-relaxed">{step.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-2 right-0 w-6 h-px bg-white/20" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 md:mt-16 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <button
              onClick={() => user ? navigate("/order") : loginWithGoogle()}
              data-testid="cta-book-now"
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-[#D4A017] text-black font-bold rounded-full hover:bg-white transition-colors duration-300 active:scale-95 inline-flex items-center justify-center gap-2"
            >
              Book your first order <ArrowRight size={18} />
            </button>
            <p className="text-xs sm:text-sm text-white/50">No prepayment. COD only. Pay when delivered.</p>
          </div>
        </div>
      </section>

      {/* WHY CLENGO - bento */}
      <section className="max-w-7xl mx-auto px-5 sm:px-6 md:px-10 py-14 md:py-20" data-testid="why-clengo-section">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-5">
          <div className="md:col-span-4 rounded-3xl bg-gradient-to-br from-[#FDF6E3] to-[#F7F6F2] p-7 sm:p-8 md:p-10 border border-black/5">
            <p className="text-[10px] sm:text-xs tracking-[0.24em] uppercase font-bold text-[#D4A017]">Why Clengo</p>
            <h3 className="mt-3 font-heading text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-tight max-w-lg">
              We connect you with the best <em className="not-italic text-[#D4A017]">neighbourhood laundry houses</em> — vetted, trained, trusted.
            </h3>
            <div className="mt-6 md:mt-8 grid grid-cols-2 gap-3 sm:gap-4 max-w-xl">
              {["Unique order ID", "Real-time status", "Damage protection", "Human support"].map(v => (
                <div key={v} className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-[#D4A017] shrink-0" />
                  <span className="text-xs sm:text-sm font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 rounded-3xl bg-[#111] text-white p-7 sm:p-8 md:p-10 relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-[#D4A017]/30 blur-3xl" />
            <p className="text-[10px] sm:text-xs tracking-[0.24em] uppercase font-bold text-[#D4A017] relative">By the numbers</p>
            <div className="mt-5 md:mt-6 space-y-5 md:space-y-6 relative">
              <div>
                <p className="font-heading text-4xl sm:text-5xl font-bold">12,400+</p>
                <p className="text-[10px] sm:text-xs uppercase tracking-wider text-white/50 mt-1">Happy customers</p>
              </div>
              <div>
                <p className="font-heading text-4xl sm:text-5xl font-bold">48<span className="text-lg text-white/50">hrs</span></p>
                <p className="text-[10px] sm:text-xs uppercase tracking-wider text-white/50 mt-1">Average turnaround</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OFFERS CARDS */}
      {activeOffers.length > 0 && (
        <section id="offers" className="max-w-7xl mx-auto px-5 sm:px-6 md:px-10 py-14 md:py-20" data-testid="offers-section">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8 md:mb-12">
            <div>
              <p className="text-[10px] sm:text-xs tracking-[0.24em] uppercase font-bold text-[#D4A017]">Limited time</p>
              <h2 className="mt-3 font-heading text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
                Save more on every basket.
              </h2>
            </div>
            <p className="text-sm sm:text-base text-black/60 max-w-md">
              Automatic discounts — no coupons, no codes. The best offer for your cart is applied at checkout.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            {activeOffers.map((o, i) => (
              <div
                key={o.offer_id || i}
                data-testid={`offer-card-${o.threshold}`}
                className="group relative rounded-3xl bg-gradient-to-br from-[#FDF6E3] to-white p-5 md:p-7 border-2 border-dashed border-[#D4A017]/40 hover:border-[#D4A017] hover:-translate-y-1 transition-[transform,border-color] duration-300"
              >
                <div className="absolute -top-3 left-5 bg-[#D4A017] text-black text-[10px] tracking-widest uppercase font-bold px-3 py-1 rounded-full">
                  Deal {i + 1}
                </div>
                <p className="font-heading text-3xl md:text-5xl font-extrabold text-[#B88A14] mt-3">
                  ₹{o.discount}
                </p>
                <p className="mt-1 text-[10px] sm:text-xs uppercase tracking-widest text-black/50 font-bold">off</p>
                <p className="mt-4 text-xs sm:text-sm text-black/70">
                  On orders above <span className="font-bold">₹{o.threshold}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ABOUT & SERVICEABLE AREAS */}
      <section id="about" className="max-w-7xl mx-auto px-5 sm:px-6 md:px-10 py-14 md:py-20 grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-10" data-testid="about-section">
        <div className="lg:col-span-3 rounded-3xl bg-[#F7F6F2] border border-black/5 p-6 sm:p-8 md:p-10">
          <div className="inline-flex items-center gap-2 text-[#D4A017]">
            <Info size={16} />
            <p className="text-[10px] sm:text-xs tracking-[0.24em] uppercase font-bold">About Clengo</p>
          </div>
          <h2 className="mt-4 font-heading text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-tight max-w-2xl">
            {settings.company_name || "Clengo Laundry Pvt. Ltd."}
          </h2>
          <p className="mt-5 md:mt-6 text-sm sm:text-base text-black/70 leading-relaxed whitespace-pre-line">
            {settings.company_about || "Loading..."}
          </p>
          <div className="mt-6 md:mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {[
              { k: "Founded", v: "2026" },
              { k: "HQ", v: "Delhi NCR" },
              { k: "Turnaround", v: "48 hrs" },
              { k: "Payment", v: "COD" },
            ].map(kv => (
              <div key={kv.k} className="rounded-2xl bg-white border border-black/5 p-3 md:p-4">
                <p className="text-[10px] uppercase tracking-widest text-black/40 font-bold">{kv.k}</p>
                <p className="mt-1 font-heading text-sm sm:text-lg font-bold">{kv.v}</p>
              </div>
            ))}
          </div>
        </div>
        <div id="areas" className="lg:col-span-2 rounded-3xl bg-[#111] text-white p-6 sm:p-8 md:p-10 relative overflow-hidden" data-testid="areas-section">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#D4A017]/25 blur-3xl" />
          <div className="inline-flex items-center gap-2 text-[#D4A017] relative">
            <MapPin size={16} />
            <p className="text-[10px] sm:text-xs tracking-[0.24em] uppercase font-bold">Serviceable areas</p>
          </div>
          <h3 className="mt-4 font-heading text-2xl sm:text-3xl font-semibold tracking-tight relative">
            We're picking up in <span className="text-[#D4A017]">{pincodes.length}</span> pincodes
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-white/50 relative">
            Delhi · Noida · Gurgaon (and expanding weekly)
          </p>
          <div className="mt-5 md:mt-6 max-h-72 overflow-y-auto pr-2 relative">
            <ul className="space-y-2 text-xs sm:text-sm">
              {pincodes.map(p => (
                <li key={p.pincode} className="flex items-center justify-between border-b border-white/5 pb-2" data-testid={`area-row-${p.pincode}`}>
                  <span>
                    <span className="font-medium">{p.area}</span>
                    <span className="text-white/40 ml-2">· {p.city}</span>
                  </span>
                  <span className="font-mono text-[#D4A017]">{p.pincode}</span>
                </li>
              ))}
              {pincodes.length === 0 && <li className="text-white/40 text-xs">Loading areas...</li>}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-5 sm:px-6 md:px-10 pb-14 md:pb-20">
        <div className="rounded-[2rem] md:rounded-[2.5rem] bg-[#D4A017] p-8 sm:p-10 md:p-16 relative overflow-hidden grain-overlay">
          <div className="grid md:grid-cols-2 gap-8 items-center relative">
            <div>
              <Logo size="lg" />
              <h3 className="mt-6 font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight text-black">
                Freshness delivered<br/>at doorstep.
              </h3>
              <p className="mt-4 text-sm sm:text-base text-black/70 max-w-md">Ready to say goodbye to laundry day? Sign in and book your first pickup.</p>
            </div>
            <div className="flex md:justify-end">
              <button
                onClick={() => user ? navigate("/order") : loginWithGoogle()}
                data-testid="cta-final-book"
                className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-black text-white font-bold rounded-full hover:bg-white hover:text-black transition-colors duration-300 active:scale-95 inline-flex items-center justify-center gap-3 text-base sm:text-lg"
              >
                {user ? "Book a pickup" : "Sign in with Google"} <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
