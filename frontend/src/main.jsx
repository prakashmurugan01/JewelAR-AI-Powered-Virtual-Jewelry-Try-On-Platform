import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('main.jsx: Starting React render...');

try {
  const root = document.getElementById('root');
  console.log('main.jsx: Found root element', root);
  
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log('main.jsx: React render completed');
} catch (err) {
  console.error('main.jsx: Error during render', err);
  document.getElementById('root').innerHTML = `<div style="color: red; padding: 20px;"><h1>Error loading app:</h1><pre>${err.message}</pre></div>`;
}
