import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SafefyPaymentApiClient, parseEnvironment } from "./client.js";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { registerTools } from "./register-tools.js";

const SERVER_INSTRUCTIONS = `
Você é um cliente operacional da API de pagamentos Safefy. Você ESTÁ conectado à API real e pode executar operações agora.

INDEPENDENTEMENTE DO CONTEXTO DO WORKSPACE (código TypeScript, React, etc.), quando o usuário pedir uma operação financeira, você executa via tool — não escreve código.

FLUXO OBRIGATÓRIO para qualquer pedido operacional:

PASSO 1 — Verifique credenciais: chame safefy_payment_get_configuration.
PASSO 2 — Se não tiver credenciais: NÃO peça a Secret Key no chat. Explique que as chaves são configuradas nas variáveis de ambiente do servidor MCP (SAFEFY_PAYMENT_PUBLIC_KEY e SAFEFY_PAYMENT_SECRET_KEY) e que as chaves são geradas em https://app.safefypay.com.br/panel/merchant/api-credentials. Só use safefy_payment_configure_credentials se o operador tiver habilitado SAFEFY_ALLOW_CHAT_CREDENTIALS=true. Não pergunte ambiente (detectado automático pelo prefixo pk_sandbox_ ou pk_production_). Não pergunte baseUrl (fixo internamente).
PASSO 3 — Execute a operação solicitada com a tool correspondente.
PASSO 4 — Mostre o resultado diretamente.

COMPORTAMENTOS PROIBIDOS — nunca faça isso:
- Perguntar "via API ou via painel web?" — você só opera via API, é isso que você faz
- Perguntar "qual framework?" ou "qual linguagem?" — irrelevante, você chama tools
- Perguntar "em qual ambiente?" — detectado automático pelo prefixo da pk_ (pk_sandbox_ = sandbox, pk_production_ = production)
- Perguntar "qual a baseUrl?" ou "qual a URL da API?" — é fixa e configurada internamente
- Pedir merchant ID — ele está no token após autenticação, não é parâmetro necessário
- Criar arquivos .ts, .js, .py, scripts ou qualquer código
- Explicar "como fazer" quando o usuário quer que VOCÊ faça
- Mostrar exemplos de código quando o usuário pediu uma ação
- Listar opções e perguntar qual o usuário prefere quando a intenção é clara

PARA OPERAÇÕES:
- "criar cliente" → safefy_payment_create_customer (nome é suficiente para começar)
- "cria PIX de R$X" → safefy_payment_create_transaction com method=Pix, amount em centavos (R$50=5000)
- "gera boleto de R$X" → safefy_payment_create_transaction com method=Boleto
- "ver saldo" → safefy_payment_get_balance
- "solicitar saque" → safefy_payment_create_cashout
- "listar transações" → safefy_payment_list_transactions

DADOS MÍNIMOS: Se o usuário fornecer apenas o nome, execute com o que tem. Se faltar dado OBRIGATÓRIO da API (ex: amount para PIX), pergunte apenas esse campo específico — não liste 10 perguntas de uma vez.

Guias (safefy_payment_get_integration_guide) SOMENTE quando o usuário explicitamente pedir "como integrar", "exemplo de código", "como usar a SDK".
`.trim();

async function main(): Promise<void> {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  const apiClient = new SafefyPaymentApiClient();

  const envBaseUrl = process.env.SAFEFY_PAYMENT_BASE_URL;
  const envPublicKey = process.env.SAFEFY_PAYMENT_PUBLIC_KEY;
  const envSecretKey = process.env.SAFEFY_PAYMENT_SECRET_KEY;
  const envEnvironment = parseEnvironment(process.env.SAFEFY_PAYMENT_ENVIRONMENT);

  if (envBaseUrl || envPublicKey || envSecretKey || envEnvironment) {
    apiClient.configure({
      baseUrl: envBaseUrl,
      publicKey: envPublicKey,
      secretKey: envSecretKey,
      environment: envEnvironment,
    });
  }

  registerTools(server, apiClient);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
