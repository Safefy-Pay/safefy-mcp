# Safefy MCP

MCP server oficial da [Safefy](https://safefypay.com.br) — integre cobranças PIX, saques, clientes e pagamentos diretamente em qualquer agente de IA compatível com Model Context Protocol.

## Como usar no seu agente de IA

### Claude (claude.ai)

Configure via `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "safefy": {
      "command": "npx",
      "args": ["-y", "@safefypay/safefy-mcp"],
      "env": {
        "SAFEFY_PAYMENT_PUBLIC_KEY": "pk_...",
        "SAFEFY_PAYMENT_SECRET_KEY": "sk_..."
      }
    }
  }
}
```

### v0 (v0.dev)

No chat do v0, clique em **"+"** → **"Add MCP Server"** e configure:

```json
{
  "name": "safefy",
  "command": "npx",
  "args": ["-y", "@safefypay/safefy-mcp"],
  "env": {
    "SAFEFY_PAYMENT_PUBLIC_KEY": "pk_...",
    "SAFEFY_PAYMENT_SECRET_KEY": "sk_..."
  }
}
```

### Lovable (lovable.dev)

Acesse **Settings → MCP Servers → Add Server** e cole:

```json
{
  "name": "safefy",
  "command": "npx",
  "args": ["-y", "@safefypay/safefy-mcp"],
  "env": {
    "SAFEFY_PAYMENT_PUBLIC_KEY": "pk_...",
    "SAFEFY_PAYMENT_SECRET_KEY": "sk_..."
  }
}
```

### Cursor / Windsurf / VS Code

Adicione ao seu `mcp.json` ou `settings.json`:

```json
{
  "mcpServers": {
    "safefy": {
      "command": "npx",
      "args": ["-y", "@safefypay/safefy-mcp"],
      "env": {
        "SAFEFY_PAYMENT_PUBLIC_KEY": "pk_...",
        "SAFEFY_PAYMENT_SECRET_KEY": "sk_..."
      }
    }
  }
}
```

---

As credenciais ficam nas variáveis de ambiente do servidor MCP (`SAFEFY_PAYMENT_PUBLIC_KEY` e `SAFEFY_PAYMENT_SECRET_KEY`), como nos exemplos acima. **Não cole a secret key no chat:** o histórico da conversa não é lugar de segredo, e a tool `safefy_payment_configure_credentials` vem desligada por padrão (só funciona se quem roda o servidor definir `SAFEFY_ALLOW_CHAT_CREDENTIALS=true`).

Opcional: `SAFEFY_PAYMENT_ENVIRONMENT` (`sandbox` ou `production`) e `SAFEFY_PAYMENT_BASE_URL`.

Gere suas credenciais em: **https://app.safefypay.com.br/panel/merchant/api-credentials**

---

## O que este servidor expõe

- Assistente de integração:
	- via `SDK Node` (`safefy-sdk-node`)
	- via `API direta` (qualquer linguagem)
- Configuração/autenticação de credenciais (`/v1/auth/token`)
- Saldo (`/v1/balance`)
- Transações (`/v1/transactions`)
- Saques (`/v1/cashouts`)
- Clientes (`/v1/customers`)
- Pedidos (`/v1/orders`)
- Produtos (`/v1/products`)
- Payment Links públicos (`/v1/payment-links`)
- Requisição genérica para cobertura total da API (`safefy_payment_api_request`)

## Requisitos

- Node.js 18+
- Credenciais de API Payment (`Public Key` e `Secret Key`)
- Gere no painel: **https://app.safefypay.com.br/panel/merchant/api-credentials**

## Instalação local (desenvolvimento)

```bash
npm install
npm run build
npm start
```

## Principais tools

- `safefy_payment_get_integration_guide`
- `safefy_payment_list_capabilities`
- `safefy_payment_configure_credentials`
- `safefy_payment_get_configuration`
- `safefy_payment_authenticate`
- `safefy_payment_api_request`
- `safefy_payment_get_balance`
- `safefy_payment_create_transaction`
- `safefy_payment_list_transactions`
- `safefy_payment_get_transaction`
- `safefy_payment_simulate_transaction`
- `safefy_payment_resend_transaction_webhook`
- `safefy_payment_create_cashout`
- `safefy_payment_list_cashouts`
- `safefy_payment_get_cashout`
- `safefy_payment_cancel_cashout`
- `safefy_payment_simulate_cashout`
- `safefy_payment_create_customer`
- `safefy_payment_list_customers`
- `safefy_payment_get_customer`
- `safefy_payment_update_customer`
- `safefy_payment_create_order`
- `safefy_payment_list_orders`
- `safefy_payment_get_order`
- `safefy_payment_list_products`
- `safefy_payment_get_product`
- `safefy_payment_get_payment_link`
- `safefy_payment_start_payment_link`
- `safefy_payment_get_payment_link_status`

## Cobertura total da API Payment

Quando uma operação ainda não tiver tool dedicada, use `safefy_payment_api_request`.

Exemplo:

```json
{
	"path": "/v1/transactions",
	"method": "GET",
	"requireAuth": true,
	"query": {
		"page": 1,
		"pageSize": 20
	}
}
```

## Skill no .github

O conteúdo de `mcp-builder` foi espelhado para `.github/skills/mcp-builder` para uso como skill de apoio no projeto.
