# Guia de Configuração para Produção

## Variáveis de Ambiente Obrigatórias

Antes de iniciar o Docker em produção, configure as seguintes variáveis de ambiente:

### 1. Banco de Dados
```bash
DATABASE_URL=mysql://gabrieljsdb:@Aa016512@172.16.2.5:3306/gestaosys
```

### 2. JWT Secret (IMPORTANTE - Gere uma nova chave segura)
```bash
JWT_SECRET=$(openssl rand -base64 32)
```

### 3. Configurações da Aplicação
```bash
VITE_APP_TITLE=Painel Administrativo - Linha do Tempo OAB
VITE_APP_LOGO=https://seu-dominio.com/logo.png
OWNER_NAME=Nome do Responsável
```

## Como Usar com Docker

### Opção 1: Arquivo .env
Crie um arquivo `.env` na raiz do projeto com todas as variáveis:

```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
nano .env
```

### Opção 2: Variáveis de Ambiente do Sistema
```bash
export DATABASE_URL=mysql://gabrieljsdb:@Aa016512@172.16.2.5:3306/gestaosys
export JWT_SECRET=$(openssl rand -base64 32)
export VITE_APP_TITLE="Painel Administrativo - Linha do Tempo OAB"

docker compose up -d --build
```

### Opção 3: docker-compose com env_file
Edite o `docker-compose.yml` e adicione:

```yaml
services:
  app:
    env_file:
      - .env.production
```

## Iniciar o Projeto

```bash
# Extrair o ZIP
unzip oab-timeline-admin-completo-final.zip
cd oab-timeline-admin

# Configurar variáveis de ambiente
cp .env.example .env
nano .env  # Edite com suas configurações

# Iniciar com Docker
docker compose -f docker-compose-external-db.yml up -d --build

# Executar migrations
docker compose -f docker-compose-external-db.yml exec app pnpm db:push

# Verificar logs
docker compose -f docker-compose-external-db.yml logs -f app
```

## Verificar se está funcionando

```bash
# Acessar o container
docker compose -f docker-compose-external-db.yml exec app sh

# Dentro do container, testar a conexão
node -e "require('dotenv').config(); console.log('DATABASE_URL:', process.env.DATABASE_URL)"
```

## Troubleshooting

### Erro: "OWNER_NAME variable is not set"
**Solução:** Configure a variável no arquivo `.env` ou como variável de sistema antes de iniciar o Docker.

### Erro: "Connection refused" ao banco de dados
**Verificar:**
1. Se o IP 172.16.2.5 está acessível da rede do Docker
2. Se as credenciais estão corretas (gabrieljsdb / @Aa016512)
3. Se o banco `gestaosys` existe

```bash
# Testar conexão do container
docker compose -f docker-compose-external-db.yml exec app mysql -h 172.16.2.5 -u gabrieljsdb -p@Aa016512 gestaosys -e "SELECT 1"
```

### Erro: "Port 3000 already in use"
**Solução:** Mude a porta no `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"  # Acesse em http://localhost:8080
```

## Segurança em Produção

1. **Mude o JWT_SECRET**: Gere uma chave segura com `openssl rand -base64 32`
2. **Use HTTPS**: Configure um proxy reverso (nginx, Caddy) com SSL/TLS
3. **Senhas fortes**: Ao criar o primeiro admin, use uma senha com 12+ caracteres
4. **Backups**: Configure backups automáticos do banco de dados
5. **Logs**: Monitore os logs do container regularmente

## Próximos Passos

1. Acesse http://localhost:3000
2. Clique em "Acessar Painel"
3. Crie o primeiro administrador
4. Faça login e comece a gerenciar as gestões
