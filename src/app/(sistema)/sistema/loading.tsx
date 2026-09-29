export default function SystemLoading() {
  return <div aria-live="polite" aria-busy="true" className="space-y-6"><span className="sr-only">Carregando conteúdo</span><div className="h-44 animate-pulse rounded-2xl bg-slate-200"/><div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div className="h-36 animate-pulse rounded-2xl bg-slate-200" key={index}/>)}</div><div className="h-80 animate-pulse rounded-2xl bg-slate-200"/></div>;
}
