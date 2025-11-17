import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function checkEligibility() {
    setError(null);
    setResult(null);
    const trimmed = input.trim();
    if (!trimmed) { setError("Enter a Farcaster handle (e.g. @alice) or a numeric FID."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Unknown error");
      setResult(data);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: "24px auto", fontFamily: "Inter, system-ui, sans-serif", padding: 20 }}>
      <h1 style={{ marginBottom: 6 }}>Creator Marketplace — Eligibility Checker</h1>
      <p style={{ marginTop: 0, color: "#444" }}>
        Enter a Farcaster handle (like <code>@alice</code>) or a numeric FID. The rule: <strong>neynar_score &gt; 0.7</strong> AND <strong>FID &lt; 500000</strong>.
      </p>

      <div style={{ marginTop: 18 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="@handle or FID"
          style={{ padding: "10px 12px", width: "100%", boxSizing: "border-box", borderRadius: 8, border: "1px solid #ddd" }}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <button
          onClick={checkEligibility}
          disabled={loading}
          style={{ padding: "10px 14px", borderRadius: 8, border: "none", cursor: "pointer" }}
        >
          {loading ? "Checking…" : "Check eligibility"}
        </button>
      </div>

      {error && <div style={{ marginTop: 12, color: "crimson" }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 18, padding: 14, borderRadius: 10, background: result.eligible ? "#e6ffef" : "#fff0f0", border: "1px solid #eee" }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {result.eligible ? "✅ Eligible" : "❌ Not eligible"}
          </div>
          <div style={{ marginTop: 8 }}>
            <div><strong>FID:</strong> {result.fid}</div>
            <div><strong>Neynar score:</strong> {result.neynar_score}</div>
            <div style={{ marginTop: 8, color: "#555" }}>
              {result.eligible ? "This account meets the Creator Marketplace criteria." : "Reasons: " + (result.reasons.join("; ") || "—")}
            </div>
          </div>
        </div>
      )}

      <footer style={{ marginTop: 26, color: "#888", fontSize: 13 }}>
        <div>Built for Mranek Street — Mini App starter</div>
      </footer>
    </div>
  );
}
