import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { prisma } from '../config/database.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { storageProvider } from './storage/storage.service.js';

export class AttachmentService {
  private hasExpectedSignature(file: Express.Multer.File): boolean {
    const bytes = file.buffer;
    const startsWith = (...signature: number[]) => signature.every((value, index) => bytes[index] === value);
    if (file.mimetype === 'image/png') return startsWith(0x89, 0x50, 0x4e, 0x47);
    if (file.mimetype === 'image/jpeg') return startsWith(0xff, 0xd8, 0xff);
    if (file.mimetype === 'image/gif') return startsWith(0x47, 0x49, 0x46, 0x38);
    if (file.mimetype === 'application/pdf') return startsWith(0x25, 0x50, 0x44, 0x46);
    if (file.mimetype === 'application/zip') return startsWith(0x50, 0x4b, 0x03, 0x04) || startsWith(0x50, 0x4b, 0x05, 0x06);
    if (file.mimetype === 'text/plain' || file.mimetype === 'text/markdown') return !bytes.subarray(0, Math.min(bytes.length, 4096)).includes(0);
    return false;
  }
  private async assertIssueInProject(issueId: string, projectId: string) {
    const issue = await prisma.issue.findFirst({ where: { id: issueId, projectId, deletedAt: null }, select: { id: true } });
    if (!issue) throw new NotFoundError('Issue not found in this project');
  }

  async list(projectId: string, issueId: string) {
    await this.assertIssueInProject(issueId, projectId);
    return prisma.attachment.findMany({
      where: { issueId },
      select: { id: true, filename: true, originalName: true, mimeType: true, size: true, createdAt: true, uploader: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async upload(input: { organizationId: string; projectId: string; issueId: string; uploaderId: string; file: Express.Multer.File }) {
    await this.assertIssueInProject(input.issueId, input.projectId);
    if (!input.file.buffer?.length) throw new BadRequestError('Attachment is empty');
    if (!this.hasExpectedSignature(input.file)) throw new BadRequestError('Attachment contents do not match its declared file type');
    const extension = path.extname(input.file.originalname).toLowerCase();
    const filename = `${randomUUID()}${extension}`;
    const storageKey = `${input.organizationId}/${input.projectId}/${input.issueId}/${filename}`;
    const stored = await storageProvider.store({ storageKey, content: input.file.buffer, contentType: input.file.mimetype });
    try {
      return await prisma.attachment.create({
        data: { issueId: input.issueId, uploaderId: input.uploaderId, filename, originalName: path.basename(input.file.originalname), mimeType: input.file.mimetype, size: input.file.size, storageKey: stored.storageKey, url: stored.url },
        select: { id: true, filename: true, originalName: true, mimeType: true, size: true, createdAt: true }
      });
    } catch (error) {
      await storageProvider.delete(storageKey).catch(() => undefined);
      throw error;
    }
  }

  async getForDownload(projectId: string, issueId: string, attachmentId: string) {
    await this.assertIssueInProject(issueId, projectId);
    const attachment = await prisma.attachment.findFirst({ where: { id: attachmentId, issueId } });
    if (!attachment) throw new NotFoundError('Attachment not found');
    return { attachment, stream: await storageProvider.read(attachment.storageKey) };
  }

  async delete(projectId: string, issueId: string, attachmentId: string) {
    await this.assertIssueInProject(issueId, projectId);
    const attachment = await prisma.attachment.findFirst({ where: { id: attachmentId, issueId } });
    if (!attachment) throw new NotFoundError('Attachment not found');
    await storageProvider.delete(attachment.storageKey);
    await prisma.attachment.delete({ where: { id: attachment.id } });
  }
}
export const attachmentService = new AttachmentService();
