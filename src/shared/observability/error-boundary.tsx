import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  onError?: (event: ErrorBoundaryErrorEvent) => void;
}

export interface ErrorBoundaryErrorEvent {
  name: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * React 18 没有函数式 Error Boundary API，因此这里只保留一个最小的类组件边界；
 * 业务 UI 仍使用函数组件和 Hooks。
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 只上报事件类型，不把错误消息、堆栈或请求地址写入用户可见 UI。
    void error;
    void errorInfo;
    const event = { name: error.name || 'Error' };
    this.props.onError?.(event);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aster-drive:error', { detail: event }));
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  public render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <main role="alert" aria-live="assertive" className="error-boundary">
        <h1>页面暂时无法加载</h1>
        <p>请重新加载当前页面。如果问题持续存在，请稍后再试。</p>
        <button type="button" onClick={this.handleRetry}>
          重新加载
        </button>
      </main>
    );
  }
}
