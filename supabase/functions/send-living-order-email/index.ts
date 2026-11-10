import { createClient } from "npm:@supabase/supabase-js@2";
import { sendLivingOrderEmail } from "../_shared/living-order-email.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token || token === authorization) return new Response("Unauthorized", { status: 401 });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anonKey) return new Response("Function not configured", { status: 503 });

  const userClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: authError } = await userClient.auth.getUser(token);
  if (authError || !userData.user) return new Response("Unauthorized", { status: 401 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await admin.from("profiles")
    .select("account_type").eq("id", userData.user.id).maybeSingle();
  if (profileError || profile?.account_type !== "admin") return new Response("Forbidden", { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      typeof body.order_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.order_id)) {
    return new Response("Invalid order reference", { status: 400 });
  }

  try {
    const result = await sendLivingOrderEmail(admin, body.order_id, "shipped");
    return Response.json(result);
  } catch (error) {
    console.error("Shipment email failed", error);
    return new Response("Shipment email failed", { status: 500 });
  }
});
