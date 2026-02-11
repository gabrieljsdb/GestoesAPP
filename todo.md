# TODO - Painel Administrativo OAB Timeline

## Funcionalidades Principais

- [x] Sistema de autenticação integrado com controle de acesso administrativo
- [x] Interface de listagem de todas as gestões com visualização em tabela/cards
- [x] Formulário para adicionar novas gestões com período e membros da diretoria
- [x] Funcionalidade de editar gestões existentes (período, membros, ordem)
- [x] Capacidade de remover gestões do histórico
- [x] Gerenciamento de membros dentro de cada gestão (adicionar/remover/editar nomes e cargos)
- [x] Marcação de gestão ativa (startActive) para definir qual aparece primeiro na timeline
- [x] Preview em tempo real mostrando como a timeline aparecerá no site público
- [x] Exportação dos dados editados em formato JSON compatível
- [x] Página pública da timeline integrada ao painel, consumindo dados do banco de dados

## Tarefas Técnicas

### Backend
- [x] Criar schema do banco de dados (gestões e membros)
- [x] Implementar helpers de banco de dados
- [x] Criar rotas tRPC para CRUD de gestões
- [x] Criar rotas tRPC para CRUD de membros
- [x] Implementar rota de exportação JSON
- [x] Adicionar proteção de rotas administrativas

### Frontend
- [x] Configurar tema e design system
- [x] Criar página de listagem de gestões (admin)
- [x] Criar formulário de adicionar gestão
- [x] Criar formulário de editar gestão
- [x] Implementar gerenciamento de membros inline
- [x] Criar componente de preview da timeline
- [x] Implementar página pública da timeline
- [x] Adicionar funcionalidade de exportação JSON

### Testes
- [x] Testes unitários para rotas tRPC
- [x] Validação de dados
- [x] Testes de integração
