import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { ErrorBoundary } from './error-boundary';

function BrokenComponent(): JSX.Element {
  throw new Error('测试错误，不应泄露给用户');
}

describe('错误边界', () => {
  it('捕获渲染错误并提供恢复入口', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <BrokenComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('页面暂时无法加载');
    expect(screen.getByRole('button', { name: '重新加载' })).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({ name: 'Error' });
  });
});
