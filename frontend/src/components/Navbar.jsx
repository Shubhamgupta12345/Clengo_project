import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

import Logo from "@/components/Logo";
import { User, ShoppingBag, LogOut, LayoutDashboard, MessageCircleWarning, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, logout, loginWithGoogle } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-black/5"
      data-testid="main-navbar"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-6 md:px-10 h-16 md:h-20 flex items-center justify-between">
        <Link to="/" data-testid="nav-home-link" className="flex items-center gap-3">
          <Logo size="md" withTagline />
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-black/70">
          <Link to="/" data-testid="nav-link-home" className="hover:text-[#D4A017] transition-colors duration-200">Home</Link>
          <Link to="/order" data-testid="nav-link-order" className="hover:text-[#D4A017] transition-colors duration-200">Book Now</Link>
          {user && (
            <>
              <Link to="/my-orders" data-testid="nav-link-my-orders" className="hover:text-[#D4A017] transition-colors duration-200">My Orders</Link>
              <Link to="/complaint" data-testid="nav-link-complaint" className="hover:text-[#D4A017] transition-colors duration-200">Complaint</Link>
            </>
          )}
          {user?.role === "admin" && (
            <Link to="/admin" data-testid="nav-link-admin" className="hover:text-[#D4A017] transition-colors duration-200">Admin</Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => navigate("/profile")}
                data-testid="nav-profile-btn"
                className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-black/5 transition-colors duration-200"
              >
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-[#D4A017]/40" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#D4A017]/15 flex items-center justify-center">
                    <User size={16} className="text-[#D4A017]" />
                  </div>
                )}
                <span className="text-sm font-medium">{user.name?.split(" ")[0]}</span>
              </button>
              <button
                onClick={logout}
                data-testid="nav-logout-btn"
                className="p-2 rounded-full hover:bg-black/5 transition-colors duration-200"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={loginWithGoogle}
              data-testid="nav-login-btn"
              className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 bg-[#111111] text-white rounded-full text-sm font-semibold hover:bg-[#D4A017] hover:text-black transition-colors duration-300 active:scale-95"
            >
              Sign in
            </button>
          )}

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-full hover:bg-black/5"
            data-testid="nav-mobile-toggle"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-black/5 bg-white/95 backdrop-blur-xl">
          <div className="px-6 py-4 flex flex-col gap-3">
            <Link to="/" onClick={() => setOpen(false)} className="py-2" data-testid="mobile-nav-home">Home</Link>
            <Link to="/order" onClick={() => setOpen(false)} className="py-2" data-testid="mobile-nav-order">Book Now</Link>
            {user && (
              <>
                <Link to="/my-orders" onClick={() => setOpen(false)} className="py-2" data-testid="mobile-nav-my-orders">
                  <ShoppingBag size={16} className="inline mr-2" /> My Orders
                </Link>
                <Link to="/complaint" onClick={() => setOpen(false)} className="py-2" data-testid="mobile-nav-complaint">
                  <MessageCircleWarning size={16} className="inline mr-2" /> Complaint
                </Link>
                <Link to="/profile" onClick={() => setOpen(false)} className="py-2" data-testid="mobile-nav-profile">
                  <User size={16} className="inline mr-2" /> Profile
                </Link>
              </>
            )}
            {user?.role === "admin" && (
              <Link to="/admin" onClick={() => setOpen(false)} className="py-2 text-[#D4A017] font-semibold" data-testid="mobile-nav-admin">
                <LayoutDashboard size={16} className="inline mr-2" /> Admin
              </Link>
            )}
            {user ? (
              <button onClick={logout} className="py-2 text-left text-red-600" data-testid="mobile-nav-logout">
                <LogOut size={16} className="inline mr-2" /> Logout
              </button>
            ) : (
              <button
                onClick={loginWithGoogle}
                className="py-3 bg-[#111] text-white rounded-full font-semibold"
                data-testid="mobile-nav-login"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
