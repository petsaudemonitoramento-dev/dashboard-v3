"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage("Não foi possível entrar. Verifique e-mail, senha e autorização.");
      setPending(false);
      return;
    }

    window.location.assign("/dashboard");
  }

  async function signInWithGoogle() {
    setPending(true);
    setMessage(null);

    const supabase = createClient();
    const redirectTo = window.location.origin + "/auth/callback";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) {
      setMessage("Não foi possível iniciar o acesso com Google.");
      setPending(false);
    }
  }

  return (
    <form className="login-form" onSubmit={signIn}>
      <label>
        E-mail
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <label>
        Senha
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      {message ? <p className="form-message">{message}</p> : null}

      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </button>

      <div className="divider"><span>ou</span></div>

      <button
        className="secondary-button"
        type="button"
        onClick={signInWithGoogle}
        disabled={pending}
      >
        Continuar com Google
      </button>

      <p className="access-note">
        Acesso restrito a usuários autorizados pela gestão do sistema.
      </p>
    </form>
  );
}
