# ProcurePro SSO Integration

## Что изменилось

### 1. Frontend (React + TypeScript)
- ✅ Убраны роуты `/login` и `/register` (редиректы на `/`)
- ✅ SSO bootstrap в `AuthContext.tsx`:
  - Если есть `?sessionId=...` → обмен на JWT через `/api/auth/session/:sessionId`
  - Если нет токена и нет sessionId → редирект на `VITE_AUTH_LOGIN_URL`
- ✅ `ProtectedRoute` редиректит на централизованный логин
- ✅ `authApi.ts`: 401/refresh fail → редирект на `VITE_AUTH_LOGIN_URL`
- ✅ Logout → редирект на централизованный логин

### 2. Backend (Node.js + Express)
- ✅ Middleware `authMiddleware.js` теперь использует `JWT_ACCESS_SECRET` (с fallback на `JWT_SECRET`)
- ✅ Совместим с токенами AuthService

### 3. AuthService Integration
- ✅ Добавлен `procurepro` в список валидных приложений для preview-session
- ✅ Добавлена логика `buildPreviewPayloads` для procurepro
- ✅ Добавлен redirect URL mapping: `PROCUREPRO_FRONTEND_URL`
- ✅ Добавлена иконка 🛒 ProcurePro в APP_META фронтенда AuthService

### 4. Docker & Nginx
- ✅ Добавлены сервисы в `docker-compose.yml`:
  - `procurepro-postgres` (порт 5439)
  - `procurepro-backend` (порт 5001)
  - `procurepro-frontend`
- ✅ Добавлены маршруты в nginx:
  - `/procurepro/` → `procurepro-frontend:80`
  - `/api-procurepro/` → `procurepro-backend:5001`

## Переменные окружения

### Backend (.env.docker)
```env
PORT=5001
DB_HOST=procurepro-postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=123456qwerty
DB_NAME=procurepro

# Из .env.shared:
JWT_ACCESS_SECRET=<общий секрет с AuthService>
```

### Frontend (build args в docker-compose.yml)
```yaml
args:
  VITE_BASE_PATH: /procurepro/
  VITE_AUTH_LOGIN_URL: https://manager.cucrm.kz
  VITE_AUTH_SERVICE_URL: https://manager.cucrm.kz
```

## Production Deployment

1. Переключить `.env.shared` в режим PRODUCTION (раскомментировать production URLs)
2. Убедиться, что `JWT_ACCESS_SECRET` одинаковый в AuthService и ProcurePro
3. Запустить миграции БД (если нужно):
   ```bash
   docker-compose exec procurepro-backend npm run migrate
   ```
4. Пересобрать и запустить:
   ```bash
   docker-compose up -d --build procurepro-postgres procurepro-backend procurepro-frontend gateway
   ```

## Доступ

- **Локально**: http://localhost/procurepro/
- **Production**: https://manager.cucrm.kz/procurepro/

## Preview Admin

Preview Admin может переключаться в ProcurePro через picker в AuthService:
- Логин как Preview Admin → выбрать "ProcurePro" из списка приложений
- Откроется ProcurePro с preview-флагом (данные не сохраняются)

