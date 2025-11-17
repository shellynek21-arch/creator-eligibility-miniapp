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
    const url = isNumeric
      ? `${baseClean}/users/${encodeURIComponent(input)}`
      : `${baseClean}/users/lookup?handle=${encodeURIComponent(input)}`;

    const r = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(key ? { "Authorization": `Bearer ${key}` } : {}),
      },
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: "neynar_error", status: r.status, message: text });
    }

    const data = await r.json();
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
