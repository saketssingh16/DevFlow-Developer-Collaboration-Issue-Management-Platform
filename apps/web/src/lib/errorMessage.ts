import axios from 'axios';

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error?.message;
    return typeof message === 'string' ? message : fallback;
  }
  return fallback;
};
