"use client";

import { TicketComment } from "@/lib/api";

export default function CommentsThread({
  comments,
  height,
}: {
  comments: TicketComment[];
  /** optional: fixed height like 320 or "60vh". If not provided, it will fill available space. */
  height?: number | string;
}) {
  const safeComments = Array.isArray(comments) ? comments : [];

  return (
    <div
      className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 flex flex-col min-h-0"
      style={height ? { height } : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-200">Comments</p>
        <p className="text-xs text-zinc-500">{safeComments.length}</p>
      </div>

      {/* Empty */}
      {safeComments.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">No comments yet.</p>
      ) : (
        // ✅ This area scrolls, not the whole page
        <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-2 space-y-3">
          {safeComments.map((c) => {
            const email = c?.author?.email || "Unknown";
            const role = c?.author?.role || "USER";
            const when = c?.createdAt ? formatDt(c.createdAt) : "—";
            const body = c?.body || "";

            return (
              <div
                key={c?.id || `${email}_${when}_${Math.random()}`}
                className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-zinc-800/70 text-[11px] font-bold text-zinc-200">
                      {(email[0] || "U").toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-200">
                        {email}
                      </p>
                      <p className="text-xs text-zinc-500">{role}</p>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-500 whitespace-nowrap">{when}</p>
                </div>

                <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                  {body}
                </div>
              </div>
            );
          })}
        </div>
      )}
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
