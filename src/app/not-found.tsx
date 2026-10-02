import { StatusActions } from "@/components/status/status-actions";

export default function NotFound() {
  return <main className="grid min-h-svh place-items-center p-6"><section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><span className="eyebrow">Erro 404</span><h1 className="mt-3 text-3xl font-semibold text-[#071d35]">Página não encontrada</h1><p className="mt-4 text-slate-600">O endereço informado não existe ou foi removido do MAE APS.</p><StatusActions/></section></main>;
}
