FROM node:18-alpine

WORKDIR /app

# Системные зависимости для Chromium (Playwright)
RUN apk add --no-cache \
    curl \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Playwright — пропускаем скачивание браузера, используем системный Chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Копируем манифесты отдельно для кеша
COPY package*.json ./

# ставим только prod-зависимости
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Проверяем что chromium доступен
RUN chromium-browser --version || chromium --version

COPY . .

ENV NODE_ENV=production

EXPOSE 5000

CMD ["npm", "start"]
