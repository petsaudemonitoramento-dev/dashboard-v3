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
  required = true,
}: {
  autoComplete: string;
  label: string;
  name: string;
  type?: string;
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
        <Field autoComplete="email" label="E-mail" name="email" type="email" />
        <Field autoComplete="current-password" label="Senha" name="password" type="password" />
        <Message state={state} />
        <SubmitButton label="Entrar" />
      </form>
      <div className="auth-divider"><span>ou</span></div>
      <form action={signInWithGoogleAction}>
        <button
          className="auth-google-button"
          type="submit"
        >
          <span className="auth-google-mark" aria-hidden="true">G</span>
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
