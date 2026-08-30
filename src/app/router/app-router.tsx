import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';

import { zhCN } from '../../locales/zh-CN';
import {
  AuthSessionProvider,
  useAuthSession,
} from '../../features/auth/hooks/use-auth-session';
import { AppShell } from '../layouts/app-shell';
import { DrivePage } from '../../pages/drive-page/drive-page';
import { LoginPage } from '../../pages/login-page/login-page';
import { TrashPage } from '../../features/trash/components/trash-page';
import { SystemViewPage } from '../../features/system-views/components/system-view-page';
import type { SystemViewKind } from '../../features/system-views/system-views';

interface ProtectedPageProps {
  children: JSX.Element;
}

function ProtectedPage({ children }: ProtectedPageProps): JSX.Element {
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

  return <AppShell>{children}</AppShell>;
}

function ProtectedDrivePage(): JSX.Element {
  return (
    <ProtectedPage>
      <DrivePage />
    </ProtectedPage>
  );
}

function ProtectedTrashPage(): JSX.Element {
  return (
    <ProtectedPage>
      <TrashPage />
    </ProtectedPage>
  );
}

function ProtectedSystemViewPage({ view }: { view: SystemViewKind }): JSX.Element {
  return (
    <ProtectedPage>
      <SystemViewPage view={view} />
    </ProtectedPage>
  );
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/', element: <ProtectedDrivePage /> },
  { path: '/drive/:folderId?', element: <ProtectedDrivePage /> },
  {
    path: '/favorites',
    element: <ProtectedSystemViewPage view="favorites" />,
  },
  { path: '/recent', element: <ProtectedSystemViewPage view="recent" /> },
  { path: '/trash', element: <ProtectedTrashPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function AppRouter(): JSX.Element {
  return (
    <AuthSessionProvider>
      <RouterProvider router={router} />
    </AuthSessionProvider>
  );
}
