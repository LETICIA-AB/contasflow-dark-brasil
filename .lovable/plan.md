

## Diagnóstico e Correção do Pipeline de Extratos

### Problema Central
As datas no PDF Stone usam formato `DD/MM/YY` (ano com 2 dígitos: `31/01/26`), mas ambos os parsers (`fileParser.ts` e `Reconciliation.tsx`) esperam `DD/MM/YYYY` (4 dígitos). Resultado: zero transações extraídas.

### Fluxo Atual no Código

| Etapa | Arquivo | Status |
|-------|---------|--------|
| Upload + leitura | `UploadsView.tsx` (handleFiles) | OK — lê corretamente com fallback de encoding |
| Parse OFX | `fileParser.ts` (parseOFX) | OK — funcional |
| Parse CSV | `fileParser.ts` (parseCSV) | OK — funcional |
| Parse PDF (geral) | `fileParser.ts` (parsePDF → parsePDFLines) | **QUEBRADO** — regex de data não aceita DD/MM/YY |
| Parse PDF (Stone) | `Reconciliation.tsx` (parseStoneExtract → extractStoneData) | **QUEBRADO** — mesma razão |
| Insert transações | `UploadsView.tsx` (salva em localStorage) | OK — sem RLS (não usa Supabase) |
| Duplicidade | Nenhuma proteção | **FALTANDO** |

### Plano de Correção (4 mudanças)

**1. Corrigir regex de data nos dois parsers**

Em `fileParser.ts` (`parsePDFLines`): mudar `DATE_RE` de `(\d{2}\/\d{2}\/\d{4})` para `(\d{2}\/\d{2}\/(?:\d{4}|\d{2}))` e converter ano de 2 dígitos para 4 dígitos (`26` → `2026`).

Em `Reconciliation.tsx` (`extractStoneData`): mesma correção no `DATE_RE` e na conversão de ano. Também ajustar o regex de período que já funciona (usa 4 dígitos no header).

**2. Corrigir regex de valor negativo no Stone parser**

O PDF Stone usa `- R$ 0,30` (espaço entre `-` e `R$`). Ajustar o `AMOUNT_RE` em ambos os arquivos para capturar padrão `- R$` com espaço.

Em `fileParser.ts`: `AMOUNT_RE` atual já tem `[+-]?\s*R?\$?` — parece OK mas precisa validar que o `-` no início da linha é capturado mesmo quando separado por espaço do valor.

Em `Reconciliation.tsx`: o regex `(-?\s*R?\$?\s*[\d.]+,\d{2})` precisa aceitar `- R$ 0,30` — ajustar para `(-\s*)?R?\$?\s*[\d.]+,\d{2}`.

**3. Adicionar proteção contra duplicidade**

Em `UploadsView.tsx` (`handleFiles`): antes de inserir novas transações, verificar se já existe transação com mesmo `date + description + amount + type`. Usar um Set de hashes para filtrar duplicatas.

**4. Copiar fixture PDF para o projeto e adicionar instrumentação**

- Copiar `STONE_01.2026.pdf` para `public/fixtures/` para testes futuros
- Melhorar logs com contagem clara: `"X transações importadas, Y auto-classificadas, Z pendentes"`
- Na UI, após parse com sucesso, exibir banner com esses números

### Arquivos Modificados
- `src/data/fileParser.ts` — fix date regex + amount regex em `parsePDFLines`
- `src/pages/Reconciliation.tsx` — fix date regex + amount regex em `extractStoneData`
- `src/components/client/UploadsView.tsx` — deduplicação + melhor feedback
- `public/fixtures/STONE_01.2026.pdf` — fixture para teste (cópia do upload)

### Detalhes Técnicos

```text
Antes (não funciona):
  DATE_RE = /(\d{2}\/\d{2}\/\d{4})/     → não casa "31/01/26"

Depois (funciona):
  DATE_RE = /(\d{2}\/\d{2}\/\d{2,4})/   → casa "31/01/26" e "31/01/2026"
  
  // Conversão:
  if (year.length === 2) year = (parseInt(year) > 50 ? "19" : "20") + year;
```

