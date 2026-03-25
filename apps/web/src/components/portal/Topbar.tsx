"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Menu, Search, LogOut, User } from "lucide-react";
import Sidebar from "@/components/portal/Sidebar";
import { cn } from "@/lib/utils";
import { useMe } from "@/lib/useMe";
import { logout } from "@/lib/api";

export default function Topbar() {
  const { me } = useMe();

  // ✅ Fix hydration: render Radix ONLY after mount
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tenantLabel =
    (me as any)?.tenantName ||
    (me as any)?.tenantSlug ||
    me?.tenant?.name ||
    me?.tenantId ||
    "—";

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-10">
        {/* Mobile menu */}
        <div className="lg:hidden">
          {mounted && (
            <Dialog.Root open={open} onOpenChange={setOpen}>
              <Dialog.Trigger asChild>
                <button
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 hover:bg-zinc-50"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </Dialog.Trigger>

              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/35" />
                <Dialog.Content className="fixed left-0 top-0 h-full w-[86%] max-w-xs bg-white shadow-xl">
                  <Sidebar />
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          )}
        </div>

        {/* Search */}
        <div className="flex flex-1 items-center">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              placeholder="Search tickets, users, invoices…"
              className={cn(
                "h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm",
                "outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200"
              )}
            />
          </div>
        </div>

        {/* Chips */}
        <div className="hidden md:flex items-center gap-2">
          <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700">
            {me?.role || "—"}
          </span>
          <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600">
            Tenant:{" "}
            <span className="font-semibold text-zinc-800">
              {tenantLabel}
            </span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/tickets"
            className="hidden sm:inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
          >
            New ticket
          </Link>

          {mounted && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 px-3 hover:bg-zinc-50">
                  <span className="h-7 w-7 rounded-lg bg-zinc-900 text-white grid place-items-center text-xs font-semibold">
                    {(me?.email?.[0] || "U").toUpperCase()}
                  </span>
                  <span className="hidden sm:block text-sm font-medium">
                    {me?.email || "Account"}
                  </span>
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  className="w-64 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg"
                >
                  <DropdownMenu.Item asChild>
                    <Link
                      href="/portal/account"
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-zinc-50"
                    >
                      <User className="h-4 w-4 text-zinc-500" />
                      Profile
                    </Link>
                  </DropdownMenu.Item>

                  <DropdownMenu.Separator className="my-1 h-px bg-zinc-200" />

                  <DropdownMenu.Item
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    onSelect={async (e) => {
                      e.preventDefault();
                      try {
                        await logout();
                      } finally {
                        window.location.href = "/login";
                      }
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </div>
      </div>
    </header>
  );
}
