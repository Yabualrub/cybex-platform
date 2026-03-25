// src/components/portal/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMe } from "@/lib/useMe";
import {
  LayoutDashboard,
  Ticket,
  Users,
  CreditCard,
  Wrench,
  Sparkles,
  Headphones,
} from "lucide-react";

type Role = "OWNER" | "ADMIN" | "TECH" | "USER";

type NavItem = {
  label: string;
  href: string;
  icon: any;
  badge?: string;
  show?: (role: Role | null) => boolean;
};

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, show: () => true },

  // Tenant tickets (OWNER/ADMIN/USER فقط)
  { label: "Tickets", href: "/tickets", icon: Ticket, show: (r) => r === "OWNER" || r === "ADMIN" || r === "USER" },

  // Admin tenant pages
  { label: "Users", href: "/users", icon: Users, badge: "Soon", show: (r) => r === "OWNER" || r === "ADMIN" },
  { label: "Billing", href: "/billing", icon: CreditCard, badge: "Soon", show: (r) => r === "OWNER" || r === "ADMIN" },

  // Services/Agent are entitlements-managed لاحقاً
  { label: "Services", href: "/services", icon: Wrench, badge: "Soon", show: (r) => r === "OWNER" || r === "ADMIN" },
  { label: "AI Agent", href: "/agent", icon: Sparkles, badge: "Soon", show: (r) => r === "OWNER" || r === "ADMIN" },

  // ✅ Support Console (TECH/ADMIN) — route موجود عندك /support/tickets
  { label: "Support Console", href: "/support/tickets", icon: Headphones, show: (r) => r === "TECH" || r === "ADMIN" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { me } = useMe();
  const role = (me?.role as Role) ?? null;

  return (
    <aside className="flex h-full flex-col border-r border-zinc-200 bg-white">
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
          <span className="text-sm font-bold">C</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">CYBEX</p>
          <p className="truncate text-xs text-zinc-500">Core Platform</p>
        </div>
      </div>

      <nav className="flex-1 px-3 pb-4">
        <div className="mt-2 space-y-1">
          {NAV.filter((i) => (i.show ? i.show(role) : true)).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  isActive ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-700"
                  )}
                />
                <span className="truncate">{item.label}</span>

                {item.badge ? (
                  <span
                    className={cn(
                      "ml-auto rounded-full px-2 py-0.5 text-xs",
                      isActive ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-700"
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-zinc-200 p-4">
        <div className="rounded-xl bg-zinc-50 p-3">
          <p className="text-xs font-medium text-zinc-900">Signed in</p>
          <p className="mt-1 truncate text-xs text-zinc-600">{me?.email || "—"}</p>
          <p className="mt-1 text-xs text-zinc-500">Role: {me?.role || "—"}</p>
        </div>
      </div>
    </aside>
  );
}
