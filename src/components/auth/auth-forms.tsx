"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  requestPasswordResetAction,
  signInAction,
  signInWithGoogleAction,
  signUpAction,
  updatePasswordAction,
  type FormState,
} from "@/app/(auth)/actions";

const INITIAL_STATE: FormState = { message: "", ok: false };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      className="auth-primary-button"
      disabled={pending}
      type="submit"
    >
      {pending ? "Aguarde..." : label}
    </button>
  );
}

function Message({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <p
      className={
        "rounded-xl p-3 text-sm " +
        (state.ok
          ? "bg-emerald-50 text-emerald-800"
          : "bg-red-50 text-red-800")
      }
      role={state.ok ? "status" : "alert"}
    >
      {state.message}
    </p>
  );
}

function Field({
  autoComplete,
  label,
  name,
  type = "text",
  placeholder,
  required = true,
}: {
  autoComplete: string;
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="auth-field">
      {label}
      <input
        autoCapitalize={type === "email" ? "none" : undefined}
        autoComplete={autoComplete}
        className="auth-input"
        name={name}
        placeholder={placeholder}
        required={required}
        spellCheck={type === "email" ? false : undefined}
        type={type}
      />
    </label>
  );
}

export function SignInForm() {
  const [state, action] = useActionState(signInAction, INITIAL_STATE);
  return (
    <div className="auth-signin-stack">
      <form action={action} className="auth-form">
        <Field
          autoComplete="email"
          label="E-mail"
          name="email"
          placeholder="seuemail@instituicao.br"
          type="email"
        />
        <Field
          autoComplete="current-password"
          label="Senha"
          name="password"
          placeholder="Sua senha"
          type="password"
        />
        <Message state={state} />
        <SubmitButton label="Entrar" />
      </form>
      <div className="auth-divider"><span>ou</span></div>
      <form action={signInWithGoogleAction}>
        <button
          className="auth-google-button"
          type="submit"
        >
          <svg aria-hidden="true" className="auth-google-mark" viewBox="0 0 24 24">
            <path d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.33 2.98-7.39Z" fill="#4285F4" />
            <path d="M12 22c2.7 0 4.97-.9 6.62-2.38l-3.24-2.53c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z" fill="#34A853" />
            <path d="M6.39 13.92A6.02 6.02 0 0 1 6.07 12c0-.67.11-1.32.32-1.92V7.47H3.04A10 10 0 0 0 2 12c0 1.61.38 3.13 1.04 4.53l3.35-2.61Z" fill="#FBBC05" />
            <path d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.47l3.35 2.61C7.18 7.71 9.39 5.95 12 5.95Z" fill="#EA4335" />
          </svg>
          Continuar com Google
        </button>
      </form>
      <div className="auth-secondary-links">
        <Link href="/recuperar-senha">Esqueci minha senha</Link>
        <Link href="/cadastro">Criar conta</Link>
      </div>
    </div>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, INITIAL_STATE);
  return (
    <form action={action} className="auth-form">
      <Field autoComplete="email" label="E-mail" name="email" type="email" />
      <Field autoComplete="new-password" label="Senha" name="password" type="password" />
      <Field
        autoComplete="new-password"
        label="Confirme a senha"
        name="passwordConfirmation"
        type="password"
      />
      <Message state={state} />
      <SubmitButton label="Solicitar acesso à Gestão" />
      <Link className="auth-back-link" href="/entrar">
        Voltar para entrar
      </Link>
    </form>
  );
}

export function PasswordRecoveryForm() {
  const [state, action] = useActionState(
    requestPasswordResetAction,
    INITIAL_STATE,
  );
  return (
    <form action={action} className="auth-form">
      <Field autoComplete="email" label="E-mail" name="email" type="email" />
      <Message state={state} />
      <SubmitButton label="Enviar instruções" />
      <Link className="auth-back-link" href="/entrar">
        Voltar para entrar
      </Link>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action] = useActionState(updatePasswordAction, INITIAL_STATE);
  return (
    <form action={action} className="auth-form">
      <Field autoComplete="new-password" label="Nova senha" name="password" type="password" />
      <Field
        autoComplete="new-password"
        label="Confirme a nova senha"
        name="passwordConfirmation"
        type="password"
      />
      <Message state={state} />
      <SubmitButton label="Atualizar senha" />
    </form>
  );
}
