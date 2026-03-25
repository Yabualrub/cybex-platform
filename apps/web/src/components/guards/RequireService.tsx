"use client";

import Link from "next/link";
import { useEntitlements } from "@/lib/useEntitlements";
import type { TenantServiceKey } from "@/lib/api";

export default function RequireService({
  service,
  children,
}: {
  service: TenantServiceKey;
  children: React.ReactNode;
}) {
  const { loading, err, data, refresh } = useEntitlements();

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/70">
        Loading…
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200 space-y-3">
        <div>{err}</div>
        <button
          onClick={refresh}
          className="h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white/90 hover:bg-white/10"
        >
          Retry
        </button>
      </div>
    );
  }

  const enabled = !!data?.entitlements?.[service];

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-extrabold text-white">Not enabled</h2>
        <p className="mt-1 text-sm text-white/60">
          This feature (<span className="font-semibold">{service}</span>) is not enabled for your tenant.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/services"
            className="inline-flex h-10 items-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
          >
            View Services
          </Link>

          <Link
            href="/tickets"
            className="inline-flex h-10 items-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white/90 hover:bg-white/10"
          >
            Contact Support
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
