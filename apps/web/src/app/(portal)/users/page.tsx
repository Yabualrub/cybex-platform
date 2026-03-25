"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, Role } from "@/lib/api";
import { useMe } from "@/lib/useMe";

type UserRow = {
  id: string;
  email: string;
  role: Role;
  status?: "ACTIVE" | "INVITED" | "DISABLED";
  createdAt?: string;
};

const ROLE_OPTIONS: Role[] = ["OWNER", "ADMIN", "TECH", "USER"];

export default function UsersPage() {
  const router = useRouter();
  const { me } = useMe();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");

  // invite form
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("USER");

  const canAccess = useMemo(() => {
    const r = (me?.role ?? "").toUpperCase();
    return r === "OWNER" || r === "ADMIN";
  }, [me?.role]);

  useEffect(() => {
    if (!me) return;
    if (!canAccess) router.replace("/dashboard");
  }, [me, canAccess, router]);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<UserRow[]>("/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      if (e?.status === 401 || e?.message === "UNAUTHORIZED") {
        return router.replace("/login");
      }
      setErr(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return users;
    return users.filter((u) => {
      const hay = [u.email, u.role, u.status, u.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(qq);
    });
  }, [users, q]);

  // ======================
  // INVITE USER (NEW FLOW)
  // ======================
  async function onInvite() {
    const e = email.trim().toLowerCase();
    if (!e) {
      setErr("Email is required.");
      return;
    }

    setBusy("invite");
    setErr(null);
    try {
      await apiFetch("/users/invite", {
        method: "POST",
        body: JSON.stringify({ email: e, role }),
      });
      setEmail("");
      setRole("USER");
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Invite failed");
    } finally {
      setBusy(null);
    }
  }

  async function onChangeRole(userId: string, nextRole: Role) {
    setBusy(`role:${userId}`);
    setErr(null);
    try {
      await apiFetch(`/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole }),
      });
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Role update failed");
    } finally {
      setBusy(null);
    }
  }

  async function onResetPassword(userId: string) {
    if (!window.confirm("Generate password reset token for this user?")) return;

    setBusy(`pw:${userId}`);
    setErr(null);
    try {
      await apiFetch(`/users/${userId}/reset-password`, {
        method: "POST",
      });
      alert("Password reset token generated.");
    } catch (e: any) {
      setErr(e?.message ?? "Password reset failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="p-2 text-white/80">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Users</h1>
          <p className="text-sm text-white/60">Manage tenant users & roles</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search email / role / status…"
            className="h-10 w-72 max-w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/20"
          />
          <button
            onClick={load}
            className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/90 hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
      </div>

      {err ? (
        <pre className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </pre>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* list */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4 min-h-0">
          <div className="mb-3 text-base font-bold">Tenant Users</div>

          {filtered.length ? (
            <div className="max-h-[70vh] overflow-auto pr-2 space-y-2">
              {filtered.map((u) => (
                <div
                  key={u.id}
                  className="rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-white/90">
                        {u.email}
                      </div>
                      <div className="text-xs text-white/50">
                        {u.status ?? "ACTIVE"} •{" "}
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleString()
                          : ""}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          onChangeRole(u.id, e.target.value as Role)
                        }
                        disabled={busy?.startsWith("role:")}
                        className="h-9 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-white/20 disabled:opacity-60"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => onResetPassword(u.id)}
                        disabled={busy?.startsWith("pw:")}
                        className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/90 hover:bg-white/10 disabled:opacity-60"
                      >
                        Reset password
                      </button>

                      {busy === `role:${u.id}` ||
                      busy === `pw:${u.id}` ? (
                        <span className="text-xs text-white/50">Working…</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-white/60">No users</div>
          )}
        </div>

        {/* invite */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-base font-bold">Invite User</div>
          <p className="mt-1 text-xs text-white/60">
            User will receive an invite to set password
          </p>

          <div className="mt-4 space-y-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/20"
            />

            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-white/20"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <button
              onClick={onInvite}
              disabled={busy === "invite"}
              className="h-10 w-full rounded-xl bg-teal-600/80 text-sm font-semibold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "invite" ? "Inviting…" : "Invite user"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
