/**
 * POST body: { query: "@alice" } or { query: "12345" }
 *
 * Environment variables required:
 *   NEYNAR_BASE_URL   - e.g. "https://api.neynar.example" (set to the Neynar base URL)
 *   NEYNAR_API_KEY    - your Neynar API key (if required)
 *
 * NOTE: Replace the placeholder endpoint paths below with the actual Neynar endpoints you will use.
 */

function jsonResponse(res, status, body) {
  res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return jsonResponse(res, 405, { message: "Only POST allowed" });

  const { query } = req.body || {};
  if (!query) return jsonResponse(res, 400, { message: "Missing query in body" });

  let fid;
  try {
    // If input looks like a handle (starts with @), resolve via Neynar or Farcaster lookup
    if (String(query).trim().startsWith("@")) {
      const handle = String(query).trim().replace(/^@/, "");
      // --- PLACEHOLDER: lookup by handle ---
      // Replace the path "/users/lookup" with the actual Neynar or Farcaster endpoint for user lookup.
      const lookupUrl = `${process.env.NEYNAR_BASE_URL}/users/lookup?handle=${encodeURIComponent(handle)}`;
      const r = await fetch(lookupUrl, {
        headers: { "Authorization": `Bearer ${process.env.NEYNAR_API_KEY}` }
      });
      if (!r.ok) {
        const text = await r.text();
        throw new Error(`Lookup failed: ${r.status} ${text}`);
      }
      const j = await r.json();
      fid = j.fid ?? j.data?.fid;
      if (!fid) throw new Error("Lookup did not return fid");
    } else {
      // parse numeric FID
      const n = Number(String(query).trim());
      if (!Number.isInteger(n) || n < 0) return jsonResponse(res, 400, { message: "Invalid numeric FID" });
      fid = n;
    }

    // --- Fetch Neynar score for the FID ---
    // Replace "/metrics/fid" below with real Neynar endpoint path.
    const scoreUrl = `${process.env.NEYNAR_BASE_URL}/metrics/fid/${encodeURIComponent(fid)}`;
    const r2 = await fetch(scoreUrl, {
      headers: { "Authorization": `Bearer ${process.env.NEYNAR_API_KEY}`, "Accept": "application/json" }
    });
    if (!r2.ok) {
      const text = await r2.text();
      throw new Error(`Neynar metrics failed: ${r2.status} ${text}`);
    }
    const scoreJson = await r2.json();
    // Expect response to include numeric field `neynar_score`
    const neynar_score = parseFloat(scoreJson.neynar_score ?? scoreJson.score ?? scoreJson.data?.neynar_score);
    if (Number.isNaN(neynar_score)) throw new Error("Neynar response missing neynar_score");

    // --- Apply your rule ---
    const eligible = (neynar_score > 0.7) && (fid < 500000);

    const reasons = [];
    if (!(neynar_score > 0.7)) reasons.push("Neynar score is <= 0.70");
    if (!(fid < 500000)) reasons.push("FID is >= 500000");

    return jsonResponse(res, 200, { fid, neynar_score, eligible, reasons });

  } catch (err) {
    console.error("API /api/check error:", err);
    return jsonResponse(res, 500, { message: err.message || String(err) });
  }
}

