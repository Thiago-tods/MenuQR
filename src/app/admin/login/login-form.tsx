"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export function LoginForm({ notice }: { notice: string | null }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  const message = state?.error ?? notice;
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="label">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className="input"
        />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input"
        />
      </div>
      {message && (
        <p role="alert" className="field-error">
          {message}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
