// pages/api/check.js
// Accepts GET ?q=handleOrFid (for quick tests) and POST { q: "<handle_or_fid>" }.
// Uses NEYNAR_BASE_URL and NEYNAR_API_KEY env vars.

export default async function handler(req, res) {
  try {
    // Accept both GET (query) and POST (body)
    const q = (req.method === "POST" ? req.body?.q : req.query?.q) || "";
    
    if (!q) {
      return res.status(400).json({ 
        error: "missing_parameter", 
        message: "Missing query parameter 'q'. Please provide a Farcaster handle or FID." 
      });
    }

    const base = process.env.NEYNAR_BASE_URL;
    const key = process.env.NEYNAR_API_KEY ?? "";

    if (!base) {
      console.error("NEYNAR_BASE_URL not configured");
      return res.status(500).json({ 
        error: "server_configuration", 
        message: "Server is not properly configured. Please contact the administrator." 
      });
    }

    if (!key) {
      console.error("NEYNAR_API_KEY not configured");
      return res.status(500).json({ 
        error: "server_configuration", 
        message: "API key is not configured. Please contact the administrator." 
      });
    }

    const input = q.toString().trim().replace(/^@+/, "");
    const isNumeric = /^\d+$/.test(input);
    const baseClean = base.replace(/\/$/, "");

    // Construct endpoint based on input type
    const endpoint = isNumeric
      ? `${baseClean}/farcaster/user/bulk?fids=${encodeURIComponent(input)}`
      : `${baseClean}/farcaster/user/by_username?username=${encodeURIComponent(input)}`;

    // Build headers
    const headers = {
      "accept": "application/json",
      "x-api-key": key,
    };

    console.log(`Fetching from Neynar: ${endpoint}`);

    const r = await fetch(endpoint, {
      method: "GET",
      headers,
    });

    const text = await r.text();

    // Log errors for debugging
    if (!r.ok) {
      console.error(`Neynar API error: ${r.status} ${r.statusText}`);
      console.error(`Response body: ${text}`);
      
      let parsed;
      try { 
        parsed = JSON.parse(text); 
      } catch (e) { 
        parsed = { message: text };
      }

      // Return the error with proper status code
      return res.status(r.status).json({ 
        error: "neynar_error", 
        status: r.status, 
        message: parsed 
      });
    }

    // Success: parse JSON
    const data = text ? JSON.parse(text) : {};
    
    // Handle bulk response (numeric FID)
    let user;
    if (isNumeric && data.users && data.users.length > 0) {
      user = data.users[0];
    } else if (!isNumeric && data.user) {
      user = data.user;
    } else {
      return res.status(404).json({
        error: "user_not_found",
        message: "User not found on Farcaster"
      });
    }

    const neynar_score = user?.experimental?.neynar_user_score ?? user?.neynar_score ?? null;
    const fid = user?.fid ?? (isNumeric ? parseInt(input) : null);

    const eligible =
      (typeof neynar_score === "number" && neynar_score > 0.7) &&
      (fid !== null && !isNaN(Number(fid)) && Number(fid) < 500000);

    return res.status(200).json({
      ok: true,
      input,
      user: {
        fid: user.fid,
        username: user.username,
        display_name: user.display_name,
        pfp_url: user.pfp_url
      },
      neynar_score,
      fid,
      eligible,
    });

  } catch (err) {
    console.error("/api/check error:", err);
    return res.status(500).json({ 
      error: "internal_error", 
      message: err.message || String(err) 
    });
  }
}
