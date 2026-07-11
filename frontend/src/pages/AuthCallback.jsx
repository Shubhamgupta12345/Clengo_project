import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState(null);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = location.hash || window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const sessionId = params.get("session_id");
    if (!sessionId) {
      navigate("/", { replace: true });
      return;
    }

    (async () => {
      try {
        const { data } = await api.post("/auth/session", { session_id: sessionId });
        setUser(data.user);
        // Clean the hash
        window.history.replaceState(null, "", window.location.pathname);
        navigate("/order", { replace: true, state: { user: data.user } });
      } catch (e) {
        setError("Authentication failed. Please try again.");
        setTimeout(() => navigate("/", { replace: true }), 2500);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFDFB]" data-testid="auth-callback-loader">
      <div className="text-center">
        <Loader2 size={40} className="text-[#D4A017] animate-spin mx-auto" />
        <p className="mt-6 font-heading text-lg">{error || "Signing you in..."}</p>
      </div>
    </div>
  );
}
