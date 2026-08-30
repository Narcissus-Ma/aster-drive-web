import { useCallback, useState } from 'react';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import { useSharing } from '../hooks/use-sharing';
import { MemberList } from './member-list';
import { PublicLinkPanel } from './public-link-panel';
import styles from './sharing-dialog.module.css';

export interface ShareDialogProps {
  onClose: () => void;
  open: boolean;
  resource: ResourceResponse | null;
}

export function ShareDialog({
  onClose,
  open,
  resource,
}: ShareDialogProps): JSX.Element | null {
  const resourceId = open ? (resource?.id ?? null) : null;
  const canShare = resource?.capabilities?.can_share === true;
  const sharing = useSharing(resourceId, open && canShare);
  const [granteeUserId, setGranteeUserId] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = useCallback(async () => {
    const normalizedUserId = granteeUserId.trim();
    if (!normalizedUserId) return;
    setIsInviting(true);
    try {
      await sharing.createMember({ grantee_user_id: normalizedUserId, role });
      setGranteeUserId('');
    } finally {
      setIsInviting(false);
    }
  }, [granteeUserId, role, sharing]);

  if (!open || resource === null) return null;

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="share-dialog-title"
        aria-modal="true"
        className={styles.dialog}
        role="dialog"
      >
        <header className={styles.header}>
          <div>
            <p className={styles.muted}>共享资源</p>
            <h2 id="share-dialog-title">{resource.name}</h2>
          </div>
          <button type="button" onClick={onClose}>
            关闭
          </button>
        </header>
        {sharing.isLoading ? <p role="status">正在加载共享设置…</p> : null}
        {sharing.error ? <p role="alert">加载共享设置失败，请稍后重试</p> : null}
        {canShare ? (
          <section aria-labelledby="share-invite-title">
            <h3 id="share-invite-title">邀请成员</h3>
            <div className={styles.inviteRow}>
              <label>
                <span className={styles.srOnly}>成员用户 ID</span>
                <input
                  aria-label="成员用户 ID"
                  placeholder="请输入成员用户 ID"
                  value={granteeUserId}
                  onChange={(event) => setGranteeUserId(event.target.value)}
                />
              </label>
              <label>
                <span className={styles.srOnly}>成员权限</span>
                <select
                  aria-label="成员权限"
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value as 'viewer' | 'editor')
                  }
                >
                  <option value="viewer">查看</option>
                  <option value="editor">编辑</option>
                </select>
              </label>
              <button
                type="button"
                disabled={isInviting || granteeUserId.trim().length === 0}
                onClick={() => void handleInvite()}
              >
                {isInviting ? '正在邀请…' : '邀请成员'}
              </button>
            </div>
          </section>
        ) : null}
        <MemberList
          canShare={canShare}
          members={sharing.members}
          onRevoke={(userId) => void sharing.revokeMember(userId)}
          onRoleChange={(userId, nextRole) =>
            void sharing.createMember({ grantee_user_id: userId, role: nextRole })
          }
        />
        <PublicLinkPanel
          canShare={canShare}
          links={sharing.links}
          onCreate={sharing.createLink}
          onRevoke={(linkId) => void sharing.revokeLink(linkId)}
        />
      </section>
    </div>
  );
}
