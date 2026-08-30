import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", async (_req, res) => {
  const classes = await prisma.class.findMany({
    select: { id: true, name: true },
    orderBy: { year: "asc" },
  });
  return res.json({ classes });
});

// Admin creates a new class (e.g. FT, TTM). Only the name is required; course and
// year are optional and fall back to sensible defaults, so a class can be added
// by simply typing its name.
const createClassSchema = z.object({
  name: z.string().trim().min(1, "Class name is required"),
  course: z.string().trim().optional(),
  year: z.coerce.number().int().min(1).max(5).optional(),
});

router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const parsed = createClassSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const { name, course, year } = parsed.data;

  const existing = await prisma.class.findUnique({ where: { name } });
  if (existing) return res.status(409).json({ message: "A class with that name already exists" });

  const cls = await prisma.class.create({
    data: { name, course: course || name, year: year ?? 1 },
    select: { id: true, name: true },
  });
  return res.status(201).json({ class: cls });
});

export default router;
