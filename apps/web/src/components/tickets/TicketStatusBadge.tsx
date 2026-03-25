// components/tickets/TicketStatusBadge.tsx
import { TicketStatus } from "@/src/lib/api";
import { cn } from "@/lib/utils";

export default function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const style = badgeStyle(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        style
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function badgeStyle(s: TicketStatus) {
  switch (s) {
    case "OPEN":
      return "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25";
    case "IN_PROGRESS":
      return "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/25";
    case "WAITING_ON_CUSTOMER":
      return "bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/25";
    case "RESOLVED":
      return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25";
    case "CLOSED":
      return "bg-zinc-500/15 text-zinc-300 ring-1 ring-zinc-500/25";
    default:
      return "bg-zinc-500/15 text-zinc-300 ring-1 ring-zinc-500/25";
  }
}
