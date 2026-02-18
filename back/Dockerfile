FROM node:18-alpine

WORKDIR /app

# Копируем манифесты отдельно для кеша (lock может отсутствовать в некоторых окружениях)
COPY package*.json ./

# ставим только prod-зависимости
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY . .

ENV NODE_ENV=production

EXPOSE 5000

CMD ["npm", "start"]
