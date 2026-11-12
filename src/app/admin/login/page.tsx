import { adminErrorMessage } from "@/lib/admin-errors";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string | string[] }>;
}) {
  const { erro } = await searchParams;
  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4"
    >
      <div>
        <h1 className="text-2xl font-extrabold">MenuQR · Admin</h1>
        <p className="text-muted text-sm">Acesso restrito à equipe da Casa Oliva.</p>
      </div>
      <LoginForm notice={adminErrorMessage(erro)} />
    </main>
  );
}
