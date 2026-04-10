const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Токен отсутствует' });
        }

        // Используем общий секрет, как и в других сервисах (AuthService/Managers/Warehouse и т.д.)
        // Приоритет: JWT_ACCESS_SECRET, fallback: JWT_SECRET (для обратной совместимости)
        const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
        if (!secret) {
            return res.status(500).json({ message: 'JWT secret не настроен' });
        }

        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Токен истёк' });
        }
        return res.status(401).json({ message: 'Невалидный токен' });
    }
};

module.exports = authMiddleware;
