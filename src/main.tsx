import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

async function bootstrap() {
  if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === 'true') {
    const { handleLocalApiRequest } = await import('./dbClient.ts');
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
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
