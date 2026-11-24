"use client";

import Link from "next/link";
import type { EnrollmentSummary } from "@/lib/types";
import { Alert, EmptyState, Icon, StatusBadge } from "./ui";

export function MyEnrollments({
  enrollments,
  initialError = false,
}: {
  enrollments: EnrollmentSummary[];
  initialError?: boolean;
}) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Minhas inscrições</h1>
          <p>Acompanhe suas solicitações e envie os documentos necessários.</p>
        </div>
        <Link className="button button-secondary" href="/cursos">
          <Icon name="school" size={16} /> Ver cursos
        </Link>
      </div>
      {initialError && (
        <div className="permissions-alert">
          <Alert>Não foi possível carregar suas inscrições. Tente novamente.</Alert>
        </div>
      )}
      <div className="card list-card enrollment-list">
        {enrollments.length ? (
          enrollments.map((enrollment) => (
            <div className="enrollment-list-row" key={enrollment.id}>
              <span>
                <strong>{enrollment.course.title}</strong>
                <small>
                  {enrollment.documents.length} documento
                  {enrollment.documents.length === 1 ? "" : "s"} anexado
                  {enrollment.documents.length === 1 ? "" : "s"}
                </small>
                {enrollment.status === "REJECTED" && (
                  <small>
                    Justificativa:{" "}
                    {enrollment.rejectionReason?.trim() ||
                      "A equipe não informou uma justificativa."}
                  </small>
                )}
              </span>
              <StatusBadge status={enrollment.status} kind="enrollment" />
              <div className="enrollment-row-links">
                <Link
                  className="button button-secondary"
                  href={`/minhas-inscricoes/${enrollment.id}`}
                >
                  Ver inscrição
                </Link>
                {enrollment.status === "APPROVED" && (
                  <Link
                    className="button button-primary"
                    href={`/cursos/${enrollment.course.id}/materiais`}
                  >
                    Materiais didáticos
                  </Link>
                )}
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title="Você ainda não tem inscrições"
            detail="Confira os cursos disponíveis e solicite sua inscrição."
          />
        )}
      </div>
    </>
  );
}
