const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Генерирование JWT токена
const generateToken = (userId, email, username) => {
    return jwt.sign(
        { id: userId, email, username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
    );
};

// Генерирование Refresh токена
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRE }
    );
};

// Регистрация
exports.register = async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;

        // Валидация входных данных
        if (!username || !email || !password || !confirmPassword) {
            return res.status(400).json({
                message: 'Пожалуйста, заполните все поля'
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                message: 'Пароли не совпадают'
            });
        }

        if (password.length < 4) {
            return res.status(400).json({
                message: 'Пароль должен быть не менее 4 символов'
            });
        }

        // Проверяем, существует ли пользователь
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: 'Пользователь с таким email или именем уже существует'
            });
        }

        // Хешируем пароль
        const hashedPassword = await bcrypt.hash(password, 10);

        // Создаём пользователя
        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, role',
            [username, email, hashedPassword]
        );

        const user = result.rows[0];

        // Генерируем токены
        const token = generateToken(user.id, user.email, user.username);
        const refreshToken = generateRefreshToken(user.id);

        // Сохраняем refresh token в БД
        await pool.query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 days\')',
            [user.id, refreshToken]
        );

        res.status(201).json({
            data: {
                token,
                refreshToken,
                user: {
                    id: user.id.toString(),
                    username: user.username,
                    email: user.email,
                    role: user.role
                },
                expiresIn: 3600
            },
            message: 'Пользователь успешно зарегистрирован'
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            message: 'Ошибка при регистрации'
        });
    }
};

// Вход
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Валидация
        if (!email || !password) {
            return res.status(400).json({
                message: 'Пожалуйста, введите email и пароль'
            });
        }

        // Ищем пользователя по email или username
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 OR username = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: 'Неверный email/логин или пароль'
            });
        }

        const user = result.rows[0];

        // Проверяем пароль
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({
                message: 'Неверный email/логин или пароль'
            });
        }

        // Генерируем токены
        const token = generateToken(user.id, user.email, user.username);
        const refreshToken = generateRefreshToken(user.id);

        // Сохраняем refresh token в БД
        await pool.query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 days\')',
            [user.id, refreshToken]
        );

        res.json({
            data: {
                token,
                refreshToken,
                user: {
                    id: user.id.toString(),
                    username: user.username,
                    email: user.email,
                    role: user.role
                },
                expiresIn: 3600
            },
            message: 'Успешный вход'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            message: 'Ошибка при входе'
        });
    }
};

// Получение профиля
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            'SELECT id, username, email, role FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Пользователь не найден'
            });
        }

        const user = result.rows[0];
        res.json({
            data: {
                id: user.id.toString(),
                username: user.username,
                email: user.email,
                role: user.role
            },
            message: 'Профиль получен'
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            message: 'Ошибка при получении профиля'
        });
    }
};

// Обновление профиля
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { username, email } = req.body;

        if (!username && !email) {
            return res.status(400).json({
                message: 'Нечего обновлять'
            });
        }

        let query = 'UPDATE users SET ';
        let params = [];
        let paramIndex = 1;

        if (username) {
            query += `username = $${paramIndex}, `;
            params.push(username);
            paramIndex++;
        }

        if (email) {
            query += `email = $${paramIndex}, `;
            params.push(email);
            paramIndex++;
        }

        query += `updated_at = NOW() WHERE id = $${paramIndex} RETURNING id, username, email, role`;
        params.push(userId);

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Пользователь не найден'
            });
        }

        const user = result.rows[0];
        res.json({
            data: {
                id: user.id.toString(),
                username: user.username,
                email: user.email,
                role: user.role
            },
            message: 'Профиль обновлен'
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            message: 'Ошибка при обновлении профиля'
        });
    }
};

// Refresh token
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                message: 'Refresh token отсутствует'
            });
        }

        // Проверяем refresh token в БД
        const tokenResult = await pool.query(
            'SELECT user_id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
            [refreshToken]
        );

        if (tokenResult.rows.length === 0) {
            return res.status(401).json({
                message: 'Refresh token истёк или невалиден'
            });
        }

        // Проверяем подпись токена
        try {
            jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch {
            return res.status(401).json({
                message: 'Невалидный refresh token'
            });
        }

        const userId = tokenResult.rows[0].user_id;

        // Получаем данные пользователя
        const userResult = await pool.query(
            'SELECT id, username, email, role FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                message: 'Пользователь не найден'
            });
        }

        const user = userResult.rows[0];

        // Генерируем новый токен
        const newToken = generateToken(user.id, user.email, user.username);
        const newRefreshToken = generateRefreshToken(user.id);

        // Удаляем старый refresh token
        await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);

        // Сохраняем новый refresh token
        await pool.query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 days\')',
            [userId, newRefreshToken]
        );

        res.json({
            data: {
                token: newToken,
                refreshToken: newRefreshToken,
                user: {
                    id: user.id.toString(),
                    username: user.username,
                    email: user.email,
                    role: user.role
                },
                expiresIn: 3600
            },
            message: 'Токен обновлён'
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({
            message: 'Ошибка при обновлении токена'
        });
    }
};

// Выход
exports.logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
        }

        res.json({ message: 'Вышли успешно' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            message: 'Ошибка при выходе'
        });
    }
};
