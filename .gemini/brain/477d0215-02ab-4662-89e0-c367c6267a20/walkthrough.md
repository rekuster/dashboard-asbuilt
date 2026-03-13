# Melhorias na Validação As-Built

Concluímos a integração do checklist de modelos com os apontamentos de campo, a estruturação do Plano de Ação RVT e a facilitação do cadastro de entregas em lote.

## Principais Mudanças

### 1. Vínculo Checklist As-Built vs Campo
O modal de verificação agora cruza dados com os **Relatos de Campo (Apontamentos)**. Se uma sala tem divergências não resolvidas em uma disciplina, o checklist exibirá um alerta âmbar com o número de pendências.
- Isso garante que a equipe só valide o modelo as-built se todos os problemas detectados na obra foram resolvidos.

### 2. Plano de Ação RVT (Gestão de Escopo)
Na aba **Entregas As-Built / Gestão de Escopo**, adicionamos campos vitais:
- **Modelo Final**: O nome exato que o arquivo deve ter na entrega final.
- **RVT Nativo?**: Indica se recebemos o arquivo original do projetista.
- **Ação/Pendência RVT**: Se não tivermos o RVT, define o plano (ex: "Gerar via IFC" ou "Cobrar projetista").

### 3. Cadastro de Entregas em Lote
Simplificamos o processo de registro de novos arquivos:
- Ao criar uma nova entrega, você pode selecionar **múltiplas disciplinas** daquela edificação de uma só vez.
- O sistema registrará automaticamente uma entrega individual para cada disciplina selecionada, economizando tempo.

## Demonstração Visual

````carousel
### Alerta de Divergências no Checklist
O sistema agora avisa se houverem divergências pendentes do campo antes de você validar a disciplina.
<!-- slide -->
### Novo Form de Escopo com Plano RVT
Definição clara do nome final do arquivo e se o arquivo nativo (.rvt) está disponível.
<!-- slide -->
### Registro de Entregas em Lote
Economia de tempo ao registrar arquivos que englobam diversas disciplinas.
````

## Como Validar
1. Vá na aba **Status As-Built**.
2. Clique no botão de **Checklist** de qualquer sala. Se houverem apontamentos naquela disciplina para essa sala, você verá um aviso em cor âmbar.
3. Na aba **Entregas As-Built**, verifique a nova tabela de **Gestão de Escopo** com as colunas de RVT.
4. Teste o botão **Nova Entrega**, selecione uma edificação e marque várias disciplinas no novo painel que aparecerá.
