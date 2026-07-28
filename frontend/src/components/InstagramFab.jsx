import { Instagram } from "lucide-react";

const INSTAGRAM_URL = "https://instagram.com/clengo";

export default function InstagramFab() {
  return (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="instagram-fab"
      title="Follow Clengo on Instagram"
      className="fixed bottom-[4.75rem] right-5 sm:bottom-24 sm:right-6 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white shadow-[0_10px_30px_rgb(221,42,123,0.4)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-200"
    >
      <Instagram size={22} />
    </a>
  );
}
