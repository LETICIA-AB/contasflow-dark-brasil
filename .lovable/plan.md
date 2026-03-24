

## Simplificar Cadastro de Usuário — Remover Bancos

### Problema
O formulário de criação/edição de usuário tem uma seção "Bancos utilizados" que não faz sentido nesse contexto. Bancos são propriedade da **empresa**, não do usuário. Essa configuração já existe corretamente na aba "Empresas".

Além disso, ao salvar o usuário, o código sobrescreve os bancos da empresa com a seleção feita no formulário de usuário (linhas 66-70), o que pode causar perda de dados.

### Mudanças

**AdminView.tsx**
1. Remover o state `formBanks` e a função `toggleBank` (usados apenas no form de usuário)
2. Remover a seção "Bancos utilizados" do formulário de criação/edição de usuário
3. Remover a lógica em `handleSave` que sobrescreve `c.banks` da empresa ao salvar o usuário (linhas 66-70)
4. No `startEdit`, remover o carregamento de `formBanks`
5. Na tabela de usuários, manter a coluna "Bancos" como leitura — ela já puxa de `c?.banks` da empresa vinculada
6. Ao selecionar empresa no dropdown, preencher apenas o CNPJ automaticamente (manter `handleClientSelect` sem setFormBanks)

### Resultado
- Formulário de usuário fica mais simples: apenas Empresa, CNPJ e Senha
- Bancos são gerenciados exclusivamente na aba Empresas
- Sem risco de sobrescrever bancos da empresa ao editar um usuário

