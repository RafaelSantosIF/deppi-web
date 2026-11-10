"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  enrollmentCount,
  hasOpenEnrollment,
  normalizeCourses,
} from "@/lib/courses";
import type { Institution } from "@/lib/types";
import { Alert, EmptyState, Icon, StatusBadge } from "./ui";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Fortaleza",
});
const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Fortaleza",
});

function formatCourseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Data não informada" : dateFormatter.format(date);
}

function formatCourseTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : timeFormatter.format(date);
}

function courseInitials(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toLocaleUpperCase("pt-BR");
}

function findInstitution(
  course: ReturnType<typeof normalizeCourses>[number],
  institutions: Institution[],
) {
  const institutionId = course.institutionId ?? course.institution?.id;
  return (
    institutions.find((institution) => institution.id === institutionId) ??
    institutions.find(
      (institution) =>
        institution.name.toLocaleLowerCase("pt-BR") ===
        course.campus.trim().toLocaleLowerCase("pt-BR"),
    )
  );
}

function institutionLabel(
  course: ReturnType<typeof normalizeCourses>[number],
  institution?: Institution,
) {
  const acronym = institution?.acronym ?? course.institution?.acronym;
  const city = institution?.city ?? course.institution?.city;
  if (acronym && city) return `${acronym} - ${city}`;
  if (institution?.name && city) return `${institution.name} - ${city}`;
  return course.campus || institution?.name || "Instituição não informada";
}

export function CoursesManagement({
  initialCourses,
  initialInstitutions,
  initialError = false,
  institutionsError = "",
  canManage,
  canCreate,
  canEditOwn,
  responsibleId,
}: {
  initialCourses: unknown;
  initialInstitutions: Institution[];
  initialError?: boolean;
  institutionsError?: string;
  canManage: boolean;
  canCreate: boolean;
  canEditOwn: boolean;
  responsibleId: number;
}) {
  const courses = useMemo(() => normalizeCourses(initialCourses), [initialCourses]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [institutionFilter, setInstitutionFilter] = useState("all");
  const error = initialError ? "Não foi possível carregar os cursos." : "";

  const visibleCourses = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return courses
      .filter((course) => {
        const institution = findInstitution(course, initialInstitutions);
        const matchesSearch = course.title
          .toLocaleLowerCase("pt-BR")
          .includes(query);
        const matchesStatus =
          statusFilter === "all" ||
          course.status === statusFilter ||
          (statusFilter === "approval-queue" &&
            course.status === "PENDING_APPROVAL");
        const matchesInstitution =
          institutionFilter === "all" ||
          institution?.id === Number(institutionFilter);
        return matchesSearch && matchesStatus && matchesInstitution;
      })
      .sort((a, b) => {
        const openOrder = Number(hasOpenEnrollment(b)) - Number(hasOpenEnrollment(a));
        if (openOrder) return openOrder;
        const publishedOrder =
          Number(b.status === "PUBLISHED") - Number(a.status === "PUBLISHED");
        if (publishedOrder) return publishedOrder;
        return Date.parse(a.startDate) - Date.parse(b.startDate);
      });
  }, [courses, initialInstitutions, search, statusFilter, institutionFilter]);

  return (
    <>
      <div className="page-header users-header courses-header">
        <div>
          <h1>Cursos</h1>
          <p>Cursos de extensão cadastrados</p>
        </div>
        {canCreate && (
          <Link className="button button-primary" href="/cursos/novo">
            <Icon name="school" size={16} /> Novo curso
          </Link>
        )}
      </div>

      {error && <div className="permissions-alert"><Alert>{error}</Alert></div>}
      {institutionsError && (
        <div className="permissions-alert">
          <Alert>{institutionsError}</Alert>
        </div>
      )}
      <div className="courses-toolbar" aria-label="Filtros de cursos">
        <div className="field courses-search">
          <Icon name="search" size={16} />
          <input
            className="input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome"
            aria-label="Buscar por nome"
          />
        </div>
        <div className="field courses-filter">
          <select
            className="input"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filtrar por status"
          >
            <option value="all">Status: Todos</option>
            {canManage && <option value="approval-queue">Fila de aprovação</option>}
            <option value="DRAFT">Rascunho</option>
            <option value="PENDING_APPROVAL">Em análise</option>
            <option value="APPROVED">Aprovado</option>
            <option value="PUBLISHED">Em andamento</option>
            <option value="CLOSED">Fechado</option>
            <option value="REJECTED">Indeferido</option>
          </select>
        </div>
        <div className="field courses-filter">
          <select
            className="input"
            value={institutionFilter}
            onChange={(event) => setInstitutionFilter(event.target.value)}
            aria-label="Filtrar por instituição"
            disabled={Boolean(institutionsError)}
          >
            <option value="all">Instituição: Todas</option>
            {initialInstitutions.map((institution) => (
              <option value={institution.id} key={institution.id}>
                {institution.acronym || institution.name}
                {institution.city ? ` - ${institution.city}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {visibleCourses.length ? (
        <div className="course-grid courses-list">
          {visibleCourses.map((course) => {
            const institution = findInstitution(course, initialInstitutions);
            const enrolled = enrollmentCount(course) ?? 0;
            const capacity = course.maxBeneficiaries;
            const progress = capacity > 0
              ? Math.min((enrolled / capacity) * 100, 100)
              : 0;
            const full = capacity > 0 && enrolled >= capacity;
            const canEdit =
              canManage ||
              (canEditOwn &&
                course.responsibleId === responsibleId &&
                course.status !== "CLOSED" &&
                course.status !== "PENDING_APPROVAL");

            return (
              <article className="card course-card" key={course.id}>
                <Link
                  className="course-card-link"
                  href={`/cursos/${course.id}`}
                  aria-label={`Ver curso ${course.title}`}
                >
                  <div className="course-cover">
                    <strong>{courseInitials(course.title)}</strong>
                    <StatusBadge status={course.status} />
                  </div>
                  <div className="course-body">
                    <h2>{course.title}</h2>
                    <p className="course-institution">
                      {institutionLabel(course, institution)}
                    </p>
                    <div className="course-meta">
                      <span>
                        <Icon name="calendar" size={13} />
                        {formatCourseDate(course.startDate)} – {formatCourseDate(course.endDateEstimated)}
                      </span>
                      <span>
                        <Icon name="calendar" size={13} />
                        {formatCourseTime(course.startDate)}–{formatCourseTime(course.endDateEstimated)}
                      </span>
                      <span>
                        <Icon name="hourglass" size={13} />
                        {course.executionHours} h
                      </span>
                    </div>
                    <div className="course-capacity">
                      <div className="course-capacity-label">
                        <span>Vagas</span>
                        <span>
                          {enrolled}/{capacity}
                          {full && " · Lotado"}
                        </span>
                      </div>
                      <div
                        className="course-progress"
                        role="progressbar"
                        aria-label={`Inscrições: ${enrolled} de ${capacity} vagas`}
                        aria-valuemin={0}
                        aria-valuemax={Math.max(capacity, 1)}
                        aria-valuenow={Math.min(enrolled, capacity)}
                      >
                        <span
                          className={full ? "course-progress-full" : ""}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
                {canEdit && (
                  <div className="course-card-actions">
                    <Link
                      className="button button-quiet"
                      href={`/cursos/${course.id}/editar`}
                    >
                      <Icon name="edit" size={14} /> Editar
                    </Link>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={
            search || statusFilter !== "all" || institutionFilter !== "all"
              ? "Nenhum curso encontrado"
              : "Nenhum curso cadastrado"
          }
          detail={
            statusFilter === "approval-queue"
              ? "Os cursos enviados para avaliação aparecerão nesta fila."
              : canCreate
                ? "Cadastre um curso ou ajuste os filtros para encontrá-lo."
                : "Volte em breve para conferir novas ações de extensão."
          }
        />
      )}
    </>
  );
}
