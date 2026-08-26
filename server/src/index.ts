import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import classRoutes from "./routes/classes";
import userRoutes from "./routes/users";
import clubRoutes from "./routes/clubs";
import eventRoutes from "./routes/events";
import teamRoutes from "./routes/teams";
import attendanceRoutes from "./routes/attendance";
import creditRoutes from "./routes/credits";
import reportRoutes from "./routes/reports";
import analyticsRoutes from "./routes/analytics";
import ccActivityRoutes from "./routes/ccActivities";

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL ?? "*" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "EventEase API is running" });
});

app.use("/api/auth", authRoutes);

app.use("/api/classes", classRoutes);

// Module 2 — Club & Event Management
app.use("/api/users", userRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/events", eventRoutes);

// Module 3 — Volunteer Management (teams)
app.use("/api/teams", teamRoutes);

// Module 4 — Attendance Request & Multi-Level Approval
app.use("/api/attendance", attendanceRoutes);

// Module 5 — CC Credit Management
app.use("/api/credits", creditRoutes);

// Module 6 — Reports & Analytics (Faculty CSV downloads)
app.use("/api/reports", reportRoutes);

// Module 7.1 — Analytics & Insights (role-aware dashboard overview)
app.use("/api/analytics", analyticsRoutes);

// Module 7.2 — Faculty CC Activities (teacher-driven CC + class marking)
app.use("/api/cc-activities", ccActivityRoutes);

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
