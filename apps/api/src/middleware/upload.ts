import multer from 'multer';
import path from 'node:path';
import { env } from '../config/env.js';
import { BadRequestError } from '../utils/errors.js';
import { Request, Response, NextFunction } from 'express';

const allowedMimeTypes = new Set(env.ALLOWED_ATTACHMENT_MIME_TYPES.split(',').map((type) => type.trim()).filter(Boolean));
const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.md', '.zip']);

export const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_ATTACHMENT_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(extension)) {
      callback(new BadRequestError('Unsupported attachment type'));
      return;
    }
    callback(null, true);
  }
});

export const requireAttachmentsEnabled = (_req: Request, _res: Response, next: NextFunction) => {
  if (!env.ATTACHMENTS_ENABLED) return next(new BadRequestError('Attachments are disabled in this deployment until persistent object storage is configured'));
  next();
};
