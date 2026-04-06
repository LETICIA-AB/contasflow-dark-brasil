

## Parsers PDF Dedicados por Banco + Registry Atualizado

### Resumo
Criar 5 novos parsers PDF dedicados (BB, Itaú, Santander, Inter, Sicoob), reescrever o `genericPdfParser` como fallback multi-estratégia, e atualizar o registry com todos os parsers.

### Arquivos Novos (5)

| Arquivo | Banco | Heurística de detecção | Lógica de débito/crédito |
|---------|-------|----------------------|--------------------------|
| `src/data/parsers/bancoBrasilPdfParser.ts` | Banco do Brasil | "banco do brasil" ou padrão `valor+C/D` | Sufixo `C` ou `D` após valor |
| `src/data/parsers/itauPdfParser.ts` | Itaú | "itaú" + "movimentação" | Sufixo `-` = débito, sem sufixo = crédito |
| `src/data/parsers/santanderPdfParser.ts` | Santander | "santander" ou "SALDO EM dd/MM" | Coluna crédito vs coluna débito (com `-`) |
| `src/data/parsers/interPdfParser.ts` | Banco Inter | "banco inter" ou data extenso | Prefixo `-R$` = débito, `R$` = crédito |
| `src/data/parsers/sicoobPdfParser.ts` | Sicoob | "sicoob" ou "PERÍODO:" | Sufixo `D` ou `C` após valor |

### Arquivos Substituídos (2)

| Arquivo | Mudança |
|---------|---------|
| `src/data/parsers/genericPdfParser.ts` | Reescrito com 5 estratégias em cascata: sufixo C/D → sufixo `-` → prefixo `+/-` → `R$` com sinal → inferência por palavras-chave |
| `src/data/parsers/registry.ts` | Adiciona os 5 novos parsers na lista, mantém ordem: específicos primeiro → genérico → OFX/CSV/XLSX |

### Lógica de cada parser (conforme código fornecido pelo usuário)

Cada parser implementa `StatementParser` com:
- `canParse()`: retorna score 0.95 se detectar nome do banco, score intermediário se detectar padrão de valores, 0 caso contrário
- `parse()`: extrai transações com lógica específica do banco
- Funções auxiliares locais (`parseBRNumber`, `extractDescription`, etc.)

### O que NÃO muda
- `stonePdfParser.ts` e `cloudwalkPdfParser.ts` (já existem e funcionam)
- `types.ts`, `fileParser.ts`, `pdfExtractor.ts`, `brHelpers.ts`
- Fluxo de upload, classificação, modelos contábeis
- Testes existentes continuam passando

