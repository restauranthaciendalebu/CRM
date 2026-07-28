import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

async function bootstrap() {
  const root = createRoot(document.getElementById('root')!);
  const isDirectApi = import.meta.env.VITE_USE_FIRESTORE_DIRECT_API !== 'false' || (typeof window !== 'undefined' && window.location.hostname.includes('github.io'));
  const directClientPromise = isDirectApi
    ? import('./dbClient.ts')
    : null;

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  if (directClientPromise) {
    const { handleLocalApiRequest } = await directClientPromise;
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
}

void bootstrap();
