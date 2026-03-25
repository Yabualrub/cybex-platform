"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getSupportTicket,
  supportReply,
  supportUpdateTicketStatus,
  SupportTicketDetail,
  TicketStatus,
} from "@/lib/api";
import { useMe } from "@/lib/useMe";

const STATUS_OPTIONS: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_ON_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];

export default function SupportTicketDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? "");
  const { me } = useMe();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);

  const [replyBody, setReplyBody] = useState("");
  const timerRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const canSupport = useMemo(() => {
    const r = (me?.role ?? "").toUpperCase();
    return r === "TECH" || r === "ADMIN";
  }, [me?.role]);

  useEffect(() => {
    if (!me) return;
    if (!canSupport) router.replace("/dashboard");
  }, [me, canSupport, router]);

  function isUnauthorized(e: any) {
    const status = e?.status;
    const msg = String(e?.message || "");
    return (
      status === 401 ||
      msg.toUpperCase().includes("UNAUTHORIZED") ||
      msg.includes("401")
    );
  }

  async function load(opts?: { silent?: boolean }) {
    if (!id) return;

    if (!opts?.silent) {
      setErr(null);
      setLoading(true);
    }

    try {
      const t = await getSupportTicket(id);
      setTicket(t ?? null);
    } catch (e: any) {
      if (isUnauthorized(e)) return router.replace("/login");
      setErr(e?.message ?? "Failed");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;

    load();

    timerRef.current = setInterval(() => {
      load({ silent: true });
    }, 30_000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!ticket?.messages) return;
    const t = setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      50
    );
    return () => clearTimeout(t);
  }, [ticket?.messages?.length]);

  async function onChangeStatus(next: TicketStatus) {
    if (!id || !ticket) return;

    setBusy("status");
    setErr(null);

    const prev = ticket.status;
    setTicket({ ...ticket, status: next });

    try {
      await supportUpdateTicketStatus(id, next);
      await load({ silent: true });
    } catch (e: any) {
      setTicket((p) => (p ? { ...p, status: prev } : p));

      if (isUnauthorized(e)) return router.replace("/login");

      const msg = String(e?.message || "");
      if (e?.status === 403 || msg.toLowerCase().includes("forbidden")) {
        setErr("Forbidden: your role cannot change status for this ticket.");
      } else if (e?.status === 404 || msg.includes("Cannot") || msg.includes("404")) {
        setErr("Not found: support status endpoint not found (check backend route).");
      } else {
        setErr(e?.message ?? "Failed to update status");
      }
    } finally {
      setBusy(null);
    }
  }

  async function onSendReply() {
    const body = replyBody.trim();
    if (!body || !id || !ticket) return;

    setBusy("reply");
    setErr(null);

    const optimistic = {
      id: `optimistic_${Date.now()}`,
      body,
      createdAt: new Date().toISOString(),
      authorId: me?.id ?? null,
      author: me?.email
        ? { id: me?.id ?? "me", email: me.email, fullName: null, role: me.role }
        : null,
    };

    setTicket({ ...ticket, messages: [...(ticket.messages || []), optimistic] });
    setReplyBody("");

    try {
      await supportReply(id, body);
      await load({ silent: true });
    } catch (e: any) {
      setTicket((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: (prev.messages || []).filter((m) => m.id !== optimistic.id),
        };
      });

      if (isUnauthorized(e)) return router.replace("/login");
      setErr(e?.message ?? "Failed to send reply");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="text-white/70">Loading…</div>;

  if (err && !ticket) {
    return (
      <div className="space-y-3">
        <Link
          href="/support/tickets"
          className="inline-flex rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
        >
          Back
        </Link>

        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="space-y-3">
        <Link
          href="/support/tickets"
          className="inline-flex rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
        >
          Back
        </Link>
        <div className="text-white/70">Ticket not found.</div>
      </div>
    );
  }

  const tenantLabel = ticket.tenant?.name ?? ticket.tenantId;
  const requester = ticket.createdBy?.email ?? "—";

  const messages = [...(ticket.messages || [])].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return da - db;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Support Ticket</h1>
          <p className="text-sm text-white/60">#{ticket.id}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/support/tickets"
            className="h-10 inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/90 hover:bg-white/10"
          >
            Back
          </Link>

          <button
            onClick={() => load()}
            className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/90 hover:bg-white/10"
            title="Reload now"
          >
            Reload
          </button>
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-lg font-bold text-white">
              {ticket.title ?? "(no title)"}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/50">
              <span>Tenant: {tenantLabel}</span>
              <span className="text-white/35">•</span>
              <span>From: {requester}</span>
              <span className="text-white/35">•</span>
              <span>
                Created:{" "}
                {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "—"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={ticket.status}
              onChange={(e) => onChangeStatus(e.target.value as TicketStatus)}
              disabled={busy === "status"}
              className="h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-white/20 disabled:opacity-60"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>

            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/70">
              {busy === "status" ? "Updating…" : ticket.status.replaceAll("_", " ")}
            </span>
          </div>
        </div>

        <div className="mt-3 whitespace-pre-wrap text-sm text-white/70">
          {ticket.description ?? "No description."}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="text-base font-bold text-white">Messages</div>
          <div className="text-xs text-white/50">{messages.length}</div>
        </div>

        <div className="mt-3 max-h-[48vh] overflow-y-auto pr-2 space-y-2">
          {messages.length ? (
            messages.map((m) => {
              const email = m.author?.email ?? "Unknown";
              const when = m.createdAt ? new Date(m.createdAt).toLocaleString() : "—";

              return (
                <div
                  key={m.id}
                  className="rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-white/90">{email}</div>
                    <div className="text-xs text-white/50">{when}</div>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-white/70">
                    {m.body}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-sm text-white/60">No messages yet.</div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="mt-4 grid gap-2">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write a reply to the customer…"
            rows={4}
            className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/20"
          />

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onSendReply}
              disabled={!replyBody.trim() || busy === "reply"}
              className="h-10 rounded-xl bg-teal-600/80 px-4 text-sm font-semibold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "reply" ? "Sending…" : "Send Reply"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
