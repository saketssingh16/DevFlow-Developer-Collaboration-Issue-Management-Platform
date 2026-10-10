import { prisma } from '../config/database.js';
import { Project, ProjectMember, ProjectRole } from '@prisma/client';

export class ProjectRepository {
  async createProject(
    organizationId: string,
    name: string,
    key: string,
    description: string | undefined,
    ownerId: string
  ): Promise<Project> {
    return prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          organizationId,
          name,
          key: key.toUpperCase(),
          description,
          ownerId
        }
      });

      // Assign creator as Project LEAD
      await tx.projectMember.create({
        data: {
          projectId: project.id,
          userId: ownerId,
          role: ProjectRole.LEAD
        }
      });

      // Record Activity Log
      await tx.activityLog.create({
        data: {
          organizationId,
          projectId: project.id,
          actorId: ownerId,
          action: 'PROJECT_CREATED',
          entityType: 'PROJECT',
          entityId: project.id,
          payload: { name: project.name, key: project.key }
        }
      });

      return project;
    });
  }

  async findOrganizationProjects(
    organizationId: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
    status?: string
  ) {
    const skip = (page - 1) * limit;

    const where = {
      organizationId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { key: { contains: search } },
              { description: { contains: search } }
            ]
          }
        : {})
    };

    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          },
          _count: {
            select: { members: true, issues: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      projects,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findById(projectId: string) {
    return prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: {
          select: { id: true, name: true, slug: true }
        },
        owner: {
          select: { id: true, name: true, email: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true }
            }
          }
        },
        _count: {
          select: { issues: true }
        }
      }
    });
  }

  async findByKey(organizationId: string, key: string): Promise<Project | null> {
    return prisma.project.findUnique({
      where: {
        organizationId_key: {
          organizationId,
          key: key.toUpperCase()
        }
      }
    });
  }

  async updateProject(
    projectId: string,
    organizationId: string,
    data: { name?: string; description?: string | null; status?: string },
    actorId: string
  ): Promise<Project> {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id: projectId },
        data
      });

      await tx.activityLog.create({
        data: {
          organizationId,
          projectId,
          actorId,
          action: 'PROJECT_UPDATED',
          entityType: 'PROJECT',
          entityId: projectId,
          payload: data
        }
      });

      return updated;
    });
  }

  async deleteProject(projectId: string, organizationId: string, actorId: string): Promise<Project> {
    return prisma.$transaction(async (tx) => {
      const deleted = await tx.project.delete({
        where: { id: projectId }
      });

      await tx.activityLog.create({
        data: {
          organizationId,
          actorId,
          action: 'PROJECT_DELETED',
          entityType: 'PROJECT',
          entityId: projectId,
          payload: { name: deleted.name, key: deleted.key }
        }
      });

      return deleted;
    });
  }

  async listMembers(projectId: string) {
    return prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async getProjectMember(projectId: string, userId: string): Promise<ProjectMember | null> {
    return prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId }
      }
    });
  }

  async getMemberById(memberId: string): Promise<ProjectMember | null> {
    return prisma.projectMember.findUnique({
      where: { id: memberId }
    });
  }

  async addMember(
    projectId: string,
    organizationId: string,
    userId: string,
    role: ProjectRole,
    actorId: string
  ): Promise<ProjectMember> {
    return prisma.$transaction(async (tx) => {
      const member = await tx.projectMember.create({
        data: {
          projectId,
          userId,
          role
        },
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId,
          projectId,
          actorId,
          action: 'PROJECT_MEMBER_ADDED',
          entityType: 'PROJECT_MEMBER',
          entityId: member.id,
          payload: { userId, role }
        }
      });

      return member;
    });
  }

  async removeMember(
    projectId: string,
    organizationId: string,
    memberId: string,
    actorId: string
  ): Promise<ProjectMember> {
    return prisma.$transaction(async (tx) => {
      const member = await tx.projectMember.delete({
        where: { id: memberId }
      });

      await tx.activityLog.create({
        data: {
          organizationId,
          projectId,
          actorId,
          action: 'PROJECT_MEMBER_REMOVED',
          entityType: 'PROJECT_MEMBER',
          entityId: memberId,
          payload: { userId: member.userId }
        }
      });

      return member;
    });
  }

  async updateMemberRole(
    projectId: string,
    organizationId: string,
    memberId: string,
    role: ProjectRole,
    actorId: string
  ): Promise<ProjectMember> {
    return prisma.$transaction(async (tx) => {
      const member = await tx.projectMember.update({
        where: { id: memberId },
        data: { role }
      });

      await tx.activityLog.create({
        data: {
          organizationId,
          projectId,
          actorId,
          action: 'PROJECT_MEMBER_ROLE_UPDATED',
          entityType: 'PROJECT_MEMBER',
          entityId: memberId,
          payload: { role }
        }
      });

      return member;
    });
  }
}

export const projectRepository = new ProjectRepository();
