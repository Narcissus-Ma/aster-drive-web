import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AppRouter } from './router/app-router';
import { ErrorBoundary } from '../shared/observability/error-boundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

export function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppRouter />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
