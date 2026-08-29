import { useState, type FormEvent } from 'react';

import { zhCN } from '../../../locales/zh-CN';
import type { LoginRequest } from '../../../shared/api/generated/openapi';
import { useAuthSession } from '../hooks/use-auth-session';
import styles from './login-form.module.css';

export interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps): JSX.Element {
  const { error: sessionError, login } = useAuthSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const payload: LoginRequest = { email, password };
    try {
      await login(payload);
      onSuccess?.();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : zhCN.auth.loginFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleError = formError ?? sessionError?.message ?? null;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate={false}>
      <div className={styles.field}>
        <label htmlFor="login-email">{zhCN.auth.email}</label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={zhCN.auth.emailPlaceholder}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="login-password">{zhCN.auth.password}</label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder={zhCN.auth.passwordPlaceholder}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {visibleError !== null ? (
        <p className={styles.error} role="alert">
          {visibleError}
        </p>
      ) : null}
      <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
        {isSubmitting ? zhCN.auth.loggingIn : zhCN.auth.login}
      </button>
    </form>
  );
}
