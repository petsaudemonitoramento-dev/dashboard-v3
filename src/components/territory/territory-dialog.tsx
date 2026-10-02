"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function TerritoryDialog({
  children,
  closeHref,
  description,
  eyebrow = "Editar UBS",
  title,
}: {
  children: React.ReactNode;
  closeHref: string;
  description: string;
  eyebrow?: string;
  title: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    closeButtonRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  function closeDialog() {
    dialogRef.current?.close();
    router.replace(closeHref, { scroll: false });
  }

  return (
    <dialog
      aria-describedby="territory-dialog-description"
      aria-labelledby="territory-dialog-title"
      className="territory-dialog"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      ref={dialogRef}
    >
      <div className="territory-dialog-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2 className="mt-2 text-2xl font-bold text-slate-900" id="territory-dialog-title">{title}</h2>
            <p className="text-sm text-slate-600" id="territory-dialog-description">{description}</p>
          </div>
          <button
            aria-label="Fechar edição da UBS"
            className="rounded-lg px-2 text-2xl text-slate-700"
            onClick={closeDialog}
            ref={closeButtonRef}
            type="button"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
