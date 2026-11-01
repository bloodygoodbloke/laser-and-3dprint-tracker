import type { NextFunction, Request, RequestHandler, Response } from "express";

export interface AuthContext {
  userId: string;
  workspaceId: string;
  role: string;
  email: string;
  isSuperAdmin: boolean;
}

export interface TokenClaims {
  subject: string;
  email: string;
  name: string;
}

export type TokenVerifier = (token: string) => Promise<TokenClaims>;
export type MemberResolver = (claims: TokenClaims) => Promise<AuthContext | null>;

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthContext;
  }
}

interface AuthOptions {
  verify: TokenVerifier | null;
  resolveMember: MemberResolver;
  // Paths (relative to the mount point) that stay public, such as health checks.
  publicPaths?: string[];
}

export const createAuthMiddleware = ({ verify, resolveMember, publicPaths = [] }: AuthOptions): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "OPTIONS" || publicPaths.includes(req.path)) return next();

    if (!verify) {
      return res.status(503).json({ error: "Authentication is not configured on this server." });
    }

    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) return res.status(401).json({ error: "Sign in required." });

    let claims: TokenClaims;
    try {
      claims = await verify(token);
    } catch (error) {
      console.warn("Token rejected:", error instanceof Error ? error.message : "unknown error");
      return res.status(401).json({ error: "Invalid or expired sign-in." });
    }

    try {
      const context = await resolveMember(claims);
      if (!context) return res.status(403).json({ error: "Your account is awaiting approval or an invitation." });
      req.auth = context;
      return next();
    } catch (error) {
      console.error("Authorization lookup failed", error instanceof Error ? error.message : error);
      return res.status(500).json({ error: "Could not verify access." });
    }
  };
};

