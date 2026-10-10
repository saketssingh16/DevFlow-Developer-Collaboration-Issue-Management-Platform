export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedApiResponse<T = unknown> {
  success: true;
  data: T[];
  meta: ApiPaginationMeta;
}

export interface ApiErrorDetail {
  [key: string]: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;
