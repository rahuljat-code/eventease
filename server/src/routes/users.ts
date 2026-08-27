import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

const ROLES = ["VOLUNTEER", "TEAM_HEAD", "PRESIDENT", "FACULTY", "ADMIN"];

router.get("/", requireAuth, requireRole("ADMIN", "PRESIDENT"), async (req, res) => {
  const role =
    typeof req.query.role === "string" && ROLES.includes(req.query.role) ? (req.query.role as Role) : undefined;
  const users = await prisma.user.findMany({
    where: role ? { role } : {},
    select: { id: true, name: true, email: true, role: true, department: true, phone: true },
    orderBy: { name: "asc" },
  });
  return res.json({ users });
});

// Admin creates a teacher (Faculty). The username becomes the login and the
// email local-part, so the teacher signs in with just the username.
const createStaffSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  username: z
    .string()
    .trim()
    .min(2, "Username is required")
    .regex(/^[a-zA-Z0-9._-]+$/, "Username can use letters, numbers, . _ -"),
  password: z.string().min(3, "Password must be at least 3 characters"),
  department: z.string().trim().optional(),
  phone: z.string().trim().optional(),
});

router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const parsed = createStaffSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const { name, username, password, department, phone } = parsed.data;
  const email = `${username.toLowerCase()}@eventease.local`;
  if (await prisma.user.findUnique({ where: { email } })) {
    return res.status(409).json({ message: "That username is already taken" });
  }
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: Role.FACULTY,
      department: department || null,
      phone: phone || null,
    },
    select: { id: true, name: true, email: true, role: true, department: true, phone: true },
  });
  return res.status(201).json({ user });
});

// Admin bulk-imports a class's students from a CSV the browser has already parsed
// into rows. Each student becomes a VOLUNTEER whose login is <uid>@eventease.local
// with the default password "student123" — the same shape the seed produces.
// Idempotent: rows whose email/uid/(class,roll) already exist are skipped, so a
// re-upload never duplicates or errors.
const importStudentsSchema = z.object({
  classId: z.coerce.number().int().positive(),
  students: z
    .array(
      z.object({
        rollNo: z.string().trim().min(1),
        uid: z.string().trim().min(1),
        name: z.string().trim().min(1),
      })
    )
    .min(1, "The sheet has no student rows"),
});

router.post("/import-students", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const parsed = importStudentsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const { classId, students } = parsed.data;

  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { id: true } });
  if (!cls) return res.status(404).json({ message: "Class not found" });

  const passwordHash = await bcrypt.hash("student123", 10);

  // Drop rows that repeat a UID within the same file before hitting the DB.
  const seen = new Set<string>();
  const rows = [] as {
    name: string;
    email: string;
    uid: string;
    rollNo: string;
    classId: number;
    passwordHash: string;
    role: Role;
  }[];
  for (const s of students) {
    const key = s.uid.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      name: s.name,
      email: `${key}@eventease.local`,
      uid: s.uid,
      rollNo: s.rollNo,
      classId,
      passwordHash,
      role: Role.VOLUNTEER,
    });
  }

  // One batched insert; skipDuplicates lets an already-imported student pass
  // through silently instead of failing the whole upload.
  const { count } = await prisma.user.createMany({ data: rows, skipDuplicates: true });
  return res.status(201).json({
    created: count,
    skipped: students.length - count,
    total: students.length,
  });
});

// Admin removes an account (e.g. a teacher). Cannot delete an Admin or yourself.
router.delete("/:id", requireAuth, requireRole("ADMIN"), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: "Invalid user id" });
  if (id === req.user!.userId) return res.status(400).json({ message: "You cannot delete your own account" });
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return res.status(404).json({ message: "User not found" });
  if (target.role === "ADMIN") return res.status(403).json({ message: "Admin accounts cannot be deleted here" });
  await prisma.user.delete({ where: { id } });
  return res.json({ message: "Account deleted" });
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
