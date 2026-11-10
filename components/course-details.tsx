"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeCourses } from "@/lib/courses";
import type { CourseSummary } from "@/lib/types";
import { courseStatusActions } from "@/lib/course-permissions";
import { Alert, Icon, StatusBadge } from "./ui";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeZone: "America/Fortaleza",
});
const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Fortaleza",
});

const statusNames: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_APPROVAL: "Em análise",
  APPROVED: "Aprovado",
  PUBLISHED: "Em andamento",
  CLOSED: "Encerrado",
  REJECTED: "Indeferido",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Data não informada" : dateFormatter.format(date);
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : timeFormatter.format(date);
}

export function CourseDetails({
  initialCourse,
  initialError = false,
  canManage,
  canEdit = false,
  isOwner = false,
}: {
  initialCourse: CourseSummary | null;
  initialError?: boolean;
  canManage: boolean;
  canEdit?: boolean;
  isOwner?: boolean;
}) {
  const [course, setCourse] = useState(initialCourse);
  const [error, setError] = useState(
    initialError ? "Não foi possível carregar os dados do curso." : "",
  );
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function loadCourse() {
    if (!course) return;
    const response = await fetch(`/api/courses/${course.id}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error ?? "Não foi possível atualizar o curso.");
    }
    const updated = normalizeCourses([body.data])[0];
    if (updated) setCourse(updated);
  }

  async function updateStatus(status: string) {
    if (!course) return;
    const reason =
      status === "REJECTED"
        ? window.prompt("Informe o motivo do indeferimento:")
        : undefined;
    if (status === "REJECTED" && !reason?.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/courses/${course.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(reason ? { reason: reason.trim() } : {}) }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error ?? "Não foi possível alterar a situação do curso.");
      }
      await loadCourse();
      setSuccess("Situação do curso atualizada.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível alterar a situação do curso.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadCover(file: File | undefined) {
    if (!course || !file) return;
    const payload = new FormData();
    payload.set("cover", file);
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/courses/${course.id}/cover`, {
        method: "POST",
        body: payload,
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error ?? "Não foi possível enviar a capa do curso.");
      }
      await loadCourse();
      setSuccess("Capa do curso atualizada.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível enviar a capa do curso.");
    } finally {
      setBusy(false);
      if (coverInput.current) coverInput.current.value = "";
    }
  }

  async function deleteCourse() {
    if (!course || !window.confirm(`Excluir o curso “${course.title}”?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/courses/${course.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error ?? "Não foi possível excluir o curso.");
      }
      router.push("/cursos");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível excluir o curso.");
      setBusy(false);
    }
  }

  if (!course) {
    return (
      <div className="course-error">
        {error && <Alert>{error}</Alert>}
        <Link className="button button-secondary" href="/cursos">Voltar aos cursos</Link>
      </div>
    );
  }

  const enrolled = course.enrolled ?? course.enrollmentsCount ?? course._count?.enrollments;
  const availableStatusActions = courseStatusActions(
    course.status,
    canManage,
    canEdit,
  );
  const coverStyle = course.coverUrl
    ? { backgroundImage: `url("${course.coverUrl}")` }
    : undefined;

  return (
    <>
      <div className="course-breadcrumb">
        <Link href="/cursos">Cursos</Link>
        <Icon name="arrow" size={14} />
        <span>{course.title}</span>
      </div>
      {error && <div className="permissions-alert"><Alert>{error}</Alert></div>}
      {success && <div className="permissions-alert"><Alert tone="success">{success}</Alert></div>}

      <div className={`course-detail-cover ${course.coverUrl ? "course-detail-cover-image" : ""}`} style={coverStyle}>
        <strong>{course.title.slice(0, 2).toLocaleUpperCase("pt-BR")}</strong>
        {canManage && (
          <label className="button button-secondary course-cover-upload">
            <Icon name="assignment" size={15} /> Enviar capa
            <input
              ref={coverInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Enviar capa do curso"
              disabled={busy}
              onChange={(event) => void uploadCover(event.target.files?.[0])}
            />
          </label>
        )}
      </div>

      <div className="course-detail-layout">
        <section className="course-detail-main">
          <div className="course-detail-heading">
            <StatusBadge status={course.status} />
            <h1>{course.title}</h1>
            <p>{course.actionType} · {course.campus}</p>
            {course.responsible?.name && (
              <p>Professor responsável: {course.responsible.name}</p>
            )}
          </div>
          <div className="card course-facts">
            <div className="course-fact">
              <Icon name="calendar" />
              <span><small>Período</small><strong>{formatDate(course.startDate)} a {formatDate(course.endDateEstimated)}</strong></span>
            </div>
            <div className="course-fact">
              <Icon name="calendar" />
              <span><small>Horário</small><strong>{formatTime(course.startDate)} às {formatTime(course.endDateEstimated)}</strong></span>
            </div>
            <div className="course-fact">
              <Icon name="assignment" />
              <span><small>Carga horária</small><strong>{course.executionHours} horas</strong></span>
            </div>
            <div className="course-fact">
              <Icon name="apartment" />
              <span><small>Instituição</small><strong>{course.campus}</strong></span>
            </div>
            <div className="course-fact">
              <Icon name="group" />
              <span><small>Vagas</small><strong>{course.maxBeneficiaries} no total{typeof enrolled === "number" ? ` · ${Math.max(course.maxBeneficiaries - enrolled, 0)} disponíveis` : ""}</strong></span>
            </div>
            <div className="course-fact">
              <Icon name="list_alt" />
              <span><small>Inscrições</small><strong>{typeof enrolled === "number" ? `${enrolled} recebidas` : "Consulte a disponibilidade"}</strong></span>
            </div>
            {course.location && <div className="course-fact"><Icon name="apartment" /><span><small>Local</small><strong>{course.location}</strong></span></div>}
            {course.offerModel && <div className="course-fact"><Icon name="school" /><span><small>Modalidade</small><strong>{course.offerModel}</strong></span></div>}
          </div>
          {course.activitiesPerformed && (
            <section className="course-description">
              <h2>Sobre o curso</h2>
              <p>{course.activitiesPerformed}</p>
            </section>
          )}
        </section>

        {(canManage || canEdit || (isOwner && course.status === "PENDING_APPROVAL")) && (
          <aside className="card course-manage-panel">
            <h2>{canManage ? "Gerenciar curso" : "Meu curso"}</h2>
            {availableStatusActions.length > 0 && (
              <>
                <div className="field">
                  <label htmlFor="course-status">Status</label>
                  <select
                    id="course-status"
                    className="input"
                    value={course.status}
                    disabled={busy}
                    onChange={(event) => void updateStatus(event.target.value)}
                  >
                    <option value={course.status}>{statusNames[course.status] ?? course.status}</option>
                    {availableStatusActions.map((status) => (
                      <option value={status} key={status}>{statusNames[status]}</option>
                    ))}
                  </select>
                  <small className="field-note">
                    {canManage
                      ? "Use a fila para aprovar ou indeferir cursos enviados."
                      : "Após a aprovação, você pode abrir ou fechar as inscrições."}
                  </small>
                </div>
              </>
            )}
            {isOwner && course.status === "PENDING_APPROVAL" && (
              <p className="field-note">O curso aguarda avaliação e não pode ser editado neste momento.</p>
            )}
            {canEdit && (
              <Link className="button button-secondary button-block" href={`/cursos/${course.id}/editar`}>
                <Icon name="edit" size={15} /> Editar curso
              </Link>
            )}
            {canManage && (
              <button className="button button-danger-outline button-block" onClick={() => void deleteCourse()} disabled={busy}>
                <Icon name="warning" size={15} /> Excluir curso
              </button>
            )}
          </aside>
        )}
      </div>
    </>
  );
}
