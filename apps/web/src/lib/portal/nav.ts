// apps/web/src/lib/portal/nav.ts
export type Role = "OWNER" | "ADMIN" | "TECH" | "USER";

export type NavItem = {
  label: string;
  href: string;
  icon?: string;
  badge?: string;
  roles?: Role[];       // مين يشوفه
  comingSoon?: boolean; // يفتح Coming Soon بدل صفحة كاملة
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },

  { label: "Tickets", href: "/tickets", icon: "Ticket" },

  // Support Inbox: TECH/ADMIN فقط
  {
    label: "Support Inbox",
    href: "/support/tickets",
    icon: "Headphones",
    roles: ["TECH", "ADMIN"],
  },

  // باقي الصفحات (Coming soon حالياً)
  { label: "Users", href: "/users", icon: "Users", badge: "Soon", comingSoon: true },
  { label: "Billing", href: "/billing", icon: "CreditCard", badge: "Soon", comingSoon: true },
  { label: "Services", href: "/services", icon: "Wrench", badge: "Soon", comingSoon: true },

  // AI Agent — حالياً Coming Soon (مش لازم “يشتغل”)
  { label: "AI Agent", href: "/agent", icon: "Sparkles", badge: "Soon", comingSoon: true },
];
