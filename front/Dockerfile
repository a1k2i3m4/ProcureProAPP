# build stage
FROM node:18-alpine AS build

WORKDIR /app

# Vite env variables are injected at build-time
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Для кеша зависимостей (lock может отсутствовать в некоторых окружениях)
COPY package*.json ./

RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build

# runtime stage
FROM nginx:1.27-alpine

# Nginx config (SPA + /api proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# static assets
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
