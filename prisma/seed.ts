import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEVICE = "AsusBook 15 OLED — i5 / 16 Go / 512 Go";
const ACCESSORIES = JSON.stringify(["Chargeur secteur 65 W"]);

type StudentSeed = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  groupName: string;
  box: string;
  serial: string;
  tutorName: string;
  tutorPhone: string;
  paid: boolean;
  avatarHue: number;
};

const STUDENTS: StudentSeed[] = [
  { id: "ELV-24-0142", code: "A24P0142X", firstName: "Lucas", lastName: "Moreau Dubois", groupName: "CM1 A — Primaire", box: "CS-014", serial: "AB6N4F9NQ1MV", tutorName: "Sophie Moreau", tutorPhone: "+33 6 12 48 90 43", paid: true, avatarHue: 264 },
  { id: "ELV-24-0143", code: "A24P0143X", firstName: "Léa", lastName: "Bernard Caron", groupName: "CM1 A — Primaire", box: "CS-015", serial: "AB6N4F9NQ23B", tutorName: "Pierre Bernard", tutorPhone: "+33 6 98 21 44 77", paid: true, avatarHue: 24 },
  { id: "ELV-24-0089", code: "A24S0089X", firstName: "Hugo", lastName: "Lefèvre Garnier", groupName: "4ᵉ B — Collège", box: "CS-038", serial: "AB6N4F9NQ4DQ", tutorName: "Camille Lefèvre", tutorPhone: "+33 6 11 56 09 22", paid: true, avatarHue: 150 },
  { id: "ELV-24-0091", code: "A24S0091X", firstName: "Camille", lastName: "Rousseau Carpentier", groupName: "4ᵉ B — Collège", box: "CS-039", serial: "AB6N4F9NQVE1", tutorName: "Patricia Rousseau", tutorPhone: "+33 6 77 33 28 18", paid: false, avatarHue: 60 },
  { id: "ELV-24-0144", code: "A24P0144X", firstName: "Théo", lastName: "Girard Marchand", groupName: "CM1 A — Primaire", box: "CS-016", serial: "AB6N4F9NQ44A", tutorName: "Ivan Girard", tutorPhone: "+33 6 22 04 66 11", paid: true, avatarHue: 200 },
  { id: "ELV-24-0210", code: "A24S0210X", firstName: "Chloé", lastName: "Petit Vasseur", groupName: "3ᵉ A — Collège", box: "CS-051", serial: "AB6N4F9NQVF7", tutorName: "Caroline Petit", tutorPhone: "+33 6 68 09 12 34", paid: true, avatarHue: 320 },
  { id: "ELV-24-0145", code: "A24P0145X", firstName: "Adam", lastName: "Laurent Quentin", groupName: "CM1 B — Primaire", box: "CS-017", serial: "AB6N4F9NQ55C", tutorName: "Monique Laurent", tutorPhone: "+33 6 89 11 33 00", paid: true, avatarHue: 130 },
  { id: "ELV-24-0211", code: "A24S0211X", firstName: "Sarah", lastName: "Dubois Renard", groupName: "3ᵉ A — Collège", box: "CS-052", serial: "AB6N4F9NQVG2", tutorName: "Frédéric Dubois", tutorPhone: "+33 6 33 44 77 11", paid: true, avatarHue: 290 },
];

type LockerSeed = {
  ownerId: string;
  number: string;
  code: string;
  brand: string;
  aisle: string;
  status: string;
};

const LOCKERS: LockerSeed[] = [
  { ownerId: "ELV-24-0142", number: "L-A-014", code: "12-34-08", brand: "Master Lock 1500iD", aisle: "Aile A · Rangée 2", status: "pending" },
  { ownerId: "ELV-24-0143", number: "L-A-015", code: "27-19-44", brand: "Master Lock 1500iD", aisle: "Aile A · Rangée 2", status: "pending" },
  { ownerId: "ELV-24-0089", number: "L-B-038", code: "05-22-31", brand: "Master Lock 1500iD", aisle: "Aile B · Rangée 4", status: "delivered" },
  { ownerId: "ELV-24-0091", number: "L-B-039", code: "18-07-26", brand: "Master Lock 1500iD", aisle: "Aile B · Rangée 4", status: "pending" },
  { ownerId: "ELV-24-0144", number: "L-A-016", code: "33-09-17", brand: "Master Lock 1500iD", aisle: "Aile A · Rangée 2", status: "pending" },
  { ownerId: "ELV-24-0210", number: "L-C-051", code: "41-06-29", brand: "Master Lock 1500iD", aisle: "Aile C · Rangée 6", status: "pending" },
  { ownerId: "ELV-24-0145", number: "L-A-017", code: "02-38-15", brand: "Master Lock 1500iD", aisle: "Aile A · Rangée 3", status: "pending" },
  { ownerId: "ELV-24-0211", number: "L-C-052", code: "19-24-37", brand: "Master Lock 1500iD", aisle: "Aile C · Rangée 6", status: "pending" },
];

async function main() {
  for (const s of STUDENTS) {
    const data = {
      code: s.code,
      firstName: s.firstName,
      lastName: s.lastName,
      groupName: s.groupName,
      box: s.box,
      device: DEVICE,
      serial: s.serial,
      accessories: ACCESSORIES,
      tutorName: s.tutorName,
      tutorPhone: s.tutorPhone,
      paid: s.paid,
      avatarHue: s.avatarHue,
    };
    await prisma.student.upsert({
      where: { id: s.id },
      update: data,
      create: { id: s.id, ...data },
    });
  }

  for (const l of LOCKERS) {
    const data = {
      number: l.number,
      brand: l.brand,
      code: l.code,
      aisle: l.aisle,
      status: l.status,
      deliveredAt: l.status === "delivered" ? new Date() : null,
    };
    await prisma.locker.upsert({
      where: { ownerId: l.ownerId },
      update: data,
      create: { ownerId: l.ownerId, ...data },
    });
  }

  console.log(`Seeded ${STUDENTS.length} students and ${LOCKERS.length} lockers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
