import { prisma } from '../config/database.js';
import { Organization, OrganizationMember, OrganizationInvitation, OrgRole, InvitationStatus } from '@prisma/client';

export class OrganizationRepository {
  async findById(id: string): Promise<Organization | null> {
    return prisma.organization.findFirst({
      where: { id, deletedAt: null }
    });
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return prisma.organization.findFirst({
      where: { slug: slug.toLowerCase(), deletedAt: null }
    });
  }

  async findUserOrganizations(userId: string) {
    return prisma.organizationMember.findMany({
      where: {
        userId,
        organization: { deletedAt: null }
      },
      select: {
        role: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            createdAt: true,
            updatedAt: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async getMember(organizationId: string, userId: string): Promise<OrganizationMember | null> {
    return prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId
        }
      }
    });
  }

  async getMemberById(memberId: string): Promise<(OrganizationMember & { organization: Organization }) | null> {
    return prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: { organization: true }
    });
  }

  async listMembers(organizationId: string) {
    return prisma.organizationMember.findMany({
      where: { organizationId },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async countOwners(organizationId: string): Promise<number> {
    return prisma.organizationMember.count({
      where: {
        organizationId,
        role: OrgRole.OWNER
      }
    });
  }

  async createOrganizationWithAdmin(
    name: string,
    slug: string,
    userId: string
  ): Promise<{ organization: Organization; member: OrganizationMember }> {
    return prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name,
          slug: slug.toLowerCase()
        }
      });

      const member = await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId,
          role: OrgRole.OWNER
        }
      });

      return { organization, member };
    });
  }

  async updateOrganization(
    id: string,
    data: { name?: string; slug?: string; logoUrl?: string | null }
  ): Promise<Organization> {
    return prisma.organization.update({
      where: { id },
      data
    });
  }

  async softDeleteOrganization(id: string): Promise<Organization> {
    return prisma.organization.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  async createInvitation(
    organizationId: string,
    email: string,
    role: OrgRole,
    token: string,
    invitedById: string,
    expiresAt: Date
  ): Promise<OrganizationInvitation> {
    return prisma.organizationInvitation.create({
      data: {
        organizationId,
        email: email.toLowerCase(),
        role,
        token,
        invitedById,
        expiresAt
      }
    });
  }

  async listInvitations(organizationId: string) {
    return prisma.organizationInvitation.findMany({
      where: {
        organizationId,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() }
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async acceptInvitation(tokenHash: string, userId: string, userEmail: string) {
    return prisma.$transaction(async (tx) => {
      const invitation = await tx.organizationInvitation.findFirst({
        where: { token: tokenHash, status: InvitationStatus.PENDING, expiresAt: { gt: new Date() } }
      });
      if (!invitation) return null;
      if (invitation.email !== userEmail.toLowerCase()) return 'EMAIL_MISMATCH' as const;

      const existingMember = await tx.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: invitation.organizationId, userId } }
      });
      if (!existingMember) {
        await tx.organizationMember.create({
          data: { organizationId: invitation.organizationId, userId, role: invitation.role }
        });
      }
      const updated = await tx.organizationInvitation.updateMany({
        where: { id: invitation.id, status: InvitationStatus.PENDING },
        data: { status: InvitationStatus.ACCEPTED }
      });
      if (updated.count !== 1) throw new Error('Invitation was already processed');
      return invitation;
    });
  }

  async removeMember(memberId: string): Promise<OrganizationMember> {
    return prisma.organizationMember.delete({
      where: { id: memberId }
    });
  }

  async updateMemberRole(memberId: string, role: OrgRole): Promise<OrganizationMember> {
    return prisma.organizationMember.update({
      where: { id: memberId },
      data: { role }
    });
  }
}

export const organizationRepository = new OrganizationRepository();
