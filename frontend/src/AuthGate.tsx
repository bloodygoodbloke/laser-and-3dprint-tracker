import { useEffect, useState, type ReactNode } from "react";
import { AuthContext, type CurrentUser } from "./AuthContext";
import { getSignedInAccount, installAuthFetch, isEntraConfigured, signIn, signOut } from "./auth";

type Stage =
  | { name: "loading" }
  | { name: "signedOut"; message?: string }
  | { name: "pending"; email: string }
  | { name: "ready"; user: CurrentUser };

interface Branding {
  businessName: string;
  businessLogoUrl: string;
}

function Shell({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding | null>(null);

  useEffect(() => {
    fetch("/api/branding").then((res) => (res.ok ? res.json() : null)).then(setBranding).catch(() => undefined);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-xl">
        <img src="/branding/makerflow-primary.svg" alt="MakerFlow — Your workshop, organised." className="mx-auto h-20 w-60 rounded-lg bg-white object-contain" />
        {branding?.businessLogoUrl ? (
          <img src={branding.businessLogoUrl} alt={branding.businessName ? `${branding.businessName} logo` : "Business logo"} className="mx-auto mt-6 h-20 w-20 rounded-full border border-slate-800 bg-slate-950 object-cover" />
        ) : null}
        {branding?.businessName ? <p className="mt-3 text-lg font-semibold text-slate-200">{branding.businessName}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<Stage>({ name: "loading" });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        installAuthFetch();
        const account = await getSignedInAccount();
        if (isEntraConfigured && !account) {
          if (!cancelled) setStage({ name: "signedOut" });
          return;
        }

        const res = await fetch("/api/me");
        if (cancelled) return;
        if (res.ok) return setStage({ name: "ready", user: await res.json() });
        if (res.status === 403) return setStage({ name: "pending", email: account?.username ?? "" });
        if (res.status === 503) return setStage({ name: "signedOut", message: "Sign-in is not configured on this server." });
        setStage({ name: "signedOut", message: "Please sign in again." });
      } catch {
        if (!cancelled) setStage({ name: "signedOut", message: "Could not reach the server." });
      }
    };

    void load();
    return () => { cancelled = true; };
  }, []);

  if (stage.name === "loading") {
    return <Shell><p className="text-sm text-slate-400">Loading…</p></Shell>;
  }

  if (stage.name === "signedOut") {
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-white">Sign in</h1>
        <p className="mt-2 text-sm text-slate-400">Use your email and password. Access is by invitation or approval.</p>
        {stage.message ? <p className="mt-3 text-sm text-amber-300" role="alert">{stage.message}</p> : null}
        {isEntraConfigured ? (
          <button type="button" onClick={() => void signIn()} className="mt-6 w-full rounded-full bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">
            Sign in
          </button>
        ) : null}
      </Shell>
    );
  }

  if (stage.name === "pending") {
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-white">Awaiting approval</h1>
        <p className="mt-2 text-sm text-slate-400">
          {stage.email ? `${stage.email} is` : "Your account is"} signed in but has not been approved yet. Ask the workshop owner to approve or invite you, then sign in again.
        </p>
        <button type="button" onClick={() => void signOut()} className="mt-6 w-full rounded-full border border-slate-700 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800">
          Sign out
        </button>
      </Shell>
    );
  }

  return (
    <AuthContext.Provider value={{ user: stage.user, logout: isEntraConfigured ? () => void signOut() : null }}>
      {children}
    </AuthContext.Provider>
  );
}
