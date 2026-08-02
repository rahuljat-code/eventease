import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (_req, res) => {
  const classes = await prisma.class.findMany({
    select: { id: true, name: true },
    orderBy: { year: "asc" },
  });
  return res.json({ classes });
});

export default router;
