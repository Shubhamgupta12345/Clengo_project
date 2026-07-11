import Logo from "@/components/Logo";
import { Mail, MapPin } from "lucide-react";
import { useSettings } from "@/lib/hooks";

export default function Footer() {
  const settings = useSettings();
  const email = settings.contact_email || "clengo.in@gmail.com";
  return (
    <footer className="mt-24 bg-[#111111] text-white/80 relative overflow-hidden" data-testid="main-footer">
      <div className="absolute inset-0 grain-overlay opacity-40 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-5 sm:px-6 md:px-10 py-14 md:py-16 relative">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
          <div className="sm:col-span-2 md:col-span-2">
            <Logo size="lg" />
            <p className="mt-5 max-w-md text-white/60 leading-relaxed">
              Clengo is your neighbourhood laundry partner — premium wash, iron and dry-cleaning at your doorstep across Delhi NCR.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={`mailto:${email}`} data-testid="footer-email-link" className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-[#D4A017]/20 transition-colors text-sm">
                <Mail size={14} /> {email}
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
              <li><a href="/#about" className="hover:text-[#D4A017] transition-colors">About</a></li>
              <li><a href="/#areas" className="hover:text-[#D4A017] transition-colors">Serviceable Areas</a></li>
              <li><a href="/#offers" className="hover:text-[#D4A017] transition-colors">Offers</a></li>
              <li className="flex items-center gap-2"><MapPin size={13} /> Delhi · Noida · Gurgaon</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 md:mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 text-[10px] sm:text-xs text-white/40">
          <p>© {new Date().getFullYear()} {settings.company_name || "Clengo Laundry Pvt. Ltd."}. All rights reserved.</p>
          <p className="tracking-[0.3em] uppercase">Freshness delivered at doorstep</p>
        </div>
      </div>
    </footer>
  );
}
