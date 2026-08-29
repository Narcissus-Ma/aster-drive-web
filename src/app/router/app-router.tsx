import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';

import { zhCN } from '../../locales/zh-CN';
import {
  AuthSessionProvider,
  useAuthSession,
} from '../../features/auth/hooks/use-auth-session';
import { AppShell } from '../layouts/app-shell';
import { DrivePage } from '../../pages/drive-page/drive-page';
import { LoginPage } from '../../pages/login-page/login-page';

function ProtectedDrivePage(): JSX.Element {
  const { status } = useAuthSession();

  if (status === 'checking') {
    return (
      <main className="app-shell" aria-busy="true">
        <section className="welcome-card">
          <p className="eyebrow">{zhCN.app.brand}</p>
          <h1>{zhCN.app.name}</h1>
          <p className="welcome-copy">{zhCN.app.restoring}</p>
        </section>
      </main>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <DrivePage />
    </AppShell>
  );
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/', element: <ProtectedDrivePage /> },
  { path: '/drive/:folderId?', element: <ProtectedDrivePage /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function AppRouter(): JSX.Element {
  return (
    <AuthSessionProvider>
      <RouterProvider router={router} />
    </AuthSessionProvider>
  );
}
