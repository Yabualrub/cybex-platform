// src/app/(portal)/support/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import {
  getSupportTickets,
  getSupportTicket,
  supportReply,
  supportUpdateTicketStatus,
  TicketStatus,
} from "@/lib/api";

type SupportTicketRow = {
  id: string;
  title?: string;
  status?: string;
  createdAt?: string;
  tenantId?: string;
  tenant?: { id: string; name?: string | null } | null;
  createdBy?: { id: string; email?: string | null; fullName?: string | null } | null;
};

const STATUS_OPTIONS: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_ON_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];

const TABS = [
  { key: "inbox", label: "Inbox" },
  { key: "customers", label: "Customers" },
  { key: "rmm", label: "RMM" },
  { key: "audit", label: "Audit" }, // ADMIN only
] as const;

export default function SupportConsolePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { me } = useMe();

  const role = (me?.role ?? "").toUpperCase();
  const isAdmin = role === "ADMIN";

  const tab = (sp.get("tab") || "inbox").toLowerCase();
  const ticketId = sp.get("ticket") || "";

  // Guard: TECH/ADMIN only
  useEffect(() => {
    if (!me) return;
    if (role !== "TECH" && role !== "ADMIN") router.replace("/dashboard");
  }, [me, role, router]);

  const activeTab = useMemo(() => {
    if (tab === "audit" && !isAdmin) return "inbox";
    return tab;
  }, [tab, isAdmin]);

  // Inbox list state
  const [loadingList, setLoadingList] = useState(true);
  const [listErr, setListErr] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);

  // Ticket side panel state
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [ticketErr, setTicketErr] = useState<string | null>(null);
  const [ticket, setTicket] = useState<any>(null);

  // Reply composer
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState<null | "reply" | "status">(null);

  async function loadInbox() {
    setListErr(null);
    setLoadingList(true);
    try {
      const t = await getSupportTickets();
      const arr = Array.isArray(t) ? (t as any) : [];
      setTickets(arr);

      // لو ما في ticket محدد، وخاصّة أول مرة، اختار أول واحد
      const current = sp.get("ticket");
      if (!current && arr.length) {
        router.replace(`/support?tab=inbox&ticket=${arr[0].id}`);
      }
    } catch (e: any) {
      if (e?.message === "UNAUTHORIZED") return router.replace("/login");
      setListErr(e?.message ?? "Failed to load inbox");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadTicket(id: string) {
    if (!id) {
      setTicket(null);
      return;
    }
    setTicketErr(null);
    setLoadingTicket(true);
    try {
      const t = await getSupportTicket(id);
      setTicket(t ?? null);
    } catch (e: any) {
      if (e?.message === "UNAUTHORIZED") return router.replace("/login");
      setTicketErr(e?.message ?? "Failed to load ticket");
      setTicket(null);
    } finally {
      setLoadingTicket(false);
    }
  }

  // Load tab content
  useEffect(() => {
    if (activeTab === "inbox") loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Load selected ticket
  useEffect(() => {
    if (activeTab !== "inbox") return;
    loadTicket(ticketId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, ticketId]);

  function goTab(k: string) {
    // لما تغيّر تبويب، نشيل ticket param
    router.push(`/support?tab=${k}`);
  }

  function openTicket(id: string) {
    router.push(`/support?tab=inbox&ticket=${id}`);
  }

  function closePanel() {
    router.push(`/support?tab=inbox`);
  }

  async function onSendReply() {
    const body = replyText.trim();
    if (!ticketId || !body) return;

    setBusy("reply");
    setTicketErr(null);

    // optimistic append
    const optimistic = {
      id: `optimistic_${Date.now()}`,
      body,
      createdAt: new Date().toISOString(),
      author: {
        id: me?.id || "local",
        email: me?.email || "you@local",
        fullName: me?.email || "You",
        role: me?.role || "TECH",
      },
    };

    setTicket((prev: any) => {
      if (!prev) return prev;
      const msgs = Array.isArray(prev.messages) ? prev.messages : [];
      return { ...prev, messages: [...msgs, optimistic] };
    });

    try {
      await supportReply(ticketId, body);
      setReplyText("");
      await loadTicket(ticketId);
      await loadInbox(); // لتحديث آخر نشاط/ترتيب مستقبلاً
    } catch (e: any) {
      setTicket((prev: any) => {
        if (!prev) return prev;
        const msgs = Array.isArray(prev.messages) ? prev.messages : [];
        return { ...prev, messages: msgs.filter((m: any) => m.id !== optimistic.id) };
      });
      setTicketErr(e?.message ?? "Reply failed");
    } finally {
      setBusy(null);
    }
  }

  async function onChangeStatus(next: TicketStatus) {
    if (!ticketId) return;
    setBusy("status");
    setTicketErr(null);

    // optimistic status
    setTicket((prev: any) => (prev ? { ...prev, status: next } : prev));
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: next } : t))
    );

    try {
      await supportUpdateTicketStatus(ticketId, next);
      await loadTicket(ticketId);
      await loadInbox();
    } catch (e: any) {
      setTicketErr(e?.message ?? "Status update failed");
      await loadTicket(ticketId); // رجّع الحقيقة
      await loadInbox();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Support Console</h1>
          <p className="text-sm text-white/60">Inbox + Side panel (TECH / ADMIN)</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => {
          const disabled = t.key === "audit" && !isAdmin;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              disabled={disabled}
              onClick={() => goTab(t.key)}
              className={[
                "h-9 rounded-xl px-3 text-sm font-medium transition",
                active ? "bg-white/10 text-white" : "bg-white/5 text-white/80 hover:bg-white/10",
                disabled ? "opacity-50 cursor-not-allowed hover:bg-white/5" : "",
              ].join(" ")}
              title={disabled ? "Admin only" : ""}
            >
              {t.label}
              {t.key === "audit" && !isAdmin ? " (Admin)" : ""}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === "inbox" ? (
        <div className="grid gap-4 lg:grid-cols-5 min-h-0">
          {/* LEFT: Inbox list */}
          <div className="lg:col-span-2 min-h-0">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 min-h-0 flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-base font-extrabold text-white">Inbox</div>
                  <div className="text-xs text-white/60">All tenants tickets</div>
                </div>

                <button
                  onClick={loadInbox}
                  className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white/80 hover:bg-white/10"
                >
                  Refresh
                </button>
              </div>

              {listErr ? (
                <pre className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {listErr}
                </pre>
              ) : null}

              <div className="mt-4 min-h-0 flex-1 overflow-auto pr-2">
                {loadingList ? (
                  <div className="text-sm text-white/60">Loading…</div>
                ) : tickets.length ? (
                  <div className="space-y-2">
                    {tickets.map((t) => {
                      const active = t.id === ticketId;
                      const tenantLabel =
                        t.tenant?.name ||
                        t.tenantId ||
                        "Tenant";

                      const requester =
                        t.createdBy?.email ||
                        t.createdBy?.fullName ||
                        "";

                      return (
                        <button
                          key={t.id}
                          onClick={() => openTicket(t.id)}
                          className={[
                            "w-full text-left flex items-center justify-between rounded-xl border px-3 py-3 transition",
                            active
                              ? "border-white/20 bg-white/10"
                              : "border-white/10 bg-black/20 hover:bg-black/30",
                          ].join(" ")}
                        >
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-white/90">
                              {t.title ?? t.id}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/50">
                              <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5">
                                {tenantLabel}
                              </span>
                              {requester ? (
                                <span className="truncate">{requester}</span>
                              ) : null}
                            </div>
                            <div className="mt-1 text-xs text-white/40">
                              {t.createdAt ? new Date(t.createdAt).toLocaleString() : ""}
                            </div>
                          </div>

                          <StatusChip status={t.status} />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-white/60">No tickets in queue</div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Side Panel */}
          <div className="lg:col-span-3 min-h-0">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 min-h-0 flex flex-col">
              {!ticketId ? (
                <div className="text-sm text-white/60">
                  Select a ticket from the inbox to view details.
                </div>
              ) : loadingTicket ? (
                <div className="text-sm text-white/60">Loading ticket…</div>
              ) : ticketErr ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {ticketErr}
                </div>
              ) : !ticket ? (
                <div className="text-sm text-white/60">Ticket not found.</div>
              ) : (
                <>
                  {/* Panel header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-lg font-extrabold text-white truncate">
                        {ticket.title ?? "(no title)"}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60">
                        <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5">
                          {ticket.tenant?.name || ticket.tenantId}
                        </span>
                        <span className="text-white/40">ID: {ticket.id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={(ticket.status ?? "OPEN") as TicketStatus}
                        onChange={(e) => onChangeStatus(e.target.value as TicketStatus)}
                        disabled={busy === "status"}
                        className="h-9 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-white/20"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={closePanel}
                        className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/80 hover:bg-white/10"
                        title="Close"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/80 whitespace-pre-wrap">
                    {ticket.description ?? "No description."}
                  </div>

                  {/* Messages thread (scroll only here) */}
                  <div className="mt-4 min-h-0 flex-1 overflow-auto pr-2">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-bold text-white">Thread</div>
                      <div className="text-xs text-white/50">
                        {(ticket.messages?.length ?? 0)} message(s)
                      </div>
                    </div>

                    {Array.isArray(ticket.messages) && ticket.messages.length ? (
                      <div className="space-y-2">
                        {ticket.messages.map((m: any) => {
                          const email = m?.author?.email || "Unknown";
                          const when = m?.createdAt ? new Date(m.createdAt).toLocaleString() : "";
                          return (
                            <div
                              key={m.id}
                              className="rounded-xl border border-white/10 bg-black/20 p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-xs text-white/70 font-semibold truncate">
                                  {email}
                                </div>
                                <div className="text-[11px] text-white/40">{when}</div>
                              </div>
                              <div className="mt-2 whitespace-pre-wrap text-sm text-white/80">
                                {m.body ?? ""}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-white/60">No messages yet.</div>
                    )}
                  </div>

                  {/* Reply composer fixed bottom */}
                  <div className="mt-4 border-t border-white/10 pt-3">
                    <div className="flex gap-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={2}
                        placeholder="Write a reply…"
                        className="w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/20"
                      />
                      <button
                        onClick={onSendReply}
                        disabled={!replyText.trim() || busy === "reply"}
                        className="h-[76px] w-28 rounded-xl bg-teal-600/80 text-sm font-bold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busy === "reply" ? "Sending…" : "Send"}
                      </button>
                    </div>

                    {ticketErr ? (
                      <div className="mt-2 text-xs text-red-200">{ticketErr}</div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "customers" ? (
        <Placeholder
          title="Customers"
          subtitle="Search users / reset password / enable services (next)"
          body="Next: user search + reset password + toggle services + impersonate session."
        />
      ) : null}

      {activeTab === "rmm" ? (
        <Placeholder
          title="RMM"
          subtitle="Remote support & monitoring (Tactical RMM) — soon"
          body="Next: list devices per tenant + open Tactical RMM remote session + scripts."
        />
      ) : null}

      {activeTab === "audit" ? (
        <Placeholder
          title="Audit"
          subtitle="Admin-only activity logs (next)"
          body="Next: audit table + filters (date/user/action/tenant)."
        />
      ) : null}
    </div>
  );
}

function Placeholder({ title, subtitle, body }: { title: string; subtitle: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="text-lg font-extrabold text-white">{title}</div>
      <div className="mt-1 text-xs text-white/60">{subtitle}</div>
      <div className="mt-4 text-sm text-white/70">{body}</div>
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

  return <span className={`rounded-full border px-2.5 py-1 text-[11px] ${cls}`}>{s}</span>;
}
