import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { logger } from '../config/logger.js';
import { ERROR_CODES, ApiErrorResponse } from '@devflow/shared';
import { RequestWithCorrelation } from './correlation.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  const correlationId = (req as RequestWithCorrelation).correlationId;

  if (err instanceof AppError) {
    logger.warn({ err, correlationId, url: req.url, method: req.method }, err.message);
    const errorPayload: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {})
      }
    };
    return res.status(err.statusCode).json(errorPayload);
  }

  if (err instanceof ZodError) {
    const formattedDetails = err.errors.reduce((acc, issue) => {
      const path = issue.path.join('.');
      acc[path] = issue.message;
      return acc;
    }, {} as Record<string, string>);

    const errorPayload: ApiErrorResponse = {
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        details: formattedDetails
      }
    };
    return res.status(422).json(errorPayload);
  }

  // Unhandled internal server error
  logger.error({ err, correlationId, url: req.url, method: req.method }, 'Unhandled internal server error');

  const errorPayload: ApiErrorResponse = {
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: process.env.NODE_ENV === 'production' ? 'An unexpected internal server error occurred' : err.message
    }
  };
  return res.status(500).json(errorPayload);
};
