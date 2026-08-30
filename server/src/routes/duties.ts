import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();

/**
 * Module 8.2 — Duty & Task Assignment.
 * A Team Head assigns duties to their team's volunteers (optionally tied to an
 * event); the volunteer marks each one done. Ownership is enforced: a head can
 * only assign to their own team members and use their own club's events.
 */

const dutySchema = z.object({
  title: z.string().trim().min(1, "A title is required"),
  description: z.string().trim().optional(),
  eventId: z.coerce.number().int().positive().optional(),
  assignedToId: z.coerce.number().int().positive(),
});

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

const dutyShape = {
  id: true,
  title: true,
  description: true,
  status: true,
  createdAt: true,
  event: { select: { id: true, name: true, eventDate: true } },
  assignedTo: { select: { id: true, name: true, rollNo: true, class: { select: { name: true } } } },
} as const;

// Head assigns a duty to a team member.
router.post("/", requireAuth, requireRole("TEAM_HEAD"), async (req: AuthRequest, res) => {
  const parsed = dutySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const { title, description, eventId, assignedToId } = parsed.data;
  const headId = req.user!.userId;

  const teams = await teamsLedBy(headId);
  const teamIds = teams.map((t) => t.id);
  const clubIds = new Set(teams.map((t) => t.clubId));

  const member = await prisma.user.findUnique({ where: { id: assignedToId }, select: { teamId: true } });
  if (!member || member.teamId === null || !teamIds.includes(member.teamId)) {
    return res.status(403).json({ message: "You can only assign duties to your own team's volunteers" });
  }
  if (eventId) {
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { clubId: true } });
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!clubIds.has(event.clubId)) {
      return res.status(403).json({ message: "You can only use your own club's events" });
    }
  }

  const duty = await prisma.duty.create({
    data: { title, description, eventId, assignedToId, assignedById: headId },
    select: dutyShape,
  });
  return res.status(201).json({ duty });
});

// Head: the duties they assigned.
router.get("/team", requireAuth, requireRole("TEAM_HEAD"), async (req: AuthRequest, res) => {
  const duties = await prisma.duty.findMany({
    where: { assignedById: req.user!.userId },
    select: dutyShape,
    orderBy: { createdAt: "desc" },
  });
  return res.json({ duties });
});

// Volunteer: the duties assigned to them.
router.get("/mine", requireAuth, requireRole("VOLUNTEER"), async (req: AuthRequest, res) => {
  const duties = await prisma.duty.findMany({
    where: { assignedToId: req.user!.userId },
    select: dutyShape,
    orderBy: { createdAt: "desc" },
  });
  return res.json({ duties });
});

// Volunteer: toggle one of their duties done / pending.
router.patch("/:id/status", requireAuth, requireRole("VOLUNTEER"), async (req: AuthRequest, res) => {
  const id = idParam(req.params.id);
  if (id === null) return res.status(400).json({ message: "Invalid duty id" });
  const duty = await prisma.duty.findUnique({ where: { id }, select: { assignedToId: true, status: true } });
  if (!duty) return res.status(404).json({ message: "Duty not found" });
  if (duty.assignedToId !== req.user!.userId) {
    return res.status(403).json({ message: "This duty isn't assigned to you" });
  }
  const updated = await prisma.duty.update({
    where: { id },
    data: { status: duty.status === "DONE" ? "PENDING" : "DONE" },
    select: dutyShape,
  });
  return res.json({ duty: updated });
});

// Head: delete a duty they assigned.
router.delete("/:id", requireAuth, requireRole("TEAM_HEAD"), async (req: AuthRequest, res) => {
  const id = idParam(req.params.id);
  if (id === null) return res.status(400).json({ message: "Invalid duty id" });
  const duty = await prisma.duty.findUnique({ where: { id }, select: { assignedById: true } });
  if (!duty) return res.status(404).json({ message: "Duty not found" });
  if (duty.assignedById !== req.user!.userId) {
    return res.status(403).json({ message: "You can only remove duties you assigned" });
  }
  await prisma.duty.delete({ where: { id } });
  return res.json({ message: "Duty removed" });
});

export default router;
