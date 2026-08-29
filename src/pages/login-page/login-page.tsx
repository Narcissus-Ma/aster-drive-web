import { Navigate, useNavigate } from 'react-router-dom';

import { zhCN } from '../../locales/zh-CN';
import { LoginForm } from '../../features/auth/components/login-form';
import { useAuthSession } from '../../features/auth/hooks/use-auth-session';
import styles from './login-page.module.css';

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const { status } = useAuthSession();

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return (
    <main className={styles.page} aria-labelledby="login-title">
      <section className={styles.card}>
        <p className={styles.eyebrow}>{zhCN.app.brand}</p>
        <h1 id="login-title">{zhCN.auth.loginTitle}</h1>
        <p className={styles.description}>{zhCN.auth.loginDescription}</p>
        <LoginForm onSuccess={() => navigate('/', { replace: true })} />
      </section>
    </main>
  );
}
