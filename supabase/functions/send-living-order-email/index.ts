import { createClient } from "npm:@supabase/supabase-js@2";
import { sendLivingOrderEmail } from "../_shared/living-order-email.ts";

const configuredSite = Deno.env.get("SITE_URL") ?? "https://aurenliving.it";
const allowedOrigin = new URL(configuredSite).origin;
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const respond = (body: string, status: number) => new Response(body, {
  status, headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.headers.get("Origin") && req.headers.get("Origin") !== allowedOrigin) return new Response("Origin not allowed", { status: 403 });
  if (req.method !== "POST") return respond("Method not allowed", 405);
  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token || token === authorization) return respond("Unauthorized", 401);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anonKey) return respond("Function not configured", 503);

  const userClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: authError } = await userClient.auth.getUser(token);
  if (authError || !userData.user) return new Response("Unauthorized", { status: 401 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await admin.from("profiles")
    .select("account_type").eq("id", userData.user.id).maybeSingle();
  if (profileError || profile?.account_type !== "admin") return respond("Forbidden", 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return respond("Invalid JSON", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      typeof body.order_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.order_id)) {
    return respond("Invalid order reference", 400);
  }

  try {
    const result = await sendLivingOrderEmail(admin, body.order_id, "shipped");
    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Shipment email failed", error);
    return respond("Shipment email failed", 500);
  }
});
