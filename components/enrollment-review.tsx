"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
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
  const [dialogStatus, setDialogStatus] = useState<
    "APPROVED" | "REJECTED" | "WAITLISTED" | null
  >(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  function openDecision(status: "APPROVED" | "REJECTED" | "WAITLISTED") {
    setDialogStatus(status);
    setReason("");
    setReasonError("");
    setError("");
  }

  async function decide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialogStatus || busy) return;
    const trimmedReason = reason.trim();
    if (dialogStatus === "REJECTED" && trimmedReason.length > 0 && trimmedReason.length < 3) {
      setReasonError("Informe pelo menos 3 caracteres ou deixe o motivo em branco.");
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
          body: JSON.stringify({
            status: dialogStatus,
            ...(trimmedReason ? { reason: trimmedReason } : {}),
          }),
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

  const decisionTitle =
    dialogStatus === "APPROVED"
      ? "Deferir inscrição"
      : dialogStatus === "REJECTED"
        ? "Indeferir inscrição"
        : "Colocar na lista de espera";

  return (
    <>
      <div className="page-header enrollment-review-header">
        <div>
          <div className="enrollment-review-title">
            <h1>{enrollment.name}</h1>
            <StatusBadge status={enrollment.status} kind="enrollment" />
          </div>
          <p>
            {enrollment.course.title} · inscrita em {formatDate(enrollment.createdAt)}
          </p>
        </div>
        {enrollment.status === "PENDING" ? (
          <div className="enrollment-review-toolbar">
            <Link className="button button-secondary" href="/inscricoes">
              <Icon name="block" size={14} /> Cancelar
            </Link>
            <button
              className="button button-secondary"
              disabled={busy}
              onClick={() => openDecision("WAITLISTED")}
            >
              Colocar na espera
            </button>
            <button
              className="button button-danger-outline"
              disabled={busy}
              onClick={() => openDecision("REJECTED")}
            >
              <Icon name="close_circle" size={14} /> Indeferir
            </button>
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() => openDecision("APPROVED")}
            >
              <Icon name="check_circle" size={14} /> Deferir
            </button>
          </div>
        ) : (
          <Link className="button button-secondary" href="/inscricoes">
            Voltar às inscrições
          </Link>
        )}
      </div>

      {error && !dialogStatus && <div className="permissions-alert"><Alert>{error}</Alert></div>}

      <div className="enrollment-review-layout">
        <div className="enrollment-review-column">
          <section className="card enrollment-review-data">
            <div className="enrollment-review-section">
              <h2>Aluno</h2>
              <dl className="enrollment-review-grid">
                <div><dt>E-mail</dt><dd>{enrollment.email || "—"}</dd></div>
                <div><dt>Matrícula</dt><dd>{enrollment.registration || "—"}</dd></div>
                <div><dt>Instituição</dt><dd>{enrollment.institution || "—"}</dd></div>
                <div><dt>Categoria</dt><dd>{enrollment.category || "—"}</dd></div>
                <div><dt>Vínculo</dt><dd>{enrollment.bond || "—"}</dd></div>
                <div><dt>Recebe bolsa</dt><dd>{enrollment.receivesScholarship ? "Sim" : "Não"}</dd></div>
                <div><dt>Horas dedicadas</dt><dd>{enrollment.dedicatedHours} h/semana</dd></div>
                <div><dt>Período</dt><dd>{formatDate(enrollment.participationStart)} – {formatDate(enrollment.participationEnd ?? "")}</dd></div>
              </dl>
            </div>
          </section>

          <section className="card enrollment-review-data">
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
          </section>
        </div>

        <div className="enrollment-review-column">
          <section className="card enrollment-review-data">
            <div className="enrollment-review-section">
              <div className="enrollment-review-documents-heading">
                <h2>Documentos</h2>
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

          <section className="card enrollment-review-data">
            <div className="enrollment-review-section">
              <h2>Registro da inscrição</h2>
            <dl className="enrollment-review-grid">
                <div><dt>Inscrição</dt><dd>#{enrollment.id}</dd></div>
                <div><dt>Solicitada em</dt><dd>{formatDateTime(enrollment.createdAt)}</dd></div>
                <div><dt>Curso</dt><dd>{enrollment.course.title}</dd></div>
                <div><dt>Situação atual</dt><dd><StatusBadge status={enrollment.status} kind="enrollment" /></dd></div>
            </dl>
            </div>
          </section>
        </div>
      </div>

      {dialogStatus && (
        <div
          className="enrollment-decision-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !busy) setDialogStatus(null);
          }}
        >
          <form
            className={`card enrollment-decision-modal ${dialogStatus === "REJECTED" ? "enrollment-decision-reject" : ""}`}
            onSubmit={(event) => void decide(event)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="enrollment-decision-title"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !busy) setDialogStatus(null);
            }}
          >
            <div className="enrollment-decision-heading">
              <h2 id="enrollment-decision-title">{decisionTitle}</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setDialogStatus(null)}
                disabled={busy}
                aria-label="Fechar"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
            <p>
              {dialogStatus === "REJECTED"
                ? `A inscrição de ${enrollment.name} passará para “Indeferida”. O motivo ficará registrado no histórico.`
                : dialogStatus === "APPROVED"
                  ? `Confirma o deferimento da inscrição de ${enrollment.name} para ${enrollment.course.title}?`
                  : `Confirma a inclusão da inscrição de ${enrollment.name} na lista de espera?`}
            </p>
            {dialogStatus === "REJECTED" && (
              <div className="field enrollment-decision-reason">
                <label htmlFor="enrollment-rejection-reason">Motivo (opcional)</label>
                <textarea
                  id="enrollment-rejection-reason"
                  className="input"
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                    setReasonError("");
                  }}
                  maxLength={255}
                  aria-invalid={Boolean(reasonError)}
                  aria-describedby={reasonError ? "enrollment-reason-error" : "enrollment-reason-help"}
                  autoFocus
                />
                <span
                  className={reasonError ? "field-error" : "field-note"}
                  id={reasonError ? "enrollment-reason-error" : "enrollment-reason-help"}
                >
                  {reasonError || "Entre 3 e 255 caracteres se informar o motivo."}
                </span>
                <span className="enrollment-decision-count">{reason.length} / 255</span>
              </div>
            )}
            {error && <Alert>{error}</Alert>}
            <div className="enrollment-decision-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setDialogStatus(null)}
                disabled={busy}
              >
                Voltar
              </button>
              <button
                className={`button ${dialogStatus === "REJECTED" ? "button-danger" : "button-primary"}`}
                disabled={busy}
                autoFocus={dialogStatus !== "REJECTED"}
              >
                {busy ? "Registrando..." : decisionTitle}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
