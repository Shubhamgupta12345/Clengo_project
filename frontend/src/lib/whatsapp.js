import { useEffect, useState } from "react";
import api from "@/lib/api";

// Clengo business number fallback for optimistic UI; overridden by /api/config
const FALLBACK_NUMBER = "916307074843";

let cached = null;
export function useClengoWhatsApp() {
  const [number, setNumber] = useState(cached || FALLBACK_NUMBER);
  useEffect(() => {
    if (cached) return;
    api.get("/config").then(({ data }) => {
      if (data?.whatsapp_number) {
        cached = data.whatsapp_number;
        setNumber(data.whatsapp_number);
      }
    }).catch(() => {});
  }, []);
  return number;
}

export function waLink(number, text) {
  const clean = String(number).replace(/\D/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

export function orderConfirmationText(order) {
  const items = order.items.map(i => `• ${i.item_name} × ${i.quantity} (${i.service}) — ₹${i.subtotal}`).join("\n");
  return `Hi Clengo team! 👋

I've just placed an order on clengo.in.

*Order ID:* ${order.order_id}
*Name:* ${order.user_name}
*Phone:* ${order.contact_phone}
*Pickup:* ${order.pickup_date} · ${order.pickup_slot}
*Address:* ${order.pickup_address}, ${order.pickup_pincode}

*Items:*
${items}

*Total (COD):* ₹${order.total_amount.toFixed(0)}

Please confirm pickup. Thank you!`;
}

export function supportText() {
  return `Hi Clengo! I need help with my laundry order.`;
}

// For admin: message a customer directly
export function adminContactCustomerText(order) {
  return `Hi ${order.user_name}, this is Clengo regarding your order ${order.order_id}.`;
}
