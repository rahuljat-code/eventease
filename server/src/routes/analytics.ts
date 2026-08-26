import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { RequestStatus } from "@prisma/client";

const router = Router();

type Tone = "amber" | "blue" | "emerald" | "red" | "indigo" | "violet" | "slate";
type Metric = { label: string; value: number; hint?: string; tone: Tone };
type Series = { label: string; value: number; tone?: Tone };
type Chart = { title: string; kind: "donut" | "bars"; series: Series[] };
type Overview = { metrics: Metric[]; charts: Chart[] };

const REQUEST_TONES: Record<RequestStatus, Tone> = {
  PENDING_TEAM_HEAD: "amber",
  PENDING_PRESIDENT: "blue",
  APPROVED: "emerald",
  REJECTED: "red",
};
const REQUEST_LABELS: Record<RequestStatus, string> = {
  PENDING_TEAM_HEAD: "With team head",
  PENDING_PRESIDENT: "With president",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

async function requestsByStatus(where: object): Promise<Chart> {
  const grouped = await prisma.attendanceRequest.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  });
  const counts = new Map(grouped.map((g) => [g.status, g._count._all]));
  const order: RequestStatus[] = ["PENDING_TEAM_HEAD", "PENDING_PRESIDENT", "APPROVED", "REJECTED"];
  return {
    title: "Attendance requests by status",
    kind: "donut",
    series: order.map((s) => ({ label: REQUEST_LABELS[s], value: counts.get(s) ?? 0, tone: REQUEST_TONES[s] })),
  };
}

async function ccLeaderboard(volunteerWhere: object, title = "Top volunteers by CC points"): Promise<Chart | null> {
  const grouped = await prisma.creditAward.groupBy({
    by: ["volunteerId"],
    where: { verifiedAt: { not: null }, volunteer: volunteerWhere },
    _sum: { points: true },
    orderBy: { _sum: { points: "desc" } },
    take: 5,
  });
  const withPoints = grouped.filter((g) => (g._sum.points ?? 0) > 0);
  if (withPoints.length === 0) return null;
  const users = await prisma.user.findMany({
    where: { id: { in: withPoints.map((g) => g.volunteerId) } },
    select: { id: true, name: true },
  });
  const nameOf = new Map(users.map((u) => [u.id, u.name]));
  return {
    title,
    kind: "bars",
    series: withPoints.map((g) => ({ label: nameOf.get(g.volunteerId) ?? "—", value: g._sum.points ?? 0, tone: "indigo" })),
  };
}

async function adminOverview(): Promise<Overview> {
  const [clubs, events, users, volunteers] = await Promise.all([
    prisma.club.count(),
    prisma.event.count(),
    prisma.user.count(),
    prisma.user.count({ where: { role: "VOLUNTEER" } }),
  ]);

  const eventsGrouped = await prisma.event.groupBy({ by: ["status"], _count: { _all: true } });
  const eventCounts = new Map(eventsGrouped.map((g) => [g.status, g._count._all]));
  const eventsChart: Chart = {
    title: "Events by status",
    kind: "donut",
    series: [
      { label: "Upcoming", value: eventCounts.get("UPCOMING") ?? 0, tone: "violet" },
      { label: "Ongoing", value: eventCounts.get("ONGOING") ?? 0, tone: "blue" },
      { label: "Completed", value: eventCounts.get("COMPLETED") ?? 0, tone: "emerald" },
    ],
  };

  const charts: Chart[] = [await requestsByStatus({}), eventsChart];
  const board = await ccLeaderboard({});
  if (board) charts.push(board);

  return {
    metrics: [
      { label: "Clubs", value: clubs, tone: "violet" },
      { label: "Events", value: events, tone: "blue" },
      { label: "Users", value: users, tone: "slate" },
      { label: "Volunteers", value: volunteers, tone: "indigo" },
    ],
    charts,
  };
}

async function presidentOverview(userId: number): Promise<Overview> {
  const clubs = await prisma.club.findMany({ where: { presidentId: userId }, select: { id: true } });
  const clubIds = clubs.map((c) => c.id);
  const teams = await prisma.team.findMany({ where: { clubId: { in: clubIds } }, select: { id: true } });
  const teamIds = teams.map((t) => t.id);

  const inClub = { volunteer: { teamId: { in: teamIds } } };
  const [events, members, pendingVerify] = await Promise.all([
    prisma.event.count({ where: { clubId: { in: clubIds } } }),
    prisma.user.count({ where: { teamId: { in: teamIds } } }),
    prisma.attendanceRequest.count({ where: { status: "PENDING_PRESIDENT", ...inClub } }),
  ]);

  const charts: Chart[] = [await requestsByStatus(inClub)];
  const board = await ccLeaderboard({ teamId: { in: teamIds } }, "Top volunteers in your club");
  if (board) charts.push(board);

  return {
    metrics: [
      { label: "Events", value: events, tone: "blue" },
      { label: "Teams", value: teams.length, tone: "violet" },
      { label: "Members", value: members, tone: "slate" },
      { label: "To verify", value: pendingVerify, hint: "waiting for you", tone: "amber" },
    ],
    charts,
  };
}

async function teamHeadOverview(userId: number): Promise<Overview> {
  const teams = await prisma.team.findMany({ where: { headId: userId }, select: { id: true } });
  const teamIds = teams.map((t) => t.id);
  const inTeam = { volunteer: { teamId: { in: teamIds } } };

  const [members, pendingApproval, actioned, awarded] = await Promise.all([
    prisma.user.count({ where: { teamId: { in: teamIds } } }),
    prisma.attendanceRequest.count({ where: { status: "PENDING_TEAM_HEAD", ...inTeam } }),
    prisma.attendanceRequest.count({ where: { headActionById: userId } }),
    prisma.creditAward.count({ where: { awardedById: userId } }),
  ]);

  const charts: Chart[] = [await requestsByStatus(inTeam)];
  const board = await ccLeaderboard({ teamId: { in: teamIds } }, "Top volunteers on your team");
  if (board) charts.push(board);

  return {
    metrics: [
      { label: "Members", value: members, tone: "slate" },
      { label: "To approve", value: pendingApproval, hint: "waiting for you", tone: "amber" },
      { label: "Actioned", value: actioned, tone: "emerald" },
      { label: "CC awards", value: awarded, tone: "indigo" },
    ],
    charts,
  };
}

async function volunteerOverview(userId: number): Promise<Overview> {
  const mine = { volunteerId: userId };
  const [total, approved, pending] = await Promise.all([
    prisma.attendanceRequest.count({ where: mine }),
    prisma.attendanceRequest.count({ where: { ...mine, status: "APPROVED" } }),
    prisma.attendanceRequest.count({
      where: { ...mine, status: { in: ["PENDING_TEAM_HEAD", "PENDING_PRESIDENT"] } },
    }),
  ]);
  const cc = await prisma.creditAward.aggregate({
    where: { volunteerId: userId, verifiedAt: { not: null } },
    _sum: { points: true },
  });

  const charts: Chart[] = [await requestsByStatus(mine)];

  // My CC points per event (verified only), as bars.
  const myCredits = await prisma.creditAward.findMany({
    where: { volunteerId: userId, verifiedAt: { not: null }, points: { gt: 0 } },
    select: { points: true, event: { select: { name: true } } },
    orderBy: { points: "desc" },
    take: 6,
  });
  if (myCredits.length > 0) {
    charts.push({
      title: "Your CC points by event",
      kind: "bars",
      series: myCredits.map((c) => ({ label: c.event.name, value: c.points, tone: "indigo" })),
    });
  }

  return {
    metrics: [
      { label: "CC points", value: cc._sum.points ?? 0, hint: "verified", tone: "indigo" },
      { label: "Requests", value: total, tone: "blue" },
      { label: "Approved", value: approved, tone: "emerald" },
      { label: "Pending", value: pending, tone: "amber" },
    ],
    charts,
  };
}

async function facultyOverview(): Promise<Overview> {
  const [classes, students, approved] = await Promise.all([
    prisma.class.count(),
    prisma.user.count({ where: { classId: { not: null } } }),
    prisma.attendanceRequest.count({ where: { status: "APPROVED" } }),
  ]);
  const cc = await prisma.creditAward.aggregate({ where: { verifiedAt: { not: null } }, _sum: { points: true } });

  // Approved lectures per class — a small loop over the (few) classes.
  const classRows = await prisma.class.findMany({ select: { id: true, name: true }, orderBy: { year: "asc" } });
  const perClass = await Promise.all(
    classRows.map((c) =>
      prisma.attendanceRequest.count({ where: { status: "APPROVED", volunteer: { classId: c.id } } })
    )
  );
  const charts: Chart[] = [
    {
      title: "Approved lectures by class",
      kind: "bars",
      series: classRows.map((c, i) => ({ label: c.name, value: perClass[i], tone: "indigo" })),
    },
  ];

  return {
    metrics: [
      { label: "Classes", value: classes, tone: "violet" },
      { label: "Students", value: students, tone: "slate" },
      { label: "Approved lectures", value: approved, tone: "emerald" },
      { label: "CC points", value: cc._sum.points ?? 0, hint: "verified, all classes", tone: "indigo" },
    ],
    charts,
  };
}

router.get("/overview", requireAuth, async (req: AuthRequest, res) => {
  const { userId, role } = req.user!;
  let overview: Overview;
  switch (role) {
    case "ADMIN":
      overview = await adminOverview();
      break;
    case "PRESIDENT":
      overview = await presidentOverview(userId);
      break;
    case "TEAM_HEAD":
      overview = await teamHeadOverview(userId);
      break;
    case "FACULTY":
      overview = await facultyOverview();
      break;
    default:
      overview = await volunteerOverview(userId);
  }
  return res.json(overview);
});

export default router;
