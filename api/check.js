// pages/api/check.js
// Accepts GET ?q=handleOrFid (for quick tests) and POST { q: "<handle_or_fid>" }.
// Uses NEYNAR_BASE_URL and NEYNAR_API_KEY env vars.

export default async function handler(req, res) {
  try {
    // Accept both GET (query) and POST (body)
    const q = (req.method === "POST" ? req.body?.q : req.query?.q) || "";
    if (!q) return res.status(400).json({ error: "missing query parameter q" });

    const base = process.env.NEYNAR_BASE_URL;
    const key = process.env.NEYNAR_API_KEY ?? "";

    if (!base) {
      return res.status(500).json({ error: "NEYNAR_BASE_URL not configured on server" });
    }

    const input = q.toString().trim().replace(/^@+/, "");
    const isNumeric = /^\d+$/.test(input);

    const baseClean = base.replace(/\/$/, "");
    // Some Neynar endpoints expect a "lookup" path while others accept /users
    // We'll POST JSON bodies (safer when API requires POST).
    const endpoint = isNumeric
      ? `${baseClean}/users/${encodeURIComponent(input)}` // may accept GET, but we'll POST too (no body)
      : `${baseClean}/users/lookup`;

    // Build headers. Include both Authorization and x-api-key if key present.
    const headers = {
      "Content-Type": "application/json",
      ...(key ? { Authorization: `Bearer ${key}`, "x-api-key": key } : {}),
    };

    // Create POST body depending on lookup vs numeric
    const bodyPayload = isNumeric ? undefined : { handle: input }; // lookup expects handle
    // If numeric endpoint requires a body, adjust as needed; using undefined will result in an empty POST.

    const r = await fetch(endpoint, {
      method: "POST",
      headers,
      body: bodyPayload ? JSON.stringify(bodyPayload) : undefined,
    });

    const text = await r.text(); // always read body text for debug
    // Helpful: log it server-side (will appear in Vercel logs).
    if (!r.ok) {
      console.error("Neynar error:", r.status, text);
      // Try to parse JSON error if possible
      let parsed = text;
      try { parsed = JSON.parse(text); } catch (e) { /* keep text */ }
      return res.status(r.status).json({ error: "neynar_error", status: r.status, message: parsed });
    }

    // success: parse JSON
    const data = text ? JSON.parse(text) : {};
    const neynar_score = data?.neynar_score ?? data?.score ?? null;
    const fid = data?.fid ?? data?.id ?? (isNumeric ? input : null);

    const eligible =
      (typeof neynar_score === "number" && neynar_score > 0.7) &&
      (fid !== null && !isNaN(Number(fid)) && Number(fid) < 500000);

    return res.status(200).json({
      ok: true,
      input,
      neynar_raw: data,
      neynar_score,
      fid,
      eligible,
    });
  } catch (err) {
    console.error("/api/check error:", err);
    return res.status(500).json({ error: "internal_error", message: String(err) });
  }
}
