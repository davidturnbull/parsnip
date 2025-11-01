import { useState } from "react";
import { createCheckoutSession, verifyPayment } from "@/api/stripe";

type PaywallOverlayProps = {
  onUnlocked?: () => void;
};

export function PaywallOverlay({ onUnlocked }: PaywallOverlayProps) {
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    setLoading(true);
    try {
      console.log("Creating checkout session...");
      const result = await createCheckoutSession({ data: {} });
      console.log("Checkout session result:", result);
      
      if (result && typeof result === 'object' && 'url' in result && result.url) {
        console.log("Redirecting to Stripe:", result.url);
        window.location.href = result.url;
      } else {
        console.error("No URL in response:", result);
        alert(`Failed to start payment. No checkout URL received. Check console for details.`);
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to start payment: ${errorMessage}\n\nCheck the browser console and server logs for more details.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-surface/95 rounded-md border border-surface-dark z-10">
      <div className="text-center p-4" onClick={(e) => e.stopPropagation()}>
        <div className="text-3xl mb-3">🔒</div>
        <div className="text-sm font-medium text-primary-dark mb-2 font-ui">
          Additional Context
        </div>
        <div className="text-xs text-primary-dark/70 mb-4 font-sans">
          Unlock this feature to add dietary preferences, allergies, and more context to your recipes.
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("Button clicked!");
            handleUnlock();
          }}
          disabled={loading}
          className={`rounded-md px-4 py-2 text-sm font-medium text-surface font-ui ${
            loading
              ? "bg-primary/40 cursor-not-allowed"
              : "bg-primary hover:bg-primary-dark cursor-pointer"
          }`}
        >
          {loading ? "Loading..." : "Unlock with Stripe"}
        </button>
      </div>
    </div>
  );
}

