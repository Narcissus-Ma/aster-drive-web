export function App(): JSX.Element {
  return (
    <main className="app-shell" aria-labelledby="app-title">
      <section className="welcome-card">
        <p className="eyebrow">ASTER DRIVE</p>
        <h1 id="app-title">你的文件工作台</h1>
        <p className="welcome-copy">
          前端工程骨架已就绪，下一步将接入认证、资源树和上传流程。
        </p>
      </section>
    </main>
  );
}
