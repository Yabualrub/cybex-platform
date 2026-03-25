"use client";

import { useEffect, useState } from "react";
import {
  getTenantServices,
  TenantService,
  TenantServiceKey,
} from "@/lib/api";

const SERVICE_LABELS: Record<TenantServiceKey, string> = {
  ai_agent: "AI Agent",
  ai_calls: "AI Calls",
  dental: "Dental Platform",
  rmm: "RMM",
  vision: "Vision / Cameras",
};

export default function ServicesPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [services, setServices] = useState<TenantService[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const res = await getTenantServices();
      setServices(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load services");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleService(
    key: TenantServiceKey,
    enabled: boolean
  ) {
    setBusyKey(key);
    setErr(null);

    try {
      const res = await fetch(
        `http://localhost:4001/tenant/services/${key}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled,
            plan: enabled ? "basic" : null,
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update service");
      }

      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to update service");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white">
          Services
        </h1>
        <p className="text-sm text-white/60">
          Enable or disable products for this tenant
        </p>
      </div>

      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        {loading ? (
          <div className="text-white/60">Loading…</div>
        ) : services.length ? (
          <div className="divide-y divide-white/10">
            {services.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between py-4"
              >
                <div>
                  <div className="font-semibold text-white">
                    {SERVICE_LABELS[s.key]}
                  </div>
                  <div className="text-xs text-white/50">
                    Key: {s.key}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs ${
                      s.enabled
                        ? "text-emerald-400"
                        : "text-white/40"
                    }`}
                  >
                    {s.enabled ? "Enabled" : "Disabled"}
                  </span>

                  <button
                    disabled={busyKey === s.key}
                    onClick={() =>
                      toggleService(s.key, !s.enabled)
                    }
                    className={`h-9 rounded-xl px-4 text-sm font-semibold ${
                      s.enabled
                        ? "bg-red-600/80 hover:bg-red-600"
                        : "bg-teal-600/80 hover:bg-teal-600"
                    } disabled:opacity-50`}
                  >
                    {busyKey === s.key
                      ? "Saving…"
                      : s.enabled
                      ? "Disable"
                      : "Enable"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-white/60">
            No services found.
          </div>
        )}
      </div>
    </div>
  );
}
