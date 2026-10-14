<p align="center">
  <img src="https://raw.githubusercontent.com/Safefy-Pay/safefy-mcp/main/.github/assets/safefy-pay-logo-white.png" alt="Safefy Pay" width="300">
</p>

<h1 align="center">safefy-mcp</h1>

<p align="center">Servidor MCP oficial da Safefy Pay para agentes de IA</p>

<p align="center"><a href="https://www.npmjs.com/package/@safefypay/safefy-mcp"><img src="https://img.shields.io/npm/v/%40safefypay%2Fsafefy-mcp?label=npm&logo=npm" alt="npm"></a> · Node.js 18+ · TypeScript</p>

---

## Visão geral

Servidor [MCP](https://modelcontextprotocol.io) oficial da [Safefy Pay](https://safefypay.com.br).
Conecta qualquer agente de IA compatível com Model Context Protocol à API de pagamentos da Safefy:
cobranças PIX, saques, clientes, pedidos, produtos e links de pagamento.

## Requisitos

- Node.js 18+
- Credenciais da API de pagamentos (Public Key e Secret Key), geradas no painel em
  **[Credenciais de API](https://app.safefypay.com.br/panel/merchant/api-credentials)**

## Configuração no agente

A configuração é a mesma em todos os agentes: o servidor roda com `npx` e as credenciais vão em
variáveis de ambiente.

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

| Agente | Onde configurar |
| --- | --- |
| Claude Desktop | `claude_desktop_config.json` (bloco acima) |
| Cursor / Windsurf / VS Code | `mcp.json` ou `settings.json` (bloco acima) |
| v0 | no chat, **+** → **Add MCP Server**, com `name: "safefy"` e os campos `command`, `args` e `env` |
| Lovable | **Settings → MCP Servers → Add Server**, com os mesmos campos do v0 |

### Variáveis de ambiente

| Variável | Obrigatória | Para que serve |
| --- | --- | --- |
| `SAFEFY_PAYMENT_PUBLIC_KEY` | sim | chave pública |
| `SAFEFY_PAYMENT_SECRET_KEY` | sim | chave secreta |
| `SAFEFY_PAYMENT_ENVIRONMENT` | não | `sandbox` ou `production` |
| `SAFEFY_PAYMENT_BASE_URL` | não | URL alternativa da API |
| `SAFEFY_ALLOW_CHAT_CREDENTIALS` | não | `true` libera a tool `safefy_payment_configure_credentials` |

> **Não cole a secret key no chat.** O histórico da conversa não é lugar de segredo. Por isso a
> tool de configurar credenciais vem desligada e só funciona com `SAFEFY_ALLOW_CHAT_CREDENTIALS=true`.

## Tools

| Grupo | Tools |
| --- | --- |
| Integração | `safefy_payment_get_integration_guide` (SDK Node ou API direta), `safefy_payment_list_capabilities` |
| Credenciais | `safefy_payment_configure_credentials`, `safefy_payment_get_configuration`, `safefy_payment_authenticate` |
| Saldo | `safefy_payment_get_balance` (com o disponível por grupo de liquidação) |
| Transações | `safefy_payment_create_transaction`, `safefy_payment_list_transactions`, `safefy_payment_get_transaction`, `safefy_payment_simulate_transaction`, `safefy_payment_resend_transaction_webhook` |
| Saques | `safefy_payment_create_cashout`, `safefy_payment_list_cashouts`, `safefy_payment_get_cashout`, `safefy_payment_cancel_cashout`, `safefy_payment_simulate_cashout` |
| Clientes | `safefy_payment_create_customer`, `safefy_payment_list_customers`, `safefy_payment_get_customer`, `safefy_payment_update_customer` |
| Pedidos | `safefy_payment_create_order`, `safefy_payment_list_orders`, `safefy_payment_get_order` |
| Produtos | `safefy_payment_list_products`, `safefy_payment_get_product` |
| Links de pagamento | `safefy_payment_get_payment_link`, `safefy_payment_start_payment_link`, `safefy_payment_get_payment_link_status` |
| Qualquer rota | `safefy_payment_api_request` |

### Cobertura total da API

Quando uma operação ainda não tiver tool própria, use `safefy_payment_api_request`:

```json
{
  "path": "/v1/transactions",
  "method": "GET",
  "requireAuth": true,
  "query": { "page": 1, "pageSize": 20 }
}
```

## Desenvolvimento

```bash
npm install     # também ativa o hook de pre-push
npm run build
npm start
```

| Comando | O que faz |
| --- | --- |
| `npm run dev` | roda direto do TypeScript |
| `npm run check` | `tsc --noEmit` |
| `npm run verify` | check + build (roda no pre-push) |

## Publicando uma versão

O projeto não usa CI: a verificação roda localmente pelo hook de `pre-push` (`.githooks/pre-push`).
Em emergência: `git push --no-verify`.

1. Numa branch, rode `npm run release:patch` (ou `:minor` / `:major`), abra o PR e faça o merge na
   `main`.
2. Na `main` atualizada, rode `npm run release`. O script:
   - confere se a árvore está limpa e igual a `origin/main`;
   - roda `npm run verify`;
   - publica no npm;
   - cria e envia a tag `vX.Y.Z`;
   - cria a release no GitHub, com notas geradas a partir dos PRs.

Requer `gh` autenticado (`gh auth login`) e login no npm.

## Novidades

### 1.2.0

- Saque com conta de saque cadastrada voltou a funcionar (a API pública aceita `payoutAccountId`).
- `settlementGroupId` opcional no saque, para escolher o grupo de liquidação. O saldo mostra o
  disponível por grupo em `balance.settlementGroups`.

### 1.1.0

- O token de acesso só é enviado para a API da Safefy.
- O CVV não é mais exposto ao modelo.
- O saque só é confirmado para uma conta já cadastrada.
- As credenciais vêm de variáveis de ambiente, não do chat.

Histórico completo: [releases no GitHub](https://github.com/Safefy-Pay/safefy-mcp/releases).

## Skill de apoio

O conteúdo de `mcp-builder` está espelhado em `.github/skills/mcp-builder`, para uso como skill no
projeto.
