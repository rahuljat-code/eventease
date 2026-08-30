
export type Role = "VOLUNTEER" | "TEAM_HEAD" | "PRESIDENT" | "FACULTY" | "ADMIN";

// A class as the register dropdown and the profile need it — just id + name.
export interface ClassRef {
  id: number;
  name: string;
}

export interface MyTeam {
  id: number;
  name: string;
  club: { id: number; name: string };
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  rollNo?: string | null;
  uid?: string | null;
  class?: ClassRef | null;
  team?: MyTeam | null;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  rollNo: string;
  uid: string;
  classId: number;
}

/* ----- Module 2: Clubs & Events ----- */

// A user as the Admin's "assign president" dropdown needs them.
export interface UserRef {
  id: number;
  name: string;
  email: string;
  role: Role;
  department?: string | null;
  phone?: string | null;
}

// The result of a bulk student CSV import.
export interface StudentImportResult {
  created: number;
  skipped: number;
  total: number;
}

export interface Club {
  id: number;
  name: string;
  category?: string | null;
  presidentId?: number | null;
  president?: { id: number; name: string; email: string } | null;
  _count?: { events: number };
}

export type TeamRole = "HEAD" | "SUBHEAD";

export interface TeamMember {
  id: number;
  name: string;
  rollNo?: string | null;
  uid?: string | null;
  teamRole?: TeamRole | null;
  class?: { name: string } | null;
}

export interface Team {
  id: number;
  name: string;
  clubId: number;
  club?: { id: number; name: string; presidentId: number | null };
  _count?: { members: number };
  members?: TeamMember[];
}

// A club with its teams, as the volunteer's "pick your team" browse returns it.
export interface BrowseTeam {
  id: number;
  name: string;
  members?: { id: number; name: string; teamRole: TeamRole }[];
  _count?: { members: number };
}
export interface BrowseClub {
  id: number;
  name: string;
  teams: BrowseTeam[];
}

export type EventStatus = "UPCOMING" | "ONGOING" | "COMPLETED";

/* ----- Module 4: Attendance requests ----- */

export type RequestStatus =
  | "PENDING_TEAM_HEAD"
  | "PENDING_PRESIDENT"
  | "APPROVED"
  | "REJECTED";

export interface AttendanceRequest {
  id: number;
  lectureDate: string;
  lectureTime: string;
  teacherName: string;
  reason?: string | null;
  status: RequestStatus;
  headActionAt?: string | null;
  headRemark?: string | null;
  presidentActionAt?: string | null;
  presidentRemark?: string | null;
  createdAt: string;
  event: { id: number; name: string; eventDate: string };
  subject: { id: number; name: string; code: string };
  volunteer: {
    id: number;
    name: string;
    rollNo?: string | null;
    uid?: string | null;
    class?: { name: string } | null;
  };
  headActionBy?: { id: number; name: string } | null;
  presidentActionBy?: { id: number; name: string } | null;
}

/* ----- Module 5: CC Credits ----- */

// One credit record for a volunteer + event, as the review lists show it.
export interface CreditAward {
  id: number;
  points: number;
  verifiedAt: string | null;
  event: { id: number; name: string; eventDate: string };
  volunteer: { id: number; name: string; rollNo?: string | null; class?: { name: string } | null };
  awardedBy?: { id: number; name: string } | null;
  verifiedBy?: { id: number; name: string } | null;
}

// Everything the Team Head's "award CC points" screen loads in one call.
export interface CreditTeamContext {
  events: { id: number; name: string; eventDate: string }[];
  members: { id: number; name: string; rollNo?: string | null; class?: { name: string } | null }[];
  awards: { id: number; volunteerId: number; eventId: number; points: number; verifiedAt: string | null }[];
}

// A volunteer's own credit, on their dashboard.
export interface MyCredit {
  id: number;
  points: number;
  verifiedAt: string | null;
  event: { id: number; name: string; eventDate: string };
}

export interface AttendanceOptions {
  events: { id: number; name: string; eventDate: string }[];
  subjects: { id: number; name: string; code: string }[];
}

/* ----- Module 7.2: Faculty CC Activities ----- */

export interface CCActivityListItem {
  id: number;
  title: string;
  activityDate: string;
  points: number;
  class: { name: string };
  presentCount: number;
  studentCount: number;
}
export interface CCRosterStudent {
  id: number;
  name: string;
  rollNo?: string | null;
  uid?: string | null;
  present: boolean;
}
export interface CCActivityDetail {
  activity: {
    id: number;
    title: string;
    activityDate: string;
    points: number;
    classId: number;
    class: { id: number; name: string };
  };
  roster: CCRosterStudent[];
}
export interface MyCCActivity {
  id: number;
  title: string;
  activityDate: string;
  points: number;
}

/* ----- Module 7.1: Analytics & Insights ----- */

export type MetricTone = "amber" | "blue" | "emerald" | "red" | "indigo" | "violet" | "slate";
export interface OverviewMetric {
  label: string;
  value: number;
  hint?: string;
  tone: MetricTone;
}
export interface OverviewSeries {
  label: string;
  value: number;
  tone?: MetricTone;
}
export interface OverviewChart {
  title: string;
  kind: "donut" | "bars";
  series: OverviewSeries[];
}
export interface Overview {
  metrics: OverviewMetric[];
  charts: OverviewChart[];
}

export interface EventItem {
  id: number;
  name: string;
  eventDate: string;
  venue?: string | null;
  status: EventStatus;
  clubId: number;
  club?: { id: number; name: string; presidentId: number | null };
  registrationCount?: number;
}

/* ----- Module 7.3: Event Registration ----- */

export interface BrowseEvent {
  id: number;
  name: string;
  eventDate: string;
  venue?: string | null;
  status: EventStatus;
  club: { name: string };
  registrationCount: number;
  registered: boolean;
}

export interface EventRegistrant {
  id: number; // the volunteer's user id
  name: string;
  rollNo?: string | null;
  uid?: string | null;
  class?: { name: string } | null;
  registeredAt: string;
}

/* ----- Module 8.1: Participation Certificate ----- */

export interface CertificateData {
  student: {
    name: string;
    uid?: string | null;
    rollNo?: string | null;
    class?: string | null;
    course?: string | null;
  };
  clubCredits: { name: string; points: number; date: string }[];
  activities: { name: string; points: number; date: string }[];
  events: { name: string; date: string }[];
  totalCC: number;
  certificateId: string;
  issuedAt: string;
}

/* ----- Module 8.2: Duty & Task Assignment ----- */

export type DutyStatus = "PENDING" | "DONE";

export interface Duty {
  id: number;
  title: string;
  description?: string | null;
  status: DutyStatus;
  createdAt: string;
  event?: { id: number; name: string; eventDate: string } | null;
  assignedTo: {
    id: number;
    name: string;
    rollNo?: string | null;
    class?: { name: string } | null;
  };
}

/* ----- Module 8.3: Leaderboard & Badges ----- */

export type Badge = "Gold" | "Silver" | "Bronze" | null;

export interface LeaderboardRow {
  rank: number;
  id: number;
  name: string;
  class: string | null;
  points: number;
  badge: Badge;
}

export interface LeaderboardData {
  leaderboard: LeaderboardRow[];
  me: LeaderboardRow | null;
}
