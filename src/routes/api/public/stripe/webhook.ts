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
        const event = JSON.parse(body) as { id: string; type: string; data: { object: Record<string, unknown> } };
        const { notifyBilling } = await import("@/lib/email/billing.server");
        if (event.type.startsWith("customer.subscription.")) {
          const userId = await applySubscription(event.data.object as Parameters<typeof applySubscription>[0]);
          if (userId) await notifyBilling(event, userId);
        } else if (event.type === "invoice.payment_succeeded" || event.type === "invoice.payment_failed") {
          await notifyBilling(event, null);
        }
        return new Response("ok");
      },
    },
  },
});
