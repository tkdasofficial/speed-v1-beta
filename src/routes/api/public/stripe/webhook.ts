import { createFileRoute } from "@tanstack/react-router";

// Stripe → authoritative entitlements. Signature verified before any write.
export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) return new Response("Billing is not configured", { status: 503 });
        const body = await request.text();
        const { verifyStripeSignature, applySubscription } = await import("@security/stripe.server");
        if (!(await verifyStripeSignature(body, request.headers.get("stripe-signature"), secret))) {
          return new Response("Invalid signature", { status: 401 });
        }
        const event = JSON.parse(body) as { type: string; data: { object: Parameters<typeof applySubscription>[0] } };
        if (event.type.startsWith("customer.subscription.")) await applySubscription(event.data.object);
        return new Response("ok");
      },
    },
  },
});
