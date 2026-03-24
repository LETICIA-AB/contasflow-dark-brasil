

## Expandir Transações no Histórico de Envios

### O que será feito
Tornar cada linha do histórico de envios clicável. Ao clicar, expande uma seção abaixo mostrando todas as transações daquele período com: descrição, data, valor, classificação, conta débito/crédito e status (auto/pendente/cliente).

### Mudanças técnicas

**UploadsView.tsx**
1. Adicionar state `expandedUploadId` para controlar qual upload está expandido
2. Tornar cada `<tr>` do histórico clicável (cursor pointer, chevron icon)
3. Ao clicar, filtrar `client.transactions` pelo período do upload selecionado
4. Renderizar uma linha extra abaixo com tabela de transações contendo:
   - Data | Descrição | Valor | Tipo (C/D) | Classificação | Conta Débito | Conta Crédito | Status (badge auto/pendente/cliente)
5. Importar `ChevronDown`/`ChevronRight` do lucide-react para indicar estado expandido
6. Badges coloridos para status: verde (auto), amarelo (pendente), azul (cliente)

### Resultado
- Clique no arquivo → vê todas as transações extraídas daquele período
- Visualização rápida sem sair da aba de envios

