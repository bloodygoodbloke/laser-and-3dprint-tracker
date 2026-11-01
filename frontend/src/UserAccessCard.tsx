import { useCallback, useEffect, useState, type FormEvent } from "react";

interface AccessUser {
  id: string;
  email: string;
  name: string;
  status: "active" | "pending";
  role: string | null;
  isSuperAdmin: boolean;
}

interface AccessInvite {
  id: string;
  email: string;
  role: string;
}

interface AccessData {
  users: AccessUser[];
  invites: AccessInvite[];
}

const request = async (method: string, url: string, body?: unknown) => {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(String(payload?.error || "Request failed"));
  }
  return res.status === 204 ? null : res.json();
};

const buttonClass = "rounded-full border px-3 py-1 text-xs";

export default function UserAccessCard() {
  const [data, setData] = useState<AccessData | null>(null);
  const [message, setMessage] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Staff");

  const load = useCallback(async () => {
    try {
      setData(await request("GET", "/api/access"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load users");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      setMessage(success);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed");
    }
  };

  const invite = async (e: FormEvent) => {
    e.preventDefault();
    await run(() => request("POST", "/api/access/invites", { email: inviteEmail, role: inviteRole }), `Invitation saved for ${inviteEmail.trim().toLowerCase()}. They can sign in with that email.`);
    setInviteEmail("");
  };

  const pending = data?.users.filter((user) => user.status === "pending") ?? [];
  const active = data?.users.filter((user) => user.status === "active") ?? [];

  return (
    <section className="rounded-3xl border border-cyan-700/40 bg-slate-900 p-6">
      <h2 className="text-xl font-semibold">User access (super admin)</h2>
      <p className="mt-2 text-sm text-slate-400">Invite people by email, or approve people who have signed in and are waiting for access.</p>
      {message ? <p className="mt-3 text-sm text-cyan-300" role="status">{message}</p> : null}

      <form onSubmit={invite} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block text-xs text-slate-400">
          Email to invite
          <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="mt-1 block w-72 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" placeholder="name@example.com" />
        </label>
        <label className="block text-xs text-slate-400">
          Role
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="mt-1 block rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
            <option>Staff</option>
            <option>Owner</option>
          </select>
        </label>
        <button className="rounded-full border border-cyan-700 px-4 py-2 text-sm text-cyan-300">Send invite</button>
      </form>

      <h3 className="mt-6 text-sm font-semibold text-white">Waiting for approval ({pending.length})</h3>
      <div className="mt-2 space-y-2">
        {pending.length === 0 ? <p className="text-sm text-slate-500">No one is waiting.</p> : null}
        {pending.map((user) => (
          <div key={user.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm">
            <span>{user.email || "(no email)"}{user.name ? ` • ${user.name}` : ""}</span>
            <button type="button" onClick={() => run(() => request("POST", `/api/access/users/${user.id}/approve`, { role: "Staff" }), `Approved ${user.email}.`)} className={`${buttonClass} border-emerald-700 text-emerald-300`}>Approve as Staff</button>
          </div>
        ))}
      </div>

      <h3 className="mt-6 text-sm font-semibold text-white">Pending invitations ({data?.invites.length ?? 0})</h3>
      <div className="mt-2 space-y-2">
        {data?.invites.length === 0 ? <p className="text-sm text-slate-500">No open invitations.</p> : null}
        {data?.invites.map((entry) => (
          <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm">
            <span>{entry.email} • {entry.role}</span>
            <button type="button" onClick={() => run(() => request("DELETE", `/api/access/invites/${entry.id}`), "Invitation cancelled.")} className={`${buttonClass} border-rose-700 text-rose-300`}>Cancel</button>
          </div>
        ))}
      </div>

      <h3 className="mt-6 text-sm font-semibold text-white">Users with access ({active.length})</h3>
      <div className="mt-2 space-y-2">
        {active.map((user) => (
          <div key={user.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm">
            <span>{user.email || "(no email)"} • {user.isSuperAdmin ? "Super admin" : user.role}</span>
            {user.isSuperAdmin ? null : (
              <button type="button" onClick={() => run(() => request("DELETE", `/api/access/users/${user.id}/membership`), `Removed access for ${user.email}.`)} className={`${buttonClass} border-rose-700 text-rose-300`}>Remove access</button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
