import { zhCN } from '../../locales/zh-CN';
import { LogoutButton } from '../../features/auth/components/logout-button';
import { useAuthSession } from '../../features/auth/hooks/use-auth-session';
import styles from './home-page.module.css';

export function HomePage(): JSX.Element {
  const { user } = useAuthSession();

  return (
    <main className={styles.page} aria-labelledby="home-title">
      <section className={styles.card}>
        <div>
          <p className={styles.eyebrow}>{zhCN.app.brand}</p>
          <h1 id="home-title">{zhCN.app.name}</h1>
          <p className={styles.description}>
            {user?.display_name ?? zhCN.session.currentUser}（
            {user?.email ?? zhCN.session.unknownEmail}）
          </p>
        </div>
        <LogoutButton />
      </section>
    </main>
  );
}
