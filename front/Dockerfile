# build stage
FROM node:18-alpine AS build

WORKDIR /app

# Для кеша зависимостей (lock может отсутствовать в некоторых окружениях)
COPY procurepro-app/front/package*.json ./

RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY procurepro-app/front/ ./
COPY .env.shared /tmp/.env.shared

RUN FRONTEND_URL="$(grep '^FRONTEND_URL=' /tmp/.env.shared | cut -d= -f2- | tr -d '\r')" \
 && export VITE_API_URL="/api-procurepro" \
 && export VITE_BASE_PATH="/procurepro/" \
 && export VITE_AUTH_LOGIN_URL="${FRONTEND_URL}" \
 && export VITE_AUTH_SERVICE_URL="${FRONTEND_URL}" \
 && npm run build

# runtime stage
FROM nginx:1.27-alpine

# Nginx config (SPA + /api proxy)
COPY procurepro-app/front/nginx.conf /etc/nginx/conf.d/default.conf

# static assets
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
