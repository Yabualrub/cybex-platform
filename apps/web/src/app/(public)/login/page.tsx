"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4001";

export default function LoginPage() {
  const [email, setEmail] = useState(""); // بدون قيم جاهزة
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        credentials: "include", // ✅ هذا اللي بيخلّي الكوكي تنحفظ
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.message || "Invalid email or password");
        return;
      }

      // ✅ ما في LocalStorage نهائيًا
      window.location.href = "/dashboard";
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ height: "100vh", display: "grid", placeItems: "center", background: "#070707", color: "white" }}>
      <div style={{ width: 360, display: "grid", gap: 12, border: "1px solid #2a2a2a", padding: 16, borderRadius: 16 }}>
        <h1 style={{ fontWeight: 900, fontSize: 24 }}>Login</h1>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 12, borderRadius: 12, border: "1px solid #2a2a2a", background: "#0b0b0b", color: "white" }}
          autoComplete="email"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 12, borderRadius: 12, border: "1px solid #2a2a2a", background: "#0b0b0b", color: "white" }}
          onKeyDown={(e) => {
            if (e.key === "Enter") login();
          }}
          autoComplete="current-password"
        />

        {error && <div style={{ color: "#ff6b6b", fontSize: 13 }}>{error}</div>}

        <button
          onClick={login}
          disabled={loading}
          style={{ padding: 12, borderRadius: 12, border: "1px solid white", background: "transparent", color: "white", fontWeight: 900, cursor: "pointer" }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>
    </main>
  );
}
