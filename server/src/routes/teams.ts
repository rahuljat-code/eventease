import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();

const createSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters"),
  clubId: z.coerce.number().int().positive().optional(),
});
const assignLeaderSchema = z.object({
  userId: z.coerce.number().int().positive("Please choose a user"),
  teamRole: z.enum(["HEAD", "SUBHEAD"]).optional(), // defaults to HEAD
});

// A team no longer has a single head: its leaders are the members whose teamRole
// is HEAD or SUBHEAD. The members list carries teamRole so the UI can show them.
const teamShape = {
  id: true,
  name: true,
  clubId: true,
  club: { select: { id: true, name: true, presidentId: true } },
  _count: { select: { members: true } },
  members: {
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      rollNo: true,
      uid: true,
      teamRole: true,
      class: { select: { name: true } },
    },
  },
} as const;

function idParam(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function clubsOf(userId: number) {
  return prisma.club.findMany({ where: { presidentId: userId }, select: { id: true } });
}

router.get("/", requireAuth, requireRole("PRESIDENT", "ADMIN"), async (req: AuthRequest, res) => {
  const { userId, role } = req.user!;

  let where = {};
  if (role === "PRESIDENT") {
    const clubIds = (await clubsOf(userId)).map((c) => c.id);
    where = { clubId: { in: clubIds } };
  }

  const teams = await prisma.team.findMany({
    where,
    select: teamShape,
    orderBy: { name: "asc" },
  });
  return res.json({ teams });
});

// The team a Head/Subhead leads (they are a leader-member of exactly one team).
router.get("/my", requireAuth, requireRole("TEAM_HEAD"), async (req: AuthRequest, res) => {
  const teams = await prisma.team.findMany({
    where: { members: { some: { id: req.user!.userId, teamRole: { not: null } } } },
    select: teamShape,
    orderBy: { name: "asc" },
  });
  return res.json({ teams });
});

router.post("/", requireAuth, requireRole("PRESIDENT"), async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }
  const { name } = parsed.data;

  const myClubs = await clubsOf(req.user!.userId);
  if (myClubs.length === 0) {
    return res.status(400).json({ message: "You are not assigned to any club yet" });
  }

  let clubId: number;
  if (parsed.data.clubId) {
    if (!myClubs.some((c) => c.id === parsed.data.clubId)) {
      return res.status(403).json({ message: "You can only create teams for your own club" });
    }
    clubId = parsed.data.clubId;
  } else if (myClubs.length === 1) {
    clubId = myClubs[0].id;
  } else {
    return res.status(400).json({ message: "Please choose which club this team is for" });
  }

  if (await prisma.team.findUnique({ where: { clubId_name: { clubId, name } } })) {
    return res.status(409).json({ message: "Your club already has a team with this name" });
  }

  const team = await prisma.team.create({ data: { name, clubId }, select: teamShape });
  return res.status(201).json({ team });
});

// Add a leader (HEAD or SUBHEAD) to a team. A team can have several of each.
// This promotes the user to TEAM_HEAD and enrols them in the team.
router.post("/:id/leaders", requireAuth, requireRole("PRESIDENT"), async (req: AuthRequest, res) => {
  const id = idParam(req.params.id);
  if (id === null) return res.status(400).json({ message: "Invalid team id" });

  const parsed = assignLeaderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }
  const { userId } = parsed.data;
  const teamRole = parsed.data.teamRole ?? "HEAD";

  const team = await prisma.team.findUnique({
    where: { id },
    include: { club: { select: { presidentId: true } } },
  });
  if (!team) return res.status(404).json({ message: "Team not found" });
  if (team.club.presidentId !== req.user!.userId) {
    return res.status(403).json({ message: "You can only manage your own club's teams" });
  }
  if (!(await prisma.user.findUnique({ where: { id: userId } }))) {
    return res.status(404).json({ message: "User not found" });
  }

  const updatedTeam = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { role: Role.TEAM_HEAD, teamId: id, teamRole } });
    return tx.team.findUnique({ where: { id }, select: teamShape });
  });
  return res.json({ team: updatedTeam });
});

// Remove one leader (demote to plain member). Leaders lead only their own team,
// so this always returns them to VOLUNTEER; they stay a member of the team.
router.delete("/:id/leaders/:userId", requireAuth, requireRole("PRESIDENT"), async (req: AuthRequest, res) => {
  const id = idParam(req.params.id);
  const userId = idParam(req.params.userId);
  if (id === null || userId === null) return res.status(400).json({ message: "Invalid id" });

  const team = await prisma.team.findUnique({
    where: { id },
    include: { club: { select: { presidentId: true } } },
  });
  if (!team) return res.status(404).json({ message: "Team not found" });
  if (team.club.presidentId !== req.user!.userId) {
    return res.status(403).json({ message: "You can only manage your own club's teams" });
  }

  const member = await prisma.user.findUnique({
    where: { id: userId },
    select: { teamId: true, teamRole: true },
  });
  if (!member || member.teamId !== id || member.teamRole === null) {
    return res.status(404).json({ message: "That user is not a leader of this team" });
  }

  const updatedTeam = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { role: Role.VOLUNTEER, teamRole: null } });
    return tx.team.findUnique({ where: { id }, select: teamShape });
  });
  return res.json({ team: updatedTeam });
});

router.delete("/:id", requireAuth, requireRole("PRESIDENT"), async (req: AuthRequest, res) => {
  const id = idParam(req.params.id);
  if (id === null) return res.status(400).json({ message: "Invalid team id" });

  const team = await prisma.team.findUnique({
    where: { id },
    include: { club: { select: { presidentId: true } } },
  });
  if (!team) return res.status(404).json({ message: "Team not found" });

  if (team.club.presidentId !== req.user!.userId) {
    return res.status(403).json({ message: "You can only delete your own club's teams" });
  }

  await prisma.$transaction(async (tx) => {
    // Demote any leaders of this team back to plain volunteers before it goes.
    await tx.user.updateMany({
      where: { teamId: id, teamRole: { not: null } },
      data: { role: Role.VOLUNTEER, teamRole: null },
    });
    await tx.team.delete({ where: { id } }); // SetNull clears remaining members' teamId
  });
  return res.json({ message: "Team deleted" });
});

router.delete("/:id/members/:userId", requireAuth, requireRole("PRESIDENT"), async (req: AuthRequest, res) => {
  const id = idParam(req.params.id);
  const userId = idParam(req.params.userId);
  if (id === null || userId === null) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const team = await prisma.team.findUnique({
    where: { id },
    include: { club: { select: { presidentId: true } } },
  });
  if (!team) return res.status(404).json({ message: "Team not found" });

  if (team.club.presidentId !== req.user!.userId) {
    return res.status(403).json({ message: "You can only manage your own club's teams" });
  }

  const member = await prisma.user.findUnique({
    where: { id: userId },
    select: { teamId: true, teamRole: true },
  });
  if (!member || member.teamId !== id) {
    return res.status(404).json({ message: "That user is not a member of this team" });
  }

  // Leaving the team clears membership and any leadership; a leader also drops
  // back to VOLUNTEER.
  await prisma.user.update({
    where: { id: userId },
    data: { teamId: null, teamRole: null, ...(member.teamRole ? { role: Role.VOLUNTEER } : {}) },
  });

  const updated = await prisma.team.findUnique({ where: { id }, select: teamShape });
  return res.json({ team: updated });
});

export default router;
