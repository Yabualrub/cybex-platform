// apps/web/src/components/portal/PortalShell.tsx
"use client";

import type { ReactNode } from "react";
import Sidebar from "@/components/portal/Sidebar";
import Topbar from "@/components/portal/Topbar";

export default function PortalShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-neutral-950 text-white">
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-72 lg:flex-col">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="lg:pl-72 h-full min-h-0 flex flex-col">
        <Topbar />

        {/* ✅ مهم: min-h-0 + overflow-hidden عشان نخلي السكرول جوّا المحتوى */}
        <main className="flex-1 min-h-0 overflow-hidden px-4 py-6 sm:px-6 lg:px-10">
          <div className="h-full min-h-0 rounded-2xl border border-white/10 bg-white/5 shadow-sm flex flex-col">
            {/* ✅ المحتوى نفسه ياخد الطول المتاح، والصفحات تتحكم بالسكرول الداخلي */}
            <div className="flex-1 min-h-0 p-4 sm:p-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
