import type { PropsWithChildren, ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { zhCN } from '../../locales/zh-CN';
import { LogoutButton } from '../../features/auth/components/logout-button';
import { GlobalSearch } from '../../features/search/components/global-search';
import styles from './app-shell.module.css';

export interface AppShellProps extends PropsWithChildren {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps): JSX.Element {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.brand}>{zhCN.app.brand}</p>
          <strong>{zhCN.app.name}</strong>
        </div>
        <GlobalSearch />
        <LogoutButton />
      </header>
      <div className={styles.body}>
        <nav className={styles.nav} aria-label="主导航">
          <Link to="/drive">我的文件</Link>
          <Link to="/shared">与我共享</Link>
          <Link to="/favorites">我的收藏</Link>
          <Link to="/recent">最近使用</Link>
          <Link to="/trash">回收站</Link>
        </nav>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
