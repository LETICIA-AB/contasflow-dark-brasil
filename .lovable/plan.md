

## Limpar localStorage e Parsear Arquivos Reais

### O que será feito

1. **Botão "Resetar Dados"** na aba Administração para limpar o localStorage e recarregar a página (para testes rápidos)

2. **Parser de arquivos OFX e CSV reais** no upload — em vez de gerar transações genéricas, o sistema lê o conteúdo do arquivo enviado e extrai as transações reais (data, descrição, valor, tipo)

3. **Classificação automática** das transações extraídas usando o motor de regras já existente (`classifyTransaction`)

### Mudanças técnicas

**Novo arquivo: `src/data/fileParser.ts`**
- Função `parseOFX(content)` — extrai transações de arquivos OFX (formato bancário padrão), lendo tags `<STMTTRN>` com `<DTPOSTED>`, `<TRNAMT>`, `<MEMO>`/`<NAME>`
- Função `parseCSV(content)` — extrai transações de CSV bancário, detectando colunas de data/descrição/valor por heurística nos cabeçalhos
- Ambas retornam array de `{ date, description, amount, type }` que é convertido em `Transaction[]`

**UploadsView.tsx**
- Ler o conteúdo real do arquivo via `FileReader.readAsText()`
- Chamar o parser apropriado (OFX ou CSV) baseado na extensão
- Gerar `Transaction[]` a partir dos dados reais, aplicando `classifyTransaction` e `resolveAccounts`
- Fallback para `generateGenericTransactions` se o parser falhar ou formato não suportado (.txt, .pdf)

**AdminView.tsx**
- Adicionar botão "Resetar Dados" que limpa as chaves `cf-v3-*` do localStorage e recarrega a página

### Resultado
- Upload de OFX/CSV real popula transações reais na aba Conferir
- Classificação automática funciona sobre os dados reais
- Fácil resetar para testar do zero

