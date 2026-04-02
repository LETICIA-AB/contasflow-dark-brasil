

## Separação Portal do Cliente + Painel do Contador com Modelagem Contábil

### Resumo
Criar dois modelos de dados separados (BankTransaction → AccountingEntry → AccountingSplit), duas rotas independentes (`/portal/extrato` e `/app/lancamentos`), e corrigir o Stone parser para extrair `description_full`, `balance` e `type` por blocos.

### Modelagem de Dados

**`src/data/models.ts`** — Novas interfaces

```text
BankTransaction (imutável, origem bancária)
  ├── id, empresa_id, date, type ("Entrada"|"Saída")
  ├── description_raw, description_full, amount, balance
  ├── bank, source_file_id, created_at
  │
  └── AccountingEntry (1:1 automático na importação)
       ├── id, bank_transaction_id, date, document_number
       ├── original_amount, status ("pendente"|"classificado"|"contabilizado")
       │
       └── AccountingSplit[] (1:N, desmembramento)
            ├── id, accounting_entry_id
            ├── history, amount, debit_account, credit_account
```

- localStorage keys: `cf-bank-transactions`, `cf-accounting-entries`, `cf-accounting-splits`
- Funções CRUD: `loadBankTransactions()`, `saveBankTransactions()`, etc.
- Ao importar: criar BankTransaction + 1 AccountingEntry + 1 AccountingSplit espelho

### Arquivos Novos

| Arquivo | Descrição |
|---------|-----------|
| `src/data/models.ts` | Interfaces + CRUD localStorage |
| `src/pages/PortalExtrato.tsx` | Tela do cliente (tabela simples) |
| `src/pages/AppLancamentos.tsx` | Tela do contador (estilo SS Parisi) |
| `src/components/accountant/SplitModal.tsx` | Modal de desmembramento |

### PARTE 2 — Portal do Cliente (`/portal/extrato`)

Rota nova no `App.tsx`. Componente `PortalExtrato.tsx`:

- Tabela com colunas: Data | Tipo (badge verde/vermelho) | Descrição (`description_full`) | Valor (cor) | Saldo | Classificação (dropdown)
- Filtro: Todos / Pendentes / Classificados
- Ao classificar: atualiza `AccountingSplit.history` + `AccountingEntry.status` → "classificado"
- **Não exibe**: débito, crédito, documento contábil
- Reutiliza `CATEGORIES` e `classifyTransaction` existentes

### PARTE 3 — Painel do Contador (`/app/lancamentos`)

Rota nova no `App.tsx`. Componente `AppLancamentos.tsx`:

- Tabela: Data | Nº Documento | Histórico | Valor | Débito | Crédito | Ações
- Botão `[Desmembrar]` em cada linha → abre `SplitModal`
- **SplitModal**:
  - Modo simples (1 linha) / múltiplo (N linhas)
  - Cada linha: Histórico, Valor, Conta Débito, Conta Crédito
  - Validação: `sum(splits.amount) === original_amount`
  - Salvar cria múltiplos `AccountingSplit`, remove o original

### PARTE 4 — Parser Stone (corrigir)

**`src/data/parsers/stonePdfParser.ts`** — Reescrever para blocos:

- Detectar início de bloco: linha com data (`DD/MM/YY`) + tipo (`Entrada`/`Saída`)
- Acumular linhas seguintes como descrição até encontrar valor monetário
- Extrair: `amount`, `balance` (segundo valor monetário), `contraparte`
- Montar `description_full` = join de todas as linhas intermediárias com ` | `
- Nunca retornar texto genérico do banco como descrição

Retorno expandido do parser — adicionar `balance` a `ParsedTransaction`:
```ts
// types.ts — adicionar campo opcional
balance?: number;
```

### PARTE 5 — Classificação Automática

Regras já existem em `classificationRules.ts` (R90-R97). Ajustar:

- `classifyTransaction` já recebe `desc` como classText. Na importação, montar: `classText = type + " " + description_full`
- Confirmar que as regras Stone (TARIFA, PIX, MAQUININHA, ANTECIPAÇÃO, RECEBIMENTO VENDAS) estão ativas
- Adicionar se faltarem:
  - `Contém "TARIFA" → Despesas Bancárias` ✓ (R90)
  - `PIX + Entrada → Receita de Serviços` ✓ (R96)
  - `PIX + Saída → Despesas Bancárias` ✓ (R97)
  - `MAQUININHA → Receita de Vendas` ✓ (R93)
  - `ANTECIPAÇÃO → Receita de Vendas` ✓ (R91)

### PARTE 6 — Integração no Pipeline

**`src/components/client/UploadsView.tsx`**:
- Após `parseFile()`, criar `BankTransaction[]` + `AccountingEntry[]` + `AccountingSplit[]`
- Manter também a criação de `Transaction` existente (compatibilidade) ou migrar gradualmente
- Exibir: "X transações importadas / Y auto-classificadas / Z pendentes"

**`src/App.tsx`**:
- Adicionar rotas: `/portal/extrato`, `/app/lancamentos`

### Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/App.tsx` | +2 rotas |
| `src/data/parsers/types.ts` | +`balance?` em ParsedTransaction |
| `src/data/parsers/stonePdfParser.ts` | Reescrever parsing por blocos |
| `src/components/client/UploadsView.tsx` | Criar BankTransaction + Entry + Split na importação |
| `src/data/classificationRules.ts` | Verificar/complementar regras Stone |

### O que NÃO muda
- `Transaction` existente e todo o fluxo atual (ClassifyView, ConfirmView, ReviewView) continuam funcionando
- `/conciliacao` (Reconciliation.tsx) mantém parser próprio
- Autenticação, RLS, localStorage structure existente
- Plano de contas (`chartOfAccounts.ts`)

