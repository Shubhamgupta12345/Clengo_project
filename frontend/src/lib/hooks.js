import { useEffect, useState } from "react";
import api from "@/lib/api";

let _settingsCache = null;
let _offersCache = null;
let _pincodesCache = null;

export function useSettings() {
  const [data, setData] = useState(_settingsCache);
  useEffect(() => {
    if (_settingsCache) return;
    api.get("/settings").then(({ data }) => {
      _settingsCache = data;
      setData(data);
    }).catch(() => {});
  }, []);
  return data || {};
}

export function useOffers() {
  const [data, setData] = useState(_offersCache || []);
  useEffect(() => {
    if (_offersCache) return;
    api.get("/offers").then(({ data }) => {
      _offersCache = data;
      setData(data);
    }).catch(() => {});
  }, []);
  return data;
}

export function usePincodes() {
  const [data, setData] = useState(_pincodesCache || []);
  useEffect(() => {
    if (_pincodesCache) return;
    api.get("/pincodes").then(({ data }) => {
      _pincodesCache = data;
      setData(data);
    }).catch(() => {});
  }, []);
  return data;
}

// Compute the best applicable offer for a subtotal
export function bestOfferFor(subtotal, offers) {
  const applicable = offers.filter(o => o.active && subtotal >= o.threshold);
  if (!applicable.length) return null;
  return applicable.reduce((a, b) => (b.discount > a.discount ? b : a));
}
