import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Registro del Service Worker para soporte PWA offline y Web Push
if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development-bypass') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[UniLink PWA] Service Worker registrado exitosamente con scope:', registration.scope);
      })
      .catch((error) => {
        console.warn('[UniLink PWA] Error al registrar Service Worker:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
