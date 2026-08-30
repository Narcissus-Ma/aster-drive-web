import type { GrantResponse } from '../../../shared/api/generated/openapi';
import styles from './sharing-dialog.module.css';

export interface MemberListProps {
  canShare: boolean;
  members: GrantResponse[];
  onRevoke?: (granteeUserId: string) => void;
  onRoleChange?: (granteeUserId: string, role: 'viewer' | 'editor') => void;
  pendingUserId?: string | null;
}

export function MemberList({
  canShare,
  members,
  onRevoke,
  onRoleChange,
  pendingUserId = null,
}: MemberListProps): JSX.Element {
  return (
    <section aria-labelledby="share-members-title">
      <h3 id="share-members-title">成员权限</h3>
      {members.length === 0 ? <p className={styles.muted}>暂未共享给其他成员</p> : null}
      {members.length > 0 ? (
        <ul className={styles.memberList} aria-label="共享成员列表">
          {members.map((member) => (
            <li className={styles.memberItem} key={member.id}>
              <span>{member.grantee_user_id}</span>
              {canShare ? (
                <>
                  <label>
                    <span className={styles.srOnly}>
                      为 {member.grantee_user_id} 设置权限
                    </span>
                    <select
                      aria-label={`为 ${member.grantee_user_id} 设置权限`}
                      value={member.role}
                      disabled={pendingUserId === member.grantee_user_id}
                      onChange={(event) =>
                        onRoleChange?.(
                          member.grantee_user_id,
                          event.target.value as 'viewer' | 'editor',
                        )
                      }
                    >
                      <option value="viewer">查看</option>
                      <option value="editor">编辑</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={pendingUserId === member.grantee_user_id}
                    onClick={() => onRevoke?.(member.grantee_user_id)}
                  >
                    撤销 {member.grantee_user_id}
                  </button>
                </>
              ) : (
                <span className={styles.roleText}>
                  {member.role === 'editor' ? '编辑' : '查看'}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
