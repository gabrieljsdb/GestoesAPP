# Guia de Deployment com Docker

Este projeto pode ser facilmente containerizado e deployado usando Docker e Docker Compose.

## Pré-requisitos

- Docker 20.10+
- Docker Compose 2.0+

## Estrutura de Containers

O projeto utiliza dois containers:

1. **MySQL Database** - Banco de dados MySQL 8.0
2. **Application** - Aplicação Node.js com React + Express

## Configuração Rápida

### 1. Preparar variáveis de ambiente

Copie o arquivo de exemplo e configure as variáveis necessárias:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Database
DATABASE_URL=mysql://oab_user:oab_password@db:3306/oab_timeline
MYSQL_PASSWORD=oab_password

# OAuth (obrigatório)
VITE_APP_ID=seu-app-id
OWNER_OPEN_ID=seu-owner-id
OWNER_NAME=Seu Nome

# API Keys
BUILT_IN_FORGE_API_KEY=sua-api-key
VITE_FRONTEND_FORGE_API_KEY=sua-frontend-api-key
```

### 2. Construir e iniciar os containers

```bash
# Build das imagens
docker-compose build

# Iniciar os containers
docker-compose up -d

# Verificar status
docker-compose ps
```

### 3. Executar migrations do banco de dados

```bash
# Acessar o container da aplicação
docker-compose exec app pnpm db:push
```

### 4. Acessar a aplicação

A aplicação estará disponível em: `http://localhost:3000`

## Comandos Úteis

### Logs

```bash
# Ver logs de todos os containers
docker-compose logs -f

# Ver logs apenas da aplicação
docker-compose logs -f app

# Ver logs apenas do banco de dados
docker-compose logs -f db
```

### Gerenciamento

```bash
# Parar os containers
docker-compose down

# Remover volumes (cuidado: deleta dados do banco)
docker-compose down -v

# Reiniciar os containers
docker-compose restart

# Reconstruir as imagens
docker-compose build --no-cache
```

### Acesso ao banco de dados

```bash
# Conectar ao MySQL
docker-compose exec db mysql -u oab_user -p oab_timeline

# Fazer backup
docker-compose exec db mysqldump -u oab_user -p oab_timeline > backup.sql

# Restaurar backup
docker-compose exec -T db mysql -u oab_user -p oab_timeline < backup.sql
```

## Deployment em Produção

### 1. Configurações de Segurança

Para produção, altere as seguintes variáveis no `.env`:

```env
NODE_ENV=production
JWT_SECRET=uma-chave-muito-secreta-e-aleatoria
MYSQL_ROOT_PASSWORD=uma-senha-forte-para-root
MYSQL_PASSWORD=uma-senha-forte-para-usuario
```

### 2. Usar um reverse proxy (Nginx)

Crie um arquivo `nginx.conf`:

```nginx
upstream app {
    server app:3000;
}

server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Adicione ao `docker-compose.yml`:

```yaml
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
  volumes:
    - ./nginx.conf:/etc/nginx/conf.d/default.conf
  depends_on:
    - app
```

### 3. SSL/TLS com Let's Encrypt

Use Certbot com Docker:

```bash
docker run -it --rm --name certbot \
  -v "/etc/letsencrypt:/etc/letsencrypt" \
  -v "/var/lib/letsencrypt:/var/lib/letsencrypt" \
  certbot/certbot certonly --standalone \
  -d seu-dominio.com
```

## Troubleshooting

### Erro: "Cannot connect to database"

Verifique se o container MySQL está rodando:
```bash
docker-compose ps db
```

Aguarde alguns segundos para o MySQL inicializar completamente.

### Erro: "Port already in use"

Altere as portas no `docker-compose.yml`:
```yaml
ports:
  - "3307:3306"  # MySQL em porta diferente
  - "3001:3000"  # App em porta diferente
```

### Erro: "EACCES: permission denied"

Se encontrar erros de permissão, execute com sudo:
```bash
sudo docker-compose up -d
```

## Monitoramento

### Health Check

O container da aplicação inclui um health check automático. Para verificar:

```bash
docker-compose ps
# Procure por "healthy" na coluna STATUS
```

### Métricas

Para monitorar recursos dos containers:

```bash
docker stats
```

## Backup e Restore

### Backup automático

Crie um script `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

docker-compose exec -T db mysqldump \
  -u oab_user -p${MYSQL_PASSWORD} \
  oab_timeline > $BACKUP_DIR/backup_$TIMESTAMP.sql

echo "Backup criado: $BACKUP_DIR/backup_$TIMESTAMP.sql"
```

Execute com cron:
```bash
0 2 * * * /path/to/backup.sh
```

## Performance

### Otimizações recomendadas

1. **Aumentar limites de memória** no `docker-compose.yml`:
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

2. **Usar volumes nomeados** para melhor performance:
```yaml
volumes:
  mysql_data:
    driver: local
    driver_opts:
      type: tmpfs
      device: tmpfs
```

3. **Habilitar compressão** no MySQL:
```yaml
environment:
  MYSQL_INIT_COMMAND: "SET GLOBAL max_connections=1000;"
```

## Suporte

Para mais informações sobre Docker, consulte:
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MySQL Docker Image](https://hub.docker.com/_/mysql)
