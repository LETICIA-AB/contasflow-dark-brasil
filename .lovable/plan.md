

## Plano de Contas vinculado por cliente + bloqueio de envio + reorganização do portal

### Resumo

Tres mudancas principais:
1. **Plano de contas por cliente** -- cada cliente tem seu proprio plano (ou o padrao). Import no admin vincula ao cliente selecionado. Deteccao de duplicata sugere replicar.
2. **Bloqueio de conclusao de envio** -- cliente so pode "concluir" envio apos classificar tudo. Progresso salvo normalmente.
3. **Reorganizacao do portal do cliente** -- consolidar views, remover redundancias, layout mais limpo.

---

### Mudancas tecnicas

#### 1. Modelo de dados (`store.ts`, `chartStore.ts`)

- `Client` ganha campo `chartId?: string` -- referencia ao plano vinculado
- Novo store `cf-v3-client-charts` no `chartStore.ts`:
  - `saveClientChart(clientId, accounts[])` -- salva plano vinculado ao cliente
  - `loadClientChart(clientId): Account[] | null`
  - `listAllClientCharts(): { clientId, chartHash, accountCount }[]` -- para deteccao de duplicatas
  - `getActiveChartForClient(clientId)` -- retorna chart do cliente, ou global, ou padrao
- Funcao `hashChart(accounts[])` para comparar planos (hash simples baseado em codes concatenados)

#### 2. Admin - Plano de Contas (`AdminView.tsx`)

- Import de plano agora exige selecionar cliente destino primeiro
- Apos parse do arquivo, antes de confirmar:
  - Verifica se hash do plano ja existe em outro cliente
  - Se sim, mostra alerta: "Este plano ja esta vinculado a [Empresa X]. Deseja replicar?"
  - Botao "Replicar para outro cliente" que copia o plano
- Na listagem, mostra qual plano cada cliente tem vinculado (badge: "Personalizado" ou "Padrao")
- Tabela resumo: Cliente | Plano | Qtd contas | Acoes (ver/editar/remover)

#### 3. Bloqueio de envio no portal do cliente (`UploadsView.tsx`)

- Botao "Concluir envio do periodo" aparece apos upload
- Se `pending.length > 0`: botao desabilitado + banner amarelo explicando:
  - "Voce tem X transacoes pendentes de classificacao. Classifique todas para concluir o envio deste periodo."
  - Progresso salvo normalmente, nada se perde
- Se `pending.length === 0`: botao verde habilitado, ao clicar muda status do cliente

#### 4. Reorganizacao do portal do cliente

**UploadsView.tsx** -- simplificar:
- Mover a secao de "Todas as transacoes" para a aba Classificar (ClassifyView), removendo duplicidade
- Manter apenas: progresso anual, upload, barra de progresso de classificacao, pendentes inline, historico de envios
- Adicionar botao "Concluir envio"

**ClassifyView.tsx** -- enriquecer:
- Absorver a tabela completa de transacoes com colunas Debito/Credito
- Filtros por status (Pendente/Classificado/Todos) e por tipo (Credito/Debito)

**DashboardView.tsx** -- manter como esta (cards + grafico + analise horizontal)

**InsightsView.tsx** -- manter como esta

**Sidebar.tsx** -- renomear "Extratos" para "Envios" para diferenciar melhor de "Classificar"

---

### Arquivos modificados

| Arquivo | O que muda |
|---|---|
| `src/data/chartStore.ts` | Funcoes per-client chart, hash, listagem |
| `src/data/store.ts` | `Client.chartId` opcional |
| `src/components/accountant/AdminView.tsx` | Import vinculado a cliente, deteccao duplicata, resumo por cliente |
| `src/components/client/UploadsView.tsx` | Remove tabela de transacoes, adiciona botao "Concluir envio" com bloqueio |
| `src/components/client/ClassifyView.tsx` | Absorve tabela completa com colunas debito/credito, filtros |
| `src/components/Sidebar.tsx` | Renomear "Extratos" para "Envios" |

