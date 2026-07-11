import { useClengoWhatsApp, waLink, supportText } from "@/lib/whatsapp";
import { MessageCircle } from "lucide-react";

export default function WhatsAppFab() {
  const number = useClengoWhatsApp();
  return (
    <a
      href={waLink(number, supportText())}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="whatsapp-fab"
      title="Chat with Clengo on WhatsApp"
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_rgb(37,211,102,0.4)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-200"
    >
      <MessageCircle size={26} strokeWidth={2.2} fill="currentColor" fillOpacity={0.15} />
      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#25D366] animate-ping" />
    </a>
  );
}
