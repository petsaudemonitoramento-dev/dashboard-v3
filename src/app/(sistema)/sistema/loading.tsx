/** Feedback de carregamento preservando os cartões enquanto os dados são consultados. */
export default function SystemLoading() {
  return (
    <div aria-live="polite" aria-busy="true" role="status" className="space-y-6">
      <div className="management-loading-heading">
        <span className="management-nav-spinner" aria-hidden="true" />
        <span>Carregando módulo e dados autorizados…</span>
      </div>
      <div className="h-44 animate-pulse rounded-2xl bg-[#e8dcf6]" aria-hidden="true" />
      <div className="grid gap-4 md:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="h-36 animate-pulse rounded-2xl bg-[#e8dcf6]" key={index} />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-[#e8dcf6]" aria-hidden="true" />
    </div>
  );
}
