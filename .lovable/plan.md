

# Reorganizacao Completa do ContasFlow

## Resumo

Reestruturar a aplicacao para tornar o contador analitico (nao operacional) e o cliente agil. Inclui: novo Painel Geral do contador, simplificacao do fluxo do cliente com redirecionamento automatico apos upload, reorganizacao de abas e responsabilidades.

---

## Mudancas

### 1. Fluxo do Cliente: Upload → Redireciona para Conferir

**`UploadsView.tsx`**: Recebe uma nova prop `onNavigate` (vinda do Index). Apos o upload ser processado com sucesso (linha 74), chama `onNavigate("confirm")` automaticamente apos 1s de delay, levando o cliente direto para a tela de conferencia.

**`Index.tsx`**: Passa `onNavigate={setView}` para o UploadsView.

### 2. ClassifyView → ConfirmView (Simplificacao)

**Renomear** `ClassifyView.tsx` para `ConfirmView.tsx`. Simplificar a interface:
- Mostrar apenas transacoes pendentes com a sugestao da IA pre-selecionada
- Botao "Confirmar todas as sugestoes" para aceitar em lote
- Remover filtros complexos e tabela de transacoes ja classificadas
- Manter barra de progresso e mensagem de sucesso

### 3. Sidebar do Cliente

```text
📤 Envios
✅ Conferir  (era "Classificar")
📊 Dashboard
💡 Insights
```

### 4. Novo: Painel Geral do Contador (`AccountantDashboardView.tsx`)

Dashboard consolidado com Recharts:
- Cards: total clientes, transacoes do mes, taxa de automacao (% IA+memoria), alertas ativos
- Grafico de barras: receita vs despesa consolidado de todos os clientes
- Ranking de risco: clientes ordenados por score de confianca do validationEngine
- Lista de alertas recentes de todos os clientes

### 5. Sidebar do Contador

```text
🏢 Carteira
📊 Painel Geral  (NOVO)
🤖 Regras IA
📋 Plano de Contas
⚙️ Admin
```

### 6. AccountsView absorve gestao de Plano de Contas do Admin

- Mover a sub-aba "chart" do `AdminView.tsx` (import de plano, vinculacao por cliente, edicao) para `AccountsView.tsx`
- `AdminView.tsx` fica apenas com: Usuarios, Uploads e Bancos (3 sub-abas)

---

## Arquivos afetados

| Arquivo | Acao |
|---|---|
| `src/components/client/ClassifyView.tsx` | Renomear para `ConfirmView.tsx`, simplificar para conferencia rapida |
| `src/components/client/UploadsView.tsx` | Adicionar prop `onNavigate`, redirecionar apos upload |
| `src/components/Sidebar.tsx` | Atualizar tabs: "Conferir" no cliente, "Painel Geral" no contador |
| `src/pages/Index.tsx` | Passar `onNavigate` ao UploadsView, adicionar rota "panel", atualizar view default do contador |
| **NOVO** `src/components/accountant/AccountantDashboardView.tsx` | Dashboard analitico consolidado com Recharts |
| `src/components/accountant/AccountsView.tsx` | Absorver import/edicao de plano de contas do AdminView |
| `src/components/accountant/AdminView.tsx` | Remover sub-aba "chart", manter users/uploads/banks |

