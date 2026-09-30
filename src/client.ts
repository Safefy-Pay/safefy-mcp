import { AUTH_PATH, DEFAULT_BASE_URL, TOKEN_EXPIRY_SAFETY_WINDOW_SECONDS } from "./constants.js";
import type {
  ApiEnvelope,
  AuthState,
  AuthTokenData,
  PaymentEnvironment,
  SafefyCredentials,
  ToolResult,
} from "./types.js";

class SafefyApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "SafefyApiError";
    this.status = status;
    this.code = code;
  }
}

export class SafefyPaymentApiClient {
  private credentials: SafefyCredentials | null = null;
  private authState: AuthState | null = null;

  configure(input: Partial<SafefyCredentials>): SafefyCredentials {
    const publicKey = input.publicKey?.trim() || this.credentials?.publicKey || "";
    const secretKey = input.secretKey?.trim() || this.credentials?.secretKey || "";

    const publicKeyEnvironment = detectEnvironmentFromCredentialKey(publicKey, "pk");
    const secretKeyEnvironment = detectEnvironmentFromCredentialKey(secretKey, "sk");

    if (publicKeyEnvironment && secretKeyEnvironment && publicKeyEnvironment !== secretKeyEnvironment) {
      throw new SafefyApiError(
        "A Public Key e a Secret Key parecem estar em ambientes diferentes (Sandbox/Production). Confira as chaves e tente novamente.",
        400,
        "credential_environment_mismatch",
      );
    }

    const detectedEnvironment = publicKeyEnvironment || secretKeyEnvironment;
    const selectedEnvironment = input.environment || detectedEnvironment || this.credentials?.environment;

    const nextCredentials: SafefyCredentials = {
      baseUrl: input.baseUrl?.trim() || this.credentials?.baseUrl || DEFAULT_BASE_URL,
      publicKey,
      secretKey,
      environment: selectedEnvironment,
    };

    this.credentials = nextCredentials;

    // Credentials changed, token must be renewed.
    this.authState = null;

    return nextCredentials;
  }

  getCurrentConfig(): Omit<SafefyCredentials, "secretKey"> & { hasSecretKey: boolean; hasToken: boolean } {
    return {
      baseUrl: this.credentials?.baseUrl || DEFAULT_BASE_URL,
      publicKey: this.credentials?.publicKey || "",
      environment: this.credentials?.environment,
      hasSecretKey: Boolean(this.credentials?.secretKey),
      hasToken: Boolean(this.authState),
    };
  }

  async authenticate(): Promise<ToolResult<AuthTokenData>> {
    this.assertCredentials();

    const response = await this.rawRequest<AuthTokenData>(AUTH_PATH, {
      method: "POST",
      body: {
        grantType: "client_credentials",
        publicKey: this.credentials!.publicKey,
        secretKey: this.credentials!.secretKey,
      },
      requireAuth: false,
    });

    const tokenData = response.body.data;
    if (!tokenData?.accessToken || !tokenData?.expiresIn) {
      throw new SafefyApiError("Nao consegui confirmar seu acesso agora. Tente novamente em instantes.", 500);
    }

    const expiresAt = Date.now() + tokenData.expiresIn * 1000;
    this.authState = {
      accessToken: tokenData.accessToken,
      expiresAt,
    };

    return {
      success: true,
      status: response.status,
      data: tokenData,
      message: response.body.message || "Autenticado com sucesso.",
    };
  }

  async request<T = unknown>(
    path: string,
    options: {
      method?: "GET" | "POST" | "PATCH";
      query?: Record<string, string | number | boolean | undefined | null>;
      body?: unknown;
      requireAuth?: boolean;
    } = {},
  ): Promise<ToolResult<T>> {
    const requireAuth = options.requireAuth ?? true;

    if (requireAuth) {
      await this.ensureAuthenticated();
    }

    const response = await this.rawRequest<T>(path, {
      method: options.method || "GET",
      query: options.query,
      body: options.body,
      requireAuth,
    });

    return {
      success: true,
      status: response.status,
      data: (response.body.data ?? (response.body as unknown)) as T,
      message: response.body.message,
    };
  }

  private async ensureAuthenticated(): Promise<void> {
    this.assertCredentials();

    if (this.authState && this.authState.expiresAt > Date.now() + TOKEN_EXPIRY_SAFETY_WINDOW_SECONDS * 1000) {
      return;
    }

    await this.authenticate();
  }

  private assertCredentials(): void {
    if (!this.credentials?.publicKey || !this.credentials.secretKey) {
      throw new SafefyApiError(
        "Antes de continuar, preciso da sua Public Key e Secret Key. Use a tool safefy_payment_configure_credentials. Se ainda nao tiver credenciais, gere aqui: https://app.safefypay.com.br/panel/merchant/api-credentials.",
        400,
        "missing_credentials",
      );
    }

    if (!this.credentials.baseUrl) {
      throw new SafefyApiError("A URL da API nao foi definida.", 400, "missing_base_url");
    }
  }

  private async rawRequest<T = unknown>(
    path: string,
    options: {
      method: "GET" | "POST" | "PATCH";
      query?: Record<string, string | number | boolean | undefined | null>;
      body?: unknown;
      requireAuth: boolean;
    },
  ): Promise<{ status: number; body: ApiEnvelope<T> }> {
    const url = this.buildUrl(path, options.query);

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (options.requireAuth && this.authState?.accessToken) {
      headers.Authorization = `Bearer ${this.authState.accessToken}`;
    }

    if (this.credentials?.environment) {
      headers["X-Environment"] = this.credentials.environment;
    }

    const requestInit: RequestInit = {
      method: options.method,
      headers,
    };

    if (options.body !== undefined) {
      requestInit.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, requestInit);

    const contentType = response.headers.get("content-type") || "";
    const parsed = contentType.includes("application/json")
      ? ((await response.json()) as ApiEnvelope<T>)
      : ({ message: await response.text() } as ApiEnvelope<T>);

    if (!response.ok) {
      throw new SafefyApiError(
        parsed.error?.message || parsed.message || `Nao foi possivel concluir sua solicitacao (HTTP ${response.status}).`,
        response.status,
        parsed.error?.code,
      );
    }

    return { status: response.status, body: parsed };
  }

  private buildUrl(path: string, query?: Record<string, string | number | boolean | undefined | null>): string {
    const normalizedPath = path.trim().startsWith("/") ? path.trim() : `/${path.trim()}`;

    // MC-01 (auditoria): o token do seller só vai para a API da Safefy. "//outro-site", "\\", esquemas
    // e caminhos fora de /v1/ são recusados, e o host final é conferido antes de enviar.
    if (!normalizedPath.startsWith("/v1/") || normalizedPath.includes("//") || /[\\\u0000-\u001f]/.test(normalizedPath)) {
      throw new SafefyApiError("Rota invalida: use um caminho da API que comece com /v1/.", 400);
    }

    const base = new URL(this.credentials?.baseUrl || DEFAULT_BASE_URL);
    const url = new URL(normalizedPath, base);
    if (url.origin !== base.origin) {
      throw new SafefyApiError("Rota invalida: a chamada precisa ficar no host da API da Safefy.", 400);
    }

    if (!query) {
      return url.toString();
    }

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }

      url.searchParams.set(key, String(value));
    }

    return url.toString();
  }
}

export function toToolError(error: unknown): ToolResult {
  if (error instanceof SafefyApiError) {
    return {
      success: false,
      status: error.status,
      error: {
        message: error.message,
        code: error.code,
      },
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: {
        message: error.message,
      },
    };
  }

  return {
    success: false,
    error: {
      message: "Erro inesperado.",
    },
  };
}

export function parseEnvironment(value?: string): PaymentEnvironment | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "sandbox") return "Sandbox";
  if (normalized === "production") return "Production";
  return undefined;
}

function detectEnvironmentFromCredentialKey(
  key: string | undefined,
  prefix: "pk" | "sk",
): PaymentEnvironment | undefined {
  if (!key) return undefined;

  const normalized = key.trim().toLowerCase();

  if (normalized.startsWith(`${prefix}_sandbox_`)) {
    return "Sandbox";
  }

  if (normalized.startsWith(`${prefix}_production_`)) {
    return "Production";
  }

  return undefined;
}
