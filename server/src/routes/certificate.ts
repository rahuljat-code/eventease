import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();

/**
 * Module 8.1 — Participation Certificate.
 * Aggregates everything a volunteer needs on their certificate: their verified
 * club CC credits, the CC activities they attended, the events they registered
 * for, and the canonical Total CC (verified club points + activity points).
 */
router.get("/mine", requireAuth, requireRole("VOLUNTEER"), async (req: AuthRequest, res) => {
  const userId = req.user!.userId;

  const [user, credits, activityRows, regs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, uid: true, rollNo: true, class: { select: { name: true, course: true } } },
    }),
    prisma.creditAward.findMany({
      where: { volunteerId: userId, verifiedAt: { not: null } },
      select: { points: true, event: { select: { name: true, eventDate: true } } },
      orderBy: { event: { eventDate: "asc" } },
    }),
    prisma.cCActivityAttendance.findMany({
      where: { studentId: userId, present: true },
      select: { activity: { select: { title: true, points: true, activityDate: true } } },
      orderBy: { activity: { activityDate: "asc" } },
    }),
    prisma.eventRegistration.findMany({
      where: { userId },
      select: { event: { select: { name: true, eventDate: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!user) return res.status(404).json({ message: "User not found" });

  const clubCredits = credits.map((c) => ({ name: c.event.name, points: c.points, date: c.event.eventDate }));
  const activities = activityRows.map((a) => ({ name: a.activity.title, points: a.activity.points, date: a.activity.activityDate }));
  const events = regs.map((r) => ({ name: r.event.name, date: r.event.eventDate }));
  const totalCC =
    clubCredits.reduce((s, c) => s + c.points, 0) + activities.reduce((s, a) => s + a.points, 0);

  return res.json({
    student: {
      name: user.name,
      uid: user.uid,
      rollNo: user.rollNo,
      class: user.class?.name ?? null,
      course: user.class?.course ?? null,
    },
    clubCredits,
    activities,
    events,
    totalCC,
    certificateId: `EE-${(user.uid ?? String(userId)).toUpperCase()}`,
    issuedAt: new Date(),
  });
});

export default router;
