import { PrismaClient, OrgRole, ProjectRole } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding DevFlow database...');

  // Password for test users: Password123!
  const defaultPasswordHash = await argon2.hash('Password123!', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
  });

  // Seed Admin User
  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@devflow.io' },
    update: {},
    create: {
      email: 'owner@devflow.io',
      name: 'DevFlow Admin Owner',
      passwordHash: defaultPasswordHash,
      emailVerified: true
    }
  });

  // Seed Developer User
  const devUser = await prisma.user.upsert({
    where: { email: 'developer@devflow.io' },
    update: {},
    create: {
      email: 'developer@devflow.io',
      name: 'Jane Developer',
      passwordHash: defaultPasswordHash,
      emailVerified: true
    }
  });

  // Seed Sample Organization 1
  const acmeOrg = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp'
    }
  });

  // Organization Memberships
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: acmeOrg.id,
        userId: ownerUser.id
      }
    },
    update: { role: OrgRole.OWNER },
    create: {
      organizationId: acmeOrg.id,
      userId: ownerUser.id,
      role: OrgRole.OWNER
    }
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: acmeOrg.id,
        userId: devUser.id
      }
    },
    update: { role: OrgRole.DEVELOPER },
    create: {
      organizationId: acmeOrg.id,
      userId: devUser.id,
      role: OrgRole.DEVELOPER
    }
  });

  // Seed Sample Organization 2 (For multi-tenant isolation testing)
  const globexOrg = await prisma.organization.upsert({
    where: { slug: 'globex-inc' },
    update: {},
    create: {
      name: 'Globex Inc',
      slug: 'globex-inc'
    }
  });

  const globexUser = await prisma.user.upsert({
    where: { email: 'globex-user@globex.com' },
    update: {},
    create: {
      email: 'globex-user@globex.com',
      name: 'Globex Admin',
      passwordHash: defaultPasswordHash,
      emailVerified: true
    }
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: globexOrg.id,
        userId: globexUser.id
      }
    },
    update: { role: OrgRole.OWNER },
    create: {
      organizationId: globexOrg.id,
      userId: globexUser.id,
      role: OrgRole.OWNER
    }
  });

  console.log('Database seeded successfully.');
  console.log('Test Accounts:');
  console.log(' - owner@devflow.io / Password123! (Acme Corp Owner)');
  console.log(' - developer@devflow.io / Password123! (Acme Corp Developer)');
  console.log(' - globex-user@globex.com / Password123! (Globex Inc Owner)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
