import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();

const activitySchema = z.object({
  title: z.string().trim().min(1, "A title is required"),
  points: z.coerce.number().int().min(0, "Points cannot be negative"),
  activityDate: z.coerce.date(),
  classId: z.coerce.number().int().positive(),
});

const attendanceSchema = z.object({
  presentStudentIds: z.array(z.coerce.number().int().positive()),
});

function idParam(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

router.post("/", requireAuth, requireRole("FACULTY", "ADMIN"), async (req: AuthRequest, res) => {
  const parsed = activitySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const { title, points, activityDate, classId } = parsed.data;

  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { id: true } });
  if (!cls) return res.status(404).json({ message: "Class not found" });

  const activity = await prisma.cCActivity.create({
    data: { title, points, activityDate, classId, createdById: req.user!.userId },
    select: { id: true, title: true, activityDate: true, points: true, class: { select: { id: true, name: true } } },
  });
  return res.status(201).json({ activity });
});

router.get("/", requireAuth, requireRole("FACULTY", "ADMIN"), async (_req, res) => {
  const activities = await prisma.cCActivity.findMany({
    orderBy: { activityDate: "desc" },
    select: { id: true, title: true, activityDate: true, points: true, classId: true, class: { select: { name: true } } },
  });
  const ids = activities.map((a) => a.id);
  const classIds = [...new Set(activities.map((a) => a.classId))];

  const [present, students] = await Promise.all([
    prisma.cCActivityAttendance.groupBy({
      by: ["activityId"],
      where: { activityId: { in: ids }, present: true },
      _count: { _all: true },
    }),
    prisma.user.groupBy({ by: ["classId"], where: { classId: { in: classIds } }, _count: { _all: true } }),
  ]);
  const presentMap = new Map(present.map((p) => [p.activityId, p._count._all]));
  const studentMap = new Map(students.map((s) => [s.classId, s._count._all]));

  return res.json({
    activities: activities.map((a) => ({
      id: a.id,
      title: a.title,
      activityDate: a.activityDate,
      points: a.points,
      class: a.class,
      presentCount: presentMap.get(a.id) ?? 0,
      studentCount: studentMap.get(a.classId) ?? 0,
    })),
  });
});

router.get("/:id", requireAuth, requireRole("FACULTY", "ADMIN"), async (req, res) => {
  const id = idParam(req.params.id);
  if (id === null) return res.status(400).json({ message: "Invalid activity id" });

  const activity = await prisma.cCActivity.findUnique({
    where: { id },
    select: { id: true, title: true, activityDate: true, points: true, classId: true, class: { select: { id: true, name: true } } },
  });
  if (!activity) return res.status(404).json({ message: "Activity not found" });

  const [students, attendance] = await Promise.all([
    prisma.user.findMany({
      where: { classId: activity.classId },
      select: { id: true, name: true, rollNo: true, uid: true },
    }),
    prisma.cCActivityAttendance.findMany({
      where: { activityId: id, present: true },
      select: { studentId: true },
    }),
  ]);
  const presentSet = new Set(attendance.map((a) => a.studentId));

  const roster = students
    .sort((a, b) => {
      const na = Number(a.rollNo), nb = Number(b.rollNo);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return (a.rollNo ?? "").localeCompare(b.rollNo ?? "");
    })
    .map((s) => ({ ...s, present: presentSet.has(s.id) }));

  return res.json({ activity, roster });
});

router.patch("/:id/attendance", requireAuth, requireRole("FACULTY", "ADMIN"), async (req, res) => {
  const id = idParam(req.params.id);
  if (id === null) return res.status(400).json({ message: "Invalid activity id" });
  const parsed = attendanceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

  const activity = await prisma.cCActivity.findUnique({ where: { id }, select: { classId: true } });
  if (!activity) return res.status(404).json({ message: "Activity not found" });

  // Only students of this activity's class can be marked.
  const students = await prisma.user.findMany({ where: { classId: activity.classId }, select: { id: true } });
  const presentSet = new Set(parsed.data.presentStudentIds);

  await prisma.$transaction(
    students.map((s) =>
      prisma.cCActivityAttendance.upsert({
        where: { activityId_studentId: { activityId: id, studentId: s.id } },
        create: { activityId: id, studentId: s.id, present: presentSet.has(s.id) },
        update: { present: presentSet.has(s.id) },
      })
    )
  );
  return res.json({ message: "Attendance saved", presentCount: [...presentSet].filter((sid) => students.some((s) => s.id === sid)).length });
});

router.delete("/:id", requireAuth, requireRole("FACULTY", "ADMIN"), async (req, res) => {
  const id = idParam(req.params.id);
  if (id === null) return res.status(400).json({ message: "Invalid activity id" });
  const activity = await prisma.cCActivity.findUnique({ where: { id }, select: { id: true } });
  if (!activity) return res.status(404).json({ message: "Activity not found" });
  await prisma.cCActivity.delete({ where: { id } });
  return res.json({ message: "Activity deleted" });
});

router.get("/mine/list", requireAuth, requireRole("VOLUNTEER"), async (req: AuthRequest, res) => {
  const rows = await prisma.cCActivityAttendance.findMany({
    where: { studentId: req.user!.userId, present: true },
    select: { activity: { select: { id: true, title: true, activityDate: true, points: true } } },
    orderBy: { activity: { activityDate: "desc" } },
  });
  const activities = rows.map((r) => r.activity);
  const total = activities.reduce((sum, a) => sum + a.points, 0);
  return res.json({ activities, total });
});

export default router;
