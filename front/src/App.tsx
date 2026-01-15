import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [backendStatus, setBackendStatus] = useState<string>('Checking...');
  const [timestamp, setTimestamp] = useState<string>('');

  useEffect(() => {
    // Проверяем соединение с бэкендом
    fetch('http://localhost:5000/api/health')
      .then(response => response.json())
      .then(data => {
        setBackendStatus('Connected');
        setTimestamp(new Date().toLocaleTimeString());
      })
      .catch(() => {
        setBackendStatus('Not connected');
        setTimestamp(new Date().toLocaleTimeString());
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full mx-auto p-6 md:p-8 bg-white rounded-2xl shadow-2xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            🚀 Docker + React + Node.js
          </h1>
          <p className="text-gray-600 text-lg">
            Полноценный проект с фронтендом и бэкендом в Docker контейнерах
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <span className="mr-3">⚛️</span> Фронтенд
            </h2>
            <ul className="space-y-3">
              <li className="flex items-center">
                <div className="w-3 h-3 bg-white rounded-full mr-3"></div>
                React 18 with TypeScript
              </li>
              <li className="flex items-center">
                <div className="w-3 h-3 bg-white rounded-full mr-3"></div>
                Tailwind CSS для стилей
              </li>
              <li className="flex items-center">
                <div className="w-3 h-3 bg-white rounded-full mr-3"></div>
                Docker контейнер
              </li>
              <li className="flex items-center">
                <div className="w-3 h-3 bg-white rounded-full mr-3"></div>
                Порт: <span className="ml-2 px-2 py-1 bg-blue-700 rounded text-sm">3000</span>
              </li>
            </ul>
          </div>
          
          <div className="p-6 bg-gradient-to-r from-green-500 to-green-600 rounded-xl text-white transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <span className="mr-3">🔧</span> Бэкенд
            </h2>
            <ul className="space-y-3">
              <li className="flex items-center">
                <div className="w-3 h-3 bg-white rounded-full mr-3"></div>
                Node.js + Express
              </li>
              <li className="flex items-center">
                <div className="w-3 h-3 bg-white rounded-full mr-3"></div>
                CORS enabled
              </li>
              <li className="flex items-center">
                <div className="w-3 h-3 bg-white rounded-full mr-3"></div>
                Docker контейнер
              </li>
              <li className="flex items-center">
                <div className="w-3 h-3 bg-white rounded-full mr-3"></div>
                Порт: <span className="ml-2 px-2 py-1 bg-green-700 rounded text-sm">5000</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mb-8">
          <div className={`p-6 rounded-xl ${backendStatus === 'Connected' ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className={`w-4 h-4 rounded-full mr-3 ${backendStatus === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`}></span>
              Статус соединения с бэкендом
            </h3>
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <p className={`text-2xl font-bold ${backendStatus === 'Connected' ? 'text-green-600' : 'text-red-600'}`}>
                  {backendStatus}
                </p>
                <p className="text-gray-600 text-sm mt-1">Последняя проверка: {timestamp}</p>
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 md:mt-0 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 font-medium"
              >
                Проверить снова
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">📋 Команды для терминала</h3>
          <div className="space-y-3 font-mono text-sm">
            <div className="flex items-start">
              <span className="text-green-600 mr-2">$</span>
              <code className="bg-gray-800 text-gray-100 px-4 py-2 rounded w-full block">
                docker-compose up --build
              </code>
            </div>
            <p className="text-gray-600 ml-6">Запустить проект в Docker</p>
            
            <div className="flex items-start">
              <span className="text-green-600 mr-2">$</span>
              <code className="bg-gray-800 text-gray-100 px-4 py-2 rounded w-full block">
                docker-compose down
              </code>
            </div>
            <p className="text-gray-600 ml-6">Остановить проект</p>
            
            <div className="flex items-start">
              <span className="text-green-600 mr-2">$</span>
              <code className="bg-gray-800 text-gray-100 px-4 py-2 rounded w-full block">
                docker-compose logs -f
              </code>
            </div>
            <p className="text-gray-600 ml-6">Показать логи контейнеров</p>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-300">
            <div className="flex flex-wrap gap-4">
              <a 
                href="http://localhost:3000" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 font-medium"
              >
                🔗 Фронтенд (localhost:3000)
              </a>
              <a 
                href="http://localhost:5000" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-300 font-medium"
              >
                🔗 Бэкенд (localhost:5000)
              </a>
              <a 
                href="http://localhost:5000/api/health" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-300 font-medium"
              >
                🔗 Health Check API
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="mt-10 text-center text-gray-600">
        <p>Проект создан с использованием Docker, React (TypeScript + Tailwind) и Node.js</p>
        <p className="text-sm mt-2">Все контейнеры запускаются через docker-compose</p>
      </footer>
    </div>
  );
}

export default App;
