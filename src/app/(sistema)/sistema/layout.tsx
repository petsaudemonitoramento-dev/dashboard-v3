import { signOutAction } from "@/app/(auth)/actions";
import { getActiveProfileContext } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export default async function SystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await enforceRouteGuard(() => getActiveProfileContext());
  return (
    <div className="min-h-svh bg-slate-100">
      <header className="flex items-center justify-between gap-4 bg-[#071d35] px-5 py-4 text-white md:px-12">
        <div>
          <strong>Cuidado na Gestação na APS</strong>
          <p className="text-xs text-white/65">{context.profile.fullName}</p>
        </div>
        <form action={signOutAction}>
          <button
            className="rounded-lg border border-white/25 px-4 py-2 text-sm font-bold"
            type="submit"
          >
            Sair
          </button>
        </form>
      </header>
      <main className="mx-auto w-[min(100%-2rem,72rem)] py-10">{children}</main>
    </div>
  );
}
