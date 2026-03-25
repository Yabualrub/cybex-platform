// apps/web/src/app/(portal)/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useMe } from "@/lib/useMe";

export default function DashboardPage() {
  const router = useRouter();
  const { me } = useMe();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [services, setServices] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);

  const role = me?.role;

  useEffect(() => {
    // ✅ مهم جداً: لا تعمل ولا طلب قبل ما me تكون جاهزة
    if (!me) return;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        // ✅ TECH dashboard: support tickets فقط
        if (role === "TECH") {
          const supportTickets = await apiFetch("/tickets/support/all");
          setTickets(Array.isArray(supportTickets) ? supportTickets : []);
          setServices([]);
          setAudit([]);
          return;
        }

        // ✅ OWNER/ADMIN/USER: tenant overview
        const [s, t, a] = await Promise.all([
          apiFetch("/tenant/services"),
          apiFetch("/tickets"),
          apiFetch("/audit?limit=20"),
        ]);

        setServices(Array.isArray(s) ? s : []);
        setTickets(Array.isArray(t) ? t : []);
        setAudit(Array.isArray(a) ? a : []);
      } catch (e: any) {
        if (e?.status === 401) return router.replace("/login");
        setErr(e?.message ?? "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, role, me]);

  if (loading) return <div className="p-2 text-white/80">Loading…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Dashboard</h1>
        <p className="text-sm text-white/60">
          {role === "TECH" ? "Support overview" : "Overview of your tenant & activity"}
        </p>
      </div>

      {err && (
        <pre className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </pre>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {role !== "TECH" ? (
          <Card title="Services">
            {services.length ? (
              <div className="space-y-2 max-h-64 overflow-auto pr-2">
                {services.map((x) => (
                  <Row key={x.key} left={x.key} right={x.plan ? `${x.enabled} • ${x.plan}` : String(x.enabled)} />
                ))}
              </div>
            ) : (
              <Muted>No services yet</Muted>
            )}
          </Card>
        ) : null}

        <Card title={role === "TECH" ? "Support Tickets (latest)" : "Tickets (latest)"}>
          {tickets.length ? (
            <div className="space-y-2 max-h-64 overflow-auto pr-2">
              {tickets.slice(0, 30).map((t) => (
                <Row
                  key={t.id}
                  left={
                    role === "TECH"
                      ? `${t.title ?? t.id}  •  ${t.tenant?.name ?? t.tenantId ?? ""}`
                      : t.title ?? t.id
                  }
                  right={t.status ?? ""}
                />
              ))}
            </div>
          ) : (
            <Muted>No tickets yet</Muted>
          )}
        </Card>

        {role !== "TECH" ? (
          <Card title="Audit (latest)">
            {audit.length ? (
              <div className="space-y-2 max-h-64 overflow-auto pr-2">
                {audit.slice(0, 30).map((a) => (
                  <Row
                    key={a.id}
                    left={a.action ?? a.id}
                    right={a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                  />
                ))}
              </div>
            ) : (
              <Muted>No audit logs</Muted>
            )}
          </Card>
        ) : (
          <Card title="Next">
            <p className="text-sm text-white/70">
              🔧 Next: Support Console (queues + assignment + SLA + filters) + RMM module entry.
            </p>
          </Card>
        )}

        {role !== "TECH" ? (
          <Card title="Next">
            <p className="text-sm text-white/70">
              الأساس ثابت ✅. الجاي: Tickets flow كامل + Support Console + Users & Roles + Billing.
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function Card({ title, children }: any) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 min-h-0">
      <div className="mb-3 text-base font-bold">{title}</div>
      {children}
    </div>
  );
}

function Row({ left, right }: any) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-2 text-sm gap-3">
      <div className="font-semibold text-white/90 truncate">{left}</div>
      <div className="text-white/60 shrink-0">{right}</div>
    </div>
  );
}

function Muted({ children }: any) {
  return <div className="text-sm text-white/50">{children}</div>;
}
