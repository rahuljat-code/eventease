import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

/**
 * Module 8.3 — Leaderboard & Badges.
 * Ranks volunteers by their Total CC (verified club credits + present CC-activity
 * points) and tags a badge tier. Returns the top 20 plus the caller's own rank.
 */
function badgeFor(points: number): "Gold" | "Silver" | "Bronze" | null {
  if (points >= 20) return "Gold";
  if (points >= 10) return "Silver";
  if (points >= 1) return "Bronze";
  return null;
}

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const [creditRows, activityRows, students] = await Promise.all([
    prisma.creditAward.groupBy({
      by: ["volunteerId"],
      where: { verifiedAt: { not: null } },
      _sum: { points: true },
    }),
    prisma.cCActivityAttendance.findMany({
      where: { present: true },
      select: { studentId: true, activity: { select: { points: true } } },
    }),
    prisma.user.findMany({
      where: { role: "VOLUNTEER" },
      select: { id: true, name: true, class: { select: { name: true } } },
    }),
  ]);

  const totals = new Map<number, number>();
  for (const c of creditRows) totals.set(c.volunteerId, (totals.get(c.volunteerId) ?? 0) + (c._sum.points ?? 0));
  for (const a of activityRows) totals.set(a.studentId, (totals.get(a.studentId) ?? 0) + a.activity.points);

  const ranked = students
    .map((s) => ({ id: s.id, name: s.name, class: s.class?.name ?? null, points: totals.get(s.id) ?? 0 }))
    .filter((s) => s.points > 0)
    .sort((a, b) => b.points - a.points)
    .map((s, i) => ({ rank: i + 1, ...s, badge: badgeFor(s.points) }));

  const me = ranked.find((r) => r.id === req.user!.userId) ?? null;
  return res.json({ leaderboard: ranked.slice(0, 20), me });
});

export default router;
