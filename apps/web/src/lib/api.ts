// apps/web/src/lib/api.ts
// CYBEX CORE PLATFORM - API client for Next.js (NestJS on :4001, HttpOnly Cookies)

export type Role = "OWNER" | "ADMIN" | "TECH" | "USER";

export type Me = {
  id: string;
  email: string;
  role: Role;
  tenantId: string;
  tenant?: { id: string; name?: string } | null;
};

export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_ON_CUSTOMER"
  | "RESOLVED"
  | "CLOSED";

export type Ticket = {
  id: string;
  title: string;
  description?: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt?: string;
};

export type TicketComment = {
  id: string;
  ticketId: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    email: string;
    role: Role;
  };
};

export type TicketDetail = Ticket & {
  tenantId: string;
  requester?: { id: string; email: string } | null;
  assignee?: { id: string; email: string } | null;
  comments: TicketComment[];
};

// Support types (global view)
export type SupportTicket = {
  id: string;
  tenantId: string;
  title: string;
  status: TicketStatus;
  createdAt: string;
  tenant?: { id: string; name?: string | null } | null;
  createdBy?: { id: string; email?: string | null; fullName?: string | null; role?: Role } | null;
};

export type SupportTicketDetail = {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  status: TicketStatus;
  createdAt: string;
  tenant?: { id: string; name?: string | null } | null;
  createdBy?: { id: string; email?: string | null; fullName?: string | null; role?: Role } | null;
  messages: Array<{
    id: string;
    body: string;
    createdAt: string;
    authorId?: string | null;
    author?: { id: string; email?: string | null; fullName?: string | null; role?: Role } | null;
  }>;
};

export type AgentConversation = {
  id: string;
  title?: string | null;
  createdAt: string;
};

export type AgentMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

type ApiError = Error & { status?: number; data?: any };

const API_BASE = "http://localhost:4001";

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const err: ApiError = new Error(
      (data && (data.message || data.error)) || `Request failed: ${res.status}`
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/* =========================
   AUTH
========================= */

export function getMe(): Promise<Me> {
  return apiFetch<Me>("/auth/me");
}

export async function logout(): Promise<any> {
  return apiFetch("/auth/logout", { method: "POST" });
}

/* =========================
   TICKETS (Tenant scoped)
========================= */

export function getTickets(): Promise<Ticket[]> {
  return apiFetch<Ticket[]>("/tickets");
}

export function createTicket(input: { title: string; description: string }): Promise<Ticket> {
  return apiFetch<Ticket>("/tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getTicket(id: string): Promise<TicketDetail> {
  const raw: any = await apiFetch<any>(`/tickets/${id}`);

  const messages = Array.isArray(raw?.messages) ? raw.messages : [];
  const comments: TicketComment[] = messages.map((m: any) => ({
    id: m.id,
    ticketId: raw?.id ?? id,
    body: m.body ?? "",
    createdAt: m.createdAt ?? new Date().toISOString(),
    author: {
      id: m.author?.id ?? m.authorId ?? "unknown",
      email: m.author?.email ?? "Unknown",
      role: (m.author?.role as Role) ?? "USER",
    },
  }));

  return {
    id: raw.id,
    tenantId: raw.tenantId ?? raw.tenant?.id ?? "",
    title: raw.title ?? "",
    description: raw.description ?? "",
    status: raw.status ?? "OPEN",
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt,
    requester: raw.createdBy?.email
      ? { id: raw.createdBy?.id ?? "unknown", email: raw.createdBy.email }
      : null,
    assignee: null,
    comments,
  };
}

export async function addTicketComment(ticketId: string, body: string): Promise<any> {
  const candidates = [`/tickets/${ticketId}/messages`, `/tickets/${ticketId}/comments`];

  let lastErr: any = null;

  for (const path of candidates) {
    try {
      return await apiFetch<any>(path, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
    } catch (e: any) {
      lastErr = e;
      const status = e?.status;
      const msg = String(e?.message || "");
      if (status === 404 || msg.includes("Cannot POST")) continue;
      throw e;
    }
  }

  throw lastErr || new Error("No comment endpoint matched.");
}

/* =========================
   SUPPORT (Global Inbox for TECH/ADMIN)
========================= */

export function getSupportTickets(): Promise<SupportTicket[]> {
  return apiFetch<SupportTicket[]>("/tickets/support/all");
}

export function getSupportTicket(id: string): Promise<SupportTicketDetail> {
  return apiFetch<SupportTicketDetail>(`/tickets/support/${id}`);
}

export async function supportReply(ticketId: string, body: string): Promise<any> {
  const candidates = [
    `/tickets/support/${ticketId}/reply`,
    `/tickets/support/${ticketId}/comments`,
  ];

  let lastErr: any = null;

  for (const path of candidates) {
    try {
      return await apiFetch<any>(path, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
    } catch (e: any) {
      lastErr = e;
      const status = e?.status;
      const msg = String(e?.message || "");
      if (status === 404 || msg.includes("Cannot POST")) continue;
      throw e;
    }
  }

  throw lastErr || new Error("No support reply endpoint matched.");
}

export function supportUpdateTicketStatus(ticketId: string, status: TicketStatus): Promise<any> {
  return apiFetch<any>(`/tickets/support/${ticketId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
// ✅ Alias عشان صفحات الـ UI ما تتكسر
export const updateTicketStatus = supportUpdateTicketStatus;

/* =========================
   AGENT
========================= */

export function getAgentConversations(): Promise<AgentConversation[]> {
  return apiFetch<AgentConversation[]>("/agent/conversations");
}

export function createAgentConversation(input?: { title?: string }): Promise<AgentConversation> {
  return apiFetch<AgentConversation>("/agent/conversations", {
    method: "POST",
    body: JSON.stringify(input || {}),
  });
}

export async function deleteAgentConversation(id: string): Promise<any> {
  return apiFetch(`/agent/conversations/${id}`, { method: "DELETE" });
}

export function getAgentMessages(conversationId: string): Promise<AgentMessage[]> {
  return apiFetch<AgentMessage[]>(`/agent/conversations/${conversationId}/messages`);
}

export function sendAgentMessage(conversationId: string, content: string): Promise<any> {
  return apiFetch(`/agent/conversations/${conversationId}/send`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

/* =========================
   PUBLIC
========================= */

export function publicProvision(input: {
  email: string;
  password: string;
  company: string;
  enable?: {
    ai_agent?: boolean;
    ai_calls?: boolean;
    dental?: boolean;
    rmm?: boolean;
    vision?: boolean;
  };
}): Promise<any> {
  return apiFetch("/public/provision", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function publicSeedSupport(): Promise<any> {
  return apiFetch("/public/seed-support", { method: "POST" });
}

/* =========================
   TENANT SERVICES
========================= */

export type TenantServiceKey = "ai_agent" | "ai_calls" | "dental" | "rmm" | "vision";

export type TenantService = {
  key: TenantServiceKey;
  enabled: boolean;
  plan?: string | null;
  updatedAt?: string | null;
};

export function getTenantServices(): Promise<TenantService[]> {
  return apiFetch<TenantService[]>("/tenant/services");
}

export type EntitlementsResponse = {
  tenantId: string;
  services: TenantService[];
  entitlements: Record<TenantServiceKey, boolean>;
};

export function getEntitlements(): Promise<EntitlementsResponse> {
  return apiFetch<EntitlementsResponse>("/tenant/services/entitlements");
}
