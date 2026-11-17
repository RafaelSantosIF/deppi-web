"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EnrollmentQueueItem } from "@/lib/types";
import { Alert, Icon, StatusBadge } from "./ui";

const categoryLabels: Record<string, string> = {
  RG: "RG",
  CPF: "CPF",
  PROOF_OF_ADDRESS: "Comprovante de residência",
  PROOF_OF_INCOME: "Comprovante de renda",
  SCHOOL_TRANSCRIPT: "Histórico escolar",
  OTHER: "Outro",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeZone: "America/Fortaleza",
      }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Fortaleza",
      }).format(date);
}

function formatIncome(value: number | null) {
  if (value === null) return "Não informada";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

function formatFileSize(value?: number) {
  if (typeof value !== "number") return "";
  return value >= 1024 * 1024
    ? `${(value / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`
    : `${Math.max(1, Math.round(value / 1024))} KB`;
}

export function EnrollmentReview({ enrollment }: { enrollment: EnrollmentQueueItem }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function decide(status: "APPROVED" | "REJECTED" | "WAITLISTED") {
    let reason: string | undefined;
    if (status === "REJECTED") {
      reason = window.prompt("Informe o motivo do indeferimento:")?.trim();
      if (!reason) return;
    }
    if (
      status === "WAITLISTED" &&
      !window.confirm("Deseja colocar esta inscrição na lista de espera?")
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/enroll/enrollments/${enrollment.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
        },
      );
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error ?? "Não foi possível registrar a decisão.");
      }
      router.replace("/inscricoes");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível registrar a decisão.");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="course-breadcrumb">
        <Link href="/inscricoes">Fila de inscrições</Link>
        <Icon name="arrow" size={14} />
        <span>{enrollment.name}</span>
      </div>
      <div className="page-header enrollment-review-header">
        <div>
          <span className="enrollment-reference">
            Inscrição #{enrollment.id} · {enrollment.course.title}
          </span>
          <h1>{enrollment.name}</h1>
          <p>{enrollment.institution}</p>
        </div>
        <StatusBadge status={enrollment.status} kind="enrollment" />
      </div>

      {error && <div className="permissions-alert"><Alert>{error}</Alert></div>}

      <div className="enrollment-review-layout">
        <section className="card enrollment-review-data">
          <div className="enrollment-review-section">
            <h2>Dados da inscrição</h2>
            <dl className="enrollment-review-grid">
              <div><dt>Categoria</dt><dd>{enrollment.category || "—"}</dd></div>
              <div><dt>Vínculo</dt><dd>{enrollment.bond || "—"}</dd></div>
              <div><dt>Recebe bolsa</dt><dd>{enrollment.receivesScholarship ? "Sim" : "Não"}</dd></div>
              <div><dt>Horas dedicadas</dt><dd>{enrollment.dedicatedHours} h/semana</dd></div>
              <div><dt>Início da participação</dt><dd>{formatDate(enrollment.participationStart)}</dd></div>
              <div><dt>Fim da participação</dt><dd>{formatDate(enrollment.participationEnd ?? "")}</dd></div>
              <div><dt>Solicitada em</dt><dd>{formatDateTime(enrollment.createdAt)}</dd></div>
            </dl>
          </div>

          <div className="enrollment-review-section">
            <h2>Renda familiar</h2>
            <dl className="enrollment-review-grid">
              <div><dt>Renda mensal</dt><dd>{formatIncome(enrollment.householdIncomeCents)}</dd></div>
              <div><dt>Pessoas no domicílio</dt><dd>{enrollment.householdSize ?? "Não informado"}</dd></div>
              <div>
                <dt>Renda per capita</dt>
                <dd>
                  {enrollment.householdIncomeCents !== null &&
                  enrollment.householdSize !== null &&
                  enrollment.householdSize > 0
                    ? formatIncome(Math.round(enrollment.householdIncomeCents / enrollment.householdSize))
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="enrollment-review-section">
            <div className="enrollment-review-documents-heading">
              <h2>Documentos enviados</h2>
              <span>{enrollment.documents.length}</span>
            </div>
            {enrollment.documents.length ? (
              <div className="enrollment-review-documents">
                {enrollment.documents.map((document) => (
                  <div className="enrollment-review-document" key={document.id}>
                    <Icon name="assignment" size={17} />
                    <span>
                      <strong>{categoryLabels[document.category] ?? "Documento"}</strong>
                      <small>
                        {document.fileName} · {formatDate(document.createdAt)}
                        {document.size ? ` · ${formatFileSize(document.size)}` : ""}
                      </small>
                    </span>
                    <a
                      className="button button-secondary"
                      href={`/api/enroll/enrollments/${enrollment.id}/documents/${document.id}/download`}
                    >
                      Baixar
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="field-note">Nenhum documento anexado.</p>
            )}
          </div>
        </section>

        <aside className="card enrollment-review-actions">
          <h2>Análise do DEPPI</h2>
          {enrollment.status === "PENDING" ? (
            <>
              <p>Confira os dados e documentos antes de decidir.</p>
              <button
                className="button button-primary button-block"
                disabled={busy}
                onClick={() => void decide("APPROVED")}
              >
                <Icon name="check" size={15} /> Aprovar inscrição
              </button>
              <button
                className="button button-secondary button-block"
                disabled={busy}
                onClick={() => void decide("WAITLISTED")}
              >
                Colocar na lista de espera
              </button>
              <button
                className="button button-danger-outline button-block"
                disabled={busy}
                onClick={() => void decide("REJECTED")}
              >
                Rejeitar inscrição
              </button>
            </>
          ) : (
            <p>Esta inscrição já recebeu uma decisão.</p>
          )}
          <Link className="button button-quiet button-block" href="/inscricoes">
            Voltar à fila
          </Link>
        </aside>
      </div>
    </>
  );
}
