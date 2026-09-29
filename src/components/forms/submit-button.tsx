"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  label,
  pendingLabel = "Salvando...",
  className = "primary-button",
}: {
  label: string;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-disabled={pending}
      className={className}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
