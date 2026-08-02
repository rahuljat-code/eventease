import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();

const statuses = ["UPCOMING", "ONGOING", "COMPLETED"] as const;

const createSchema = z.object({
  name: z.string().min(2, "Event name must be at least 2 characters"),
  eventDate: z.coerce.date({ message: "A valid event date is required" }),
  venue: z.string().optional(),
  status: z.enum(statuses).optional(),
  clubId: z.coerce.number().int().positive().optional(),
});
const updateSchema = createSchema.partial();

const eventShape = {
  id: true,
  name: true,
  eventDate: true,
  venue: true,
  status: true,
  clubId: true,
  club: { select: { id: true, name: true, presidentId: true } },
} as const;

function idParam(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function clubsOf(userId: number) {
  return prisma.club.findMany({ where: { presidentId: userId }, select: { id: true } });
}

router.get("/", requireAuth, requireRole("PRESIDENT", "ADMIN"), async (req: AuthRequest, res) => {
  const { userId, role } = req.user!;

  let where = {};
  if (role === "PRESIDENT") {
    const clubIds = (await clubsOf(userId)).map((c) => c.id);
    where = { clubId: { in: clubIds } };
  }

  const events = await prisma.event.findMany({
    where,
    select: eventShape,
    orderBy: { eventDate: "asc" },
  });
  return res.json({ events });
});

router.post("/", requireAuth, requireRole("PRESIDENT"), async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }
  const data = parsed.data;

  const myClubs = await clubsOf(req.user!.userId);
  if (myClubs.length === 0) {
    return res.status(400).json({ message: "You are not assigned to any club yet" });
  }

  let clubId: number;
  if (data.clubId) {
    if (!myClubs.some((c) => c.id === data.clubId)) {
      return res.status(403).json({ message: "You can only create events for your own club" });
    }
    clubId = data.clubId;
  } else if (myClubs.length === 1) {
    clubId = myClubs[0].id;
  } else {
    return res.status(400).json({ message: "Please choose which club this event is for" });
  }

  const event = await prisma.event.create({
    data: {
      name: data.name,
      eventDate: data.eventDate,
      venue: data.venue,
      status: data.status,
      clubId,
    },
    select: eventShape,
  });
  return res.status(201).json({ event });
});

router.patch("/:id", requireAuth, requireRole("PRESIDENT"), async (req: AuthRequest, res) => {
  const id = idParam(req.params.id);
  if (id === null) return res.status(400).json({ message: "Invalid event id" });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const event = await prisma.event.findUnique({
    where: { id },
    include: { club: { select: { presidentId: true } } },
  });
  if (!event) return res.status(404).json({ message: "Event not found" });

  // *** the ownership check ***
  if (event.club.presidentId !== req.user!.userId) {
    return res.status(403).json({ message: "You can only edit your own club's events" });
  }

  const { clubId, ...editable } = parsed.data;
  const updated = await prisma.event.update({ where: { id }, data: editable, select: eventShape });
  return res.json({ event: updated });
});

router.delete("/:id", requireAuth, requireRole("PRESIDENT"), async (req: AuthRequest, res) => {
  const id = idParam(req.params.id);
  if (id === null) return res.status(400).json({ message: "Invalid event id" });

  const event = await prisma.event.findUnique({
    where: { id },
    include: { club: { select: { presidentId: true } } },
  });
  if (!event) return res.status(404).json({ message: "Event not found" });

  if (event.club.presidentId !== req.user!.userId) {
    return res.status(403).json({ message: "You can only delete your own club's events" });
  }

  await prisma.event.delete({ where: { id } });
  return res.json({ message: "Event deleted" });
});

export default router;
