import type { RequestHandler } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import prisma from "./prisma.js";
import { createAuthMiddleware, type AuthContext, type MemberResolver, type TokenClaims, type TokenVerifier } from "./authMiddleware.js";

export { createAuthMiddleware };

const emailList = (value: string | undefined) => (value ?? "").split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean);

// The super admin is assigned by email in SUPER_ADMIN_EMAILS (server setting, not editable from the app).
export const isSuperAdminEmail = (email: string, env: NodeJS.ProcessEnv = process.env) =>
  !!email && emailList(env.SUPER_ADMIN_EMAILS).includes(email);

// Existing data belongs to the first (oldest) workspace; its id is randomly generated.
export const getDefaultWorkspace = async () =>
  (await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } })) ??
  (await prisma.workspace.create({ data: { name: "My Workshop" } }));

// Verifies Microsoft Entra External ID access/ID tokens against the tenant's published signing keys.
export const createEntraVerifier = (env: NodeJS.ProcessEnv = process.env): TokenVerifier | null => {
  const issuer = env.ENTRA_ISSUER;
  const jwksUri = env.ENTRA_JWKS_URI;
  const audience = env.ENTRA_CLIENT_ID;
  if (!issuer || !jwksUri || !audience) return null;

  const keys = createRemoteJWKSet(new URL(jwksUri));
  return async (token) => {
    const { payload } = await jwtVerify(token, keys, { issuer, audience });
    const email = String(payload.email ?? payload.preferred_username ?? "").trim().toLowerCase();
    return { subject: String(payload.sub ?? ""), email, name: String(payload.name ?? "") };
  };
};

// Access is by invitation or approval: unknown users are signed in but get no workspace until invited.
export const resolveMemberFromDatabase: MemberResolver = async (claims) => {
  if (!claims.subject) return null;

  const user = await prisma.user.upsert({
    where: { subject: claims.subject },
    update: { email: claims.email, name: claims.name },
    create: { subject: claims.subject, email: claims.email, name: claims.name },
  });

  const isSuperAdmin = isSuperAdminEmail(claims.email);
  const toContext = (workspaceId: string, role: string): AuthContext => ({ userId: user.id, workspaceId, role, email: claims.email, isSuperAdmin });

  const existing = await prisma.membership.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  if (existing) return toContext(existing.workspaceId, existing.role);
  if (!claims.email) return null;

  const invite = await prisma.invite.findUnique({ where: { email: claims.email } });
  if (invite) {
    await prisma.$transaction([
      prisma.membership.create({ data: { userId: user.id, workspaceId: invite.workspaceId, role: invite.role } }),
      prisma.invite.delete({ where: { id: invite.id } }),
    ]);
    return toContext(invite.workspaceId, invite.role);
  }

  if (isSuperAdmin || emailList(process.env.OWNER_EMAILS).includes(claims.email)) {
    const workspace = await getDefaultWorkspace();
    await prisma.membership.create({ data: { userId: user.id, workspaceId: workspace.id, role: "Owner" } });
    return toContext(workspace.id, "Owner");
  }

  return null;
};

export const isAuthDisabled = (env: NodeJS.ProcessEnv = process.env) =>
  env.AUTH_DISABLED === "true" && env.NODE_ENV !== "production";

export const authGate = (publicPaths: string[] = []): RequestHandler => {
  if (isAuthDisabled()) {
    console.warn("AUTH_DISABLED=true: all routes are unauthenticated. Never use this outside local development.");
    return async (req, _res, next) => {
      try {
        const workspace = await getDefaultWorkspace();
        req.auth = { userId: "local-dev", workspaceId: workspace.id, role: "Owner", email: "dev@localhost", isSuperAdmin: true };
        next();
      } catch (error) {
        next(error);
      }
    };
  }
  return createAuthMiddleware({ verify: createEntraVerifier(), resolveMember: resolveMemberFromDatabase, publicPaths });
};
