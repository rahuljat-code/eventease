import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvCell).join(",");
}

function toCsv(rows: (string | number | null | undefined)[][]): string {
  // A leading BOM so Excel reads UTF-8 names (e.g. accents) correctly.
  return "﻿" + rows.map(csvRow).join("\r\n");
}

function byRoll(a: { rollNo: string | null }, b: { rollNo: string | null }): number {
  const na = Number(a.rollNo);
  const nb = Number(b.rollNo);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return (a.rollNo ?? "").localeCompare(b.rollNo ?? "");
}

function parseClassId(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function sendCsv(res: import("express").Response, filename: string, csv: string) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(csv);
}

router.get("/attendance", requireAuth, requireRole("FACULTY", "ADMIN"), async (req: AuthRequest, res) => {
  const classId = parseClassId(req.query.classId);
  if (classId === null) return res.status(400).json({ message: "A valid classId is required" });

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { subjects: { orderBy: { code: "asc" }, select: { id: true, code: true } } },
  });
  if (!cls) return res.status(404).json({ message: "Class not found" });

  const students = await prisma.user.findMany({
    where: { classId },
    select: { id: true, name: true, rollNo: true, uid: true },
  });
  students.sort(byRoll);

  const approved = await prisma.attendanceRequest.findMany({
    where: { status: "APPROVED", volunteer: { classId } },
    select: { volunteerId: true, subjectId: true },
  });

  const counts = new Map<number, Map<number, number>>();
  for (const r of approved) {
    const perStudent = counts.get(r.volunteerId) ?? new Map<number, number>();
    perStudent.set(r.subjectId, (perStudent.get(r.subjectId) ?? 0) + 1);
    counts.set(r.volunteerId, perStudent);
  }

  const header = ["Roll No", "Name", "UID", ...cls.subjects.map((s) => s.code), "Total"];
  const rows: (string | number | null)[][] = [header];

  for (const st of students) {
    const perStudent = counts.get(st.id);
    let total = 0;
    const subjectCells = cls.subjects.map((s) => {
      const n = perStudent?.get(s.id) ?? 0;
      total += n;
      return n;
    });
    rows.push([st.rollNo, st.name, st.uid, ...subjectCells, total]);
  }

  return sendCsv(res, `${cls.name}-attendance.csv`, toCsv(rows));
});


router.get("/credits", requireAuth, requireRole("FACULTY", "ADMIN"), async (req: AuthRequest, res) => {
  const classId = parseClassId(req.query.classId);
  if (classId === null) return res.status(400).json({ message: "A valid classId is required" });

  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { name: true } });
  if (!cls) return res.status(404).json({ message: "Class not found" });

  const students = await prisma.user.findMany({
    where: { classId },
    select: { id: true, name: true, rollNo: true, uid: true },
  });
  students.sort(byRoll);

  const credits = await prisma.creditAward.findMany({
    where: { verifiedAt: { not: null }, volunteer: { classId } },
    select: { volunteerId: true, points: true },
  });

  const totals = new Map<number, number>();
  for (const c of credits) {
    totals.set(c.volunteerId, (totals.get(c.volunteerId) ?? 0) + c.points);
  }

  const rows: (string | number | null)[][] = [["Roll No", "Name", "UID", "Verified CC Points"]];
  for (const st of students) {
    rows.push([st.rollNo, st.name, st.uid, totals.get(st.id) ?? 0]);
  }

  return sendCsv(res, `${cls.name}-cc-points.csv`, toCsv(rows));
});

router.get("/cc-activities", requireAuth, requireRole("FACULTY", "ADMIN"), async (req: AuthRequest, res) => {
  const classId = parseClassId(req.query.classId);
  if (classId === null) return res.status(400).json({ message: "A valid classId is required" });

  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { name: true } });
  if (!cls) return res.status(404).json({ message: "Class not found" });

  const activities = await prisma.cCActivity.findMany({
    where: { classId },
    select: { id: true, title: true, points: true },
    orderBy: { activityDate: "asc" },
  });

  const students = await prisma.user.findMany({
    where: { classId },
    select: { id: true, name: true, rollNo: true, uid: true },
  });
  students.sort(byRoll);

  const present = await prisma.cCActivityAttendance.findMany({
    where: { present: true, activity: { classId } },
    select: { activityId: true, studentId: true },
  });
  const presentSet = new Set(present.map((p) => `${p.activityId}:${p.studentId}`));

  const header = ["Roll No", "Name", "UID", ...activities.map((a) => a.title), "Total"];
  const rows: (string | number | null)[][] = [header];

  for (const st of students) {
    let total = 0;
    const cells = activities.map((a) => {
      const earned = presentSet.has(`${a.id}:${st.id}`) ? a.points : 0;
      total += earned;
      return earned;
    });
    rows.push([st.rollNo, st.name, st.uid, ...cells, total]);
  }

  return sendCsv(res, `${cls.name}-cc-activities.csv`, toCsv(rows));
});

export default router;
