import '@testing-library/jest-dom/vitest';

// jsdom 不提供 ProseMirror 计算光标位置时依赖的布局 API，测试中返回空矩形即可避免依赖真实浏览器布局。
if (typeof document.elementFromPoint !== 'function') {
  document.elementFromPoint = () => document.querySelector('.ProseMirror');
}

if (typeof Range.prototype.getClientRects !== 'function') {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
}

if (typeof Range.prototype.getBoundingClientRect !== 'function') {
  Range.prototype.getBoundingClientRect = () => new DOMRect();
}
