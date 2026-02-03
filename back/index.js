require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/database');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Инициализация БД - создание таблиц при старте
async function initializeDatabase() {
    try {
        // Читаем SQL команды
        const fs = require('fs').promises;
        const path = require('path');
        const initSQL = await fs.readFile(path.join(__dirname, './database/init.sql'), 'utf-8');

        // Выполняем каждую команду
        const commands = initSQL.split(';').filter(cmd => cmd.trim());
        for (const command of commands) {
            await pool.query(command);
        }
        console.log('✅ База данных инициализирована');
    } catch (error) {
        console.error('❌ Ошибка инициализации БД:', error.message);
    }
}

// Проверка подключения к БД
async function checkDatabaseConnection() {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('✅ Подключение к БД успешно');
        return true;
    } catch (error) {
        console.error('❌ Ошибка подключения к БД:', error.message);
        console.log('⚠️  Убедитесь, что PostgreSQL запущена и данные в .env верные');
        return false;
    }
}

// Маршруты
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
    res.json({
        message: 'Backend запущен!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', service: 'backend' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({
        message: 'Ошибка сервера',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Запуск сервера
async function startServer() {
    const isConnected = await checkDatabaseConnection();

    if (isConnected) {
        await initializeDatabase();
    }

    app.listen(PORT, () => {
        console.log(`🚀 Backend сервер запущен на порту ${PORT}`);
        console.log(`📱 API URL: http://localhost:${PORT}`);
        console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? '✓ установлен' : '✗ не установлен'}`);
    });
}

startServer();

