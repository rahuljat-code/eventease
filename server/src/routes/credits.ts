import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();

const awardSchema = z.object({
  volunteerId: z.coerce.number().int().positive(),
  eventId: z.coerce.number().int().positive(),
  points: z.coerce.number().int().min(0, "Points cannot be negative"),
});

const creditShape = {
  id: true,
  points: true,
  verifiedAt: true,
  event: { select: { id: true, name: true, eventDate: true } },
  volunteer: { select: { id: true, name: true, rollNo: true, class: { select: { name: true } } } },
  awardedBy: { select: { id: true, name: true } },
  verifiedBy: { select: { id: true, name: true } },
} as const;

function idParam(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function teamsLedBy(userId: number) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { teamId: true, teamRole: true, team: { select: { clubId: true } } },
  });
  if (!u || u.teamRole === null || u.teamId === null || !u.team) return [];
  return [{ id: u.teamId, clubId: u.team.clubId }];
}
async function clubsOf(userId: number) {
  return prisma.club.findMany({ where: { presidentId: userId }, select: { id: true } });
}

router.get("/team", requireAuth, requireRole("TEAM_HEAD"), async (req: AuthRequest, res) => {
  const teams = await teamsLedBy(req.user!.userId);
  const teamIds = teams.map((t) => t.id);
  const clubIds = [...new Set(teams.map((t) => t.clubId))];

  if (teamIds.length === 0) {
    return res.json({ events: [], members: [], awards: [] });
  }

  const [events, members, awards] = await Promise.all([
    prisma.event.findMany({
      where: { clubId: { in: clubIds } },
      select: { id: true, name: true, eventDate: true },
      orderBy: { eventDate: "desc" },
    }),
    prisma.user.findMany({
      where: { teamId: { in: teamIds } },
      select: { id: true, name: true, rollNo: true, class: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.creditAward.findMany({
      where: { volunteer: { teamId: { in: teamIds } } },
      select: { id: true, volunteerId: true, eventId: true, points: true, verifiedAt: true },
    }),
  ]);

  return res.json({ events, members, awards });
});

router.put("/", requireAuth, requireRole("TEAM_HEAD"), async (req: AuthRequest, res) => {
  const parsed = awardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }
  const { volunteerId, eventId, points } = parsed.data;
  const headId = req.user!.userId;

  const teams = await teamsLedBy(headId);
  const teamIds = teams.map((t) => t.id);
  const clubIds = new Set(teams.map((t) => t.clubId));

  const volunteer = await prisma.user.findUnique({ where: { id: volunteerId }, select: { teamId: true } });
  if (!volunteer || volunteer.teamId === null || !teamIds.includes(volunteer.teamId)) {
    return res.status(403).json({ message: "You can only award points to your own team's volunteers" });
  }
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { clubId: true } });
  if (!event) return res.status(404).json({ message: "Event not found" });
  if (!clubIds.has(event.clubId)) {
    return res.status(403).json({ message: "You can only award points for your own club's events" });
  }

  const existing = await prisma.creditAward.findUnique({
    where: { volunteerId_eventId: { volunteerId, eventId } },
    select: { verifiedAt: true },
  });
  if (existing?.verifiedAt) {
    return res.status(409).json({ message: "These points are already verified and can no longer be changed" });
  }

  const award = await prisma.creditAward.upsert({
    where: { volunteerId_eventId: { volunteerId, eventId } },
    create: { volunteerId, eventId, points, awardedById: headId },
    update: { points, awardedById: headId },
    select: creditShape,
  });
  return res.json({ award });
});

router.get("/club", requireAuth, requireRole("PRESIDENT"), async (req: AuthRequest, res) => {
  const clubIds = (await clubsOf(req.user!.userId)).map((c) => c.id);

  const where = req.query.history
    ? { verifiedById: req.user!.userId }
    : { verifiedAt: null, volunteer: { team: { clubId: { in: clubIds } } } };

  const awards = await prisma.creditAward.findMany({
    where,
    select: creditShape,
    orderBy: { updatedAt: "desc" },
  });
  return res.json({ awards });
});

router.patch("/:id/verify", requireAuth, requireRole("PRESIDENT"), async (req: AuthRequest, res) => {
  const id = idParam(req.params.id);
  if (id === null) return res.status(400).json({ message: "Invalid credit id" });

  const award = await prisma.creditAward.findUnique({
    where: { id },
    select: { verifiedAt: true, volunteer: { select: { team: { select: { club: { select: { presidentId: true } } } } } } },
  });
  if (!award) return res.status(404).json({ message: "Credit award not found" });
  if (award.volunteer.team?.club.presidentId !== req.user!.userId) {
    return res.status(403).json({ message: "You can only verify your own club's credits" });
  }
  if (award.verifiedAt) {
    return res.status(409).json({ message: "This credit is already verified" });
  }

  const updated = await prisma.creditAward.update({
    where: { id },
    data: { verifiedById: req.user!.userId, verifiedAt: new Date() },
    select: creditShape,
  });
  return res.json({ award: updated });
});

router.delete("/:id", requireAuth, requireRole("PRESIDENT"), async (req: AuthRequest, res) => {
  const id = idParam(req.params.id);
  if (id === null) return res.status(400).json({ message: "Invalid credit id" });

  const award = await prisma.creditAward.findUnique({
    where: { id },
    select: { volunteer: { select: { team: { select: { club: { select: { presidentId: true } } } } } } },
  });
  if (!award) return res.status(404).json({ message: "Credit award not found" });
  if (award.volunteer.team?.club.presidentId !== req.user!.userId) {
    return res.status(403).json({ message: "You can only remove your own club's credits" });
  }

  await prisma.creditAward.delete({ where: { id } });
  return res.json({ message: "Credit award removed" });
});

router.get("/mine", requireAuth, requireRole("VOLUNTEER"), async (req: AuthRequest, res) => {
  const awards = await prisma.creditAward.findMany({
    where: { volunteerId: req.user!.userId },
    select: {
      id: true,
      points: true,
      verifiedAt: true,
      event: { select: { id: true, name: true, eventDate: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  const total = awards.reduce((sum, a) => (a.verifiedAt ? sum + a.points : sum), 0);
  return res.json({ awards, total });
});

export default router;
