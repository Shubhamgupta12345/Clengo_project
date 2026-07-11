import { useState } from "react";
import api from "@/lib/api";
import { MapPin, Search, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PincodeChecker({ onServiceable, compact = false }) {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState(null); // null | { serviceable, area }
  const [loading, setLoading] = useState(false);

  const check = async (e) => {
    e?.preventDefault();
    if (!/^\d{6}$/.test(pincode)) {
      setResult({ error: "Please enter a valid 6-digit pincode" });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get(`/pincodes/check/${pincode}`);
      setResult(data);
      if (data.serviceable && onServiceable) onServiceable(pincode, data.area);
    } catch (err) {
      setResult({ error: "Unable to check right now" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={compact ? "" : "w-full"} data-testid="pincode-checker">
      <form onSubmit={check} className={`flex items-stretch bg-white ${compact ? "rounded-full" : "rounded-full"} shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-black/5 overflow-hidden w-full`}>
        <div className="pl-4 sm:pl-5 pr-1 sm:pr-2 flex items-center text-[#D4A017] shrink-0">
          <MapPin size={compact ? 18 : 20} />
        </div>
        <input
          type="text"
          maxLength={6}
          inputMode="numeric"
          value={pincode}
          onChange={(e) => { setPincode(e.target.value.replace(/\D/g, "")); setResult(null); }}
          placeholder="Enter 6-digit pincode"
          className={`flex-1 min-w-0 ${compact ? "py-3 text-sm" : "py-4 md:py-5 text-sm md:text-base"} px-2 sm:px-3 outline-none bg-transparent placeholder:text-black/30`}
          data-testid="pincode-input"
        />
        <button
          type="submit"
          disabled={loading}
          data-testid="pincode-check-btn"
          className={`m-1.5 ${compact ? "px-4 sm:px-5 py-2.5 text-sm" : "px-4 sm:px-7 py-3 sm:py-3.5 text-sm"} bg-[#D4A017] text-black font-bold rounded-full hover:bg-[#B88A14] transition-colors duration-300 active:scale-95 disabled:opacity-70 flex items-center gap-1.5 sm:gap-2 shrink-0`}
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
          Check
        </button>
      </form>
      {result && (
        <div
          data-testid="pincode-result"
          className={`mt-4 flex items-start gap-3 px-5 py-3 rounded-2xl border ${
            result.serviceable
              ? "bg-green-50 border-green-200 text-green-800"
              : result.error
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          {result.serviceable ? <CheckCircle2 size={20} className="mt-0.5" /> : <XCircle size={20} className="mt-0.5" />}
          <div className="text-sm">
            {result.error ? (
              <p className="font-semibold">{result.error}</p>
            ) : result.serviceable ? (
              <>
                <p className="font-bold">Yay! We service {result.area?.area}, {result.area?.city}</p>
                <p className="text-green-700/80 mt-0.5">Freshness will be delivered to your doorstep.</p>
              </>
            ) : (
              <>
                <p className="font-bold">Sorry, we don't service this pincode yet.</p>
                <p className="mt-0.5">We're expanding rapidly. Try a nearby Delhi/NCR pincode!</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
