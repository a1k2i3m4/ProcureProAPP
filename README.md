# ProcurePro - Dockerized React + Node.js Application

Проект с фронтендом на React (TypeScript + Tailwind CSS) и бэкендом на Node.js, запускаемый в Docker контейнерах.

## 🚀 Быстрый старт

### Предварительные требования
- Docker / Docker Compose

### Установка и запуск

```bash
docker compose up -d --build
```

### Порты
- Frontend: http://localhost:5174
- Backend API: http://localhost:5001
- Postgres (host порт): localhost:5434 (внутри docker-сети: 5432)
