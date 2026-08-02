import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CLASSES = [
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
      ["Data Structures", "DS"],
      ["Database Management Systems", "DBMS"],
      ["Operating Systems", "OS"],
    ],
  },
  {
    name: "TYIT",
    course: "B.Sc. Information Technology",
    year: 3,
    subjects: [
      ["Artificial Intelligence", "AI"],
      ["Software Project Management", "SPM"],
      ["Internet of Things", "IoT"],
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
  }

  const tyit = await prisma.class.findUniqueOrThrow({ where: { name: "TYIT" } });
  const syit = await prisma.class.findUniqueOrThrow({ where: { name: "SYIT" } });

  const users = [
    { name: "Admin User", email: "admin@eventease.local", password: "admin123", role: Role.ADMIN },
    { name: "Priya Nair", email: "president@eventease.local", password: "president123", role: Role.PRESIDENT },
    { name: "Aditi Sharma", email: "head@eventease.local", password: "head123", role: Role.TEAM_HEAD },
    { name: "Priti Shelar", email: "faculty@eventease.local", password: "faculty123", role: Role.FACULTY },
    { name: "Rahul Jat", email: "rahul@eventease.local", password: "rahul123", role: Role.VOLUNTEER, rollNo: "44", uid: "24BIT044", classId: tyit.id },
    { name: "Sana Khan", email: "sana@eventease.local", password: "sana123", role: Role.VOLUNTEER, rollNo: "12", uid: "24BIT012", classId: syit.id },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        passwordHash: await bcrypt.hash(u.password, 10),
        role: u.role,
        rollNo: u.rollNo ?? null,
        uid: u.uid ?? null,
        classId: u.classId ?? null,
      },
    });
  }

  // ----- Module 2: a demo club led by the seeded president -----
  // So the President account can create events straight away, without an Admin
  // having to assign a club first.
  const president = await prisma.user.findUniqueOrThrow({
    where: { email: "president@eventease.local" },
  });
  const club = await prisma.club.upsert({
    where: { name: "Dot Com Club" },
    update: { presidentId: president.id },
    create: { name: "Dot Com Club", category: "Technical", presidentId: president.id },
  });

  // ----- Module 3: a demo team under that club (no head yet) -----
  await prisma.team.upsert({
    where: { clubId_name: { clubId: club.id, name: "Events Team" } },
    update: {},
    create: { name: "Events Team", clubId: club.id },
  });

  console.log("\nSeed complete. Login accounts (email / password):");
  for (const u of users) {
    console.log(`  ${u.role.padEnd(10)}  ${u.email}  /  ${u.password}`);
  }
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
