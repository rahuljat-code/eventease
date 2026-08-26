import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const CLASSES: { name: string; course: string; year: number; subjects: string[][] }[] = [
  {
    name: "FYIT",
    course: "B.Sc. Information Technology",
    year: 1,
    subjects: [
      ["Imperative Programming", "IP"],
      ["Digital Logic & Applications", "DLA"],
      ["Web Programming", "WP"],
    ],
  },
  {
    name: "SYIT",
    course: "B.Sc. Information Technology",
    year: 2,
    subjects: [
      ["Core Java", "CJ"],
      ["Data Structures", "DS"],
      ["Quantitative Techniques", "QT"],
      ["Computer Networks", "CN"],
      ["Human Resource Management", "HRM"],
      ["Hindi", "HIN"],
    ],
  },
  {
    name: "TYIT",
    course: "B.Sc. Information Technology",
    year: 3,
    subjects: [
      ["Advance Software Development Technique", "ASDT"],
      ["Mobile App Development With Flutter", "MAD"],
      ["Artificial Intelligence", "AI"],
      ["Ethical Hacking", "EH"],
      ["Big Data", "BD"],
      ["Data Visualization", "DV"],
    ],
  },
  // Software Development branch. Subjects are not in the roll-call sheets, so
  // they start empty and can be added later (the attendance sheet builds its
  // columns from whatever subjects exist).
  {
    name: "SYSD",
    course: "B.Sc. Software Development",
    year: 2,
    subjects: [
      ["Advance Java", "AJ"],
      ["Python", "PY"],
      ["Data CN", "DCN"],
      ["Software Engineering", "SE"],
      ["Human Resource Management", "HRM"],
      ["Hindi", "HIN"],
    ],
  },
  {
    name: "TYSD",
    course: "B.Sc. Software Development",
    year: 3,
    subjects: [
      ["Data Structures and Algorithms", "DSA"],
      ["Mobile App Development With Flutter", "MAD"],
      ["Artificial Intelligence", "AI"],
      ["Ethical Hacking", "EH"],
      ["Big Data", "BD"],
      ["Data Visualization", "DV"],
    ],
  },
];

async function main() {
  for (const c of CLASSES) {
    const cls = await prisma.class.upsert({
      where: { name: c.name },
      update: { course: c.course, year: c.year },
      create: { name: c.name, course: c.course, year: c.year },
    });
    for (const [name, code] of c.subjects) {
      await prisma.subject.upsert({
        where: { classId_code: { classId: cls.id, code } },
        update: { name },
        create: { classId: cls.id, name, code },
      });
    }
    // Keep the class's subjects in sync — drop any no longer in the list.
    const codes = c.subjects.map(([, code]) => code);
    if (codes.length > 0) {
      await prisma.subject.deleteMany({ where: { classId: cls.id, code: { notIn: codes } } });
    } else {
      await prisma.subject.deleteMany({ where: { classId: cls.id } });
    }
  }

  // ----- Clean slate: wipe all operational / demo data -----
  // The seed resets the system to the baseline the Admin builds on: only the
  // Admin, one teacher, the classes/subjects and the real student roster. Clubs,
  // teams, events, CC activities and registrations are all cleared (the Admin
  // creates clubs and assigns presidents from inside the app; presidents then
  // create teams and assign heads).
  await prisma.eventRegistration.deleteMany({});
  await prisma.attendanceRequest.deleteMany({});
  await prisma.creditAward.deleteMany({});
  await prisma.cCActivityAttendance.deleteMany({});
  await prisma.cCActivity.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.club.deleteMany({});

  // ----- Staff: only the Admin and one teacher to start with -----
  const staff = [
    { name: "Admin", email: "admin@eventease.local", password: "W3L", role: Role.ADMIN },
    { name: "Preeti Shelar", email: "preeti@eventease.local", password: "preeti123", role: Role.FACULTY },
  ];
  // Remove every other account (old demo staff + all students) — students are
  // re-imported clean below, so nobody is left promoted.
  await prisma.user.deleteMany({ where: { email: { notIn: staff.map((s) => s.email) } } });
  for (const u of staff) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash },
      create: { name: u.name, email: u.email, passwordHash, role: u.role },
    });
  }

  // ----- Real college roster, imported from the roll-call sheets -----
  // roster.json is { "SYIT": [{rollNo, uid, name}, ...], "TYIT": [...], ... }.
  // Each student gets a login: email = <uid>@eventease.local, password "student123".
  //
  // Clear volunteer accounts first so the roster imports cleanly on every run
  // (no leftover (classId, rollNo) collisions from earlier data). Staff accounts
  // are untouched.
  await prisma.user.deleteMany({ where: { role: "VOLUNTEER" } });

  const roster: Record<string, { rollNo: string; uid: string; name: string }[]> = JSON.parse(
    fs.readFileSync(path.join(__dirname, "roster.json"), "utf8")
  );
  const studentHash = await bcrypt.hash("student123", 10);
  let imported = 0;
  for (const [code, students] of Object.entries(roster)) {
    const cls = await prisma.class.findUniqueOrThrow({ where: { name: code } });
    for (const s of students) {
      const email = `${s.uid.toLowerCase()}@eventease.local`;
      const data = {
        where: { email },
        update: { name: s.name, rollNo: s.rollNo, uid: s.uid, classId: cls.id },
        create: {
          name: s.name,
          email,
          passwordHash: studentHash,
          role: Role.VOLUNTEER,
          rollNo: s.rollNo,
          uid: s.uid,
          classId: cls.id,
        },
      };
      try {
        await prisma.user.upsert(data);
        imported++;
      } catch (e: any) {
        // A stale volunteer row is holding this (classId, rollNo) or uid — clear
        // it and retry (staff rows have null rollNo/uid, so are never matched).
        await prisma.user.deleteMany({
          where: {
            role: "VOLUNTEER",
            email: { not: email },
            OR: [{ classId: cls.id, rollNo: s.rollNo }, { uid: s.uid }],
          },
        });
        try {
          await prisma.user.upsert(data);
          imported++;
        } catch (e2: any) {
          console.log(`  SKIP ${code} roll ${s.rollNo} ${s.uid} (${s.name}) — ${e2.code ?? e2.message}`);
        }
      }
    }
  }

  console.log(`\nSeed complete. Imported ${imported} students.`);
  console.log("Logins (username / password):");
  for (const u of staff) console.log(`  ${u.role.padEnd(8)}  ${u.email.split("@")[0]}  /  ${u.password}`);
  console.log("  Student   <uid>  /  student123   (e.g. 24bit044)");
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
