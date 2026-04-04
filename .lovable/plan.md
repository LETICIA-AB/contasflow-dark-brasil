

## Limpar Todos os Dados do Sistema

### Problema
O botão "Resetar Dados" atual (AdminView) só remove chaves `cf-v3-*` do localStorage, mas existem dados em outras chaves:
- `cf-bank-transactions`, `cf-accounting-entries`, `cf-accounting-splits` (modelos contábeis)
- `cf-v4-clients`, `cf-v4-uploads` (clientes e uploads)
- `cf-v3-*` (users, memory, banks, charts)
- `cf-notifications`
- `cf-unsupported-sample-*`

### Solução
Alterar o "Resetar Dados" no `AdminView.tsx` para limpar **todas** as chaves com prefixo `cf-` (exceto `cf-theme`), cobrindo 100% dos dados.

### Arquivo modificado
`src/components/accountant/AdminView.tsx` — Mudar o filtro de `key.startsWith("cf-v3-")` para `key.startsWith("cf-") && key !== "cf-theme"`.

Isso apaga: empresas, usuários, transações bancárias, lançamentos contábeis, splits, uploads, memória de classificação, bancos, plano de contas, notificações — tudo. A página recarrega e os seeds padrão são recriados automaticamente.

