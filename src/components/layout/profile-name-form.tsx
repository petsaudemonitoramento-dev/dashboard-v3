"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { initialProfileFormState, updateDisplayNameAction } from "@/app/(sistema)/sistema/perfil/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className="management-profile-save" disabled={pending} type="submit">
    {pending ? "Salvando…" : "Salvar nome"}
  </button>;
}

export function ProfileNameForm({ name }: { name: string }) {
  const [state, action] = useActionState(updateDisplayNameAction, initialProfileFormState);
  return <form action={action} className="management-profile-form">
    <label htmlFor="profile-display-name">Nome de exibição</label>
    <input id="profile-display-name" name="display_name" type="text" minLength={2} maxLength={80}
      autoComplete="name" defaultValue={state.ok ? state.name : name} required />
    <p>O nome aparece somente no seu perfil. E-mail, função e autorizações não são alterados.</p>
    <SubmitButton />
    {state.message ? <p className={state.ok ? "management-form-success" : "management-form-error"} role="status">{state.message}</p> : null}
  </form>;
}
