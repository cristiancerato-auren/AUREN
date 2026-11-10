import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_URL") ?? "https://aurenliving.it",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo non consentito" }, 405);
  const requestOrigin = req.headers.get("Origin");
  const allowedOrigin = Deno.env.get("SITE_URL") ?? "https://aurenliving.it";
  try {
    if (requestOrigin && new URL(requestOrigin).origin !== new URL(allowedOrigin).origin) {
      return json({ error: "Origine non autorizzata" }, 403);
    }
  } catch {
    return json({ error: "Origine non valida" }, 403);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const shippingCentsRaw = Deno.env.get("SHIPPING_FLAT_RATE_CENTS");
  const siteUrl = (Deno.env.get("SITE_URL") ?? "https://aurenliving.it").replace(/\/$/, "");
  if (!supabaseUrl || !serviceKey || !stripeKey || shippingCentsRaw === undefined) {
    return json({ error: "Checkout non configurato: manca anche la tariffa di spedizione" }, 503);
  }
  const shippingCents = Number(shippingCentsRaw);
  if (!Number.isSafeInteger(shippingCents) || shippingCents < 0 || shippingCents > 100000) {
    return json({ error: "Tariffa di spedizione non valida" }, 503);
  }
  const shippingTotal = shippingCents / 100;

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > 64_000) return json({ error: "Richiesta troppo grande" }, 413);
  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 64_000) return json({ error: "Richiesta troppo grande" }, 413);
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid object");
  } catch {
    return json({ error: "Richiesta non valida" }, 400);
  }

  const customerName = typeof body.customer_name === "string" ? body.customer_name.trim() : "";
  const customerEmail = typeof body.customer_email === "string" ? body.customer_email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const shippingAddress = body.shipping_address;
  const billingAddress = body.billing_address ?? null;
  const customerNote = typeof body.customer_note === "string" ? body.customer_note.trim() : "";
  const items = body.items;
  const address = shippingAddress && typeof shippingAddress === "object" && !Array.isArray(shippingAddress)
    ? shippingAddress as Record<string, unknown> : null;
  const requiredAddressFields = ["line1", "postal_code", "city", "province", "country"];
  const addressValid = !!address && requiredAddressFields.every((key) =>
    typeof address[key] === "string" && (address[key] as string).trim().length > 0 &&
    (address[key] as string).trim().length <= (key === "line1" ? 180 : 100)
  );
  if (!customerName || customerName.length > 160 ||
      customerEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) ||
      phone.length > 40 || customerNote.length > 1000 || !addressValid ||
      !Array.isArray(items) || items.length < 1 || items.length > 50) {
    return json({ error: "Controlla i dati del cliente, la spedizione e i prodotti" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let userId: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ") && authHeader.slice(7).startsWith("eyJ")) {
    const { data, error } = await supabase.auth.getUser(authHeader.slice(7));
    if (error) return json({ error: "Sessione utente non valida" }, 401);
    userId = data.user?.id ?? null;
  }

  // Only identifiers and quantities come from the browser. SQL locks stock and
  // recalculates every price from the trusted catalogue inside one transaction.
  const safeItems = items.map((item) => ({
    product_id: item?.product_id,
    variant_id: item?.variant_id ?? null,
    quantity: item?.quantity,
  }));
  const { data: reservation, error: reserveError } = await supabase.rpc(
    "create_living_order_reservation",
    {
      p_customer_name: customerName,
      p_customer_email: customerEmail,
      p_phone: phone || null,
      p_shipping_address: shippingAddress,
      p_billing_address: billingAddress,
      p_customer_note: customerNote,
      p_shipping_total: shippingTotal,
      p_user_id: userId,
      p_items: safeItems,
    },
  );
  if (reserveError || !reservation?.order_id || !Array.isArray(reservation.items)) {
    console.error("Order reservation failed", reserveError);
    return json({ error: "Prodotti non disponibili o dati ordine non validi" }, 409);
  }

  const form = new URLSearchParams();
  form.set("mode", "payment");
  // Stripe Checkout permits an expiry from 30 minutes to 24 hours.
  form.set("expires_at", String(Math.floor(Date.now() / 1000) + 30 * 60));
  form.set("success_url", siteUrl + "/living.html?checkout=success&session_id={CHECKOUT_SESSION_ID}");
  form.set("cancel_url", siteUrl + "/living.html?checkout=cancelled");
  form.set("customer_email", customerEmail);
  if (shippingCents > 0) {
    form.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
    form.set("shipping_options[0][shipping_rate_data][fixed_amount][amount]", String(shippingCents));
    form.set("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "eur");
    form.set("shipping_options[0][shipping_rate_data][display_name]", "Spedizione");
  }
  form.set("client_reference_id", reservation.order_id);
  form.set("metadata[order_id]", reservation.order_id);
  reservation.items.forEach((item: Record<string, unknown>, index: number) => {
    const prefix = "line_items[" + index + "]";
    form.set(prefix + "[quantity]", String(item.quantity));
    form.set(prefix + "[price_data][currency]", "eur");
    form.set(prefix + "[price_data][unit_amount]", String(Math.round(Number(item.unit_price) * 100)));
    form.set(prefix + "[price_data][product_data][name]", String(item.product_name) +
      (item.variant_name ? " — " + String(item.variant_name) : ""));
  });

  let stripeResponse: Response;
  let session: Record<string, unknown>;
  try {
    stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + stripeKey,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: form,
    });
    const payload: unknown = await stripeResponse.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid Stripe response");
    }
    session = payload as Record<string, unknown>;
  } catch (error) {
    console.error("Stripe session request failed", error);
    await supabase.rpc("release_living_order_reservation", { p_order_id: reservation.order_id });
    return json({ error: "Impossibile avviare il pagamento. Riprova." }, 502);
  }
  let checkoutUrl: URL | null = null;
  try {
    checkoutUrl = typeof session.url === "string" ? new URL(session.url) : null;
  } catch { /* Invalid provider URL is rejected below. */ }
  if (!stripeResponse.ok || !checkoutUrl || checkoutUrl.protocol !== "https:" ||
      checkoutUrl.hostname !== "checkout.stripe.com" || typeof session.id !== "string") {
    console.error("Stripe session creation failed", session);
    await supabase.rpc("release_living_order_reservation", { p_order_id: reservation.order_id });
    return json({ error: "Impossibile avviare il pagamento. Riprova." }, 502);
  }

  const { data: linkedOrder, error: updateError } = await supabase.from("living_orders").update({
    payment_provider: "stripe",
    provider_session_id: session.id,
    updated_at: new Date().toISOString(),
  }).eq("id", reservation.order_id).eq("payment_status", "pending").select("id").maybeSingle();

  if (updateError || !linkedOrder) {
    await fetch("https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(session.id) + "/expire", {
      method: "POST",
      headers: { "Authorization": "Bearer " + stripeKey },
    });
    await supabase.rpc("release_living_order_reservation", { p_order_id: reservation.order_id });
    return json({ error: "Errore durante la preparazione dell'ordine" }, 502);
  }

  return json({ checkout_url: checkoutUrl.href, order_number: reservation.order_number });
});
