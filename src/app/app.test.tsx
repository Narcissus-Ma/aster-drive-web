import { render, screen } from '@testing-library/react';

import { App } from './app';

describe('应用入口', () => {
  it('渲染应用入口', () => {
    render(<App />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '你的文件工作台' })).toBeInTheDocument();
  });
});
