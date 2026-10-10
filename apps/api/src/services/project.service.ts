import { projectRepository } from '../repositories/project.repository.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { cacheService } from './cache.service.js';
import { ConflictError, NotFoundError, BadRequestError } from '../utils/errors.js';
import { CreateProjectInput, UpdateProjectInput, AddProjectMemberInput } from '@devflow/validation';
import { ProjectRole } from '@devflow/shared';

export class ProjectService {
  async createProject(organizationId: string, input: CreateProjectInput, userId: string) {
    const existingKey = await projectRepository.findByKey(organizationId, input.key);
    if (existingKey) {
      throw new ConflictError(`Project with key '${input.key.toUpperCase()}' already exists in this organization`);
    }

    const project = await projectRepository.createProject(
      organizationId,
      input.name,
      input.key,
      input.description,
      userId
    );

    // Invalidate organization project list cache
    await cacheService.invalidateTenantCache(organizationId, 'project');

    return project;
  }

  async listOrganizationProjects(
    organizationId: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
    status?: string
  ) {
    const cacheKey = cacheService.buildTenantKey(organizationId, 'project', {
      action: 'list',
      page,
      limit,
      search,
      status
    });

    const cached = await cacheService.get<Awaited<ReturnType<typeof projectRepository.findOrganizationProjects>>>(cacheKey);
    if (cached) return cached;

    const result = await projectRepository.findOrganizationProjects(organizationId, page, limit, search, status);
    
    // Cache project list for 5 minutes
    await cacheService.set(cacheKey, result, 300);

    return result;
  }

  async getProjectDetails(projectId: string, organizationId: string) {
    const cacheKey = cacheService.buildTenantKey(organizationId, 'project', {
      action: 'details',
      projectId
    });

    const cached = await cacheService.get<NonNullable<Awaited<ReturnType<typeof projectRepository.findById>>>>(cacheKey);
    if (cached) return cached;

    const project = await projectRepository.findById(projectId);
    if (!project || project.organizationId !== organizationId) {
      throw new NotFoundError('Project not found in this organization');
    }

    await cacheService.set(cacheKey, project, 300);

    return project;
  }

  async updateProject(
    projectId: string,
    organizationId: string,
    input: UpdateProjectInput,
    actorId: string
  ) {
    const project = await projectRepository.findById(projectId);
    if (!project || project.organizationId !== organizationId) {
      throw new NotFoundError('Project not found');
    }

    const updated = await projectRepository.updateProject(projectId, organizationId, input, actorId);

    // Invalidate project caches
    await cacheService.invalidateTenantCache(organizationId, 'project');

    return updated;
  }

  async deleteProject(projectId: string, organizationId: string, actorId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project || project.organizationId !== organizationId) {
      throw new NotFoundError('Project not found');
    }

    const deleted = await projectRepository.deleteProject(projectId, organizationId, actorId);

    // Invalidate project caches
    await cacheService.invalidateTenantCache(organizationId, 'project');

    return deleted;
  }

  async listProjectMembers(projectId: string) {
    return projectRepository.listMembers(projectId);
  }

  async addProjectMember(
    projectId: string,
    organizationId: string,
    input: AddProjectMemberInput,
    actorId: string
  ) {
    const orgMember = await organizationRepository.getMember(organizationId, input.userId);
    if (!orgMember) {
      throw new BadRequestError('User must be an organization member before joining a project');
    }

    const existingProjectMember = await projectRepository.getProjectMember(projectId, input.userId);
    if (existingProjectMember) {
      throw new ConflictError('User is already a member of this project');
    }

    const member = await projectRepository.addMember(projectId, organizationId, input.userId, input.role as ProjectRole, actorId);
    
    await cacheService.invalidateTenantCache(organizationId, 'project');

    return member;
  }

  async removeProjectMember(
    projectId: string,
    organizationId: string,
    memberId: string,
    actorId: string
  ) {
    const project = await projectRepository.findById(projectId);
    if (!project || project.organizationId !== organizationId) throw new NotFoundError('Project not found');
    const member = await projectRepository.getMemberById(memberId);
    if (!member || member.projectId !== projectId) {
      throw new NotFoundError('Project member not found');
    }
    if (member.userId === project.ownerId) {
      throw new BadRequestError('Transfer project ownership before removing the project owner');
    }

    const removed = await projectRepository.removeMember(projectId, organizationId, memberId, actorId);
    
    await cacheService.invalidateTenantCache(organizationId, 'project');

    return removed;
  }

  async updateProjectMemberRole(
    projectId: string,
    organizationId: string,
    memberId: string,
    role: ProjectRole,
    actorId: string
  ) {
    const member = await projectRepository.getMemberById(memberId);
    if (!member || member.projectId !== projectId) {
      throw new NotFoundError('Project member not found');
    }

    const updated = await projectRepository.updateMemberRole(projectId, organizationId, memberId, role, actorId);
    
    await cacheService.invalidateTenantCache(organizationId, 'project');

    return updated;
  }
}

export const projectService = new ProjectService();
