"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Alert, Icon } from "./ui";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Não foi possível entrar.");
      router.replace("/inicio");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível entrar.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <h1>Entrar</h1>
      <p>Use o seu e-mail cadastrado.</p>
      {search.get("registered") && (
        <Alert tone="success">
          Conta criada. Entre com seu e-mail e senha.
        </Alert>
      )}
      {search.get("expired") && (
        <Alert tone="info">Sua sessão terminou. Entre novamente.</Alert>
      )}
      {search.get("password") && (
        <Alert tone="success">Senha alterada. Entre novamente.</Alert>
      )}
      {error && <Alert>{error}</Alert>}
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input
          className="input"
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="password">Senha</label>
        <div className="input-wrap">
          <input
            className="input"
            id="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            type="button"
            className="icon-button"
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            onClick={() => setVisible(!visible)}
          >
            <Icon name="eye" />
          </button>
        </div>
      </div>
      <button
        className="button button-primary button-block"
        type="submit"
        disabled={busy}
      >
        {busy ? "Entrando..." : "Entrar"}
      </button>
      <div className="auth-footer">
        Ainda não tem conta? <Link href="/cadastro">Crie sua conta</Link>
      </div>
    </form>
  );
}
