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
    if (!trimmed) { 
      setError("Enter a Farcaster handle (e.g. @alice) or a numeric FID."); 
      return; 
    }
    setLoading(true);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: trimmed })
      });
      const data = await res.json();
      
      // Handle 402 Payment Required error specifically
      if (res.status === 402) {
        setError(
          "This service requires a paid Neynar account. The free tier doesn't include access to user lookup endpoints. " +
          "Please upgrade your Neynar plan at https://neynar.com to continue using this service."
        );
        return;
      }
      
      if (!res.ok) {
        // Handle other errors
        const errorMsg = typeof data.message === 'object' 
          ? (data.message.message || JSON.stringify(data.message))
          : (data.message || data.error || "Unknown error");
        throw new Error(errorMsg);
      }
      
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
          onKeyPress={e => e.key === 'Enter' && checkEligibility()}
          placeholder="@handle or FID"
          style={{ 
            padding: "10px 12px", 
            width: "100%", 
            boxSizing: "border-box", 
            borderRadius: 8, 
            border: "1px solid #ddd",
            fontSize: 16
          }}
        />
      </div>
      
      <div style={{ marginTop: 12 }}>
        <button
          onClick={checkEligibility}
          disabled={loading}
          style={{ 
            padding: "10px 14px", 
            borderRadius: 8, 
            border: "none", 
            cursor: loading ? "not-allowed" : "pointer",
            backgroundColor: loading ? "#ccc" : "#5b4bff",
            color: "white",
            fontWeight: 600,
            fontSize: 15
          }}
        >
          {loading ? "Checking…" : "Check eligibility"}
        </button>
      </div>
      
      {error && (
        <div style={{ 
          marginTop: 16, 
          padding: 14, 
          borderRadius: 10, 
          backgroundColor: "#fff0f0", 
          border: "1px solid #ffcdd2",
          color: "#c62828"
        }}>
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}
      
      {result && (
        <div style={{ 
          marginTop: 18, 
          padding: 14, 
          borderRadius: 10, 
          background: result.eligible ? "#e6ffef" : "#fff0f0", 
          border: result.eligible ? "1px solid #4caf50" : "1px solid #ffcdd2" 
        }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {result.eligible ? "✅ Eligible" : "❌ Not eligible"}
          </div>
          <div style={{ marginTop: 8 }}>
            <div><strong>FID:</strong> {result.fid || 'N/A'}</div>
            <div><strong>Neynar score:</strong> {result.neynar_score !== null ? result.neynar_score : 'N/A'}</div>
            <div style={{ marginTop: 8, color: "#555" }}>
              {result.eligible 
                ? "This account meets the Creator Marketplace criteria." 
                : "This account does not meet the eligibility requirements (neynar_score must be > 0.7 AND FID must be < 500000)."}
            </div>
          </div>
        </div>
      )}
      
      <footer style={{ marginTop: 26, color: "#888", fontSize: 13, borderTop: "1px solid #eee", paddingTop: 16 }}>
        <div>Built for Mranek Street — Mini App starter</div>
        <div style={{ marginTop: 8 }}>
          <strong>Note:</strong> This app requires a paid Neynar account. <a href="https://neynar.com" target="_blank" rel="noopener noreferrer" style={{ color: "#5b4bff" }}>Upgrade here</a>
        </div>
      </footer>
    </div>
  );
}
