import { PrismaClient, Prisma, EstadoArca } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {

  // Usuario ADMIN
  const adminEmail = 'admin@demo.local';
  const adminPass = 'admin1234';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await argon2.hash(adminPass);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: 'ADMIN'
      }
    });
    console.log(`👤 Usuario admin creado: ${adminEmail} / ${adminPass}`);
  } else {
    console.log(`👤 Usuario admin ya existe: ${adminEmail}`);
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
