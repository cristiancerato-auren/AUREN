/* AUREN — secure property-image upload helper.
 * Loaded only after Supabase JS and the app's Supabase client are configured.
 * This module deliberately does not create a client or expose secret keys.
 */
(function () {
  "use strict";

  const BUCKET = "property-images";
  const MAX_FILES = 20;
  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

  async function uploadPropertyImages(client, files) {
    if (!client || !client.auth || !client.storage) {
      throw new Error("Il servizio immagini non è configurato.");
    }

    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    const user = sessionData && sessionData.session && sessionData.session.user;
    if (!user) throw new Error("Accedi per caricare le fotografie dell'immobile.");

    const selected = Array.from(files || []);
    if (!selected.length) return [];
    if (selected.length > MAX_FILES) {
      throw new Error("Puoi caricare al massimo 20 fotografie per annuncio.");
    }

    for (const file of selected) {
      if (!ALLOWED_TYPES.has(file.type)) {
        throw new Error("Formato non supportato: usa JPG, PNG o WebP.");
      }
      if (file.size > MAX_FILE_BYTES) {
        throw new Error("Ogni fotografia deve pesare al massimo 5 MB.");
      }
    }

    const uploaded = [];
    for (const file of selected) {
      const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" })[file.type];
      const safeName = (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
      const path = user.id + "/" + safeName + "." + extension;
      const { data, error } = await client.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false
      });
      if (error) {
        throw new Error("Caricamento non riuscito. " + error.message);
      }
      const { data: publicData } = client.storage.from(BUCKET).getPublicUrl(data.path);
      uploaded.push({ path: data.path, publicUrl: publicData.publicUrl });
    }
    return uploaded;
  }

  window.AURENStorage = Object.freeze({
    uploadPropertyImages,
    bucket: BUCKET,
    maxFiles: MAX_FILES,
    maxFileBytes: MAX_FILE_BYTES
  });
})();