import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();


const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rollNo: z.string().min(1, "Roll number is required"),
  uid: z.string().min(1, "UID is required"),
  classId: z.coerce.number().int().positive("Please choose your class"),
});

const loginSchema = z.object({
  email: z.email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  rollNo: true,
  uid: true,
  class: { select: { id: true, name: true } },
  team: { select: { id: true, name: true, club: { select: { id: true, name: true } } } },
} as const;

function signToken(userId: number, role: string) {
  return jwt.sign(
    { userId, role }, 
    process.env.JWT_SECRET as string, 
    { expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as jwt.SignOptions["expiresIn"] }
  );
}

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }
  const { name, email, password, rollNo, uid, classId } = parsed.data;

  if (await prisma.user.findUnique({ where: { email } })) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }

  if (await prisma.user.findUnique({ where: { uid } })) {
    return res.status(409).json({ message: "An account with this UID already exists" });
  }
  // The chosen class must actually exist.
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) {
    return res.status(400).json({ message: "Please choose a valid class" });
  }

  if (await prisma.user.findUnique({ where: { classId_rollNo: { classId, rollNo } } })) {
    return res.status(409).json({ message: "That roll number is already registered in this class" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({

      data: { name, email, passwordHash, rollNo, uid, classId },
      select: publicUser,
    });
    const token = signToken(user.id, user.role);
    return res.status(201).json({ user, token });
  } catch (err) {

    if ((err as { code?: string }).code === "P2002") {
      return res.status(409).json({ message: "An account with these details already exists" });
    }
    console.error("register failed:", err);
    return res.status(500).json({ message: "Something went wrong creating your account" });
  }
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = signToken(user.id, user.role);
  const safeUser = await prisma.user.findUnique({ where: { id: user.id }, select: publicUser });
  return res.json({ user: safeUser, token });
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: publicUser,
  });

  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json({ user });
});

// Any signed-in user can change their own password. They must prove they know
// the current one, and the new one is validated the same way registration is.
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

router.post("/change-password", requireAuth, async (req: AuthRequest, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) return res.status(404).json({ message: "User not found" });

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Your current password is incorrect" });

  if (currentPassword === newPassword) {
    return res.status(400).json({ message: "The new password must be different from your current one" });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });
  return res.json({ message: "Password changed successfully" });
});

router.get("/admin-only", requireAuth, requireRole("ADMIN"), (_req: AuthRequest, res) => {
  return res.json({ message: "Secret admin data — you are an ADMIN." });
});

export default router;
