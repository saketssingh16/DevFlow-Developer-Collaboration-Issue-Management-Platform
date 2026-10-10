import { Response } from 'express';
import { ProjectScopedRequest } from '../middleware/project.middleware.js';
import { attachmentService } from '../services/attachment.service.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class AttachmentController {
  list = async (req: ProjectScopedRequest, res: Response) => sendSuccess(res, await attachmentService.list(req.project!.id, req.params.issueId));
  upload = async (req: ProjectScopedRequest, res: Response) => {
    if (!req.user || !req.file) throw new BadRequestError('An attachment file is required');
    const attachment = await attachmentService.upload({ organizationId: req.project!.organizationId, projectId: req.project!.id, issueId: req.params.issueId, uploaderId: req.user.userId, file: req.file });
    sendSuccess(res, attachment, 201);
  };
  download = async (req: ProjectScopedRequest, res: Response) => {
    const { attachment, stream } = await attachmentService.getForDownload(req.project!.id, req.params.issueId, req.params.attachmentId);
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Length', attachment.size);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName.replace(/["\\\r\n]/g, '_')}"`);
    stream.on('error', () => { if (!res.headersSent) res.status(404).end(); else res.destroy(); });
    stream.pipe(res);
  };
  delete = async (req: ProjectScopedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    await attachmentService.delete(req.project!.id, req.params.issueId, req.params.attachmentId);
    res.status(204).end();
  };
}
export const attachmentController = new AttachmentController();
