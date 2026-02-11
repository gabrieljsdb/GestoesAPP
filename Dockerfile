# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# Instala pnpm
RUN npm install -g pnpm

# Copia arquivos de dependência
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Instala TODAS as dependências
# MUDANÇA AQUI: Removido "--frozen-lockfile" para permitir que o pnpm atualize o lockfile
RUN pnpm install

# Copia código fonte
COPY . .

# Roda o build
RUN pnpm build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Instala pnpm
RUN npm install -g pnpm

# Copia arquivos de package do builder (O lockfile virá atualizado do builder)
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/patches ./patches

# Instala dependências de produção
# MUDANÇA AQUI: Pode manter sem o frozen também por segurança nesta etapa
RUN pnpm install --prod

# Copia a aplicação compilada
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle

# Expõe a porta
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

# Inicia
CMD ["node", "dist/index.js"]