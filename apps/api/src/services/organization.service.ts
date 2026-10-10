import { organizationRepository } from '../repositories/organization.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { generateRandomToken, hashOpaqueToken } from '../utils/crypto.js';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../utils/errors.js';
import { CreateOrgInput, UpdateOrgInput, InviteMemberInput, UpdateMemberRoleInput } from '@devflow/validation';
import { OrgRole } from '@devflow/shared';
import { activityService } from './activity.service.js';
import { enqueueEmailJob } from '../jobs/queues.js';
import { env } from '../config/env.js';

export class OrganizationService {
  async createOrganization(input: CreateOrgInput, userId: string) {
    const existingOrg = await organizationRepository.findBySlug(input.slug);
    if (existingOrg) {
      throw new ConflictError(`Organization slug '${input.slug}' is already taken`);
    }

    const { organization, member } = await organizationRepository.createOrganizationWithAdmin(
      input.name,
      input.slug,
      userId
    );

    await activityService.record({ organizationId: organization.id, actorId: userId, action: 'ORGANIZATION_CREATED', entityType: 'ORGANIZATION', entityId: organization.id, payload: { name: organization.name, slug: organization.slug } });
    return {
      ...organization,
      role: member.role
    };
  }

  async getUserOrganizations(userId: string) {
    const memberships = await organizationRepository.findUserOrganizations(userId);
    return memberships.map((m) => ({
      ...m.organization,
      role: m.role
    }));
  }

  async getOrganizationDetails(organizationId: string) {
    const org = await organizationRepository.findById(organizationId);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }
    return org;
  }

  async updateOrganization(organizationId: string, input: UpdateOrgInput, actorId: string) {
    const org = await organizationRepository.findById(organizationId);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    if (input.slug && input.slug !== org.slug) {
      const existing = await organizationRepository.findBySlug(input.slug);
      if (existing) {
        throw new ConflictError(`Slug '${input.slug}' is already in use`);
      }
    }

    const updated = await organizationRepository.updateOrganization(organizationId, input);
    await activityService.record({ organizationId, actorId, action: 'ORGANIZATION_UPDATED', entityType: 'ORGANIZATION', entityId: organizationId, payload: input });
    return updated;
  }

  async deleteOrganization(organizationId: string, actorId: string) {
    const org = await organizationRepository.findById(organizationId);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    await organizationRepository.softDeleteOrganization(organizationId);
    await activityService.record({ organizationId, actorId, action: 'ORGANIZATION_ARCHIVED', entityType: 'ORGANIZATION', entityId: organizationId });
  }

  async listMembers(organizationId: string) {
    return organizationRepository.listMembers(organizationId);
  }

  async inviteMember(organizationId: string, input: InviteMemberInput, invitedById: string) {
    const existingUser = await userRepository.findByEmail(input.email);
    if (existingUser) {
      const isMember = await organizationRepository.getMember(organizationId, existingUser.id);
      if (isMember) {
        throw new ConflictError('User is already a member of this organization');
      }
    }

    const token = generateRandomToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await organizationRepository.createInvitation(
      organizationId,
      input.email,
      input.role as OrgRole,
      hashOpaqueToken(token),
      invitedById,
      expiresAt
    );
    await activityService.record({ organizationId, actorId: invitedById, action: 'MEMBER_INVITED', entityType: 'INVITATION', entityId: invitation.id, payload: { email: invitation.email, role: invitation.role } });
    await enqueueEmailJob('organization_invitation', {
      email: invitation.email,
      invitationUrl: `${env.APP_URL}/invitations/${token}`,
      organizationId
    });

    return { id: invitation.id, email: invitation.email, role: invitation.role, status: invitation.status, expiresAt: invitation.expiresAt };
  }

  async acceptInvitation(token: string, userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    const invitation = await organizationRepository.acceptInvitation(hashOpaqueToken(token), userId, user.email);
    if (!invitation) throw new NotFoundError('Invitation is invalid, expired, or already used');
    if (invitation === 'EMAIL_MISMATCH') throw new ForbiddenError('This invitation was sent to a different email address');
    await activityService.record({ organizationId: invitation.organizationId, actorId: userId, action: 'MEMBER_JOINED', entityType: 'ORGANIZATION_MEMBER', entityId: userId, payload: { invitationId: invitation.id } });
    return { organizationId: invitation.organizationId, role: invitation.role };
  }

  async listInvitations(organizationId: string) {
    return organizationRepository.listInvitations(organizationId);
  }

  async removeMember(organizationId: string, memberId: string, actorId: string) {
    const member = await organizationRepository.getMemberById(memberId);
    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundError('Member not found in this organization');
    }

    if (member.role === OrgRole.OWNER) {
      const ownerCount = await organizationRepository.countOwners(organizationId);
      if (ownerCount <= 1) {
        throw new BadRequestError('Cannot remove the sole owner of an organization');
      }
    }

    await organizationRepository.removeMember(memberId);
    await activityService.record({ organizationId, actorId, action: 'MEMBER_REMOVED', entityType: 'ORGANIZATION_MEMBER', entityId: memberId, payload: { userId: member.userId } });
  }

  async updateMemberRole(organizationId: string, memberId: string, input: UpdateMemberRoleInput, actorId: string) {
    const member = await organizationRepository.getMemberById(memberId);
    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundError('Member not found in this organization');
    }

    if (member.role === OrgRole.OWNER && input.role !== OrgRole.OWNER) {
      const ownerCount = await organizationRepository.countOwners(organizationId);
      if (ownerCount <= 1) {
        throw new BadRequestError('An organization must have at least one owner');
      }
    }

    const updated = await organizationRepository.updateMemberRole(memberId, input.role as OrgRole);
    await activityService.record({ organizationId, actorId, action: 'MEMBER_ROLE_UPDATED', entityType: 'ORGANIZATION_MEMBER', entityId: memberId, payload: { userId: member.userId, role: input.role } });
    return updated;
  }
}

export const organizationService = new OrganizationService();
