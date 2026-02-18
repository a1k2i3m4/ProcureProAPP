FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# ставим только prod-зависимости
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production

EXPOSE 5000

CMD ["npm", "start"]
