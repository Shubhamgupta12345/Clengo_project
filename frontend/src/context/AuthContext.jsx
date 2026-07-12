import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const { data } = await api.post("/auth/session", {
          access_token: tokenResponse.access_token,
        });
        setUser(data.user);
      } catch (e) {
        console.error("Login failed", e);
      }
    },
  });

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) { /* ignore */ }
    setUser(null);
    window.location.href = "/";
  };

  const refreshUser = checkAuth;

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, refreshUser, loginWithGoogle: login }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);