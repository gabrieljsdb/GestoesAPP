# Configuração do Banco de Dados Externo

Este projeto foi configurado para usar um banco de dados MySQL externo.

## Informações de Conexão

- **Host**: 172.16.2.5
- **Usuário**: gabrieljsdb
- **Senha**: @Aa016512
- **Banco de dados**: gestaosys
- **Porta**: 3306 (padrão)

## String de Conexão

```
mysql://gabrieljsdb:@Aa016512@172.16.2.5:3306/gestaosys
```

## Configuração Inicial

### 1. Criar as tabelas no banco de dados

Execute as migrations do Drizzle para criar as tabelas necessárias:

```bash
# Em desenvolvimento
pnpm db:push

# Com Docker
docker-compose exec app pnpm db:push
```

### 2. Variáveis de Ambiente

A conexão está configurada por padrão no `docker-compose.yml` e será usada automaticamente.

Se precisar alterar a conexão, você pode:

**Opção 1: Variável de ambiente**
```bash
export DATABASE_URL="mysql://gabrieljsdb:@Aa016512@172.16.2.5:3306/gestaosys"
pnpm dev
```

**Opção 2: Arquivo .env**
```env
DATABASE_URL=mysql://gabrieljsdb:@Aa016512@172.16.2.5:3306/gestaosys
```

**Opção 3: Docker Compose**
```bash
docker-compose up -d
```

## Estrutura das Tabelas

O projeto cria automaticamente as seguintes tabelas:

### `users`
- Tabela de usuários com autenticação OAuth
- Campos: id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn

### `gestoes`
- Tabela de gestões (períodos de administração)
- Campos: id, period, startActive, displayOrder, createdAt, updatedAt

### `members`
- Tabela de membros de cada gestão
- Campos: id, gestaoId, name, displayOrder, createdAt, updatedAt

## Verificar Conexão

Para verificar se a conexão está funcionando:

```bash
# Testar conexão
mysql -h 172.16.2.5 -u gabrieljsdb -p@Aa016512 -D gestaosys -e "SELECT 1;"

# Ou com Docker
docker-compose exec app node -e "
  const mysql = require('mysql2/promise');
  mysql.createConnection({
    host: '172.16.2.5',
    user: 'gabrieljsdb',
    password: '@Aa016512',
    database: 'gestaosys'
  }).then(() => console.log('✓ Conexão OK')).catch(e => console.log('✗ Erro:', e.message));
"
```

## Backup e Restore

### Fazer backup do banco

```bash
mysqldump -h 172.16.2.5 -u gabrieljsdb -p@Aa016512 gestaosys > backup.sql
```

### Restaurar backup

```bash
mysql -h 172.16.2.5 -u gabrieljsdb -p@Aa016512 gestaosys < backup.sql
```

## Troubleshooting

### Erro: "Access denied for user 'gabrieljsdb'"

Verifique:
1. Host está correto: 172.16.2.5
2. Usuário está correto: gabrieljsdb
3. Senha está correta: @Aa016512
4. Banco existe: gestaosys

### Erro: "Can't connect to MySQL server"

Verifique:
1. O servidor MySQL está rodando
2. A porta 3306 está acessível
3. Firewall permite conexão
4. Rede está configurada corretamente

### Erro: "Unknown database 'gestaosys'"

Execute:
```bash
mysql -h 172.16.2.5 -u gabrieljsdb -p@Aa016512 -e "CREATE DATABASE IF NOT EXISTS gestaosys;"
```

## Segurança

⚠️ **IMPORTANTE**: As credenciais estão expostas neste arquivo. Para produção:

1. Use variáveis de ambiente seguras
2. Não commite credenciais no Git
3. Use um gerenciador de secrets (AWS Secrets Manager, Vault, etc.)
4. Altere a senha do usuário no banco de dados
5. Restrinja acesso por IP no firewall

## Próximos Passos

1. Executar migrations: `pnpm db:push`
2. Iniciar a aplicação: `pnpm dev` ou `docker-compose up -d`
3. Acessar em: http://localhost:3000
4. Fazer login com sua conta Manus OAuth
5. Acessar o painel administrativo em: http://localhost:3000/admin
