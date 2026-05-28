import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { api } from './api/client';
import { startSse } from './api/sse';

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5_000, refetchOnWindowFocus: false },
  },
});

// Gate live updates on the backend's refresh mode. A 'manual' spec runs no
// SSE plugin server-side (see server.ts), so the frontend must not open an
// EventSource against it; it relies on TanStack Query refetch instead.
// Default to live when /api/spec is unreachable or omits the field.
void api
  .spec()
  .then((s) => {
    if (!s || s.refresh !== 'manual') startSse(qc);
  })
  .catch(() => startSse(qc));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
