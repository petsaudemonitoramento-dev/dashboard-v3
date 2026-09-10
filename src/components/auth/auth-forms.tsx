"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  completeProfileAction,
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
      className="min-h-12 rounded-xl bg-[#0d4d80] px-5 font-bold text-white transition hover:bg-[#071d35] disabled:opacity-60"
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
      role="status"
    >
      {state.message}
    </p>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="min-h-12 rounded-xl border border-slate-200 px-4 font-normal outline-none transition focus:border-[#0d4d80] focus:ring-4 focus:ring-[#0d4d80]/10"
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

function GoogleButton() {
  return (
    <form action={signInWithGoogleAction}>
      <button
        className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-5 font-bold text-slate-800 transition hover:bg-slate-50"
        type="submit"
      >
        Continuar com Google
      </button>
    </form>
  );
}

export function SignInForm() {
  const [state, action] = useActionState(signInAction, INITIAL_STATE);
  return (
    <div className="grid gap-5">
      <form action={action} className="grid gap-4">
        <Field label="E-mail" name="email" type="email" />
        <Field label="Senha" name="password" type="password" />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input name="remember" type="checkbox" />
          Lembrar de mim
        </label>
        <Message state={state} />
        <SubmitButton label="Entrar" />
      </form>
      <div className="flex items-center gap-3 text-xs uppercase text-slate-400 before:h-px before:flex-1 before:bg-slate-200 after:h-px after:flex-1 after:bg-slate-200">
        ou
      </div>
      <GoogleButton />
      <div className="flex justify-between gap-4 text-sm font-bold text-[#0d4d80]">
        <Link href="/recuperar-senha">Esqueci minha senha</Link>
        <Link href="/cadastro">Criar conta</Link>
      </div>
    </div>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, INITIAL_STATE);
  return (
    <div className="grid gap-5">
      <form action={action} className="grid gap-4">
        <Field label="E-mail" name="email" type="email" />
        <Field label="Senha" name="password" type="password" />
        <Field
          label="Confirme a senha"
          name="passwordConfirmation"
          type="password"
        />
        <Message state={state} />
        <SubmitButton label="Criar conta" />
      </form>
      <div className="flex items-center gap-3 text-xs uppercase text-slate-400 before:h-px before:flex-1 before:bg-slate-200 after:h-px after:flex-1 after:bg-slate-200">
        ou
      </div>
      <GoogleButton />
      <Link className="text-sm font-bold text-[#0d4d80]" href="/entrar">
        Voltar para entrar
      </Link>
    </div>
  );
}

export function PasswordRecoveryForm() {
  const [state, action] = useActionState(
    requestPasswordResetAction,
    INITIAL_STATE,
  );
  return (
    <form action={action} className="grid gap-4">
      <Field label="E-mail" name="email" type="email" />
      <Message state={state} />
      <SubmitButton label="Enviar instruções" />
      <Link className="text-sm font-bold text-[#0d4d80]" href="/entrar">
        Voltar para entrar
      </Link>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action] = useActionState(updatePasswordAction, INITIAL_STATE);
  return (
    <form action={action} className="grid gap-4">
      <Field label="Nova senha" name="password" type="password" />
      <Field
        label="Confirme a nova senha"
        name="passwordConfirmation"
        type="password"
      />
      <Message state={state} />
      <SubmitButton label="Atualizar senha" />
    </form>
  );
}

export function CompleteProfileForm() {
  const [state, action] = useActionState(completeProfileAction, INITIAL_STATE);
  return (
    <form action={action} className="grid gap-4">
      <Field label="Nome completo" name="fullName" />
      <Field label="Telefone (opcional)" name="phone" required={false} />
      <div className="grid gap-2 text-sm font-bold text-slate-700">
        Tipo de acesso solicitado
        <div className="flex min-h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal text-slate-700">
          Gestão Municipal
        </div>
      </div>
      <input name="requestedRole" type="hidden" value="gestao_municipal" />
      <input name="professionalRegistration" type="hidden" value="" />
      <p className="text-xs leading-5 text-slate-500">
        O acesso à Gestão Municipal será analisado pelo Administrador. A solicitação
        não libera acesso automaticamente.
      </p>
      <Message state={state} />
      <SubmitButton label="Enviar para aprovação" />
    </form>
  );
}
