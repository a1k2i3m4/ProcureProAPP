'use strict';

// Простой логгер — оборачивает console с уровнями и временной меткой
const logger = {
  info:  (...args) => console.log(`[INFO]  ${new Date().toISOString()}`, ...args),
  warn:  (...args) => console.warn(`[WARN]  ${new Date().toISOString()}`, ...args),
  error: (...args) => console.error(`[ERROR] ${new Date().toISOString()}`, ...args),
  debug: (...args) => {
    if (process.env.DEBUG_SEARCH) console.log(`[DEBUG] ${new Date().toISOString()}`, ...args);
  },
};

module.exports = logger;

