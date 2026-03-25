// apps/web/src/components/portal/ComingSoon.tsx
"use client";

import Link from "next/link";

export default function ComingSoon({
  title = "Coming Soon",
  description = "This module is under development.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">{title}</h1>
          <p className="mt-2 text-sm text-white/60">{description}</p>
        </div>

        <Link
          href="/tickets"
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
        >
          Back to Tickets
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Feature text="Role-based access" />
        <Feature text="Audit trail" />
        <Feature text="Tenant isolation" />
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/70">
      {text}
    </div>
  );
}
