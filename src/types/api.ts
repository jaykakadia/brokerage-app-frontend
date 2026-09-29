export interface ApiResponse<T = unknown> {
  status: 'success' | 'error' | string;
  message?: string;
  data?: T;
}

export interface MessageResponse {
  status: 'success' | 'error' | string;
  message: string;
  code?: string;
}

export interface ApiErrorDetail {
  loc?: (string | number)[];
  msg?: string;
  type?: string;
  detail?: string | ApiErrorDetail[];
}

export interface ApiErrorResponse {
  detail?: string | ApiErrorDetail[];
  message?: string;
}
