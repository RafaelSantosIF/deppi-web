"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CourseSummary, SessionUser } from "@/lib/types";
import { Alert, Icon } from "./ui";

export function CourseEnrollmentForm({
  course,
  user,
}: {
  course: CourseSummary;
  user: SessionUser;
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [institution, setInstitution] = useState("");
  const [category, setCategory] = useState("Aluno");
  const [bond, setBond] = useState("Discente");
  const [receivesScholarship, setReceivesScholarship] = useState(false);
  const [householdIncome, setHouseholdIncome] = useState("");
  const [householdSize, setHouseholdSize] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/enroll/courses/${course.id}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          institution: institution.trim(),
          category: category.trim(),
          bond: bond.trim(),
          receivesScholarship,
          dedicatedHours: course.executionHours,
          householdIncomeCents: Math.round(Number(householdIncome) * 100),
          householdSize: Number(householdSize),
          participationStart: course.startDate,
          participationEnd: course.endDateEstimated,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error ?? "Não foi possível solicitar a inscrição.");
      }
      const result =
        body.data && typeof body.data === "object"
          ? (body.data as Record<string, unknown>)
          : {};
      const enrollment =
        result.enrollment && typeof result.enrollment === "object"
          ? (result.enrollment as Record<string, unknown>)
          : result;
      const id = Number(enrollment.id);
      router.push(
        Number.isInteger(id) && id > 0
          ? `/minhas-inscricoes/${id}`
          : "/minhas-inscricoes",
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível solicitar a inscrição.");
      setBusy(false);
    }
  }

  return (
    <div className="enrollment-form-page">
      <div className="course-breadcrumb">
        <Link href="/cursos">Cursos</Link>
        <Icon name="arrow" size={14} />
        <Link href={`/cursos/${course.id}`}>{course.title}</Link>
        <Icon name="arrow" size={14} />
        <span>Inscrição</span>
      </div>
      <div className="page-header">
        <div>
          <h1>Solicitar inscrição</h1>
          <p>{course.title}</p>
        </div>
      </div>

      {error && <div className="permissions-alert"><Alert>{error}</Alert></div>}
      <div className="enrollment-form-layout">
        <form className="card enrollment-form-card" onSubmit={(event) => void submit(event)}>
          <h2>Informações de participação</h2>
          <p className="field-note">
            Preencha os dados que serão encaminhados ao DEPPI para análise.
          </p>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="enrollment-name">Nome completo</label>
              <input
                className="input"
                id="enrollment-name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={150}
              />
            </div>
            <div className="field">
              <label htmlFor="enrollment-institution">Instituição de vínculo</label>
              <input
                className="input"
                id="enrollment-institution"
                required
                value={institution}
                onChange={(event) => setInstitution(event.target.value)}
                maxLength={150}
              />
            </div>
            <div className="field">
              <label htmlFor="enrollment-category">Categoria</label>
              <input
                className="input"
                id="enrollment-category"
                required
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                maxLength={80}
              />
            </div>
            <div className="field">
              <label htmlFor="enrollment-bond">Vínculo</label>
              <input
                className="input"
                id="enrollment-bond"
                required
                value={bond}
                onChange={(event) => setBond(event.target.value)}
                maxLength={80}
              />
            </div>
            <div className="field">
              <label htmlFor="household-income">Renda mensal da família (R$)</label>
              <input
                className="input"
                id="household-income"
                type="number"
                required
                min="0"
                step="0.01"
                value={householdIncome}
                onChange={(event) => setHouseholdIncome(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="household-size">Pessoas no domicílio</label>
              <input
                className="input"
                id="household-size"
                type="number"
                required
                min="1"
                step="1"
                value={householdSize}
                onChange={(event) => setHouseholdSize(event.target.value)}
              />
            </div>
            <label className="enrollment-checkbox">
              <input
                type="checkbox"
                checked={receivesScholarship}
                onChange={(event) => setReceivesScholarship(event.target.checked)}
              />
              Recebo bolsa
            </label>
          </div>
          <div className="enrollment-form-actions">
            <Link className="button button-secondary" href={`/cursos/${course.id}`}>
              Voltar
            </Link>
            <button className="button button-primary" type="submit" disabled={busy}>
              <Icon name="group" size={15} />
              {busy ? "Enviando..." : "Confirmar inscrição"}
            </button>
          </div>
        </form>

        <aside className="card enrollment-api-note">
          <h2>Sobre a análise</h2>
          <p>
            Ao confirmar, sua solicitação será registrada como pendente. Depois,
            você poderá anexar os documentos comprobatórios.
          </p>
          <p>
            Informe a renda total mensal e todas as pessoas que residem no
            domicílio. Esses dados serão enviados ao DEPPI para análise.
          </p>
        </aside>
      </div>
    </div>
  );
}
