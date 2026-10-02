"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { deleteProfileAction } from "./actions";

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      <Trash2 aria-hidden="true" className="size-4" />
      {pending ? "Excluindo..." : "Excluir perfil"}
    </button>
  );
}

export function DeleteProfileForm({ email, page, userId }: { email: string; page: number; userId: string }) {
  return (
    <form
      action={deleteProfileAction}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Excluir o perfil de ${email}? A conta de acesso será removida e desaparecerá desta lista. O histórico operacional será preservado.`,
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      <input name="userId" type="hidden" value={userId} />
      <input name="page" type="hidden" value={page} />
      <DeleteButton />
    </form>
  );
}
