"use client";

import { useActionState } from "react";

import { USER_ROLES } from "@/lib/auth/types";
import {
  ROLE_LABEL,
  SITUATION_LABEL,
  SITUATION_STYLE,
  availableActions,
  formatDate,
  situationOf,
  type AdminProfileRow,
} from "@/lib/admin/status";
import { ADMIN_ACTION_LABEL } from "@/lib/validation/admin";

import { applyAdminProfileAction, type AdminActionState } from "./actions";

const INITIAL: AdminActionState = { ok: false, message: "" };

export function UserCard({
  profile,
  isSelf,
}: {
  profile: AdminProfileRow;
  isSelf: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    applyAdminProfileAction,
    INITIAL,
  );
  const situation = situationOf(profile);
  const actions = availableActions(situation);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-slate-900">
              {profile.full_name ?? "Cadastro incompleto"}
            </strong>
            {isSelf ? (
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">
                você
              </span>
            ) : null}
          </div>
          <p className="truncate text-sm text-slate-500">{profile.email}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${SITUATION_STYLE[situation]}`}
        >
          {SITUATION_LABEL[situation]}
        </span>
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Perfil
          </dt>
          <dd className="text-slate-800">{ROLE_LABEL[profile.role]}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Cadastro em
          </dt>
          <dd className="text-slate-800">{formatDate(profile.created_at)}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Cadastro completo
          </dt>
          <dd className="text-slate-800">
            {profile.completed_at ? formatDate(profile.completed_at) : "Não"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
        {actions.map((action) => (
          <form action={formAction} key={action}>
            <input name="userId" type="hidden" value={profile.user_id} />
            <input name="action" type="hidden" value={action} />
            <button
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800 disabled:opacity-50"
              disabled={pending}
              type="submit"
            >
              {ADMIN_ACTION_LABEL[action]}
            </button>
          </form>
        ))}

        <form action={formAction} className="flex items-end gap-2">
          <input name="userId" type="hidden" value={profile.user_id} />
          <input name="action" type="hidden" value="definir_papel" />
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            Papel
            <select
              className="rounded-lg border border-slate-300 p-2 text-sm font-normal text-slate-800"
              defaultValue={profile.role}
              name="role"
            >
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </select>
          </label>
          <button
            className="rounded-lg bg-[#0d4d80] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
            disabled={pending}
            type="submit"
          >
            Aplicar
          </button>
        </form>
      </div>

      {state.message ? (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            state.ok
              ? "bg-emerald-50 text-emerald-900"
              : "bg-rose-50 text-rose-900"
          }`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </article>
  );
}
