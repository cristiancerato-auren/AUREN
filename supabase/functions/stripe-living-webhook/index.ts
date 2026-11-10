import { createClient } from "npm:@supabase/supabase-js@2";

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyStripeSignature(rawBody: string, header: string, secret: string): Promise<boolean> {
  const parts = header.split(",").map((part) => part.split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(timestamp + "." + rawBody));
  const expected = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return signatures.some((signature) => constantTimeEqual(signature, expected));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!webhookSecret || !supabaseUrl || !serviceKey) {
    return new Response("Webhook not configured", { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("Stripe-Signature") ?? "";
  let valid = false;
  try {
    valid = await verifyStripeSignature(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe signature verification error", error);
  }
  if (!valid) return new Response("Invalid signature", { status: 400 });

  let event: Record<string, any>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  const session = event.data?.object;
  const orderId = session?.metadata?.order_id;
  if (!orderId || !session?.id) return new Response("Missing order reference", { status: 400 });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded") {
    if (session.payment_status !== "paid") {
      // Do not mark delayed payment methods as paid until Stripe confirms them.
      return new Response("Payment not completed", { status: 200 });
    }
    const { data: pendingOrder, error: orderReadError } = await supabase.from("living_orders")
      .select("id,total,currency,payment_status,provider_session_id")
      .eq("id", orderId).maybeSingle();
    if (orderReadError) return new Response("Order lookup failed", { status: 500 });
    if (!pendingOrder || pendingOrder.provider_session_id !== session.id ||
        session.mode !== "payment" || session.currency !== "eur" ||
        Number(session.amount_total) !== Math.round(Number(pendingOrder.total) * 100)) {
      return new Response("Order/payment amount mismatch", { status: 409 });
    }
    if (pendingOrder.payment_status === "paid") return new Response("ok", { status: 200 });
    if (pendingOrder.payment_status !== "pending") return new Response("Order is not payable", { status: 409 });

    const { data, error } = await supabase.from("living_orders").update({
      payment_status: "paid",
      reservation_expires_at: null,
      updated_at: new Date().toISOString(),
    }).eq("id", orderId)
      .eq("provider_session_id", session.id)
      .eq("payment_status", "pending")
      .select("id");

    if (error) {
      console.error("Could not confirm paid order", error);
      return new Response("Order update failed", { status: 500 });
    }
    // An empty result means Stripe retried an already processed event or the
    // session/order pair did not match. Never create or duplicate an order here.
    if (!data?.length) {
      const { data: existing, error: readError } = await supabase.from("living_orders")
        .select("id,payment_status,provider_session_id")
        .eq("id", orderId).maybeSingle();
      if (readError || existing?.provider_session_id !== session.id || existing?.payment_status !== "paid") {
        return new Response("Order/session mismatch", { status: 409 });
      }
    }
    return new Response("ok", { status: 200 });
  }

  if (event.type === "checkout.session.expired") {
    const { data: order, error } = await supabase.from("living_orders")
      .select("id,payment_status,provider_session_id")
      .eq("id", orderId).maybeSingle();
    if (error) return new Response("Order lookup failed", { status: 500 });
    if (!order || order.provider_session_id !== session.id) {
      return new Response("Order/session mismatch", { status: 409 });
    }
    if (order.payment_status === "pending") {
      const { error: releaseError } = await supabase.rpc("release_living_order_reservation", {
        p_order_id: orderId,
      });
      if (releaseError) {
        console.error("Could not release expired order stock", releaseError);
        return new Response("Stock release failed", { status: 500 });
      }
    }
    return new Response("ok", { status: 200 });
  }

  // Ignore unrelated Stripe events; they are not payment confirmation.
  return new Response("ignored", { status: 200 });
});
