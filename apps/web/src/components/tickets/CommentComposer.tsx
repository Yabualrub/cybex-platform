// components/tickets/CommentComposer.tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export default function CommentComposer({
  onSend,
}: {
  onSend: (body: string) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await onSend(trimmed);
      setBody("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <p className="text-sm font-semibold text-zinc-200">Add a comment</p>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your update…"
        className={cn(
          "mt-3 h-28 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200",
          "outline-none focus:border-zinc-700 focus:ring-2 focus:ring-zinc-800"
        )}
        disabled={loading}
      />

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={() => setBody("")}
          className="h-10 rounded-xl border border-zinc-800 px-4 text-sm font-medium text-zinc-200 hover:bg-zinc-900"
          disabled={loading || !body.trim()}
        >
          Clear
        </button>

        <button
          onClick={submit}
          className="h-10 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          disabled={loading || !body.trim()}
        >
          {loading ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
