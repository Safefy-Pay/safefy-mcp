# Safefy MCP

Servidor MCP para integrar e operar a `safefy-api-payment` via tools do Model Context Protocol.

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

- Node.js 20+
- Credenciais de API Payment (`Public Key` e `Secret Key`)
- Gerar credenciais no painel: `https://app.safefypay.com.br/panel/merchant/api-credentials`

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run check
npm run build
npm start
```

## Variáveis de ambiente (opcional)

Se definir as variáveis abaixo, o servidor inicia já pré-configurado:

- `SAFEFY_PAYMENT_BASE_URL`
- `SAFEFY_PAYMENT_PUBLIC_KEY`
- `SAFEFY_PAYMENT_SECRET_KEY`
- `SAFEFY_PAYMENT_ENVIRONMENT` (`sandbox` ou `production`)

Você também pode configurar tudo em runtime usando a tool `safefy_payment_configure_credentials`.

Sem configuração prévia, o MCP usa `https://api-payment.safefypay.com.br` como `baseUrl` padrão e solicita configuração de credenciais na primeira operação autenticada.

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
