"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CourseSummary, EnrollmentSummary } from "@/lib/types";
import { Alert, EmptyState, Icon, StatusBadge } from "./ui";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Fortaleza",
});

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Data não informada" : dateFormatter.format(date);
}

function initials(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toLocaleUpperCase("pt-BR");
}

export function StudentCourses({
  initialCourses,
  initialEnrollments,
  initialError = false,
}: {
  initialCourses: CourseSummary[];
  initialEnrollments: EnrollmentSummary[];
  initialError?: boolean;
}) {
  const [search, setSearch] = useState("");
  const courses = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return initialCourses.filter((course) =>
      `${course.title} ${course.campus}`
        .toLocaleLowerCase("pt-BR")
        .includes(query),
    );
  }, [initialCourses, search]);
  const enrollmentStatusesByCourseId = new Map(
    initialEnrollments.map((enrollment) => [
      enrollment.course.id,
      enrollment.status,
    ]),
  );

  return (
    <>
      <div className="page-header users-header courses-header">
        <div>
          <h1>Cursos</h1>
          <p>Cursos com inscrições abertas</p>
        </div>
        <Link className="button button-secondary" href="/minhas-inscricoes">
          <Icon name="assignment" size={16} /> Minhas inscrições
        </Link>
      </div>

      {initialError && (
        <div className="permissions-alert">
          <Alert>Não foi possível carregar os cursos ou suas inscrições. Tente novamente.</Alert>
        </div>
      )}

      <div className="courses-toolbar student-courses-toolbar" aria-label="Filtros de cursos">
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
      </div>

      {courses.length ? (
        <div className="course-grid courses-list">
          {courses.map((course) => {
            const enrolled = course.enrolled ?? course.enrollmentsCount ?? course._count?.enrollments ?? 0;
            const remaining = Math.max(course.maxBeneficiaries - enrolled, 0);
            const progress = course.maxBeneficiaries
              ? Math.min((enrolled / course.maxBeneficiaries) * 100, 100)
              : 0;
            const enrollmentStatus = enrollmentStatusesByCourseId.get(course.id);
            const alreadyEnrolled = enrollmentStatus !== undefined;

            return (
              <article className="card course-card student-course-card" key={course.id}>
                <Link
                  className="course-card-link"
                  href={`/cursos/${course.id}`}
                  aria-label={`Ver curso ${course.title}`}
                >
                  <div
                    className={`course-cover ${course.coverUrl ? "student-course-cover-image" : ""}`}
                    style={course.coverUrl ? { backgroundImage: `url("${course.coverUrl}")` } : undefined}
                  >
                    {!course.coverUrl && <strong>{initials(course.title)}</strong>}
                    <StatusBadge status={course.status} />
                  </div>
                  <div className="course-body">
                    <h2>{course.title}</h2>
                    <p className="course-institution">{course.campus}</p>
                    <div className="course-meta">
                      <span>
                        <Icon name="calendar" size={13} />
                        {formatDate(course.startDate)} – {formatDate(course.endDateEstimated)}
                      </span>
                      <span>
                        <Icon name="schedule" size={13} />
                        {course.executionHours} h
                      </span>
                    </div>
                    <div className="course-capacity">
                      <div className="course-capacity-label">
                        <span>Vagas disponíveis</span>
                        <span>{remaining}/{course.maxBeneficiaries}</span>
                      </div>
                      <div
                        className="course-progress"
                        role="progressbar"
                        aria-label={`Vagas ocupadas: ${enrolled} de ${course.maxBeneficiaries}`}
                        aria-valuemin={0}
                        aria-valuemax={Math.max(course.maxBeneficiaries, 1)}
                        aria-valuenow={Math.min(enrolled, course.maxBeneficiaries)}
                      >
                        <span style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="course-card-actions student-course-actions">
                  {alreadyEnrolled ? (
                    <Link className="button button-secondary" href="/minhas-inscricoes">
                      <Icon name="check" size={14} />
                      {enrollmentStatus === "APPROVED" ? "Inscrito" : "Inscrição solicitada"}
                    </Link>
                  ) : (
                    <Link className="button button-primary" href={`/cursos/${course.id}`}>
                      Ver curso e inscrever-se
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={search ? "Nenhum curso encontrado" : "Nenhum curso disponível"}
          detail={
            search
              ? "Tente buscar por outro nome ou instituição."
              : "Novos cursos com inscrições abertas aparecerão aqui."
          }
        />
      )}
    </>
  );
}
