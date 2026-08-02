import { Router } from "express";
import { z } from "zod";
import { RequestStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();

const createSchema = z.object({
  eventId: z.coerce.number().int().positive("Please choose the event"),
  subjectId: z.coerce.number().int().positive("Please choose the subject"),
  lectureDate: z.coerce.date({ message: "A valid lecture date is required" }),
  lectureTime: z.string().min(1, "Lecture timing is required"),
  teacherName: z.string().min(1, "Teacher name is required"),
  reason: z.string().optional(),
});

const actionSchema = z
  .object({
    action: z.enum(["APPROVE", "REJECT"]),
    remark: z.string().optional(),
  })
  .refine((d) => d.action !== "REJECT" || (d.remark?.trim().length ?? 0) > 0, {
    message: "Please give a reason when rejecting a request",
    path: ["remark"],
  });

const requestShape = {
  id: true,
  lectureDate: true,
  lectureTime: true,
  teacherName: true,
  reason: true,
  status: true,
  headActionAt: true,
  headRemark: true,
  presidentActionAt: true,
  presidentRemark: true,
  createdAt: true,
  event: { select: { id: true, name: true, eventDate: true } },
  subject: { select: { id: true, name: true, code: true } },
  volunteer: {
    select: {
      id: true,
      name: true,
      rollNo: true,
      uid: true,
      class: { select: { name: true } },
      teamId: true,
    },
  },
  headActionBy: { select: { id: true, name: true } },
  presidentActionBy: { select: { id: true, name: true } },
} as const;

function idParam(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// The clubs this user is President of.
async function clubsOf(userId: number) {
  return prisma.club.findMany({ where: { presidentId: userId }, select: { id: true } });
}

// The teams this user is Team Head of.
async function teamsLedBy(userId: number) {
  return prisma.team.findMany({ where: { headId: userId }, select: { id: true } });
}

// The volunteer's own profile bits we need: their team, its club, and their class.
async function volunteerContext(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { classId: true, teamId: true, team: { select: { clubId: true } } },
  });
}

const MAX_DAYS_FROM_EVENT = 7;
const DAY_MS = 1000 * 60 * 60 * 24;

function checkLectureDate(lectureDate: Date, eventDate: Date): string | null {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (lectureDate.getTime() > endOfToday.getTime()) {
    return "The lecture date cannot be in the future";
  }
  const daysApart = Math.abs(lectureDate.getTime() - eventDate.getTime()) / DAY_MS;
  if (daysApart > MAX_DAYS_FROM_EVENT) {
    return `The lecture must be within ${MAX_DAYS_FROM_EVENT} days of the event you were on duty for`;
  }
  return null;
}

router.get("/options", requireAuth, requireRole("VOLUNTEER"), async (req: AuthRequest, res) => {
  const me = await volunteerContext(req.user!.userId);
  if (!me?.teamId || !me.team) {
    return res.status(400).json({ message: "Join a team first — your requests go to your team head" });
  }

  const [events, subjects] = await Promise.all([
    prisma.event.findMany({
      where: { clubId: me.team.clubId },
      select: { id: true, name: true, eventDate: true },
      orderBy: { eventDate: "desc" },
    }),
    me.classId
      ? prisma.subject.findMany({
          where: { classId: me.classId },
          select: { id: true, name: true, code: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return res.json({ events, subjects });
});

router.post("/", requireAuth, requireRole("VOLUNTEER"), async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }
  const { eventId, subjectId, lectureDate, lectureTime, teacherName, reason } = parsed.data;
  const volunteerId = req.user!.userId;

  const me = await volunteerContext(volunteerId);
  if (!me?.teamId || !me.team) {
    return res.status(400).json({ message: "Join a team first — your requests go to your team head" });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { clubId: true, eventDate: true },
  });
  if (!event) return res.status(404).json({ message: "Event not found" });
  if (event.clubId !== me.team.clubId) {
    return res.status(403).json({ message: "You can only claim duty for your own club's events" });
  }

  const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { classId: true } });
  if (!subject) return res.status(404).json({ message: "Subject not found" });
  if (subject.classId !== me.classId) {
    return res.status(400).json({ message: "That subject is not taught in your class" });
  }

  const dateError = checkLectureDate(lectureDate, event.eventDate);
  if (dateError) return res.status(400).json({ message: dateError });

  const clash = await prisma.attendanceRequest.findUnique({
    where: { volunteerId_subjectId_lectureDate: { volunteerId, subjectId, lectureDate } },
  });
  if (clash) {
    return res.status(409).json({ message: "You have already submitted a request for this lecture" });
  }

  try {
    const request = await prisma.attendanceRequest.create({
      data: {
        volunteerId,
        eventId,
        subjectId,
        lectureDate,
        lectureTime,
        teacherName,
        reason,
      },
      select: requestShape,
    });
    return res.status(201).json({ request });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return res.status(409).json({ message: "You have already submitted a request for this lecture" });
    }
    console.error("attendance create failed:", err);
    return res.status(500).json({ message: "Something went wrong submitting your request" });
  }
});

router.get("/mine", requireAuth, requireRole("VOLUNTEER"), async (req: AuthRequest, res) => {
  const requests = await prisma.attendanceRequest.findMany({
    where: { volunteerId: req.user!.userId },
    select: requestShape,
    orderBy: { createdAt: "desc" },
  });
  return res.json({ requests });
});

router.patch("/:id", requireAuth, requireRole("VOLUNTEER"), async (req: AuthRequest, res) => {
  const id = idParam(req.params.id);
  if (id === null) return res.status(400).json({ message: "Invalid request id" });

  const parsed = createSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const existing = await prisma.attendanceRequest.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: "Request not found" });
  if (existing.volunteerId !== req.user!.userId) {
    return res.status(403).json({ message: "You can only edit your own requests" });
  }
  if (existing.status !== RequestStatus.REJECTED) {
    return res.status(400).json({ message: "Only a rejected request can be edited and resubmitted" });
  }

  const { eventId, subjectId, ...rest } = parsed.data;

  const me = await volunteerContext(req.user!.userId);
  if (!me?.teamId || !me.team) {
    return res.status(400).json({ message: "Join a team first — your requests go to your team head" });
  }
  const finalEventId = eventId ?? existing.eventId;
  const finalSubjectId = subjectId ?? existing.subjectId;
  const finalDate = rest.lectureDate ?? existing.lectureDate;

  const event = await prisma.event.findUnique({
    where: { id: finalEventId },
    select: { clubId: true, eventDate: true },
  });
  if (!event) return res.status(404).json({ message: "Event not found" });
  if (event.clubId !== me.team.clubId) {
    return res.status(403).json({ message: "You can only claim duty for your own club's events" });
  }

  const subject = await prisma.subject.findUnique({
    where: { id: finalSubjectId },
    select: { classId: true },
  });
  if (!subject) return res.status(404).json({ message: "Subject not found" });
  if (subject.classId !== me.classId) {
    return res.status(400).json({ message: "That subject is not taught in your class" });
  }

  const dateError = checkLectureDate(finalDate, event.eventDate);
  if (dateError) return res.status(400).json({ message: dateError });

  try {
    const request = await prisma.attendanceRequest.update({
      where: { id },
      data: {
        ...rest,
        eventId: finalEventId,
        subjectId: finalSubjectId,
        status: RequestStatus.PENDING_TEAM_HEAD,
        headActionById: null,
        headActionAt: null,
        headRemark: null,
        presidentActionById: null,
        presidentActionAt: null,
        presidentRemark: null,
      },
      select: requestShape,
    });
    return res.json({ request });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return res.status(409).json({ message: "You have already submitted a request for this lecture" });
    }
    throw err;
  }
});

router.delete("/:id", requireAuth, requireRole("VOLUNTEER"), async (req: AuthRequest, res) => {
  const id = idParam(req.params.id);
  if (id === null) return res.status(400).json({ message: "Invalid request id" });

  const existing = await prisma.attendanceRequest.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: "Request not found" });
  if (existing.volunteerId !== req.user!.userId) {
    return res.status(403).json({ message: "You can only withdraw your own requests" });
  }
  if (existing.status !== RequestStatus.PENDING_TEAM_HEAD) {
    return res.status(400).json({ message: "Only a request still awaiting your team head can be withdrawn" });
  }

  await prisma.attendanceRequest.delete({ where: { id } });
  return res.json({ message: "Request withdrawn" });
});

router.get("/team", requireAuth, requireRole("TEAM_HEAD"), async (req: AuthRequest, res) => {
  const userId = req.user!.userId;

  // ?history=1 returns what this head has already decided, instead of the queue.
  if (req.query.history) {
    const requests = await prisma.attendanceRequest.findMany({
      where: { headActionById: userId },
      select: requestShape,
      orderBy: { headActionAt: "desc" },
    });
    return res.json({ requests });
  }

  const teamIds = (await teamsLedBy(userId)).map((t) => t.id);
  const requests = await prisma.attendanceRequest.findMany({
    where: { status: RequestStatus.PENDING_TEAM_HEAD, volunteer: { teamId: { in: teamIds } } },
    select: requestShape,
    orderBy: { createdAt: "asc" },
  });
  return res.json({ requests });
});

router.patch("/:id/head", requireAuth, requireRole("TEAM_HEAD"), async (req: AuthRequest, res) => {
  const id = idParam(req.params.id);
  if (id === null) return res.status(400).json({ message: "Invalid request id" });

  const parsed = actionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }
  const { action, remark } = parsed.data;

  const request = await prisma.attendanceRequest.findUnique({
    where: { id },
    include: { volunteer: { select: { teamId: true } } },
  });
  if (!request) return res.status(404).json({ message: "Request not found" });

  // *** ownership: the volunteer must be on a team this user heads ***
  const teamIds = (await teamsLedBy(req.user!.userId)).map((t) => t.id);
  if (!request.volunteer.teamId || !teamIds.includes(request.volunteer.teamId)) {
    return res.status(403).json({ message: "You can only act on your own team's requests" });
  }

  // *** the double-approval guard: only a request still waiting on the head ***
  if (request.status !== RequestStatus.PENDING_TEAM_HEAD) {
    return res.status(409).json({ message: "This request has already been acted on" });
  }

  const updated = await prisma.attendanceRequest.update({
    where: { id },
    data: {
      status: action === "APPROVE" ? RequestStatus.PENDING_PRESIDENT : RequestStatus.REJECTED,
      headActionById: req.user!.userId,
      headActionAt: new Date(),
      headRemark: remark,
    },
    select: requestShape,
  });
  return res.json({ request: updated });
});


router.get("/club", requireAuth, requireRole("PRESIDENT"), async (req: AuthRequest, res) => {
  const userId = req.user!.userId;

  // ?history=1 returns what this President has already verified or rejected.
  if (req.query.history) {
    const requests = await prisma.attendanceRequest.findMany({
      where: { presidentActionById: userId },
      select: requestShape,
      orderBy: { presidentActionAt: "desc" },
    });
    return res.json({ requests });
  }

  const clubIds = (await clubsOf(userId)).map((c) => c.id);
  const requests = await prisma.attendanceRequest.findMany({
    where: {
      status: RequestStatus.PENDING_PRESIDENT,
      volunteer: { team: { clubId: { in: clubIds } } },
    },
    select: requestShape,
    orderBy: { headActionAt: "asc" },
  });
  return res.json({ requests });
});

router.patch("/:id/president", requireAuth, requireRole("PRESIDENT"), async (req: AuthRequest, res) => {
  const id = idParam(req.params.id);
  if (id === null) return res.status(400).json({ message: "Invalid request id" });

  const parsed = actionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }
  const { action, remark } = parsed.data;

  const request = await prisma.attendanceRequest.findUnique({
    where: { id },
    include: { volunteer: { select: { team: { select: { clubId: true } } } } },
  });
  if (!request) return res.status(404).json({ message: "Request not found" });

  // *** ownership: the volunteer's team must belong to a club this user leads ***
  const clubIds = (await clubsOf(req.user!.userId)).map((c) => c.id);
  const clubId = request.volunteer.team?.clubId;
  if (!clubId || !clubIds.includes(clubId)) {
    return res.status(403).json({ message: "You can only verify your own club's requests" });
  }

  // *** the order guard: the Team Head must have approved it first ***
  if (request.status !== RequestStatus.PENDING_PRESIDENT) {
    return res.status(409).json({ message: "This request is not waiting for your verification" });
  }

  const updated = await prisma.attendanceRequest.update({
    where: { id },
    data: {
      status: action === "APPROVE" ? RequestStatus.APPROVED : RequestStatus.REJECTED,
      presidentActionById: req.user!.userId,
      presidentActionAt: new Date(),
      presidentRemark: remark,
    },
    select: requestShape,
  });
  return res.json({ request: updated });
});

export default router;
