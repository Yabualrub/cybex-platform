"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  createAgentConversation,
  deleteAgentConversation,
  getAgentConversations,
  getAgentMessages,
  sendAgentMessage,
  type AgentConversation,
  type AgentMessage,
} from "@/lib/api";

export default function AgentUI() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [convos, setConvos] = useState<AgentConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [text, setText] = useState("");

  async function loadConvos() {
    setErr(null);
    setLoading(true);
    try {
      const data = await getAgentConversations();
      const arr = Array.isArray(data) ? data : [];
      setConvos(arr);
      if (!activeId && arr[0]?.id) setActiveId(arr[0].id);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(conversationId: string) {
    setErr(null);
    try {
      const data = await getAgentMessages(conversationId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load messages");
    }
  }

  useEffect(() => {
    loadConvos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const active = useMemo(
    () => convos.find((c) => c.id === activeId) ?? null,
    [convos, activeId]
  );

  async function onNewConversation() {
    setBusy("new");
    setErr(null);
    try {
      const c = await createAgentConversation({ title: "Website Chat" } as any);
      await loadConvos();
      if (c?.id) setActiveId(c.id);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create conversation");
    } finally {
      setBusy(null);
    }
  }

  async function onDeleteConversation(id: string) {
    setBusy(`del:${id}`);
    setErr(null);
    try {
      await deleteAgentConversation(id);
      const next = convos.filter((c) => c.id !== id);
      setConvos(next);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      setMessages([]);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to delete conversation");
    } finally {
      setBusy(null);
    }
  }

  async function onSend() {
    const body = text.trim();
    if (!body || !activeId) return;

    setBusy("send");
    setErr(null);

    // optimistic
    setMessages((prev) => [
      ...(prev || []),
      { id: `tmp_${Date.now()}`, role: "user", content: body, createdAt: new Date().toISOString() },
    ]);
    setText("");

    try {
      await sendAgentMessage(activeId, body);
      await loadMessages(activeId);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to send");
      // rollback: easiest reload
      await loadMessages(activeId);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold text-white">AI Agent</h1>
          <p className="text-sm text-white/60">
            Conversations + Messages (module wiring test)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNewConversation}
            disabled={busy === "new"}
            className="h-10 rounded-xl bg-teal-600/80 px-4 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-50"
          >
            {busy === "new" ? "Creating…" : "New conversation"}
          </button>

          <Link
            href="/tickets"
            className="h-10 inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white/90 hover:bg-white/10"
          >
            Back to Tickets
          </Link>
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Conversations */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 min-h-0">
          <div className="mb-3 text-base font-bold text-white">Conversations</div>

          {loading ? (
            <div className="text-sm text-white/60">Loading…</div>
          ) : convos.length ? (
            <div className="max-h-[60vh] overflow-auto pr-2 space-y-2">
              {convos.map((c) => {
                const isActive = c.id === activeId;

                // ✅ IMPORTANT: outer container is DIV (NOT button) to avoid nested button
                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={[
                      "w-full cursor-pointer rounded-xl border p-3 text-left",
                      isActive
                        ? "border-teal-500/40 bg-teal-500/10"
                        : "border-white/10 bg-black/20 hover:bg-black/30",
                    ].join(" ")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setActiveId(c.id);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-white/90">
                          {(c as any)?.title ?? (c as any)?.subject ?? "Conversation"}
                        </div>
                        <div className="text-xs text-white/50">
                          {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""} • {c.id}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // ✅ prevents selecting + avoids nested buttons problem
                          onDeleteConversation(c.id);
                        }}
                        disabled={busy === `del:${c.id}`}
                        className="h-8 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white/90 hover:bg-white/10 disabled:opacity-50"
                      >
                        {busy === `del:${c.id}` ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-white/60">No conversations yet.</div>
          )}
        </div>

        {/* Messages */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4 min-h-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-base font-bold text-white">Messages</div>
            <div className="text-xs text-white/50">
              {active ? `Active: ${active.id}` : "No active conversation"}
            </div>
          </div>

          <div className="max-h-[52vh] overflow-auto pr-2 space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
            {messages.length ? (
              messages.map((m) => (
                <div key={m.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-white/70">
                      {(m.role || "user").toUpperCase()}
                    </div>
                    <div className="text-xs text-white/40">
                      {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
                    </div>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-white/80">
                    {m.content}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-white/60">No messages.</div>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
              className="h-10 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/20"
            />
            <button
              onClick={onSend}
              disabled={!activeId || !text.trim() || busy === "send"}
              className="h-10 rounded-xl bg-teal-600/80 px-4 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-50"
            >
              {busy === "send" ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
