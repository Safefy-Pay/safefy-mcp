import type { ToolResult } from "./types.js";

const baseAuthFlow = [
  "1. Gere suas credenciais no painel Safefy (Public Key e Secret Key).",
  "2. Faca login na API em `POST /v1/auth/token`.",
  "3. Use o token retornado no cabecalho `Authorization: Bearer <token>`.",
  "4. Quando o token estiver perto de expirar, gere um novo.",
];

function buildNodeSdkGuide() {
  const code = `import { SafefyPaymentSDK } from "safefy-sdk-node";

const sdk = new SafefyPaymentSDK({
  publicKey: process.env.SAFEFY_PUBLIC_KEY!,
  secretKey: process.env.SAFEFY_SECRET_KEY!,
  log: true,
});

// Balance
const balance = await sdk.balance.get();

// Create customer
const customer = await sdk.customers.create({
  name: "Maria",
  email: "maria@email.com",
  document: "12345678901",
  documentType: "Cpf",
});

// Create transaction (PIX)
const transaction = await sdk.transactions.create({
  method: "Pix",
  amount: 1500,
  customerId: customer.id,
  description: "Pedido #123",
});

console.log(balance.available, transaction.id, transaction.pix?.copyAndPaste);`;

  return {
    mode: "sdk_node",
    package: "safefy-sdk-node",
    install: "npm install safefy-sdk-node",
    notes: [
      "O SDK cuida do login e renovacao de token para voce.",
      "As mensagens de erro ja vem organizadas para facilitar o tratamento.",
      "Esse caminho e ideal para projetos em Node.js e TypeScript.",
    ],
    code,
  };
}

function buildDirectApiGuide(language: string) {
  const snippets: Record<string, string> = {
    curl: `# 1) Token
curl -X POST "$SAFEFY_BASE_URL/v1/auth/token" \\
  -H "Content-Type: application/json" \\
  -d '{"grantType":"client_credentials","publicKey":"'$SAFEFY_PUBLIC_KEY'","secretKey":"'$SAFEFY_SECRET_KEY'"}'

# 2) Balance
curl -X GET "$SAFEFY_BASE_URL/v1/balance" \\
  -H "Authorization: Bearer $SAFEFY_TOKEN"`,
    python: `import requests

base_url = "https://api.seu-ambiente.com"
public_key = "pk_..."
secret_key = "sk_..."

# Token
token_res = requests.post(f"{base_url}/v1/auth/token", json={
    "grantType": "client_credentials",
    "publicKey": public_key,
    "secretKey": secret_key,
})
token_res.raise_for_status()
access_token = token_res.json()["data"]["accessToken"]
headers = {"Authorization": f"Bearer {access_token}"}

# Balance
balance = requests.get(f"{base_url}/v1/balance", headers=headers)
print(balance.json())`,
    csharp: `using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

var client = new HttpClient { BaseAddress = new Uri("https://api.seu-ambiente.com") };

var authPayload = JsonSerializer.Serialize(new {
  grantType = "client_credentials",
  publicKey = "pk_...",
  secretKey = "sk_..."
});

var authRes = await client.PostAsync("/v1/auth/token", new StringContent(authPayload, Encoding.UTF8, "application/json"));
authRes.EnsureSuccessStatusCode();
using var authDoc = JsonDocument.Parse(await authRes.Content.ReadAsStringAsync());
var token = authDoc.RootElement.GetProperty("data").GetProperty("accessToken").GetString();

client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
var balanceRes = await client.GetAsync("/v1/balance");
Console.WriteLine(await balanceRes.Content.ReadAsStringAsync());`,
    default: `1) POST /v1/auth/token
2) Salve accessToken
3) Use Authorization: Bearer <token>
4) Chame endpoints como /v1/balance, /v1/customers, /v1/transactions, /v1/cashouts, /v1/orders, /v1/products`,
  };

  const selectedSnippet = snippets[language] || snippets.default;

  return {
    mode: "direct_api",
    language,
    authFlow: baseAuthFlow,
    keyEndpoints: [
      "POST /v1/auth/token",
      "GET /v1/balance",
      "POST/GET /v1/customers",
      "POST/GET /v1/transactions",
      "POST/GET /v1/cashouts",
      "POST/GET /v1/orders",
      "GET /v1/products",
    ],
    code: selectedSnippet,
  };
}

export function buildIntegrationGuide(params: {
  mode: "sdk_node" | "direct_api";
  language?: string;
}): ToolResult {
  const data =
    params.mode === "sdk_node"
      ? buildNodeSdkGuide()
      : buildDirectApiGuide((params.language || "curl").toLowerCase());

  return {
    success: true,
    data,
    message:
      params.mode === "sdk_node"
        ? "Pronto! Montei um guia simples para integrar com o SDK Node."
        : "Pronto! Montei um guia simples para integrar direto pela API.",
  };
}
