"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeEnrollmentDocuments } from "@/lib/enrollments";
import { Alert, Icon, StatusBadge } from "./ui";

const categories = [
  { value: "RG", label: "RG", required: true },
  { value: "CPF", label: "CPF", required: true },
  { value: "PROOF_OF_ADDRESS", label: "Comprovante de residência", required: true },
  { value: "PROOF_OF_INCOME", label: "Comprovante de renda", required: true },
  { value: "SCHOOL_TRANSCRIPT", label: "Histórico escolar", required: true },
  { value: "OTHER", label: "Outro", required: false },
];
const requiredCategories = categories.filter((item) => item.required);
const maxFileSize = 10 * 1024 * 1024;
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

function categoryValue(document: { category: string; fileName: string }) {
  if (categories.some((category) => category.value === document.category)) {
    return document.category;
  }
  const legacyLabels: Record<string, string> = {
    RG: "RG",
    CPF: "CPF",
    "Comprovante de residência": "PROOF_OF_ADDRESS",
    "Comprovante de renda": "PROOF_OF_INCOME",
    "Histórico escolar": "SCHOOL_TRANSCRIPT",
    Outro: "OTHER",
  };
  const prefix = Object.keys(legacyLabels).find((label) =>
    document.fileName.startsWith(`${label} - `),
  );
  return prefix ? legacyLabels[prefix] : "";
}

function categoryLabel(value: string) {
  return categories.find((category) => category.value === value)?.label ?? "Documento";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "America/Fortaleza",
      }).format(date);
}

export function EnrollmentDocuments({
  enrollmentId,
  courseTitle,
  status,
  rejectionReason = "",
  householdIncomeCents,
  householdSize,
  canUpdateHousehold,
  initialDocuments,
}: {
  enrollmentId: number;
  courseTitle: string;
  status: string;
  rejectionReason?: string;
  householdIncomeCents: number | null;
  householdSize: number | null;
  canUpdateHousehold: boolean;
  initialDocuments: unknown;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState(categories[0].value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [income, setIncome] = useState(
    householdIncomeCents === null ? "" : (householdIncomeCents / 100).toFixed(2),
  );
  const [size, setSize] = useState(
    householdSize === null ? "" : String(householdSize),
  );
  const [savingHousehold, setSavingHousehold] = useState(false);
  const [householdError, setHouseholdError] = useState("");
  const [householdSuccess, setHouseholdSuccess] = useState("");
  const [removingDocumentId, setRemovingDocumentId] = useState("");
  const documents = normalizeEnrollmentDocuments(initialDocuments);
  const submittedCategories = useMemo(
    () => new Set(documents.map(categoryValue).filter(Boolean)),
    [documents],
  );
  const requiredCount = requiredCategories.filter((item) =>
    submittedCategories.has(item.value),
  ).length;

  async function upload(file?: File) {
    if (!file) return;
    setError("");
    setSuccess("");
    if (!allowedTypes.has(file.type) || file.size === 0 || file.size > maxFileSize) {
      setError("Envie um arquivo PDF, JPG ou PNG de até 10 MB.");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("category", category);
    setBusy(true);
    try {
      const response = await fetch(
        `/api/enroll/enrollments/${enrollmentId}/documents`,
        { method: "POST", body: formData },
      );
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error ?? "Não foi possível enviar o documento.");
      }
      setSuccess("Documento enviado.");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível enviar o documento.");
    } finally {
      setBusy(false);
    }
  }

  async function saveHousehold(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHouseholdError("");
    setHouseholdSuccess("");
    setSavingHousehold(true);
    try {
      const response = await fetch(`/api/enroll/enrollments/${enrollmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdIncomeCents: Math.round(Number(income) * 100),
          householdSize: Number(size),
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error ?? "Não foi possível salvar os dados familiares.");
      }
      setHouseholdSuccess("Renda familiar salva.");
      router.refresh();
    } catch (caught) {
      setHouseholdError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar os dados familiares.",
      );
    } finally {
      setSavingHousehold(false);
    }
  }

  async function removeDocument(documentId: string) {
    if (!window.confirm("Deseja excluir este documento?")) return;
    setRemovingDocumentId(documentId);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(
        `/api/enroll/enrollments/${enrollmentId}/documents/${documentId}`,
        { method: "DELETE" },
      );
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error ?? "Não foi possível excluir o documento.");
      }
      setSuccess("Documento excluído.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível excluir o documento.");
    } finally {
      setRemovingDocumentId("");
    }
  }

  return (
    <>
      <div className="course-breadcrumb">
        <Link href="/minhas-inscricoes">Minhas inscrições</Link>
        <Icon name="arrow" size={14} />
        <span>{courseTitle}</span>
      </div>
      <div className="page-header">
        <div>
          <span className="enrollment-reference">Inscrição #{enrollmentId}</span>
          <h1>{courseTitle}</h1>
        </div>
        <StatusBadge status={status} kind="enrollment" />
      </div>

      {status === "REJECTED" && (
        <div className="permissions-alert">
          <Alert>
            <strong>Inscrição indeferida.</strong>{" "}
            Justificativa:{" "}
            {rejectionReason.trim() ||
              "A equipe não informou uma justificativa."}
          </Alert>
        </div>
      )}
      {error && <div className="permissions-alert"><Alert>{error}</Alert></div>}
      {success && <div className="permissions-alert"><Alert tone="success">{success}</Alert></div>}
      <div className="enrollment-document-layout">
        <div className="enrollment-document-sidebar">
          <section className="card enrollment-status-card">
            <h2>Situação</h2>
            <StatusBadge status={status} kind="enrollment" />
            <div className="enrollment-timeline">
              <span className="timeline-current">Inscrição realizada</span>
              <span>Análise do DEPPI</span>
            </div>
          </section>
          <section className="card family-income-card">
            <h2>Renda familiar</h2>
            {canUpdateHousehold ? (
              <form className="family-income-form" onSubmit={(event) => void saveHousehold(event)}>
                <label className="field">
                  <span>Renda mensal da família (R$)</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={income}
                    onChange={(event) => setIncome(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Pessoas no domicílio</span>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={size}
                    onChange={(event) => setSize(event.target.value)}
                  />
                </label>
                {householdIncomeCents !== null && householdSize && householdSize > 0 && (
                  <p className="family-income-per-capita">
                    Renda per capita:{" "}
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(householdIncomeCents / 100 / householdSize)}
                  </p>
                )}
                {householdError && <Alert>{householdError}</Alert>}
                {householdSuccess && <Alert tone="success">{householdSuccess}</Alert>}
                <button className="button button-secondary button-block" disabled={savingHousehold}>
                  {savingHousehold ? "Salvando..." : "Salvar renda"}
                </button>
              </form>
            ) : (
              <>
                <p>
                  Renda mensal:{" "}
                  {householdIncomeCents === null
                    ? "Não informada"
                    : new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(householdIncomeCents / 100)}
                </p>
                <p>Pessoas no domicílio: {householdSize ?? "Não informado"}</p>
              </>
            )}
          </section>
        </div>

        <section className="card enrollment-documents-card">
          <div className="enrollment-documents-head">
            <h2>Documentos</h2>
            <small>{requiredCount} de {requiredCategories.length} obrigatórios</small>
          </div>
          <div className="enrollment-doc-checklist">
            {categories.map((item) => (
              <div
                className={`enrollment-doc-check ${submittedCategories.has(item.value) ? "enrollment-doc-received" : ""}`}
                key={item.value}
              >
                <Icon name={submittedCategories.has(item.value) ? "check_circle" : "radio_button_unchecked"} size={14} />
                <span>{item.label}{item.required ? "" : " (opcional)"}</span>
              </div>
            ))}
          </div>

          <div
            className="enrollment-dropzone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void upload(event.dataTransfer.files[0]);
            }}
          >
            <Icon name="assignment" size={22} />
            <strong>Arraste o arquivo aqui ou escolha no computador</strong>
            <small>PDF, JPG ou PNG · até 10 MB</small>
            <div className="enrollment-upload-controls">
              <label className="field">
                <span>Categoria do documento</span>
                <select
                  className="input"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  disabled={busy}
                >
                  {categories.map((item) => (
                    <option value={item.value} key={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button button-primary"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
              >
                {busy ? "Enviando..." : "Escolher arquivo"}
              </button>
              <input
                ref={inputRef}
                className="enrollment-file-input"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                aria-label="Escolher documento para enviar"
                disabled={busy}
                onChange={(event) => void upload(event.target.files?.[0])}
              />
            </div>
          </div>

          <div className="enrollment-document-list">
            {documents.length ? documents.map((document) => (
              <div className="enrollment-document-row" key={document.id}>
                <Icon name="assignment" size={16} />
                <span>
                  <strong>{document.fileName}</strong>
                  <small>{categoryLabel(document.category || categoryValue(document))}</small>
                </span>
                <time>{formatDate(document.createdAt)}</time>
                <a
                  className="button button-secondary"
                  href={`/api/enroll/enrollments/${enrollmentId}/documents/${document.id}/download`}
                >
                  Baixar
                </a>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Excluir ${document.fileName}`}
                  disabled={removingDocumentId === document.id}
                  onClick={() => void removeDocument(document.id)}
                >
                  <Icon name="delete" size={16} />
                </button>
              </div>
            )) : (
              <p className="enrollment-no-documents">Você ainda não enviou documentos.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
