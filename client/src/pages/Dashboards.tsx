import { DashboardShell, ComingSoon } from "../components/DashboardShell";

// The only dashboard still a skeleton. Admin, President, Volunteer and Team Head
// now live in their own files; Faculty grows its section in Module 6.

export function FacultyDashboard() {
  return (
    <DashboardShell title="Faculty">
      <ComingSoon note="Attendance and CC point sheet downloads will appear here." />
    </DashboardShell>
  );
}
