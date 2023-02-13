import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const william = await prisma.user.upsert({
    where: { email: "william@ironeec.com" },
    update: {},
    create: {
      email: "william@ironeec.com",
      name: "William",
      image:
        "https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=10160568857483134&height=50&width=50&ext=1672928640&hash=AeQ0frh06y96II7DD5g",
      role: "MANAGER",
    },
  });
  console.log("william", william);
  await prisma.activityGroup.deleteMany();
  await prisma.activityGroup.createMany({
    data: [
      {
        name: "Cardio",
        default: true,
      },
      { name: "Fitness", default: true },
      { name: "Aquatique", default: true },
      { name: "Cross Fit", default: true },
      { name: "Boxe", default: true },
      { name: "Raquette", default: true },
    ],
  });
  await prisma.certificationGroup.deleteMany();
  await prisma.certificationGroup.createMany({
    data: [{ name: "LESMILLS", default: true }],
  });

  const groups = await prisma.activityGroup.findMany();
  const certifications = await prisma.certificationGroup.findMany();
  await prisma.club.create({
    data: {
      name: "Moving",
      address: "Mours",
      manager: {
        connect: { id: william.id },
      },
      sites: {
        create: {
          name: "Club Moving",
          address: "Rue de Mours",
          openWithClub: true,
          rooms: {
            createMany: {
              data: [
                {
                  name: "Fitness 1",
                  capacity: 60,
                  reservation: "POSSIBLE",
                },
                {
                  name: "Fitness 2",
                  capacity: 40,
                  reservation: "POSSIBLE",
                },
                {
                  name: "Fitness 3",
                  capacity: 40,
                  reservation: "POSSIBLE",
                },
                {
                  name: "Tennis",
                  capacity: 4,
                  reservation: "MANDATORY",
                },
                {
                  name: "Badmington",
                  capacity: 4,
                  reservation: "MANDATORY",
                },
                {
                  name: "Squach",
                  capacity: 4,
                  reservation: "MANDATORY",
                },
                {
                  name: "Piscine",
                  capacity: 30,
                  reservation: "POSSIBLE",
                },
              ],
            },
          },
        },
      },
      activities: {
        createMany: {
          data: [
            {
              name: "Body Combat",
              groupId: groups.find((g) => g.name === "Fitness").id,
              certificationGroupId: certifications[0].id,
            },
            {
              name: "Body Attack",
              groupId: groups.find((g) => g.name === "Cardio").id,
              certificationGroupId: certifications[0].id,
            },
            {
              name: "Hiit",
              groupId: groups.find((g) => g.name === "Cardio").id,
            },
            {
              name: "Aquabike",
              groupId: groups.find((g) => g.name === "Aquatique").id,
            },
            {
              name: "Boxe débutant",
              groupId: groups.find((g) => g.name === "Boxe").id,
            },
            {
              name: "Boxe avancé",
              groupId: groups.find((g) => g.name === "Boxe").id,
            },
            {
              name: "X-Fit",
              groupId: groups.find((g) => g.name === "Cross Fit").id,
            },
            {
              name: "Tennis",
              groupId: groups.find((g) => g.name === "Raquette").id,
            },
          ],
        },
      },
    },
  });

  await prisma.club.create({
    data: {
      name: "610 Crew",
      address: "Conflans Ste Honorine",
      manager: {
        connect: { id: william.id },
      },
      sites: {
        create: {
          name: "Eragny",
          address: "Gymnase de la bute",
          rooms: {
            create: {
              name: "Salle polyvalente",
              capacity: 30,
              reservation: "NONE",
            },
          },
        },
      },
      activities: {
        createMany: {
          data: [
            {
              name: "Body Combat",
              groupId: groups.find((g) => g.name === "Fitness").id,
            },
            {
              name: "Body Attack",
              groupId: groups.find((g) => g.name === "Cardio").id,
            },
            {
              name: "Boxe débutant",
              groupId: groups.find((g) => g.name === "Boxe").id,
            },
            {
              name: "Boxe avancé",
              groupId: groups.find((g) => g.name === "Boxe").id,
            },
          ],
        },
      },
    },
  });

  //     {
  //       name: "610 Crew",
  //       address: "Eragny",
  //       managerId: william.id,
  //     },
  //   ],
  // });

  // const clubs = await prisma.club.findMany();
  // const movingId = clubs.find((c) => c.name === "Moving").id;
  // const crewId = clubs.find((c) => c.name === "610 Crew").id;

  // await prisma.site.createMany({
  //   data: [
  //     {
  //       name: "Mours",
  //       address: "Rue du moving",
  //       clubId: movingId,
  //     },
  //     {
  //       name: "Eragny",
  //       address: "Gymnase de la bute",
  //       clubId: crewId,
  //     },
  //     {
  //       name: "Conflans",
  //       address: "Salle de sport de conflans",
  //       clubId: crewId,
  //     },
  //   ],
  // });

  // await prisma.activity.createMany({
  //   data: [
  //     {
  //       name: "Body Combat",
  //       groupId: groups.find((g) => g.name === "Fitness").id,
  //       clubId: crewId,
  //     },
  //     {
  //       name: "Body Attack",
  //       groupId: groups.find((g) => g.name === "Cardio").id,
  //       clubId: crewId,
  //     },
  //     {
  //       name: "Aquabike",
  //       groupId: groups.find((g) => g.name === "Aquatique").id,
  //       clubId: movingId,
  //     },
  //     {
  //       name: "Body Combat",
  //       groupId: groups.find((g) => g.name === "Fitness").id,
  //       clubId: movingId,
  //     },
  //     {
  //       name: "Body Attack",
  //       groupId: groups.find((g) => g.name === "Cardio").id,
  //       clubId: movingId,
  //     },
  //   ],
  // });
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
