"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { validCpf, validEmail } from "@/lib/validation";
import { Alert, Icon, Logo } from "./ui";

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [registration, setRegistration] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (step === 1) {
      if (name.trim().length < 2) return setError("Informe seu nome completo.");
      if (!validCpf(cpf))
        return setError("CPF inválido. Confira os dígitos verificadores.");
      if (registration.length > 20)
        return setError("A matrícula deve ter até 20 caracteres.");
      setStep(2);
      return;
    }
    if (!validEmail(email)) return setError("Informe um e-mail válido.");
    if (password.length < 8)
      return setError("A senha deve ter pelo menos 8 caracteres.");
    if (password !== confirmPassword)
      return setError("As senhas não conferem.");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          cpf,
          registration,
          email,
          password,
          confirmPassword,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Não foi possível criar sua conta.");
      router.replace("/login?registered=1");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível criar sua conta.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="register-page">
      <div className="register-top">
        <Logo small />
        <Link href="/login">Já tenho conta</Link>
      </div>
      <h1>Crie sua conta</h1>
      <p>
        Cadastro exclusivo para alunos. Preencha seus dados e defina uma senha
        de acesso.
      </p>
      <div className="stepper" aria-label={`Etapa ${step} de 2`}>
        <span className={step === 1 ? "active" : ""}>
          <span className="step-number">1</span> Dados pessoais
        </span>
        <span className={step === 2 ? "active" : ""}>
          <span className="step-number">2</span> Acesso
        </span>
      </div>
      <form onSubmit={submit} className="stack">
        <div className="card card-pad stack">
          <h2>{step === 1 ? "Seus dados pessoais" : "Dados de acesso"}</h2>
          {error && <Alert>{error}</Alert>}
          {step === 1 ? (
            <>
              <div className="field">
                <label htmlFor="name">Nome completo</label>
                <input
                  className="input"
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  required
                  minLength={2}
                />
              </div>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="cpf">CPF</label>
                  <input
                    className="input"
                    id="cpf"
                    inputMode="numeric"
                    value={cpf}
                    onChange={(event) => setCpf(event.target.value)}
                    maxLength={14}
                    required
                  />                  
                </div>
                <div className="field">
                  <label htmlFor="registration">Matrícula (opcional)</label>
                  <input
                    className="input"
                    id="registration"
                    value={registration}
                    onChange={(event) => setRegistration(event.target.value)}
                    maxLength={20}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <label htmlFor="email">E-mail</label>
                <input
                  className="input"
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="password">Senha</label>
                  <input
                    className="input"
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />                  
                </div>
                <div className="field">
                  <label htmlFor="confirmPassword">Confirmar senha</label>
                  <input
                    className="input"
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            </>
          )}
        </div>
        <div className="register-actions">
          {step === 2 ? (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setError("");
                setStep(1);
              }}
            >
              Voltar
            </button>
          ) : (
            <Link className="button button-secondary" href="/login">
              Voltar
            </Link>
          )}
          <button
            className="button button-primary"
            type="submit"
            disabled={busy}
          >
            {busy
              ? "Criando conta..."
              : step === 1
                ? "Continuar"
                : "Criar conta"}
            <Icon name="arrow" size={16} />
          </button>
        </div>
      </form>
    </main>
  );
}
