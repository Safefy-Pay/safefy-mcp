export type PaymentEnvironment = "Sandbox" | "Production";

export interface SafefyCredentials {
  baseUrl: string;
  publicKey: string;
  secretKey: string;
  environment?: PaymentEnvironment;
}

export interface AuthState {
  accessToken: string;
  expiresAt: number;
}

export interface ApiErrorResponse {
  message?: string;
  code?: string;
}

export interface ApiEnvelope<T = unknown> {
  data?: T;
  message?: string;
  error?: ApiErrorResponse;
  items?: unknown[];
  totalItems?: number;
  page?: number;
  pageSize?: number;
}

export interface AuthTokenData {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  environment: string;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  status?: number;
  data?: T;
  message?: string;
  error?: {
    message: string;
    code?: string;
  };
}
