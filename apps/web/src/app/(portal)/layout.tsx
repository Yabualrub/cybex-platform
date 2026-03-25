// apps/web/src/app/(portal)/layout.tsx
"use client";

import PortalShell from "@/components/portal/PortalShell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
