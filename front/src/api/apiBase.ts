import axios, { AxiosInstance } from 'axios';

/**
 * Единый источник baseURL для API.
 *
 * В проде (docker + nginx) должно быть "/api" (запросы идут на тот же домен, nginx проксирует в backend).
 * В деве можно ходить напрямую на backend.
 */
export function getApiBaseUrl(): string {
  // Vite использует import.meta.env.*
  const viteUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

  // Пользователь просил REACT_APP_API_URL. В Vite такой переменной «из коробки» нет,
  // но мы можем поддержать её через VITE_REACT_APP_API_URL (см. .env.example) и читать здесь.
  const reactAppAlias = (import.meta.env.VITE_REACT_APP_API_URL as string | undefined)?.trim();

  const envUrl = viteUrl || reactAppAlias;
  if (envUrl) return envUrl;

  // fallback для разработки (как в задаче)
  return 'http://localhost:5000';
}

export const publicApi: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

