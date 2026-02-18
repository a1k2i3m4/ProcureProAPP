#!/bin/bash

# Скрипт для инициализации PostgreSQL БД

echo "🔧 Инициализация PostgreSQL базы данных для ProcurePro..."

# Проверяем, установлен ли PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL не установлен!"
    echo "Установите PostgreSQL через Homebrew:"
    echo "  brew install postgresql"
    exit 1
fi

# Проверяем, запущен ли PostgreSQL сервис
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ PostgreSQL не запущен!"
    echo "Запустите PostgreSQL через Homebrew:"
    echo "  brew services start postgresql"
    exit 1
fi

echo "✅ PostgreSQL запущен"

# Создаём БД
echo "📝 Создаём базу данных 'procurepro'..."
psql -U postgres -h localhost -c "CREATE DATABASE procurepro;" 2>/dev/null

if [ $? -eq 0 ] || psql -U postgres -h localhost -d procurepro -c "\d" > /dev/null 2>&1; then
    echo "✅ База данных создана или уже существует"
else
    echo "❌ Ошибка при создании БД"
    exit 1
fi

# Инициализируем таблицы
echo "📊 Создаём таблицы..."
psql -U postgres -h localhost -d procurepro -f ./back/database/init.sql

if [ $? -eq 0 ]; then
    echo "✅ Таблицы созданы успешно"
else
    echo "❌ Ошибка при создании таблиц"
    exit 1
fi

# Проверяем таблицы
echo "🔍 Проверяем таблицы..."
psql -U postgres -h localhost -d procurepro -c "\dt"

echo ""
echo "✅ База данных успешно инициализирована!"
echo ""
echo "Теперь вы можете запустить бэкенд:"
echo "  cd back && npm run dev"
