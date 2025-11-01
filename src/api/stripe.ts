import { createServerFn } from "@tanstack/react-start";
import Stripe from "stripe";

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY || (process.env as any).STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured. Please set it in your .env file.");
  }
  return new Stripe(secretKey, {
    apiVersion: "2024-10-28.acacia",
  });
};

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((d: {}) => d)
  .handler(async () => {
    try {
      const stripe = getStripe();
      const baseUrl = process.env.BASE_URL || (process.env as any).BASE_URL || "http://localhost:3000";
      const priceAmount = Number(process.env.STRIPE_PRICE_AMOUNT || (process.env as any).STRIPE_PRICE_AMOUNT || 500);

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Parsnip Context Access",
                description: "Unlock additional context fields for recipe generation",
              },
              unit_amount: priceAmount,
            },
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/?payment=cancelled`,
      });

      if (!session.url) {
        throw new Error("Stripe session created but no URL returned");
      }

      return { sessionId: session.id, url: session.url };
    } catch (error) {
      console.error("Stripe checkout session creation error:", error);
      throw error;
    }
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string }) => d)
  .handler(async ({ data }) => {
    const stripe = getStripe();

    if (!data?.sessionId) {
      throw new Error("Session ID is required");
    }

    const session = await stripe.checkout.sessions.retrieve(data.sessionId);

    if (session.payment_status === "paid") {
      return { paid: true, sessionId: session.id };
    }

    return { paid: false, sessionId: session.id };
  });

