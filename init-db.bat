@echo off
REM Скрипт для инициализации PostgreSQL БД на Windows

echo.
echo 🔧 Инициализация PostgreSQL базы данных для ProcurePro...
echo.

REM Проверяем, запущен ли PostgreSQL
echo 🔍 Проверяю подключение к PostgreSQL...
psql -U postgres -h localhost -c "SELECT NOW();" > nul 2>&1

if errorlevel 1 (
    echo.
    echo ❌ PostgreSQL не подключен!
    echo.
    echo Убедитесь, что:
    echo   1. PostgreSQL установлен
    echo   2. PostgreSQL сервис запущен
    echo   3. Учётные данные корректные (postgres:postgres)
    echo.
    pause
    exit /b 1
)

echo ✅ PostgreSQL подключен
echo.

REM Создаём БД
echo 📝 Создаю базу данных 'procurepro'...
psql -U postgres -h localhost -c "CREATE DATABASE procurepro;" 2>nul

echo ✅ База данных создана или уже существует
echo.

REM Инициализируем таблицы
echo 📊 Создаю таблицы...
psql -U postgres -h localhost -d procurepro -f ./back/database/init.sql

if errorlevel 1 (
    echo.
    echo ❌ Ошибка при создании таблиц
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Таблицы созданы успешно
echo.

REM Проверяем таблицы
echo 🔍 Проверяю таблицы:
echo.
psql -U postgres -h localhost -d procurepro -c "\dt"

echo.
echo ✅ База данных успешно инициализирована!
echo.
echo Теперь вы можете запустить бэкенд:
echo   cd back
echo   npm run dev
echo.
pause
