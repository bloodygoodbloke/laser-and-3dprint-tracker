import { Router, type NextFunction, type Request, type Response } from "express";
import prisma from "../prisma.js";
import { isSuperAdminEmail } from "../auth.js";

const router = Router();
const ROLES = new Set(["Owner", "Staff"]);

const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.auth?.isSuperAdmin) return res.status(403).json({ error: "Super admin access required." });
  return next();
};

router.get("/me", async (req, res) => {
  const auth = req.auth!;
  const workspace = await prisma.workspace.findUnique({ where: { id: auth.workspaceId } });
  res.json({
    email: auth.email,
    role: auth.role,
    isSuperAdmin: auth.isSuperAdmin,
    workspaceId: auth.workspaceId,
    workspaceName: workspace?.name ?? "",
  });
});

router.get("/access", requireSuperAdmin, async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const [users, invites] = await Promise.all([
    prisma.user.findMany({ include: { memberships: true }, orderBy: { createdAt: "asc" } }),
    prisma.invite.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } }),
  ]);

  res.json({
    workspaceId,
    users: users.map((user) => {
      const membership = user.memberships.find((entry) => entry.workspaceId === workspaceId);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        status: membership ? "active" : "pending",
        role: membership?.role ?? null,
        isSuperAdmin: isSuperAdminEmail(user.email),
      };
    }),
    invites: invites.map((invite) => ({ id: invite.id, email: invite.email, role: invite.role, createdAt: invite.createdAt })),
  });
});

const readRole = (value: unknown) => (typeof value === "string" && ROLES.has(value) ? value : "Staff");

router.post("/access/invites", requireSuperAdmin, async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address." });

  const existingUser = await prisma.user.findFirst({ where: { email }, include: { memberships: true } });
  if (existingUser?.memberships.some((entry) => entry.workspaceId === req.auth!.workspaceId)) {
    return res.status(409).json({ error: "That person already has access." });
  }

  const invite = await prisma.invite.upsert({
    where: { email },
    update: { role: readRole(req.body?.role), workspaceId: req.auth!.workspaceId },
    create: { email, role: readRole(req.body?.role), workspaceId: req.auth!.workspaceId },
  });
  return res.status(201).json(invite);
});

router.delete("/access/invites/:id", requireSuperAdmin, async (req, res) => {
  await prisma.invite.deleteMany({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId } });
  res.status(204).end();
});

router.post("/access/users/:id/approve", requireSuperAdmin, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
  if (!user) return res.status(404).json({ error: "User not found." });

  const workspaceId = req.auth!.workspaceId;
  const membership = await prisma.membership.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId } },
    update: { role: readRole(req.body?.role) },
    create: { userId: user.id, workspaceId, role: readRole(req.body?.role) },
  });
  if (user.email) await prisma.invite.deleteMany({ where: { email: user.email } });
  return res.json(membership);
});

router.delete("/access/users/:id/membership", requireSuperAdmin, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.id === req.auth!.userId || isSuperAdminEmail(user.email)) {
    return res.status(400).json({ error: "The super admin's access cannot be removed." });
  }
  await prisma.membership.deleteMany({ where: { userId: user.id, workspaceId: req.auth!.workspaceId } });
  return res.status(204).end();
});

export default router;
