import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { zhCN } from '../../../locales/zh-CN';
import { useAuthSession } from '../hooks/use-auth-session';

export function LogoutButton(): JSX.Element {
  const navigate = useNavigate();
  const { logout } = useAuthSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = async () => {
    setIsSubmitting(true);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <button type="button" disabled={isSubmitting} onClick={() => void handleLogout()}>
      {isSubmitting ? zhCN.session.loggingOut : zhCN.session.logout}
    </button>
  );
}
