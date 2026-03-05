import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SafefyPaymentApiClient, parseEnvironment, toToolError } from "./client.js";
import {
  customerDocumentTypeSchema,
  customerStatusSchema,
  httpMethodSchema,
  isoDateTimeSchema,
  paymentMethodSchema,
  payoutStatusSchema,
  simulateCashoutActionSchema,
  productStatusSchema,
  productTypeSchema,
  transactionStatusSchema,
} from "./schemas.js";
import type { ToolResult } from "./types.js";
import { buildIntegrationGuide } from "./integration-guide.js";

function toMcpResponse(result: ToolResult) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
    structuredContent: result as unknown as Record<string, unknown>,
  };
}

function registerJsonTool(
  server: McpServer,
  config: {
    name: string;
    title: string;
    description: string;
    inputSchema: z.ZodTypeAny;
    readOnlyHint?: boolean;
    idempotentHint?: boolean;
    destructiveHint?: boolean;
  },
  handler: (params: any) => Promise<ToolResult>,
): void {
  server.registerTool(
    config.name,
    {
      title: config.title,
      description: config.description,
      inputSchema: config.inputSchema,
      annotations: {
        readOnlyHint: config.readOnlyHint ?? false,
        destructiveHint: config.destructiveHint ?? false,
        idempotentHint: config.idempotentHint ?? false,
        openWorldHint: true,
      },
    },
    async (params: any) => {
      try {
        return toMcpResponse(await handler(params));
      } catch (error) {
        return toMcpResponse(toToolError(error));
      }
    },
  );
}

export function registerTools(server: McpServer, apiClient: SafefyPaymentApiClient): void {
  registerJsonTool(
    server,
    {
      name: "safefy_payment_get_integration_guide",
      title: "Get Integration Guide",
      description:
        "Mostra um passo a passo de integracao (SDK Node ou API direta). Use somente quando o usuario pedir ajuda para integrar.",
      inputSchema: z
        .object({
          mode: z.enum(["sdk_node", "direct_api"]),
          language: z
            .enum(["node", "typescript", "javascript", "python", "php", "csharp", "java", "go", "curl", "other"])
            .optional(),
        })
        .strict(),
      readOnlyHint: true,
      idempotentHint: true,
    },
    async (params) => buildIntegrationGuide(params),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_list_capabilities",
      title: "List Payment Capabilities",
      description:
        "Mostra tudo que este MCP consegue fazer. Nao executa operacoes financeiras, apenas informa capacidades. NAO use este tool quando o usuario pedir uma acao concreta (criar cliente, PIX, etc.) — nesses casos va direto para a tool de execucao.",
      inputSchema: z.object({}).strict(),
      readOnlyHint: true,
      idempotentHint: true,
    },
    async () => ({
      success: true,
      data: {
        integrationModes: ["sdk_node", "direct_api"],
        authenticatedApiScopes: [
          "auth",
          "balance",
          "customers",
          "transactions",
          "cashouts",
          "orders",
          "products",
        ],
        publicApiScopes: ["payment_links"],
        genericRequestTool: "safefy_payment_api_request",
        notes: [
          "Com credenciais validas, o MCP executa as operacoes diretamente quando voce pedir (ex: criar cliente, transacao, pix, boleto, saque).",
          "Se precisar de algo especifico, use a tool safefy_payment_api_request.",
          "Para payment links publicos, use requireAuth=false.",
        ],
      },
    }),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_configure_credentials",
      title: "Configure Safefy Credentials",
      description:
        "Configura as credenciais da conta. Peca APENAS publicKey (pk_...) e secretKey (sk_...). O ambiente e detectado automaticamente pelo prefixo das chaves (pk_sandbox_ ou pk_production_). NAO peca environment, NAO peca baseUrl — esses sao configurados automaticamente.",
      inputSchema: z
        .object({
          publicKey: z.string().min(1).describe("Public Key da credencial (pk_sandbox_... ou pk_production_...)."),
          secretKey: z.string().min(1).describe("Secret Key da credencial (sk_sandbox_... ou sk_production_...)."),
          authenticateNow: z.boolean().default(true),
        })
        .strict(),
    },
    async (params) => {
      const config = apiClient.configure({
        publicKey: params.publicKey,
        secretKey: params.secretKey,
      });

      if (!params.authenticateNow) {
        return {
          success: true,
          data: {
            baseUrl: config.baseUrl,
            publicKey: config.publicKey,
            environment: config.environment,
            authenticated: false,
          },
          message: "Credenciais configuradas.",
        };
      }

      const auth = await apiClient.authenticate();
      return {
        success: true,
        data: {
          baseUrl: config.baseUrl,
          publicKey: config.publicKey,
          environment: auth.data?.environment || config.environment,
          authenticated: true,
          expiresIn: auth.data?.expiresIn,
        },
        message: "Credenciais configuradas e autenticação concluída.",
      };
    },
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_get_configuration",
      title: "Get Safefy MCP Config",
      description: "Verifica se as credenciais ja estao configuradas. Chame antes de qualquer operacao para saber se precisa pedir credenciais ao usuario.",
      inputSchema: z.object({}).strict(),
      readOnlyHint: true,
      idempotentHint: true,
    },
    async () => ({
      success: true,
      data: apiClient.getCurrentConfig(),
    }),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_authenticate",
      title: "Authenticate in Safefy Payment",
      description: "Faz login novamente na API e atualiza o token de acesso.",
      inputSchema: z.object({}).strict(),
      idempotentHint: true,
    },
    async () => apiClient.authenticate(),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_api_request",
      title: "Generic Safefy API Request",
      description:
        "Executa uma chamada real para qualquer rota da API de pagamentos. Use quando nao houver tool dedicada.",
      inputSchema: z
        .object({
          path: z.string().min(1).describe("Caminho da rota. Ex: /v1/transactions"),
          method: httpMethodSchema.default("GET"),
          requireAuth: z.boolean().default(true),
          query: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
          body: z.unknown().optional(),
        })
        .strict(),
    },
    async ({ path, method, requireAuth, query, body }) =>
      apiClient.request(path, {
        method,
        requireAuth,
        query,
        body,
      }),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_get_balance",
      title: "Get Merchant Balance",
      description: "Consulta e retorna o saldo atual. Chame imediatamente quando o usuario perguntar 'qual meu saldo', 'quanto tenho disponivel', etc.",
      inputSchema: z.object({}).strict(),
      readOnlyHint: true,
      idempotentHint: true,
    },
    async () => apiClient.request("/v1/balance"),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_create_transaction",
      title: "Create Transaction",
      description:
        "Cria cobranca PIX, boleto ou cartao na API agora. NAO pergunte 'via API ou painel' nem 'qual framework' — voce JA ESTA conectado a API. 'gera um PIX de R$50' = chame com method=Pix, amount=5000. 'boleto de R$100' = method=Boleto, amount=10000. Valores em centavos. Nao pede merchant ID. APOS criar: se for PIX exiba o campo pixCopyPaste em destaque como 'PIX Copia e Cola'; se for Boleto exiba boletoDigitableLine. Esses campos estao no topo do resultado.",
      inputSchema: z
        .object({
          method: paymentMethodSchema,
          amount: z.number().int().positive(),
          currency: z.string().default("BRL"),
          description: z.string().max(500).optional(),
          externalId: z.string().max(100).optional(),
          customerId: z.string().uuid().optional(),
          callbackUrl: z.string().url().optional(),
          metadata: z.string().optional(),
          pixExpirationMinutes: z.number().int().min(5).max(1440).optional(),
          customerName: z.string().optional(),
          customerDocument: z.string().optional(),
          customerEmail: z.string().email().optional(),
          customerPhone: z.string().optional(),
          cardToken: z.string().optional(),
          installments: z.number().int().min(1).max(12).optional(),
          cardCvv: z.string().optional(),
          boletoDueDate: z.string().optional(),
          boletoInstructions: z.string().optional(),
        })
        .strict(),
      destructiveHint: true,
    },
    async (params) => {
      const result = await apiClient.request("/v1/transactions", { method: "POST", body: params });
      const data = (result as any)?.data;
      if (data?.pix?.copyAndPaste) {
        return {
          ...result,
          pixCopyPaste: data.pix.copyAndPaste,
          pixTxId: data.pix.txId,
          pixExpiresAt: data.pix.expiresAt,
        };
      }
      if (data?.boleto?.digitableLine) {
        return {
          ...result,
          boletoDigitableLine: data.boleto.digitableLine,
          boletoDueDate: data.boleto.dueDate,
          boletoPdfUrl: data.boleto.pdfUrl ?? null,
        };
      }
      return result;
    },
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_list_transactions",
      title: "List Transactions",
      description: "Lista suas transacoes com filtros.",
      inputSchema: z
        .object({
          page: z.number().int().positive().default(1),
          pageSize: z.number().int().positive().max(100).default(20),
          method: paymentMethodSchema.optional(),
          status: transactionStatusSchema.optional(),
          externalId: z.string().optional(),
          customerId: z.string().uuid().optional(),
          startDate: isoDateTimeSchema.optional(),
          endDate: isoDateTimeSchema.optional(),
        })
        .strict(),
      readOnlyHint: true,
      idempotentHint: true,
    },
    async (params) => apiClient.request("/v1/transactions", { query: params }),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_get_transaction",
      title: "Get Transaction",
      description: "Obtém uma transação por ID via /v1/transactions/{transactionId}.",
      inputSchema: z.object({ transactionId: z.string().uuid() }).strict(),
      readOnlyHint: true,
      idempotentHint: true,
    },
    async ({ transactionId }) => apiClient.request(`/v1/transactions/${transactionId}`),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_simulate_transaction",
      title: "Simulate Transaction",
      description:
        "Simula mudança de status de transação em Sandbox via /v1/transactions/{transactionId}/simulate.",
      inputSchema: z
        .object({
          transactionId: z.string().uuid(),
          action: z.enum(["complete", "expire", "fail", "refund"]),
        })
        .strict(),
    },
    async ({ transactionId, action }) =>
      apiClient.request(`/v1/transactions/${transactionId}/simulate`, {
        method: "POST",
        body: { action },
      }),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_resend_transaction_webhook",
      title: "Resend Transaction Webhook",
      description: "Reenvia webhook de transação completed via /v1/transactions/{transactionId}/resend-webhook.",
      inputSchema: z.object({ transactionId: z.string().uuid() }).strict(),
      destructiveHint: true,
    },
    async ({ transactionId }) =>
      apiClient.request(`/v1/transactions/${transactionId}/resend-webhook`, {
        method: "POST",
      }),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_create_cashout",
      title: "Create Cashout",
      description: "Solicita saque agora. Quando o usuario pedir 'solicita um saque de R$X', 'quero sacar R$X', chame esta tool. Valores em centavos.",
      inputSchema: z
        .object({
          amount: z.number().int().positive(),
          payoutAccountId: z.string().uuid().optional(),
          pixKey: z.string().optional(),
          pixKeyType: z.enum(["Cpf", "Cnpj", "Email", "Phone", "Random"]).optional(),
          externalId: z.string().max(100).optional(),
          callbackUrl: z.string().url().optional(),
        })
        .strict(),
      destructiveHint: true,
    },
    async (params) => apiClient.request("/v1/cashouts", { method: "POST", body: params }),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_list_cashouts",
      title: "List Cashouts",
      description: "Lista saques com paginação via /v1/cashouts.",
      inputSchema: z
        .object({
          page: z.number().int().positive().default(1),
          pageSize: z.number().int().positive().max(100).default(20),
          status: payoutStatusSchema.optional(),
          startDate: isoDateTimeSchema.optional(),
          endDate: isoDateTimeSchema.optional(),
        })
        .strict(),
      readOnlyHint: true,
      idempotentHint: true,
    },
    async (params) => apiClient.request("/v1/cashouts", { query: params }),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_get_cashout",
      title: "Get Cashout",
      description: "Obtém saque por ID via /v1/cashouts/{id}.",
      inputSchema: z.object({ id: z.string().uuid() }).strict(),
      readOnlyHint: true,
      idempotentHint: true,
    },
    async ({ id }) => apiClient.request(`/v1/cashouts/${id}`),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_cancel_cashout",
      title: "Cancel Cashout",
      description: "Cancela saque via /v1/cashouts/{id}/cancel.",
      inputSchema: z.object({ id: z.string().uuid() }).strict(),
      destructiveHint: true,
    },
    async ({ id }) => apiClient.request(`/v1/cashouts/${id}/cancel`, { method: "POST" }),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_simulate_cashout",
      title: "Simulate Cashout",
      description: "Simula saque em sandbox via /v1/cashouts/{id}/simulate.",
      inputSchema: z
        .object({
          id: z.string().uuid(),
          action: simulateCashoutActionSchema,
        })
        .strict(),
      destructiveHint: true,
    },
    async ({ id, action }) =>
      apiClient.request(`/v1/cashouts/${id}/simulate`, {
        method: "POST",
        body: { action },
      }),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_create_customer",
      title: "Create Customer",
      description:
        "Cria um cliente na API agora. Não pergunte 'via API ou painel' nem 'qual framework' — você JA ESTÁ conectado à API. Se o usuário disser 'cria cliente chamado Jorge', chame esta tool com name='Jorge'. Dados mínimos: name. Email, documento e outros são opcionais. Não pede merchant ID.",
      inputSchema: z
        .object({
          externalId: z.string().max(255).optional(),
          name: z.string().min(1).max(255),
          email: z.string().email(),
          document: z.string().optional(),
          documentType: customerDocumentTypeSchema.optional(),
          phone: z.string().optional(),
          metadata: z.string().optional(),
          addressStreet: z.string().optional(),
          addressNumber: z.string().optional(),
          addressComplement: z.string().optional(),
          addressNeighborhood: z.string().optional(),
          addressCity: z.string().optional(),
          addressState: z.string().optional(),
          addressPostalCode: z.string().optional(),
          addressCountry: z.string().optional(),
        })
        .strict(),
      destructiveHint: true,
    },
    async (params) => apiClient.request("/v1/customers", { method: "POST", body: params }),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_list_customers",
      title: "List Customers",
      description: "Lista clientes via /v1/customers.",
      inputSchema: z
        .object({
          page: z.number().int().positive().default(1),
          pageSize: z.number().int().positive().max(100).default(20),
          status: customerStatusSchema.optional(),
          documentType: customerDocumentTypeSchema.optional(),
          search: z.string().max(255).optional(),
          externalId: z.string().max(255).optional(),
          startDate: isoDateTimeSchema.optional(),
          endDate: isoDateTimeSchema.optional(),
        })
        .strict(),
      readOnlyHint: true,
      idempotentHint: true,
    },
    async (params) => apiClient.request("/v1/customers", { query: params }),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_get_customer",
      title: "Get Customer",
      description: "Obtém cliente por ID via /v1/customers/{id}.",
      inputSchema: z.object({ id: z.string().uuid() }).strict(),
      readOnlyHint: true,
      idempotentHint: true,
    },
    async ({ id }) => apiClient.request(`/v1/customers/${id}`),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_update_customer",
      title: "Update Customer",
      description: "Atualiza cliente via /v1/customers/{id}.",
      inputSchema: z
        .object({
          id: z.string().uuid(),
          name: z.string().max(255).optional(),
          email: z.string().email().max(255).optional(),
          document: z.string().max(14).optional(),
          documentType: customerDocumentTypeSchema.optional(),
          phone: z.string().max(20).optional(),
          status: customerStatusSchema.optional(),
          metadata: z.string().optional(),
          addressStreet: z.string().optional(),
          addressNumber: z.string().optional(),
          addressComplement: z.string().optional(),
          addressNeighborhood: z.string().optional(),
          addressCity: z.string().optional(),
          addressState: z.string().optional(),
          addressPostalCode: z.string().optional(),
          addressCountry: z.string().optional(),
        })
        .strict(),
      destructiveHint: true,
    },
    async ({ id, ...body }) => apiClient.request(`/v1/customers/${id}`, { method: "PATCH", body }),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_create_order",
      title: "Create Order",
      description: "Cria pedido com itens e pagamento via /v1/orders.",
      inputSchema: z
        .object({
          customerId: z.string().uuid(),
          items: z
            .array(
              z
                .object({
                  productId: z.string().uuid(),
                  variantId: z.string().uuid().optional(),
                  quantity: z.number().int().positive().default(1),
                })
                .strict(),
            )
            .min(1),
          method: paymentMethodSchema,
          description: z.string().max(500).optional(),
          notes: z.string().optional(),
          externalId: z.string().max(100).optional(),
          couponCode: z.string().optional(),
          shippingAmount: z.number().int().min(0).optional(),
          shippingAddress: z
            .object({
              street: z.string().optional(),
              number: z.string().optional(),
              complement: z.string().optional(),
              neighborhood: z.string().optional(),
              city: z.string().optional(),
              state: z.string().optional(),
              zipCode: z.string().optional(),
              country: z.string().optional(),
            })
            .strict()
            .optional(),
          callbackUrl: z.string().url().optional(),
          metadata: z.string().optional(),
          expirationMinutes: z.number().int().min(5).max(1440).optional(),
          boletoDueDate: z.string().optional(),
          boletoInstructions: z.string().optional(),
        })
        .strict(),
      destructiveHint: true,
    },
    async (params) => apiClient.request("/v1/orders", { method: "POST", body: params }),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_list_orders",
      title: "List Orders",
      description: "Lista pedidos via /v1/orders.",
      inputSchema: z
        .object({
          page: z.number().int().positive().default(1),
          pageSize: z.number().int().positive().max(100).default(10),
          status: z.string().optional(),
          fulfillmentStatus: z.string().optional(),
          customerId: z.string().uuid().optional(),
        })
        .strict(),
      readOnlyHint: true,
      idempotentHint: true,
    },
    async (params) => apiClient.request("/v1/orders", { query: params }),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_get_order",
      title: "Get Order",
      description: "Obtém pedido por ID via /v1/orders/{orderId}.",
      inputSchema: z.object({ orderId: z.string().uuid() }).strict(),
      readOnlyHint: true,
      idempotentHint: true,
    },
    async ({ orderId }) => apiClient.request(`/v1/orders/${orderId}`),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_list_products",
      title: "List Products",
      description: "Lista produtos cadastrados do merchant via /v1/products.",
      inputSchema: z
        .object({
          page: z.number().int().positive().default(1),
          pageSize: z.number().int().positive().max(100).default(20),
          status: productStatusSchema.optional(),
          type: productTypeSchema.optional(),
          categoryId: z.string().uuid().optional(),
          search: z.string().max(255).optional(),
          externalId: z.string().max(100).optional(),
          startDate: isoDateTimeSchema.optional(),
          endDate: isoDateTimeSchema.optional(),
        })
        .strict(),
      readOnlyHint: true,
      idempotentHint: true,
    },
    async (params) => apiClient.request("/v1/products", { query: params }),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_get_product",
      title: "Get Product",
      description: "Obtém produto por ID via /v1/products/{productId}.",
      inputSchema: z.object({ productId: z.string().uuid() }).strict(),
      readOnlyHint: true,
      idempotentHint: true,
    },
    async ({ productId }) => apiClient.request(`/v1/products/${productId}`),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_get_payment_link",
      title: "Get Payment Link",
      description: "Consulta link de pagamento público via /v1/payment-links/{token}.",
      inputSchema: z.object({ token: z.string().min(1) }).strict(),
      readOnlyHint: true,
      idempotentHint: true,
    },
    async ({ token }) => apiClient.request(`/v1/payment-links/${token}`, { requireAuth: false }),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_start_payment_link",
      title: "Start Payment Link",
      description: "Inicia cobrança de payment link via /v1/payment-links/{token}/start.",
      inputSchema: z
        .object({
          token: z.string().min(1),
          method: z.enum(["pix", "boleto"]),
          buyerName: z.string().optional(),
          buyerEmail: z.string().email().optional(),
          buyerPhone: z.string().optional(),
        })
        .strict(),
      destructiveHint: true,
    },
    async ({ token, method, buyerName, buyerEmail, buyerPhone }) =>
      apiClient.request(`/v1/payment-links/${token}/start`, {
        method: "POST",
        requireAuth: false,
        body: {
          method,
          buyerName,
          buyerEmail,
          buyerPhone,
        },
      }),
  );

  registerJsonTool(
    server,
    {
      name: "safefy_payment_get_payment_link_status",
      title: "Get Payment Link Status",
      description:
        "Consulta status de cobrança de payment link por sessão via /v1/payment-links/{token}/payments/{paymentId}/status.",
      inputSchema: z
        .object({
          token: z.string().min(1),
          paymentId: z.string().uuid(),
        })
        .strict(),
      readOnlyHint: true,
      idempotentHint: true,
    },
    async ({ token, paymentId }) =>
      apiClient.request(`/v1/payment-links/${token}/payments/${paymentId}/status`, {
        requireAuth: false,
      }),
  );
}
