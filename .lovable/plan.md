

## Unificar Extratos + Classificar em uma única aba

### O que muda

A aba "Extratos" passa a ser a aba principal unificada do cliente, eliminando a aba "Classificar" separada. A nova estrutura da página fica:

1. **Header** — título "Extratos Bancários"
2. **Linha de progresso anual (Jan–Dez)** — 12 blocos/meses horizontais. Cada mês fica verde se tem upload, vermelho/amarelo com alerta se não tem. Mês atual destacado.
3. **Seletor de período + Drop zone** — como já existe
4. **Seção de Classificação** — barra de progresso de classificação + lista de pendentes com dropdown de categoria + tabela de todas as transações (conteúdo atual do ClassifyView integrado)
5. **Histórico de envios** — tabela de uploads movida para o final da página

### Arquivos alterados

| Arquivo | Ação |
|---|---|
| `src/components/client/UploadsView.tsx` | Reescrever: integrar ClassifyView, adicionar linha de progresso anual com alertas de meses sem extrato |
| `src/components/client/ClassifyView.tsx` | Manter arquivo (pode ser usado pelo contador), mas o conteúdo será duplicado/integrado no UploadsView |
| `src/components/Sidebar.tsx` | Remover tab "Classificar" do menu do cliente (ficam só "Extratos" e "Dashboard") |
| `src/pages/Index.tsx` | Remover case "classify" do switch do cliente, passar `onUpdate` para UploadsView |

### Detalhes técnicos

**Linha de progresso anual:**
- Array dos 12 meses do ano fiscal (ou Out/2025–Set/2026 conforme períodos existentes)
- Para cada mês, verificar se existe upload do cliente naquele período
- Mês com upload: bolinha/bloco verde. Sem upload: bolinha vermelha + tooltip/alerta. Mês atual: borda accent.
- Abaixo da linha, alerta amarelo se houver meses sem extrato: "⚠ Extratos pendentes: Jan/2026, Fev/2026"

**Seção classificação integrada:**
- Recebe `client` e `onUpdate` como props
- Mostra barra de progresso, pendentes com dropdown, tabela completa — mesma lógica do ClassifyView atual

**Ordem final da página:**
1. Progresso anual
2. Upload (seletor + dropzone)
3. Classificação (progresso + pendentes + tabela transações)
4. Histórico de envios

