#!/bin/sh
set -e

# Extraer URLs desde variables de entorno inyectadas por Dokploy / Docker
API_URL="${VITE_API_URL:-${VITE_ACCESS_API_URL:-}}"
HELPER_URL="${VITE_HELPER_API_URL:-http://localhost:7080}"

# Generar archivo runtime env-config.js
cat <<EOF > /usr/share/nginx/html/env-config.js
window.__ENV__ = {
  VITE_API_URL: "${API_URL}",
  VITE_ACCESS_API_URL: "${API_URL}",
  VITE_HELPER_API_URL: "${HELPER_URL}"
};
EOF

exec "$@"
