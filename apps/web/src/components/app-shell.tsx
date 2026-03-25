"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiLogout } from "@/lib/api";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tickets", label: "Tickets" },
  { href: "/services", label: "Services" },
  { href: "/users", label: "Users" },
  { href: "/billing", label: "Billing" },
  { href: "/support", label: "Support Inbox" },
];

function cn(...x: (string | false | null | undefined)[]) {
  return x.filter(Boolean).join(" ");
}

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await apiLogout();
    } finally {
      router.replace("/login");
    }
  }

  return (
    <div className="min-h-screen bg-[#070B12] text-white">
      <div className="mx-auto max-w-[1400px] px-4 py-6">
        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <aside className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="mb-6">
              <div className="text-xl font-extrabold tracking-wide">CYBEX</div>
              <div className="text-sm text-white/60">Core Platform</div>
            </div>

            <nav className="space-y-1">
              {nav.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                      active
                        ? "bg-white/10 text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-[#10b2b8]" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-6">
              <button
                onClick={handleLogout}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
              >
                Logout
              </button>
            </div>
          </aside>

          {/* Main */}
          <main className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
