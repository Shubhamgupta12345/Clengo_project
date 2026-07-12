import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import Landing from "@/pages/Landing";
import Order from "@/pages/Order";
import MyOrders from "@/pages/MyOrders";
import Complaint from "@/pages/Complaint";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";
import WhatsAppFab from "@/components/WhatsAppFab";
import { GoogleOAuthProvider } from "@react-oauth/google";

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/order" element={<Order />} />
      <Route path="/my-orders" element={<MyOrders />} />
      <Route path="/complaint" element={<Complaint />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}
function App() {
  return (
    <div className="App">
      <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
        <AuthProvider>
          <BrowserRouter>
            <AppRouter />
            <WhatsAppFab />
            <Toaster position="top-center" richColors />
          </BrowserRouter>
        </AuthProvider>
      </GoogleOAuthProvider>
    </div>
  );
}
export default App;