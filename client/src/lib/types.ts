
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
}

export interface Club {
  id: number;
  name: string;
  category?: string | null;
  presidentId?: number | null;
  president?: { id: number; name: string; email: string } | null;
  _count?: { events: number };
}

export interface TeamMember {
  id: number;
  name: string;
  rollNo?: string | null;
  uid?: string | null;
  class?: { name: string } | null;
}

export interface Team {
  id: number;
  name: string;
  clubId: number;
  headId?: number | null;
  head?: { id: number; name: string; email: string } | null;
  club?: { id: number; name: string; presidentId: number | null };
  _count?: { members: number };
  members?: TeamMember[];
}

// A club with its teams, as the volunteer's "pick your team" browse returns it.
export interface BrowseTeam {
  id: number;
  name: string;
  head?: { id: number; name: string } | null;
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

export interface AttendanceOptions {
  events: { id: number; name: string; eventDate: string }[];
  subjects: { id: number; name: string; code: string }[];
}

export interface EventItem {
  id: number;
  name: string;
  eventDate: string;
  venue?: string | null;
  status: EventStatus;
  clubId: number;
  club?: { id: number; name: string; presidentId: number | null };
}
