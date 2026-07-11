import Logo from "@/components/Logo";
import { Instagram, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-24 bg-[#111111] text-white/80 relative overflow-hidden" data-testid="main-footer">
      <div className="absolute inset-0 grain-overlay opacity-40 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-16 relative">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <Logo size="lg" />
            <p className="mt-5 max-w-md text-white/60 leading-relaxed">
              Clengo is your neighbourhood laundry partner — premium wash, iron and dry-cleaning at your doorstep across Delhi NCR.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="mailto:hello@clengo.in" className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-[#D4A017]/20 transition-colors text-sm">
                <Mail size={14} /> hello@clengo.in
              </a>
              <a href="tel:+919999999999" className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-[#D4A017]/20 transition-colors text-sm">
                <Phone size={14} /> +91 99999 99999
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-heading text-xs tracking-[0.24em] uppercase text-[#D4A017] mb-4">Services</h4>
            <ul className="space-y-3 text-sm">
              <li>Wash & Fold</li>
              <li>Steam Ironing</li>
              <li>Premium Dry Clean</li>
              <li>Household Linen</li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading text-xs tracking-[0.24em] uppercase text-[#D4A017] mb-4">Company</h4>
            <ul className="space-y-3 text-sm">
              <li>About</li>
              <li>Serviceable Areas</li>
              <li>Terms & Privacy</li>
              <li className="flex items-center gap-2"><MapPin size={13} /> Delhi · Noida · Gurgaon</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <p>© {new Date().getFullYear()} Clengo Laundry Pvt. Ltd. All rights reserved.</p>
          <p className="tracking-[0.3em] uppercase">Freshness delivered at doorstep</p>
        </div>
      </div>
    </footer>
  );
}
