import { useState } from "react";
import { createCheckoutSession, verifyPayment } from "@/api/stripe";

type PaywallProps = {
  minHeight?: string;
};

export function Paywall({ minHeight = "min-h-20" }: PaywallProps) {
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
    <div className={`w-full ${minHeight} rounded-md border border-surface-dark bg-surface px-3 py-4 flex flex-col items-center justify-center`}>
      <div className="text-center w-full">
        <div className="mb-4 flex justify-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <svg 
              className="w-6 h-6 text-primary" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
          </div>
        </div>
        <h3 className="text-sm font-semibold text-primary-dark mb-2 font-ui font-ui-heading">
          Unlock Additional Context
        </h3>
        <p className="text-xs text-primary-dark/70 mb-4 font-sans leading-relaxed">
          Add dietary preferences, allergies, substitutions, and more to personalize your recipes.
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("Button clicked!");
            handleUnlock();
          }}
          disabled={loading}
          className={`rounded-md px-4 py-2 text-sm font-medium text-surface font-ui transition-colors ${
            loading
              ? "bg-primary/40 cursor-not-allowed"
              : "bg-primary hover:bg-primary-dark cursor-pointer active:scale-[0.98]"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Unlock with Stripe
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

