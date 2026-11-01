import { PublicClientApplication, type AccountInfo } from "@azure/msal-browser";

const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID as string | undefined;
const authority = import.meta.env.VITE_ENTRA_AUTHORITY as string | undefined;
const scopes = ["openid", "profile", "email"];

// Without Entra settings the app only works against a backend running with AUTH_DISABLED (local development).
export const isEntraConfigured = Boolean(clientId && authority);

let msal: PublicClientApplication | null = null;

const getMsal = async () => {
  if (!msal) {
    // Entra only accepts plain-http redirect URIs for "localhost", not 127.0.0.1.
    if (window.location.hostname === "127.0.0.1" && window.location.protocol === "http:") {
      window.location.replace(window.location.href.replace("//127.0.0.1", "//localhost"));
      return new Promise<never>(() => undefined);
    }
    msal = new PublicClientApplication({
      auth: {
        clientId: clientId!,
        authority: authority!,
        knownAuthorities: [new URL(authority!).host],
        redirectUri: window.location.origin,
        postLogoutRedirectUri: window.location.origin,
      },
      cache: { cacheLocation: "sessionStorage" },
    });
    await msal.initialize();
    await msal.handleRedirectPromise();
  }
  return msal;
};

const activeAccount = (client: PublicClientApplication): AccountInfo | null => client.getActiveAccount() ?? client.getAllAccounts()[0] ?? null;

export const getSignedInAccount = async () => {
  if (!isEntraConfigured) return null;
  const client = await getMsal();
  const account = activeAccount(client);
  if (account) client.setActiveAccount(account);
  return account;
};

export const signIn = async () => {
  const client = await getMsal();
  await client.loginRedirect({ scopes });
};

export const signOut = async () => {
  if (!isEntraConfigured) return;
  const client = await getMsal();
  await client.logoutRedirect({ account: activeAccount(client) ?? undefined });
};

// The ID token is sent to our own API; the backend verifies it against the Entra signing keys.
export const getIdToken = async (): Promise<string | null> => {
  if (!isEntraConfigured) return null;
  const client = await getMsal();
  const account = activeAccount(client);
  if (!account) return null;
  const cached = account.idToken;
  const exp = (account.idTokenClaims as { exp?: number } | undefined)?.exp ?? 0;
  if (cached && exp * 1000 > Date.now() + 60_000) return cached;
  try {
    const result = await client.acquireTokenSilent({ scopes, account, forceRefresh: true });
    return result.idToken || null;
  } catch {
    return null;
  }
};

// Adds the sign-in token to every same-origin API call so individual API helpers need no changes.
export const installAuthFetch = () => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
    if (!url.startsWith("/api/") && !url.startsWith("/uploads/")) return originalFetch(input, init);
    const token = await getIdToken();
    if (!token) return originalFetch(input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set("Authorization", `Bearer ${token}`);
    return originalFetch(input, { ...init, headers });
  };
};
