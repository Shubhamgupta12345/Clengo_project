import { Sparkles } from "lucide-react";

export default function Logo({ size = "md", withTagline = false, className = "" }) {
  const dims = {
    sm: { text: "text-xl", spark: 14 },
    md: { text: "text-2xl", spark: 18 },
    lg: { text: "text-4xl", spark: 24 },
    xl: { text: "text-6xl md:text-7xl", spark: 40 },
  }[size];

  return (
    <div className={`inline-flex items-baseline gap-1 ${className}`} data-testid="clengo-logo">
      <span className={`font-heading font-extrabold text-[#D4A017] ${dims.text} tracking-tight leading-none`}>
        clengo
      </span>
      <Sparkles size={dims.spark} className="text-[#D4A017] animate-sparkle -translate-y-1" strokeWidth={2.4} />
      {withTagline && (
        <span className="hidden md:inline ml-3 text-[10px] tracking-[0.28em] uppercase text-black/60 font-semibold self-end pb-1">
          Freshness at doorstep
        </span>
      )}
    </div>
  );
}
