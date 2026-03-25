"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createTicket, getTickets } from "@/lib/api";
import { useMe } from "@/lib/useMe";

type Ticket = {
  id: string;
  title?: string;
  status?: string;
  createdAt?: string;
};

export default function TicketsPage() {
  const router = useRouter();
  const { me } = useMe();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const role = (me?.role ?? "").toUpperCase();

  // ✅ Only OWNER/ADMIN/USER can use tenant tickets
  const canUseTenantTickets = role === "OWNER" || role === "ADMIN" || role === "USER";
  // ✅ Only OWNER/USER can create (ADMIN حسب قرارك—أنا خليته يقدر كمان. إذا بدك تمنعه احكيلي)
  const canCreateTicket = role === "OWNER" || role === "ADMIN" || role === "USER";

  const formValid = useMemo(
    () => title.trim().length >= 3 && description.trim().length >= 5,
    [title, description]
  );

  useEffect(() => {
    // ✅ TECH should never land here. Send to Support Inbox.
    if (me && !canUseTenantTickets) {
      router.replace("/support/tickets");
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const t = await getTickets();
      setTickets(Array.isArray(t) ? t : []);
    } catch (e: any) {
      if (e?.message === "UNAUTHORIZED") return router.replace("/login");
      setErr(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // لا تحمل قبل ما نعرف me (عشان ما يصير flicker/redirect غلط)
    if (!me) return;
    if (!canUseTenantTickets) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  async function onCreate() {
    if (!canCreateTicket) return;
    if (!formValid) return;

    setErr(null);
    try {
      // ✅ IMPORTANT: backend expects { title, description }
      const created = await createTicket({
        title: title.trim(),
        description: description.trim(),
      });

      setTitle("");
      setDescription("");
      await load();

      if (created?.id) router.push(`/tickets/${created.id}`);
    } catch (e: any) {
      if (e?.message === "UNAUTHORIZED") return router.replace("/login");
      setErr(e?.message ?? "Create failed");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Tickets list */}
      <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4 min-h-0">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold">Your Tickets</h1>
            <p className="text-xs text-white/60">Track issues, updates, and replies</p>
          </div>

          {/* (اختياري) خففنا “Refresh” لأنه كثير بتحسه مش لازم */}
          <button
            onClick={load}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
          >
            Refresh
          </button>
        </div>

        {err && (
          <pre className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 whitespace-pre-wrap">
            {err}
          </pre>
        )}

        {loading ? (
          <div className="text-sm text-white/60">Loading…</div>
        ) : tickets.length ? (
          // ✅ scroll داخل صندوق التيكتات مش الصفحة
          <div className="space-y-2 max-h-[520px] overflow-auto pr-2">
            {tickets.map((t) => (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-3 hover:bg-black/30"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-white/90">
                    {t.title ?? t.id}
                  </div>
                  <div className="text-xs text-white/50">
                    {t.createdAt ? new Date(t.createdAt).toLocaleString() : ""}
                  </div>
                </div>

                <StatusChip status={t.status} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-sm text-white/60">No tickets yet</div>
        )}
      </div>

      {/* Create ticket (OWNER/ADMIN/USER only) */}
      {canCreateTicket ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-lg font-extrabold">New Ticket</h2>
          <p className="mt-1 text-xs text-white/60">Send an issue to support</p>

          <div className="mt-4 space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/20"
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your issue…"
              rows={6}
              className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/20"
            />

            <button
              onClick={onCreate}
              disabled={!formValid}
              className="h-10 w-full rounded-xl bg-teal-600/80 text-sm font-semibold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create Ticket
            </button>
          </div>
        </div>
      ) : (
        // TECH لو بطريقة ما وصل، يشوف رسالة محترمة
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-lg font-extrabold">Support</h2>
          <p className="mt-1 text-sm text-white/60">
            This area is for customer tickets. As TECH, use the Support Inbox.
          </p>
          <button
            onClick={() => router.push("/support/tickets")}
            className="mt-4 h-10 w-full rounded-xl bg-white/10 text-sm font-semibold text-white hover:bg-white/15"
          >
            Go to Support Inbox
          </button>
        </div>
      )}
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
      {s}
    </span>
  );
}
