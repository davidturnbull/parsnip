import { useState, useEffect, useCallback } from "react";

const PAYMENT_STORAGE_KEY = "parsnip-payment-status";

export function usePaymentStatus() {
  const [hasPaid, setHasPaid] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PAYMENT_STORAGE_KEY);
      if (saved === "true") {
        setHasPaid(true);
      }
    } catch {}
  }, []);

  const markAsPaid = useCallback(() => {
    try {
      localStorage.setItem(PAYMENT_STORAGE_KEY, "true");
      setHasPaid(true);
    } catch {}
  }, []);

  const checkPaymentFromUrl = useCallback(() => {
    if (typeof window === "undefined") return null;

    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment");
    const sessionId = urlParams.get("session_id");

    if (paymentStatus === "success" && sessionId) {
      return { sessionId, success: true };
    }

    return null;
  }, []);

  return {
    hasPaid,
    markAsPaid,
    checkPaymentFromUrl,
  };
}

