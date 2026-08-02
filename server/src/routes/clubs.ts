import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

const createSchema = z.object({
  name: z.string().min(2, "Club name must be at least 2 characters"),
  category: z.string().optional(),
});
const updateSchema = createSchema.partial();
const assignSchema = z.object({
  userId: z.coerce.number().int().positive("Please choose a user"),
});

const clubShape = {
  id: true,
  name: true,
  category: true,
  presidentId: true,
  president: { select: { id: true, name: true, email: true } },
  _count: { select: { events: true } },
} as const;

function idParam(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}


router.get("/", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  const clubs = await prisma.club.findMany({ select: clubShape, orderBy: { name: "asc" } });
  return res.json({ clubs });
});


router.get("/browse", requireAuth, async (_req, res) => {
  const clubs = await prisma.club.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      teams: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          head: { select: { id: true, name: true } },
          _count: { select: { members: true } },
        },
      },
    },
  });
  return res.json({ clubs });
});

router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }
  if (await prisma.club.findUnique({ where: { name: parsed.data.name } })) {
    return res.status(409).json({ message: "A club with this name already exists" });
  }
  const club = await prisma.club.create({ data: parsed.data, select: clubShape });
  return res.status(201).json({ club });
});

router.patch("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const id = idParam(req.params.id);
  if (id === null) return res.status(400).json({ message: "Invalid club id" });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }
  if (!(await prisma.club.findUnique({ where: { id } }))) {
    return res.status(404).json({ message: "Club not found" });
  }
  const club = await prisma.club.update({ where: { id }, data: parsed.data, select: clubShape });
  return res.json({ club });
});

router.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const id = idParam(req.params.id);
  if (id === null) return res.status(400).json({ message: "Invalid club id" });
  if (!(await prisma.club.findUnique({ where: { id } }))) {
    return res.status(404).json({ message: "Club not found" });
  }
  await prisma.club.delete({ where: { id } });
  return res.json({ message: "Club deleted" });
});

router.patch("/:id/president", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const id = idParam(req.params.id);
  if (id === null) return res.status(400).json({ message: "Invalid club id" });

  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }
  const { userId } = parsed.data;

  if (!(await prisma.club.findUnique({ where: { id } }))) {
    return res.status(404).json({ message: "Club not found" });
  }
  if (!(await prisma.user.findUnique({ where: { id: userId } }))) {
    return res.status(404).json({ message: "User not found" });
  }

  const [, club] = await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { role: Role.PRESIDENT } }),
    prisma.club.update({ where: { id }, data: { presidentId: userId }, select: clubShape }),
  ]);

  return res.json({ club });
});

export default router;
