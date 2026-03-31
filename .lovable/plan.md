

## Smart Layout: Parser Registry Multi-Banco

### Resumo
Refatorar o sistema de importação de extratos para uma arquitetura baseada em **plugins** (`StatementParser`), com registry automático que detecta o formato do arquivo e seleciona o parser correto. Cobre: BB, Stone, Santander, PagBank, Itaú, InfinitePay/Cloudwalk, PicPay. Adiciona suporte a XLSX via SheetJS e um Wizard de mapeamento de colunas para CSV/XLSX desconhecidos.

### Arquitetura

```text
UploadsView.tsx
  └─ handleFiles()
       └─ ParserRegistry.parse(file)
            ├─ detectFormat(lines/content) → score por parser
            ├─ bestParser.parse(input) → ParsedTransaction[]
            └─ fallback: score < 0.6 → "layout não suportado" + salva amostra
```

### Arquivos Novos

**`src/data/parsers/types.ts`** — Interface `StatementParser`
```ts
interface ParserContext {
  fileName: string;
  mimeType: string;
  textContent?: string;      // para OFX/CSV/TXT
  buffer?: ArrayBuffer;       // para PDF/XLSX
  textLines?: string[];       // linhas extraídas de PDF
}

interface StatementParser {
  id: string;
  name: string;
  supportedFormats: string[]; // ["pdf"], ["csv","txt"], ["ofx"], ["xlsx"]
  canParse(ctx: ParserContext): number; // 0..1
  parse(ctx: ParserContext): Promise<ParsedTransaction[]>;
}
```

**`src/data/parsers/registry.ts`** — `ParserRegistry`
- `register(parser)`, `parse(ctx)`: itera parsers, chama `canParse`, escolhe o de maior score
- Se nenhum score >= 0.6: retorna erro + salva `ctx.textContent?.slice(0, 5000)` ou primeiras 200 linhas em `localStorage` key `cf-unsupported-sample-{timestamp}` para debug

**`src/data/parsers/stonePdfParser.ts`** — Mover `parseStonePDFLines` atual
- `canParse`: score 0.95 se texto contém "stone instituição" ou "DESCRIÇÃO.*VALOR.*SALDO"
- `parse`: reutiliza lógica existente de blocos

**`src/data/parsers/cloudwalkPdfParser.ts`** — Mover `parseInfinitePayLines`
- `canParse`: score 0.95 se contém "infinitepay|cloudwalk|tipo de transa"

**`src/data/parsers/genericPdfParser.ts`** — Mover `parsePDFLinesGeneric`
- `canParse`: score 0.3 (fallback, só usado se nenhum outro casar)

**`src/data/parsers/ofxParser.ts`** — Mover `parseOFX`
- `canParse`: score 0.99 se contém `<OFX` ou `<STMTTRN>`

**`src/data/parsers/csvGenericParser.ts`** — Mover `parseCSV`
- `canParse`: score 0.7 se detecta delimitador e headers reconhecíveis; 0.4 se posicional
- Se colunas não reconhecidas (dateCol === -1 || descCol === -1): retorna score 0.5 e sinaliza `needsMapping: true`

**`src/data/parsers/xlsxParser.ts`** — Novo parser XLSX
- Usa SheetJS (`xlsx` package, já existe no browser como CDN ou npm)
- `canParse`: score 0.99 se extensão é .xlsx/.xls
- `parse`: lê primeira aba (ou permite escolha), converte para linhas CSV-like, reutiliza a mesma lógica de detecção de colunas do CSV parser
- Se colunas não reconhecidas → `needsMapping: true`

**`src/data/parsers/pdfExtractor.ts`** — Função compartilhada
- Extrair a lógica de PDF.js (carregar CDN, extrair linhas com posição x/y) em função reutilizável
- Todos os PDF parsers recebem `textLines` já prontas

### Arquivos Modificados

**`src/data/fileParser.ts`** — Simplificar
- Manter como facade: exportar `parseFile(file: File): Promise<ParsedTransaction[]>`
- Internamente usa `ParserRegistry`
- Remover as funções individuais (movidas para parsers/)

**`src/components/client/UploadsView.tsx`**
- `handleFiles` chama `parseFile(file)` em vez de if/else por extensão
- Adicionar estado `needsMapping` → quando true, abre o **Column Mapping Wizard**
- Wizard: modal com preview das primeiras 5 linhas + dropdowns para mapear "Data", "Descrição", "Valor", "Tipo" (opcional)
- Após mapeamento, re-parseia com as colunas selecionadas

**`src/data/classificationRules.ts`** — Expandir `classifyTransaction`
- Receber `classText` composto (não apenas `desc`): `tipo + " " + descricaoCompleta + " " + contraparte`
- Adicionar assinatura: `classifyTransaction(classText: string, type: "credit"|"debit")`
- Atualizar chamadas em UploadsView e ClassifyView

**`src/components/client/UploadsView.tsx`** — Aceitar .xlsx
- Adicionar `.xlsx, .xls` à lista `accepted`
- Ler como ArrayBuffer (como PDF)

### Wizard de Mapeamento de Colunas

Componente `src/components/client/ColumnMappingWizard.tsx`:
- Props: `headers: string[]`, `sampleRows: string[][]`, `onConfirm(mapping)`, `onCancel`
- UI: tabela com preview + 4 selects (Data, Descrição, Valor, Tipo)
- Compartilhado entre CSV e XLSX (mesmo componente)

### Dependências

- Adicionar `xlsx` (SheetJS) via npm para parsing de planilhas no browser
- PDF.js continua via CDN (já funciona)

### Testes

- Mover fixtures existentes + usar os PDFs já em `public/fixtures/`
- Testes unitários para cada parser: `canParse` retorna score esperado + `parse` extrai transações corretas
- Teste do registry: dado um arquivo Stone PDF, seleciona `stonePdfParser`

### O que NÃO muda
- Estrutura de `Transaction`, `Client`, localStorage
- Fluxo de classificação (memória → regras → pendente)
- Página de Reconciliação (`/conciliacao`) — mantém parser próprio
- Helpers `brHelpers.ts` — reutilizados por todos os parsers

