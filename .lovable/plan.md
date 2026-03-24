

## Adicionar Cadastro de Empresas na Administração

### Problema
A aba Administração permite criar usuários, mas exige selecionar uma empresa existente. Não há como cadastrar novas empresas — elas vêm apenas do seed data.

### Solução
Adicionar uma nova sub-aba **"Empresas"** na tela de Administração, com CRUD completo de clientes.

### Mudanças

**1. AdminView.tsx — Nova sub-aba "Empresas"**
- Adicionar `"clients"` ao array de sub-tabs (Usuários | Empresas | Extratos | Bancos)
- Criar seção com:
  - Botão "+ Nova empresa"
  - Formulário inline com campos: Nome, CNPJ (com máscara), Regime tributário (Simples Nacional / Lucro Presumido / Lucro Real), Banco principal, Bancos utilizados
  - Tabela listando todas as empresas com colunas: Nome, CNPJ, Regime, Bancos, Status, Ações (Editar/Excluir)

**2. store.ts — Função de criação de cliente**
- Adicionar helper `createClient()` que gera um novo `Client` com ID único, transações vazias, e status "classify"

**3. Fluxo do usuário**
- Contador acessa Administração → Empresas → "+ Nova empresa"
- Preenche dados e salva
- Empresa fica disponível no dropdown ao criar usuários

### Detalhes técnicos
- Reutilizar os mesmos patterns visuais já usados nas outras sub-tabs (cf-card, cf-table, cf-input, cf-select)
- Aplicar `formatCNPJ` no campo CNPJ
- Regime como `<select>` com as 3 opções
- Seleção de bancos com checkboxes (igual ao formulário de usuários)
- Persistência via `saveClients()` existente

