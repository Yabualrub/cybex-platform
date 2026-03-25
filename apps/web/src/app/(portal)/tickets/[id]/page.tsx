// src/app/(portal)/tickets/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TicketStatusBadge from "@/components/tickets/TicketStatusBadge";
import CommentsThread from "@/components/tickets/CommentsThread";
import CommentComposer from "@/components/tickets/CommentComposer";
import {
  addTicketComment,
  getTicket,
  TicketComment,
  TicketDetail,
  TicketStatus,
  updateTicketStatus,
} from "@/lib/api";
import { useMe } from "@/lib/useMe";

const STATUS_OPTIONS: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_ON_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const { me } = useMe();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSupportActions = useMemo(() => {
    const role = me?.role;
    return role === "TECH" || role === "ADMIN";
  }, [me]);

  useEffect(() => {
    if (!id) return;
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const t = await getTicket(id);
        if (!alive) return;
        setTicket(t);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Failed to load ticket.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [id]);

  async function refresh() {
    if (!id) return;
    const t = await getTicket(id);
    setTicket(t);
  }

  async function onSendComment(body: string) {
    if (!id || !ticket) return;

    setBusy("comment");

    // optimistic add
    const optimistic: TicketComment = {
      id: `optimistic_${Date.now()}`,
      ticketId: id,
      body,
      createdAt: new Date().toISOString(),
      author: {
        id: me?.id || "local",
        email: me?.email || "you@local",
        role: me?.role || "OWNER",
      },
    };

    setTicket((prev) =>
      prev ? { ...prev, comments: [...(prev.comments || []), optimistic] } : prev
    );

    try {
      await addTicketComment(id, body);
      await refresh();
    } catch (e) {
      setTicket((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: (prev.comments || []).filter((c) => c.id !== optimistic.id),
        };
      });
      throw e;
    } finally {
      setBusy(null);
    }
  }

  async function onChangeStatus(status: TicketStatus) {
    if (!id) return;
    setBusy("status");
    try {
      await updateTicketStatus(id, status);
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 text-zinc-300">
        Loading ticket…
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-6 text-red-200">
        {error || "Ticket not found."}
        <div className="mt-4">
          <button
            onClick={() => router.push("/tickets")}
            className="h-10 rounded-xl border border-red-900/60 px-4 text-sm font-semibold hover:bg-red-900/20"
          >
            Back to tickets
          </button>
        </div>
      </div>
    );
  }

  return (
    // ✅ page fills height; no page scroll
    <div className="h-full min-h-0 flex flex-col gap-4">
      {/* Header (fixed) */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">Ticket</p>
            <h2 className="truncate text-lg font-semibold text-zinc-100">
              {ticket.title}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Created {formatDt(ticket.createdAt)} • Updated{" "}
              {ticket.updatedAt ? formatDt(ticket.updatedAt) : "—"}
            </p>
            <p className="mt-1 text-xs text-zinc-600">ID: {ticket.id}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <TicketStatusBadge status={ticket.status} />

            <button
              onClick={refresh}
              className="h-9 rounded-xl border border-zinc-800 px-3 text-sm font-medium text-zinc-200 hover:bg-zinc-900"
            >
              Refresh
            </button>

            <button
              onClick={() => router.push("/tickets")}
              className="h-9 rounded-xl border border-zinc-800 px-3 text-sm font-medium text-zinc-200 hover:bg-zinc-900"
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Body area (flex-1) */}
      <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 min-h-0 flex flex-col gap-4">
          {/* Description (fixed height natural) */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
            <p className="text-sm font-semibold text-zinc-200">Description</p>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-200">
              {ticket.description || "—"}
            </div>
          </div>

          {/* ✅ Comments scroll area */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="h-full min-h-0 overflow-auto pr-1">
              <CommentsThread comments={ticket.comments || []} />
            </div>
          </div>

          {/* Composer stays visible */}
          <CommentComposer onSend={onSendComment} disabled={busy === "comment"} />
        </div>

        {/* Right column */}
        <div className="min-h-0 flex flex-col gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
            <p className="text-sm font-semibold text-zinc-200">Meta</p>
            <div className="mt-3 space-y-2 text-sm">
              <MetaRow k="Tenant" v={ticket.tenantId} />
              <MetaRow k="Requester" v={ticket.requester?.email || "—"} />
              <MetaRow k="Assignee" v={"Coming soon"} />
            </div>
          </div>

          {canSupportActions ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
              <p className="text-sm font-semibold text-zinc-200">Support Actions</p>
              <p className="mt-1 text-xs text-zinc-500">TECH / ADMIN only.</p>

              <div className="mt-3">
                <label className="text-xs text-zinc-500">Status</label>
                <select
                  value={ticket.status}
                  onChange={(e) => onChangeStatus(e.target.value as TicketStatus)}
                  disabled={busy === "status"}
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 outline-none focus:border-zinc-700 focus:ring-2 focus:ring-zinc-800 disabled:opacity-60"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/30 p-3 text-xs text-zinc-400">
                Assignment / queues next (we’ll add assigneeId + endpoints).
              </div>
            </div>
          ) : null}

          {busy ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 text-xs text-zinc-400">
              Working… ({busy})
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MetaRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-zinc-500">{k}</span>
      <span className="max-w-[60%] break-words text-right text-zinc-200">{v}</span>
    </div>
  );
}

function formatDt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
