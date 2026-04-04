

## Fix: Filtrar Headers/Footers de Página no Stone PDF Parser

### Problema
Quando o PDF tem múltiplas páginas, as linhas de cabeçalho/rodapé de cada página ("Extrato de conta corrente", "Emitido em...", "Página X de Y", "Período: de...", "DATA TIPO DESCRIÇÃO VALOR SALDO CONTRAPARTE") são capturadas como `pendingDescLines` e concatenadas na descrição da próxima transação.

O filtro atual (linhas 131-135) tenta limpar essas linhas, mas só remove padrões parciais — frases como "Extrato de conta corrente" e "Emitido em 02 fevereiro 2026 às 12:10:20" passam pelo filtro e se acumulam no buffer.

### Solução
Adicionar um filtro robusto de linhas de header/footer que descarte qualquer linha contendo padrões conhecidos de cabeçalho Stone. Aplicar esse filtro em **todos** os pontos onde linhas são adicionadas a `descLines` (tanto no bloco `pendingDescLines` quanto no bloco `current.descLines` após o amount).

### Mudança Concreta

**`src/data/parsers/stonePdfParser.ts`**:

1. Criar função `isHeaderLine(line: string): boolean` que retorna `true` para linhas contendo:
   - `Extrato de conta corrente`
   - `Emitido em`
   - `Página \d+ de \d+`
   - `Período:` ou `Periodo:`
   - `DATA TIPO DESCRIÇÃO VALOR SALDO`
   - `CONTRAPARTE` (sozinha ou como header)
   - `Stone Instituição de Pagamento`
   - `CNPJ` / `Ag:` / `Conta:` (metadados bancários)

2. Usar `isHeaderLine()` como guarda antes de fazer `.push()` em `descLines` e `pendingDescLines` — nas 3 seções:
   - Linha 68: `descLines: [...pendingDescLines]` → filtrar pending
   - Linha 101-103: contraparte após amount → checar antes de push
   - Linha 125-126: descrição pura → checar antes de push
   - Linha 137-140: pending lines → checar antes de push

### Resultado Esperado
"Antecipação" aparecerá limpo, sem cabeçalhos de página concatenados. A `description_full` conterá apenas: `Recebimento vendas | Antecipação` (ou similar), sem metadados do PDF.

### Arquivo Modificado
- `src/data/parsers/stonePdfParser.ts` — adicionar `isHeaderLine()` + aplicar filtro em 4 pontos

