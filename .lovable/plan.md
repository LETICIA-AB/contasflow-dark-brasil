

## "Outros" com Descrição do Cliente + Memória Automática

### O que será feito
Quando o cliente selecionar a categoria **"Outros"** na classificação de uma transação, um campo de texto aparece para ele descrever o que foi aquela movimentação. Essa descrição é salva na memória, e nos próximos extratos do mesmo banco, transações com descrição similar serão automaticamente classificadas como "Outros" com a mesma descrição do cliente.

### Como funciona

```text
Cliente seleciona "Outros"
       ↓
Campo de texto aparece: "Descreva essa movimentação"
       ↓
Cliente digita (ex: "Reembolso de viagem do sócio")
       ↓
Salva na memória com: categoria "Outros" + clientDescription
       ↓
Próximo extrato → mesma descrição bancária → auto-classifica como "Outros"
       com a descrição do cliente já preenchida
```

### Mudanças técnicas

**`src/data/store.ts`**
- Adicionar campo `clientDescription?: string` ao type `Transaction`

**`src/data/memoryStore.ts`**
- Adicionar campo `clientDescription?: string` ao type `ClassificationMemory`
- Atualizar `saveToMemory` para aceitar e salvar `clientDescription`

**`src/components/client/ClassifyView.tsx`**
- Adicionar state `othersInput: Record<string, string>` para armazenar texto por transação
- Quando o select muda para "Outros", mostrar um `<Textarea>` abaixo com placeholder "Descreva o que foi essa movimentação..."
- Adicionar botão "Confirmar" que só aparece quando categoria é "Outros" e texto foi preenchido
- No `handleClassify`: se categoria === "Outros", salvar `clientDescription` na transação e na memória via `saveToMemory` com o campo extra
- Para transações auto-classificadas como "Outros" (vindas da memória), exibir a `clientDescription` na tabela como tooltip ou texto secundário

