"use client";

import { useActionState, useState } from "react";

import {
  createPatientAction,
  type ManualPatientState,
} from "../actions";

const INITIAL: ManualPatientState = { ok: false, message: "" };

export function NewPatientForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createPatientAction,
    INITIAL,
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <button
        className="text-sm font-bold text-[#0d4d80]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? "Fechar cadastro manual" : "+ Cadastrar gestante manualmente"}
      </button>

      {open ? (
        <form action={formAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-xs font-bold text-slate-600 md:col-span-2">
            Nome da gestante
            <input
              className="rounded-lg border border-slate-300 p-2 text-sm font-normal"
              maxLength={160}
              name="displayName"
              required
              type="text"
            />
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            Data de nascimento
            <input
              className="rounded-lg border border-slate-300 p-2 text-sm font-normal"
              name="birthDate"
              type="date"
            />
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            Início do pré-natal (DUM)
            <input
              className="rounded-lg border border-slate-300 p-2 text-sm font-normal"
              name="prenatalStartDate"
              type="date"
            />
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            Data provável do parto
            <input
              className="rounded-lg border border-slate-300 p-2 text-sm font-normal"
              name="dueDate"
              type="date"
            />
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            Classificação de risco
            <select
              className="rounded-lg border border-slate-300 p-2 text-sm font-normal"
              name="riskLevel"
            >
              <option value="">Não informado</option>
              <option value="habitual">Habitual</option>
              <option value="alto">Alto</option>
            </select>
          </label>
          <div className="md:col-span-2">
            <button
              className="rounded-lg bg-[#0d4d80] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              disabled={pending}
              type="submit"
            >
              {pending ? "Salvando…" : "Cadastrar"}
            </button>
          </div>
        </form>
      ) : null}

      {state.message ? (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            state.ok ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"
          }`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
