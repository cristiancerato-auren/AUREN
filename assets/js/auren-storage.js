/* AUREN — private property-image storage helper.
 * Browser-safe: uses only the publishable Supabase client passed by the page.
 * No service-role key or other server secret is used here.
 */
(function () {
  "use strict";

  const BUCKET = "property-images";
  const SUPABASE_ORIGIN = "https://upcgbbwwghaazsqfbwri.supabase.co";
  const MAX_FILES = 20;
  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const SIGNED_URL_SECONDS = 3600;
  const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

  function safeHttpsUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
    } catch {
      return "";
    }
  }

  function pathFromStoredPublicUrl(value) {
    try {
      const url = new URL(String(value || ""));
      const prefix = "/storage/v1/object/public/" + BUCKET + "/";
      if (url.origin !== SUPABASE_ORIGIN || !url.pathname.startsWith(prefix)) return null;
      return decodeURIComponent(url.pathname.slice(prefix.length));
    } catch {
      return null;
    }
  }

  async function resolveImageUrl(client, value, explicitPath) {
    const path = explicitPath || pathFromStoredPublicUrl(value);
    if (!path) return safeHttpsUrl(value);
    if (!client || !client.storage) return "";
    const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
    if (error || !data?.signedUrl) {
      console.warn("AUREN private image unavailable:", error?.message || "signed URL missing");
      return "";
    }
    return safeHttpsUrl(data.signedUrl);
  }

  async function uploadPropertyImages(client, propertyId, files) {
    if (!client?.auth || !client?.storage) throw new Error("Il servizio immagini non è configurato.");
    if (!/^[0-9a-f-]{36}$/i.test(String(propertyId || ""))) {
      throw new Error("Annuncio non valido: aggiorna la pagina e riprova.");
    }
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    const user = sessionData?.session?.user;
    if (!user) throw new Error("Accedi per caricare le fotografie dell'immobile.");

    const selected = Array.from(files || []);
    if (!selected.length) return [];
    if (selected.length > MAX_FILES) throw new Error("Puoi caricare al massimo 20 fotografie per annuncio.");
    for (const file of selected) {
      if (!ALLOWED_TYPES.has(file.type)) throw new Error("Formato non supportato: usa JPG, PNG o WebP.");
      if (!file.size || file.size > MAX_FILE_BYTES) throw new Error("Ogni fotografia deve pesare al massimo 5 MB.");
    }

    const uploaded = [];
    try {
      for (const file of selected) {
        const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" })[file.type];
        const safeName = crypto.randomUUID();
        const path = user.id + "/" + propertyId + "/" + safeName + "." + extension;
        const { data, error } = await client.storage.from(BUCKET).upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false
        });
        if (error) throw error;
        const { data: publicData } = client.storage.from(BUCKET).getPublicUrl(data.path);
        uploaded.push({ path: data.path, publicUrl: publicData.publicUrl });
      }
      return uploaded;
    } catch (error) {
      const paths = uploaded.map(item => item.path);
      if (paths.length) {
        const { error: cleanupError } = await client.storage.from(BUCKET).remove(paths);
        if (cleanupError) console.warn("AUREN private image cleanup:", cleanupError.message);
      }
      throw new Error("Caricamento fotografie non riuscito. " + (error?.message || ""));
    }
  }

  async function removePropertyImages(client, paths) {
    const safePaths = Array.from(paths || []).filter(path =>
      typeof path === "string" && path.length < 600 && !path.startsWith("/") && !path.includes("..")
    );
    if (!safePaths.length) return;
    const { error } = await client.storage.from(BUCKET).remove(safePaths);
    if (error) throw error;
  }

  window.AURENStorage = Object.freeze({
    uploadPropertyImages,
    resolveImageUrl,
    removePropertyImages,
    bucket: BUCKET,
    maxFiles: MAX_FILES,
    maxFileBytes: MAX_FILE_BYTES
  });
})();
