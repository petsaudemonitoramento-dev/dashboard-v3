import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="login-shell">
      <section className="login-brand">
        <div className="brand-chip">SAÚDE DIGITAL • APS</div>
        <div className="brand-copy">
          <p className="eyebrow">Gestão Municipal</p>
          <h1>Cuidado na Gestação na APS</h1>
          <p>
            Indicadores oficiais do SIAPS para acompanhar tendências, boas práticas
            e necessidades de atenção em toda a rede.
          </p>
        </div>
        <div className="brand-footer">
          <span>PET Saúde + UFCG</span>
          <span>Campina Grande • PB</span>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div>
            <p className="eyebrow">Acesso institucional</p>
            <h2>Entrar na plataforma</h2>
            <p className="muted">
              Use uma conta autorizada para acessar o painel da gestão.
            </p>
          </div>
          <LoginForm />
          <div className="login-meta">
            <span>Desenvolvido por Lucca Araújo</span>
            <span>Versão 3.0</span>
          </div>
        </div>
      </section>
    </main>
  );
}
