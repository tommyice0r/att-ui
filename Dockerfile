# Etapa 1: Compilación de Frontend con Node y pnpm
FROM node:22-alpine AS build
WORKDIR /app

# Habilitar corepack para pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Argumentos para compilar variables de entorno tanto VITE_API_URL como VITE_ACCESS_API_URL
ARG VITE_API_URL=""
ARG VITE_ACCESS_API_URL=""
ARG VITE_HELPER_API_URL="http://localhost:7080"
ARG VITE_APP_NAME="ATT BOT"
ARG VITE_APP_VERSION="V6.1"
ARG VITE_APP_CODE="att-bot"

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ACCESS_API_URL=$VITE_ACCESS_API_URL
ENV VITE_HELPER_API_URL=$VITE_HELPER_API_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_APP_CODE=$VITE_APP_CODE

# Copiar código fuente y compilar
COPY . .
RUN pnpm build

# Etapa 2: Servidor Nginx ligero con inyección de variables en Runtime
FROM nginx:alpine AS final

# Copiar artefactos compilados
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Script de inicio para inyectar variables de entorno en runtime (Dokploy)
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
