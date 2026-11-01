import { createContext, useContext } from "react";

export interface CurrentUser {
  email: string;
  role: string;
  isSuperAdmin: boolean;
  workspaceId: string;
  workspaceName: string;
}

interface AuthState {
  user: CurrentUser;
  /** Null when running without sign-in (local development). */
  logout: (() => void) | null;
}

export const AuthContext = createContext<AuthState | null>(null);

export const useAuth = () => {
  const state = useContext(AuthContext);
  if (!state) throw new Error("useAuth must be used inside AuthGate");
  return state;
};
