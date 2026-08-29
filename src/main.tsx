import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/app';
import './styles/global.css';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('找不到应用根节点');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
