import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { handleLocalApiRequest } from './dbClient.ts';

// Intercept fetch calls globally to redirect /api/* to Firebase Firestore
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const url = typeof input === 'string' 
    ? input 
    : (input instanceof Request ? input.url : input.toString());
  if (url.includes('/api/')) {
    return await handleLocalApiRequest(url, init);
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
