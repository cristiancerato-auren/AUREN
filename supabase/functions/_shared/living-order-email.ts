import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

type EmailKind = "paid" | "shipped";
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c] ?? c));

export async function sendLivingOrderEmail(
  supabase: SupabaseClient,
  orderId: string,
  kind: EmailKind,
): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("LIVING_ORDER_EMAIL_FROM");
  if (!apiKey || !from) throw new Error("Order email service is not configured");

  const sentColumn = kind === "paid" ? "paid_email_sent_at" : "shipped_email_sent_at";
  const lockColumn = kind === "paid" ? "paid_email_sending_at" : "shipped_email_sending_at";
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const { data: claim, error: claimError } = await supabase.from("living_orders")
    .update({ [lockColumn]: now, updated_at: now })
    .eq("id", orderId).is(sentColumn, null)
    .or(`${lockColumn}.is.null,${lockColumn}.lt.${staleBefore}`)
    .select("id").maybeSingle();
  if (claimError) throw new Error("Could not claim order email: " + claimError.message);
  if (!claim) return { sent: false, reason: "already_sent_or_in_progress" };

  try {
    const { data: order, error } = await supabase.from("living_orders")
      .select("id,order_number,customer_name,customer_email,total,currency,payment_status,fulfillment_status,tracking_code,tracking_url")
      .eq("id", orderId).single();
    if (error || !order) throw new Error("Order not found for email");

    if (kind === "paid" && order.payment_status === "failed") {
      throw new Error("Cannot send paid confirmation for failed order");
    }
    if (kind === "shipped" && order.fulfillment_status !== "shipped") {
      throw new Error("Shipment email requires shipped fulfillment status");
    }
    const { data: items, error: itemsError } = await supabase.from("living_order_items")
      .select("product_name,variant_name,quantity,line_total")
      .eq("order_id", orderId);
    if (itemsError) throw new Error("Could not load order items");

    const itemRows = (items || []).map((item) =>
      `<li>${escapeHtml(item.product_name)}${item.variant_name ? " — " + escapeHtml(item.variant_name) : ""} × ${Number(item.quantity)} — € ${Number(item.line_total).toFixed(2)}</li>`
    ).join("");
    const title = kind === "paid" ? "Pagamento confermato" : "Il tuo ordine è stato spedito";
    const detail = kind === "paid"
      ? "Abbiamo ricevuto il pagamento del tuo ordine."
      : "Il tuo ordine AUREN Living è stato affidato al corriere.";
    let safeTrackingUrl = "";
    if (kind === "shipped" && order.tracking_url) {
      try {
        const parsed = new URL(order.tracking_url);
        if (parsed.protocol === "https:" && !parsed.username && !parsed.password) safeTrackingUrl = parsed.href;
      } catch { /* Invalid tracking URL is omitted from customer email. */ }
    }
    const tracking = safeTrackingUrl
      ? `<p>Tracciamento: <a href="${escapeHtml(safeTrackingUrl)}">${escapeHtml(order.tracking_code || "Segui la spedizione")}</a></p>`
      : kind === "shipped" && order.tracking_code
      ? `<p>Codice di tracciamento: ${escapeHtml(order.tracking_code)}</p>`
      : "";
    const html = `<!doctype html><html><body style="margin:0;background:#f4efe7;color:#211b17;font:16px Arial,sans-serif"><main style="max-width:620px;margin:30px auto;padding:32px;background:#fffdf9"><p style="letter-spacing:5px">AUREN LIVING</p><h1 style="font-family:Georgia,serif;font-weight:400">${title}</h1><p>Ciao ${escapeHtml(order.customer_name)},</p><p>${detail}</p><p>Ordine <strong>#${escapeHtml(order.order_number)}</strong></p><ul>${itemRows}</ul><p>Totale: <strong>€ ${Number(order.total).toFixed(2)}</strong></p>${tracking}<p>Grazie per aver scelto AUREN.</p></main></body></html>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `auren-living-${kind}-${orderId}`,
      },
      body: JSON.stringify({
        from,
        to: [order.customer_email],
        subject: `AUREN Living — ${title} · Ordine #${order.order_number}`,
        html,
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Email provider returned ${response.status}: ${body.slice(0, 500)}`);
    }

    const { error: sentError } = await supabase.from("living_orders")
      .update({ [sentColumn]: new Date().toISOString(), [lockColumn]: null, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (sentError) throw new Error("Email sent but delivery state could not be saved");
    return { sent: true };
  } catch (error) {
    await supabase.from("living_orders").update({ [lockColumn]: null, updated_at: new Date().toISOString() }).eq("id", orderId);
    throw error;
  }
}
