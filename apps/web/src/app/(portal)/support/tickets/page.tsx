"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupportTickets, TicketStatus, SupportTicket } from "@/lib/api";
import { useMe } from "@/lib/useMe";

const STATUS_OPTIONS: Array<TicketStatus | "ALL"> = [
  "ALL",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_ON_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];

export default function SupportInboxPage() {
  const router = useRouter();
  const { me } = useMe();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("ALL");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const timerRef = useRef<any>(null);

  // ✅ TECH/ADMIN only
  useEffect(() => {
    const role = (me?.role ?? "").toUpperCase();
    if (!me) return;
    if (!["TECH", "ADMIN"].includes(role)) {
      router.replace("/dashboard");
    }
  }, [me, router]);

  async function load(opts?: { silent?: boolean }) {
    if (!opts?.silent) {
      setErr(null);
      setLoading(true);
    }

    try {
      const t = await getSupportTickets();
      const arr = Array.isArray(t) ? t : [];

      // ✅ newest first
      arr.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });

      setTickets(arr);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e: any) {
      if (e?.status === 401) return router.replace("/login");
      const msg = String(e?.message || "");
      if (msg.includes("401") || msg.toUpperCase().includes("UNAUTHORIZED")) {
        return router.replace("/login");
      }
      setErr(e?.message ?? "Failed");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  // initial load + auto refresh
  useEffect(() => {
    load();

    timerRef.current = setInterval(() => {
      load({ silent: true });
    }, 30_000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return (tickets || []).filter((t) => {
      const matchStatus = status === "ALL" ? true : (t.status || "OPEN") === status;
      if (!qq) return matchStatus;

      const hay = [t.id, t.title, t.tenantId, t.tenant?.name, t.createdBy?.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchStatus && hay.includes(qq);
    });
  }, [tickets, q, status]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-extrabold">Support Inbox</h1>
          <p className="text-xs text-white/60">
            Queue across tenants (TECH / ADMIN)
            {lastUpdated ? (
              <span className="ml-2 text-white/40">• Updated {lastUpdated}</span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, tenant, requester email…"
            className="h-10 w-72 max-w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/20"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-white/20"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "All statuses" : s.replaceAll("_", " ")}
              </option>
            ))}
          </select>

          <button
            onClick={() => load()}
            className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white/80 hover:bg-white/10"
            title="Reload now"
          >
            Reload
          </button>
        </div>
      </div>

      {err && (
        <pre className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </pre>
      )}

      {/* List card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-xs text-white/50">
            Showing{" "}
            <span className="text-white/80 font-semibold">{filtered.length}</span>{" "}
            ticket{filtered.length === 1 ? "" : "s"}
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-white/60">Loading…</div>
        ) : filtered.length ? (
          <div className="max-h-[62vh] overflow-y-auto pr-2 space-y-2">
            {filtered.map((t) => (
              <Link
                key={t.id}
                href={`/support/tickets/${t.id}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-3 hover:bg-black/30"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-white/90">
                    {t.title ?? t.id}
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/50">
                    <span>{t.createdAt ? new Date(t.createdAt).toLocaleString() : ""}</span>
                    <span className="text-white/35">•</span>
                    <span className="truncate">Tenant: {t.tenant?.name ?? t.tenantId}</span>

                    {t.createdBy?.email ? (
                      <>
                        <span className="text-white/35">•</span>
                        <span className="truncate">From: {t.createdBy.email}</span>
                      </>
                    ) : null}
                  </div>
                </div>

                <StatusChip status={t.status} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-sm text-white/60">No tickets in queue</div>
        )}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status?: string }) {
  const s = (status ?? "OPEN").toUpperCase();
  const cls =
    s === "OPEN"
      ? "bg-amber-500/15 text-amber-200 border-amber-500/30"
      : s === "CLOSED"
      ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/30"
      : "bg-white/10 text-white/70 border-white/10";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${cls}`}>
      {s.replaceAll("_", " ")}
    </span>
  );
}
