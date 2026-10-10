import { Response } from 'express';
import { ApiResponse, PaginatedApiResponse, ApiPaginationMeta } from '@devflow/shared';

export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200, meta?: Record<string, unknown>): Response {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {})
  };
  return res.status(statusCode).json(payload);
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  meta: ApiPaginationMeta,
  statusCode: number = 200
): Response {
  const payload: PaginatedApiResponse<T> = {
    success: true,
    data,
    meta
  };
  return res.status(statusCode).json(payload);
}
