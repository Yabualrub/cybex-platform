"use client";

import { useEffect, useMemo, useState } from "react";
import { getAuditLogs, AuditLog } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { useRouter } from "next/navigation";

export default function AuditPage() {
  const router = useRouter();
  const { me } = useMe();

  const [rows, setRows] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [action, setAction] = useState<string>("ALL");
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const canSeeAudit = useMemo(() => {
    const role = me?.role;
    return role === "ADMIN" || role === "TECH";
  }, [me]);

  const actionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(r.action);
    return ["ALL", ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (action !== "ALL" && r.action !== action) return false;
      if (!qq) return true;

      const blob = [
        r.action,
        r.entityType,
        r.entityId,
        r.userEmail,
        r.userId,
        r.tenantName,
        r.tenantId,
        r.ip,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return blob.includes(qq);
    });
  }, [rows, q, action]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditLogs({ take: 300 });
      setRows(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!me) return;
    // لو مش مسموح يشوف Audit — رجعه للداشبورد
    if (!canSeeAudit) {
      router.push("/dashboard");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, canSeeAudit]);

  async function refresh() {
    setBusy(true);
    try {
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!me) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 text-zinc-300">
        Loading…
      </div>
    );
  }

  if (!canSeeAudit) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 text-zinc-300">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">Admin</p>
            <h2 className="truncate text-lg font-semibold text-zinc-100">Audit Log</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Everything important that happened in the system.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={refresh}
              className="h-9 rounded-xl border border-zinc-800 px-3 text-sm font-medium text-zinc-200 hover:bg-zinc-900 disabled:opacity-60"
              disabled={busy || loading}
            >
              {busy ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search (action, user, tenant, entity, ip)…"
            className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 outline-none focus:border-zinc-700 focus:ring-2 focus:ring-zinc-800"
          />

          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 outline-none focus:border-zinc-700 focus:ring-2 focus:ring-zinc-800"
          >
            {actionOptions.map((a) => (
              <option key={a} value={a}>
                {a === "ALL" ? "All actions" : a}
              </option>
            ))}
          </select>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-400">
            Showing <span className="text-zinc-200 font-semibold">{filtered.length}</span> of{" "}
            <span className="text-zinc-200 font-semibold">{rows.length}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 text-zinc-300">
          Loading audit…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-6 text-red-200">
          {error}
          <div className="mt-4">
            <button
              onClick={load}
              className="h-10 rounded-xl border border-red-900/60 px-4 text-sm font-semibold hover:bg-red-900/20"
            >
              Try again
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 text-zinc-300">
          No results.
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="bg-zinc-950/60">
                <tr className="text-left text-xs text-zinc-400">
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-zinc-900 hover:bg-zinc-950/60 cursor-pointer"
                    onClick={() => setSelected(r)}
                  >
                    <td className="px-4 py-3 text-zinc-300">{fmt(r.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-950/40 px-2 py-1 text-xs font-semibold text-zinc-200">
                        {r.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {r.tenantName ? (
                        <span className="text-zinc-200 font-semibold">{r.tenantName}</span>
                      ) : (
                        <span className="text-zinc-400">{short(r.tenantId || "—")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {r.userEmail || short(r.userId || "—")}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      <span className="text-zinc-400">{r.entityType || "—"}</span>{" "}
                      <span className="text-zinc-500">{r.entityId ? `(${short(r.entityId)})` : ""}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{r.ip || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Drawer */}
      {selected ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-zinc-500">Audit Details</p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">{selected.action}</p>
              <p className="mt-1 text-xs text-zinc-500">{fmt(selected.createdAt)}</p>
            </div>

            <button
              onClick={() => setSelected(null)}
              className="h-9 rounded-xl border border-zinc-800 px-3 text-sm font-medium text-zinc-200 hover:bg-zinc-900"
            >
              Close
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <KV k="Tenant" v={selected.tenantName || selected.tenantId || "—"} />
            <KV k="User" v={selected.userEmail || selected.userId || "—"} />
            <KV k="EntityType" v={selected.entityType || "—"} />
            <KV k="EntityId" v={selected.entityId || "—"} />
            <KV k="IP" v={selected.ip || "—"} />
            <KV k="UserAgent" v={selected.userAgent || "—"} />
          </div>

          <div className="mt-4">
            <p className="text-xs text-zinc-500">Metadata</p>
            <pre className="mt-2 max-h-[320px] overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-200">
{pretty(selected.metadata)}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">
      <p className="text-xs text-zinc-500">{k}</p>
      <p className="mt-1 break-words text-sm text-zinc-200">{v}</p>
    </div>
  );
}

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function short(s: string) {
  if (!s) return "—";
  if (s.length <= 10) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function pretty(v: any) {
  try {
    return JSON.stringify(v ?? null, null, 2);
  } catch {
    return String(v);
  }
}
