"use client";

import { useActionState } from "react";

import {
  addEncounterAction,
  addExamAction,
  addRiskAssessmentAction,
  addVaccinationAction,
  type ClinicalRecordState,
} from "../../actions";

const INITIAL: ClinicalRecordState = { ok: false, message: "" };

const inputClass =
  "rounded-lg border border-slate-300 p-2 text-sm font-normal text-slate-800";
const labelClass = "grid gap-1 text-xs font-bold text-slate-600";

function Feedback({ state }: { state: ClinicalRecordState }) {
  if (!state.message) return null;
  return (
    <p
      className={`mt-2 rounded-lg px-3 py-2 text-sm ${
        state.ok ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"
      }`}
      role="status"
    >
      {state.message}
    </p>
  );
}

export function AddEncounterForm({ publicId }: { publicId: string }) {
  const [state, action, pending] = useActionState(addEncounterAction, INITIAL);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input name="patientPublicId" type="hidden" value={publicId} />
      <label className={labelClass}>
        Data
        <input className={inputClass} name="occurredOn" required type="date" />
      </label>
      <label className={labelClass}>
        Tipo
        <select className={inputClass} name="kind">
          <option value="consulta_prenatal">Consulta de pré-natal</option>
          <option value="consulta_puerperal">Consulta puerperal</option>
          <option value="visita_domiciliar">Visita domiciliar</option>
          <option value="odontologica">Atendimento odontológico</option>
          <option value="outra">Outro</option>
        </select>
      </label>
      <label className={`${labelClass} sm:col-span-2`}>
        Observação (opcional)
        <input className={inputClass} maxLength={500} name="notes" type="text" />
      </label>
      <div className="sm:col-span-2">
        <button
          className="rounded-lg bg-[#0d4d80] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          Registrar atendimento
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function AddExamForm({ publicId }: { publicId: string }) {
  const [state, action, pending] = useActionState(addExamAction, INITIAL);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <input name="patientPublicId" type="hidden" value={publicId} />
      <label className={labelClass}>
        Exame
        <select className={inputClass} name="examType">
          <option value="sifilis">Sífilis</option>
          <option value="hiv">HIV</option>
          <option value="hepatite_b">Hepatite B</option>
          <option value="hepatite_c">Hepatite C</option>
          <option value="outro">Outro</option>
        </select>
      </label>
      <label className={labelClass}>
        Coleta
        <input className={inputClass} name="collectedOn" type="date" />
      </label>
      <label className={labelClass}>
        Resultado
        <select className={inputClass} name="result">
          <option value="">Não informado</option>
          <option value="nao_reagente">Não reagente</option>
          <option value="reagente">Reagente</option>
          <option value="indeterminado">Indeterminado</option>
          <option value="realizado">Realizado</option>
        </select>
      </label>
      <div className="sm:col-span-3">
        <button
          className="rounded-lg bg-[#0d4d80] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          Registrar exame
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function AddVaccinationForm({ publicId }: { publicId: string }) {
  const [state, action, pending] = useActionState(addVaccinationAction, INITIAL);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input name="patientPublicId" type="hidden" value={publicId} />
      <label className={labelClass}>
        Vacina
        <select className={inputClass} name="vaccine">
          <option value="dtpa">dTpa</option>
          <option value="influenza">Influenza</option>
          <option value="hepatite_b">Hepatite B</option>
          <option value="covid19">COVID-19</option>
          <option value="outra">Outra</option>
        </select>
      </label>
      <label className={labelClass}>
        Aplicação
        <input className={inputClass} name="appliedOn" type="date" />
      </label>
      <div className="sm:col-span-2">
        <button
          className="rounded-lg bg-[#0d4d80] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          Registrar vacina
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function AddRiskForm({ publicId }: { publicId: string }) {
  const [state, action, pending] = useActionState(
    addRiskAssessmentAction,
    INITIAL,
  );
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input name="patientPublicId" type="hidden" value={publicId} />
      <label className={labelClass}>
        Classificação
        <select className={inputClass} name="level">
          <option value="habitual">Risco habitual</option>
          <option value="alto">Alto risco</option>
        </select>
      </label>
      <div className="sm:col-span-2">
        <button
          className="rounded-lg bg-[#0d4d80] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          Registrar classificação
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
