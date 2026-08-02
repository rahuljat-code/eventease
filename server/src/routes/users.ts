import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, requireRole("ADMIN", "PRESIDENT"), async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
  return res.json({ users });
});

const teamSchema = z.object({
  teamId: z.coerce.number().int().positive().nullable(),
});

router.patch("/me/team", requireAuth, requireRole("VOLUNTEER"), async (req: AuthRequest, res) => {
  const parsed = teamSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Please choose a valid team" });
  }
  const { teamId } = parsed.data;

  // If joining a team, it must exist.
  if (teamId !== null && !(await prisma.team.findUnique({ where: { id: teamId } }))) {
    return res.status(404).json({ message: "Team not found" });
  }

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { teamId },
    select: {
      id: true,
      name: true,
      team: { select: { id: true, name: true, club: { select: { id: true, name: true } } } },
    },
  });
  return res.json({ user });
});

export default router;
