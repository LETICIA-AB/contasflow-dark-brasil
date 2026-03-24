

## Plano de Contas Domínio importável + vinculação por empresa + IA com conta contábil automática

### Conceito

Você vai fornecer o plano de contas real da Domínio (pode colar como texto, CSV ou JSON). O sistema vai:
- Substituir o plano genérico atual pelo plano real da Domínio
- Permitir vincular um plano de contas específico por empresa (cada cliente pode ter contas diferentes)
- Na classificação automática, a IA já resolve a conta contábil (débito/crédito) junto com a categoria
- Criar memória inteligente que aprende com cada classificação manual e melhora com o tempo

### Arquivos e mudanças

| Arquivo | Mudança |
|---|---|
| `src/data/chartOfAccounts.ts` | Substituir as 95 contas atuais pelo plano real da Domínio que você fornecer. Manter a mesma interface `Account { code, seq, name, type, group }`. Atualizar os mapas `CATEGORY_DEBIT_MAP`, `CATEGORY_CREDIT_MAP` e `BANK_ACCOUNT_MAP` com os códigos reais. `resolveAccounts()` passa a aceitar `chartOverrides` opcional por empresa. |
| `src/data/store.ts` | `Client` ganha: `banks: string[]` (bancos usados), `chartOverrides: Record<string, string>` (mapeamento categoria→conta específico da empresa). `Transaction` ganha: `debitAccount?: string`, `creditAccount?: string`. Novo store `cf-v3-memory` para memória de classificação. Novo store `cf-v3-banks` para cadastro de bancos. |
| `src/data/classificationRules.ts` | Nova função `classifyWithMemory(desc, type, clientId)` que consulta memória antes das regex. `normalizeDescription()` para limpar descrições. `saveToMemory()` para gravar cada classificação. |
| `src/components/accountant/AdminView.tsx` | Nova sub-aba "Bancos" com CRUD + campo "Outro". No form de usuário, checkboxes de bancos + seção "Plano de Contas" onde o contador edita `chartOverrides` da empresa (tabela: Categoria → Conta Padrão → Conta da Empresa). |
| `src/components/accountant/RulesView.tsx` | Nova seção "Memória de classificação" mostrando descrições aprendidas, contagem de uso, opção de editar/excluir. |
| `src/components/client/UploadsView.tsx` | Classificação chama `classifyWithMemory`. Colunas Débito/Crédito na tabela. Upload compacto inline. Alerta de bancos faltantes. |
| `src/components/client/DashboardView.tsx` | Análise horizontal com drill-down SVG por categoria + filtro de período. |
| `src/components/client/InsightsView.tsx` | **Novo** — projeções, tendências, resumo textual baseado nos dados. |
| `src/components/Sidebar.tsx` | Aba Insights no cliente, badge notificações no contador. |
| `src/pages/Index.tsx` | Rota InsightsView, props atualizadas. |

### Fluxo da classificação com conta contábil

```text
Transação: "PGTO FORNEC HORTIFRUTI" (débito)
      │
      ▼
  1. Memória → já viu essa desc antes? → Sim, count=3 → categoria "Fornecedores"
      │                                    + debitAccount "320001", creditAccount "111002"
      │                                    classifiedBy: "memory"
      │
  2. Se não → Regex R41 match → categoria "Fornecedores / Compras"
      │         + resolveAccounts("Fornecedores", "debit", "Bradesco", chartOverrides)
      │         → debit "320001", credit "111002"
      │
  3. Se não → pendente → cliente classifica → salva na memória
```

### Como fornecer o plano de contas

Você pode colar aqui o plano de contas da Domínio em qualquer formato:
- Texto copiado da tela (código | nome | tipo)
- CSV ou planilha
- Lista simples

Eu converto para o formato do sistema e substituo o `chartOfAccounts.ts` atual. Se cada empresa tem um plano diferente na Domínio, você pode fornecer o plano base e depois os overrides por empresa.

### Próximo passo

Cole o plano de contas real da Domínio e eu implemento tudo de uma vez: substituo as contas, adiciono a vinculação por empresa, memória inteligente, bancos customizáveis, análise horizontal e insights.

