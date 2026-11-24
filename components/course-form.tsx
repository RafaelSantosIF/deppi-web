"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import type { CourseProfessor, CourseSummary, Institution } from "@/lib/types";
import { Alert, Icon } from "./ui";

export type CoursePayload = {
  campus: string;
  actionType: string;
  title: string;
  thematicArea: string;
  extensionLine: string;
  startDate: string;
  endDateEstimated: string;
  minBeneficiaries: number;
  maxBeneficiaries: number;
  executionHours: number;
  responsibleId: number;
  location: string;
  funding: string;
  institutionalProgram: string;
  offerModel: string;
  coverageMunicipalities: string[];
  evaluationMethods: string[];
  disclosureMethods: string[];
  activitiesPerformed: string;
};

function localDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function initialValues(
  course: CourseSummary | null,
  responsibleId: number,
): CoursePayload {
  return {
    campus: course?.campus ?? "",
    actionType: course?.actionType ?? "Curso",
    title: course?.title ?? "",
    thematicArea: course?.thematicArea ?? "",
    extensionLine: course?.extensionLine ?? "",
    startDate: localDate(course?.startDate),
    endDateEstimated: localDate(course?.endDateEstimated),
    minBeneficiaries: course?.minBeneficiaries ?? 1,
    maxBeneficiaries: course?.maxBeneficiaries ?? 20,
    executionHours: course?.executionHours ?? 40,
    responsibleId: course?.responsibleId ?? responsibleId,
    location: course?.location ?? "",
    funding: course?.funding ?? "",
    institutionalProgram: course?.institutionalProgram ?? "",
    offerModel: course?.offerModel ?? "Presencial",
    coverageMunicipalities: course?.coverageMunicipalities ?? [],
    evaluationMethods: course?.evaluationMethods ?? [],
    disclosureMethods: course?.disclosureMethods ?? [],
    activitiesPerformed: course?.activitiesPerformed ?? "",
  };
}

function splitList(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function CourseForm({
  course,
  institutions,
  institutionsError = "",
  responsibleId,
  responsibleName,
  professors,
  professorsError = "",
  canAssignResponsible,
  busy,
  error,
  onCancel,
  onSubmit,
}: {
  course: CourseSummary | null;
  institutions: Institution[];
  institutionsError?: string;
  responsibleId: number;
  responsibleName: string;
  professors: CourseProfessor[];
  professorsError?: string;
  canAssignResponsible: boolean;
  busy: boolean;
  error?: string;
  onCancel: string;
  onSubmit: (
    payload: CoursePayload,
    cover: File | null,
    submitForApproval: boolean,
  ) => Promise<void>;
}) {
  const [values, setValues] = useState(() =>
    initialValues(
      course,
      canAssignResponsible ? (course?.responsibleId ?? 0) : responsibleId,
    ),
  );
  const [cover, setCover] = useState<File | null>(null);
  const [localError, setLocalError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [institutionSearch, setInstitutionSearch] = useState(() => {
    const selected = institutions.find(
      (institution) => institution.name === values.campus,
    );
    return selected
      ? `${selected.name}${selected.city ? ` - ${selected.city}` : ""}`
      : "";
  });
  const [institutionPickerOpen, setInstitutionPickerOpen] = useState(false);
  const institutionPicker = useRef<HTMLDivElement>(null);
  const extraFields = useRef<HTMLDetailsElement>(null);
  const preview = useMemo(
    () => (cover ? URL.createObjectURL(cover) : course?.coverUrl ?? ""),
    [cover, course?.coverUrl],
  );
  const dateError =
    values.startDate &&
    values.endDateEstimated &&
    new Date(values.endDateEstimated) <= new Date(values.startDate);
  const selectedInstitution = institutions.find(
    (institution) => institution.name === values.campus,
  );
  const selectedInstitutionLabel = selectedInstitution
    ? `${selectedInstitution.name}${selectedInstitution.city ? ` - ${selectedInstitution.city}` : ""}`
    : "";
  const institutionQuery =
    institutionSearch === selectedInstitutionLabel
      ? ""
      : institutionSearch.trim().toLocaleLowerCase("pt-BR");
  const visibleInstitutions = useMemo(
    () =>
      institutions.filter((institution) =>
        `${institution.name} ${institution.acronym ?? ""} ${institution.city ?? ""}`
          .toLocaleLowerCase("pt-BR")
          .includes(institutionQuery),
      ),
    [institutions, institutionQuery],
  );

  useEffect(() => {
    return () => {
      if (cover) URL.revokeObjectURL(preview);
    };
  }, [cover, preview]);

  function update<K extends keyof CoursePayload>(key: K, value: CoursePayload[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function selectCover(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setLocalError("A capa deve estar no formato JPG ou PNG.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLocalError("A capa deve ter no máximo 5 MB.");
      return;
    }
    setLocalError("");
    setCover(file);
  }

  function dropCover(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    selectCover(event.dataTransfer.files[0]);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.startDate || !values.endDateEstimated || dateError) {
      setLocalError("A data de término deve ser posterior à data de início.");
      return;
    }
    if (values.maxBeneficiaries < values.minBeneficiaries) {
      setLocalError("O número de vagas deve ser igual ou superior ao mínimo.");
      return;
    }
    if (!institutions.some((institution) => institution.name === values.campus)) {
      setLocalError("Selecione uma instituição cadastrada.");
      return;
    }
    if (
      !values.actionType.trim() ||
      !values.thematicArea.trim() ||
      !values.extensionLine.trim() ||
      !values.location.trim() ||
      !values.funding.trim() ||
      !values.activitiesPerformed.trim()
    ) {
      if (extraFields.current) extraFields.current.open = true;
      setLocalError("Preencha as outras informações obrigatórias do curso.");
      return;
    }
    setLocalError("");
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const submitForApproval =
      submitter instanceof HTMLButtonElement &&
      submitter.value === "submit-for-approval";
    void onSubmit(
      {
        ...values,
        startDate: new Date(values.startDate).toISOString(),
        endDateEstimated: new Date(values.endDateEstimated).toISOString(),
      },
      cover,
      submitForApproval,
    );
  }

  return (
    <div className="course-editor-page">
      <nav className="course-breadcrumb" aria-label="Navegação estrutural">
        <Link href="/cursos">Cursos</Link>
        <Icon name="arrow" size={14} />
        <span>{course ? "Editar curso" : "Novo curso"}</span>
      </nav>

      <div className="course-editor-heading">
        <h1>{course ? "Editar curso" : "Novo curso"}</h1>
        <p>
          {course
            ? "Atualize as informações do curso."
            : "O curso será criado como rascunho. Envie-o para avaliação quando estiver pronto."}
        </p>
      </div>

      {(error || localError || professorsError || institutionsError) && (
        <div className="course-editor-alerts">
          {error && <Alert>{error}</Alert>}
          {localError && <Alert>{localError}</Alert>}
          {professorsError && <Alert>{professorsError}</Alert>}
          {institutionsError && <Alert>{institutionsError}</Alert>}
        </div>
      )}
      {course?.status === "REJECTED" && (
        <div className="course-editor-alerts">
          <Alert>
            <strong>O DEPPI indeferiu este curso.</strong>{" "}
            Justificativa:{" "}
            {course.rejectionReason?.trim() ||
              "O DEPPI não informou uma justificativa."}
          </Alert>
        </div>
      )}

      <form className="course-editor-form" onSubmit={submit}>
        <section className="card course-editor-info">
          <h2>Informações</h2>
          <div className="course-editor-grid">
            <div className="field course-field-wide">
              <label htmlFor="course-title">Nome do curso</label>
              <input id="course-title" className="input" required minLength={3} value={values.title} onChange={(event) => update("title", event.target.value)} />
            </div>
            <div className="field course-field-wide">
              <label htmlFor="course-campus">Instituição</label>
              <div
                className="institution-picker"
                ref={institutionPicker}
                onBlur={(event) => {
                  if (
                    !institutionPicker.current?.contains(
                      event.relatedTarget as Node | null,
                    )
                  ) {
                    setInstitutionPickerOpen(false);
                  }
                }}
              >
                <input
                  id="course-campus"
                  className="input"
                  type="text"
                  required
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls="course-institution-options"
                  aria-expanded={institutionPickerOpen}
                  aria-label="Instituição do curso"
                  value={institutionSearch}
                  disabled={busy || Boolean(institutionsError)}
                  placeholder="Selecione ou pesquise uma instituição"
                  onFocus={(event) => {
                    event.currentTarget.select();
                    setInstitutionPickerOpen(true);
                  }}
                  onChange={(event) => {
                    setInstitutionSearch(event.target.value);
                    update("campus", "");
                    setInstitutionPickerOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setInstitutionPickerOpen(false);
                    if (event.key === "Enter" && institutionPickerOpen) {
                      const first = visibleInstitutions[0];
                      if (first) {
                        event.preventDefault();
                        update("campus", first.name);
                        setInstitutionSearch(
                          `${first.name}${first.city ? ` - ${first.city}` : ""}`,
                        );
                        setInstitutionPickerOpen(false);
                      }
                    }
                  }}
                />
                {institutionPickerOpen && (
                  <div
                    className="institution-picker-options"
                    id="course-institution-options"
                    role="listbox"
                    aria-label="Instituições disponíveis"
                  >
                    {visibleInstitutions.length ? (
                      visibleInstitutions.map((institution) => (
                        <button
                          className="institution-picker-option"
                          type="button"
                          role="option"
                          aria-selected={institution.name === values.campus}
                          key={institution.id}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            update("campus", institution.name);
                            setInstitutionSearch(
                              `${institution.name}${institution.city ? ` - ${institution.city}` : ""}`,
                            );
                            setInstitutionPickerOpen(false);
                          }}
                        >
                          {institution.name}
                          {institution.city && ` - ${institution.city}`}
                        </button>
                      ))
                    ) : (
                      <p className="institution-picker-empty">
                        Nenhuma instituição encontrada.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="field">
              <label htmlFor="course-hours">Carga horária (horas)</label>
              <input id="course-hours" className="input" type="number" min={1} required value={values.executionHours} onChange={(event) => update("executionHours", Number(event.target.value))} />
            </div>
            <div className="field">
              <label htmlFor="course-capacity">Vagas</label>
              <input id="course-capacity" className="input" type="number" min={values.minBeneficiaries} required value={values.maxBeneficiaries} onChange={(event) => update("maxBeneficiaries", Number(event.target.value))} />
            </div>
            <div className="field">
              <label htmlFor="course-start">Data e horário de início</label>
              <input id="course-start" className="input" type="datetime-local" required value={values.startDate} onChange={(event) => update("startDate", event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="course-end">Data e horário de término</label>
              <input id="course-end" className="input" type="datetime-local" required aria-invalid={Boolean(dateError)} value={values.endDateEstimated} onChange={(event) => update("endDateEstimated", event.target.value)} />
              {dateError && <small className="field-error">A data de término deve ser posterior à data de início.</small>}
            </div>
            <div className="field">
              <label htmlFor="course-min">Vagas mínimas</label>
              <input id="course-min" className="input" type="number" min={1} required value={values.minBeneficiaries} onChange={(event) => update("minBeneficiaries", Number(event.target.value))} />
            </div>
            <div className="field">
              <label htmlFor="course-responsible">Professor responsável</label>
              {canAssignResponsible ? (
                <select
                  id="course-responsible"
                  className="input"
                  required
                  value={values.responsibleId || ""}
                  disabled={busy || Boolean(professorsError)}
                  onChange={(event) => update("responsibleId", Number(event.target.value))}
                >
                  <option value="">Selecione um professor</option>
                  {course?.responsible &&
                    !professors.some((professor) => professor.id === course.responsible?.id) && (
                      <option value={course.responsible.id}>
                        {course.responsible.name} (atual)
                      </option>
                    )}
                  {professors.map((professor) => (
                    <option value={professor.id} key={professor.id}>
                      {professor.name}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input id="course-responsible" className="input" value={responsibleName} readOnly />
                  <small className="field-note">Você será definido como responsável pelo curso.</small>
                </>
              )}
            </div>
          </div>

          <details className="course-extra-fields" ref={extraFields}>
            <summary>Outras informações necessárias</summary>
            <div className="course-editor-grid">
              <div className="field">
                <label htmlFor="course-action">Tipo de ação</label>
                <input id="course-action" className="input" value={values.actionType} onChange={(event) => update("actionType", event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="course-thematic-area">Área temática</label>
                <input id="course-thematic-area" className="input" value={values.thematicArea} onChange={(event) => update("thematicArea", event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="course-extension-line">Linha de extensão</label>
                <input id="course-extension-line" className="input" value={values.extensionLine} onChange={(event) => update("extensionLine", event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="course-location">Local de realização</label>
                <input id="course-location" className="input" value={values.location} onChange={(event) => update("location", event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="course-funding">Financiamento</label>
                <input id="course-funding" className="input" value={values.funding} onChange={(event) => update("funding", event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="course-program">Programa institucional</label>
                <input id="course-program" className="input" value={values.institutionalProgram} onChange={(event) => update("institutionalProgram", event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="course-offer">Modalidade</label>
                <select id="course-offer" className="input" value={values.offerModel} onChange={(event) => update("offerModel", event.target.value)}>
                  <option>Presencial</option>
                  <option>Híbrido</option>
                  <option>EAD</option>
                </select>
              </div>
              {([
                ["coverageMunicipalities", "Municípios de abrangência"],
                ["evaluationMethods", "Métodos de avaliação"],
                ["disclosureMethods", "Formas de divulgação"],
              ] as const).map(([key, label]) => (
                <div className="field" key={key}>
                  <label htmlFor={`course-${key}`}>{label}</label>
                  <textarea id={`course-${key}`} className="input" rows={2} value={values[key].join("\n")} onChange={(event) => update(key, splitList(event.target.value))} />
                </div>
              ))}
              <div className="field course-field-wide">
                <label htmlFor="course-activities">Atividades realizadas</label>
                <textarea id="course-activities" className="input" rows={3} value={values.activitiesPerformed} onChange={(event) => update("activitiesPerformed", event.target.value)} />
              </div>
            </div>
          </details>
        </section>

        <aside className="card course-cover-panel">
          <h2>Capa</h2>
          <label
            className={`course-cover-drop ${dragging ? "course-cover-drop-active" : ""} ${preview ? "course-cover-drop-preview" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={dropCover}
            style={preview ? { backgroundImage: `url("${preview}")` } : undefined}
          >
            {!preview && <Icon name="assignment" size={23} />}
            <span>{preview ? cover?.name ?? "Capa atual" : <>Arraste uma imagem aqui ou <strong>escolha no computador</strong></>}</span>
            <small>JPG ou PNG · até 5 MB</small>
            <input type="file" accept="image/png,image/jpeg" aria-label="Selecionar capa do curso" disabled={busy} onChange={(event) => selectCover(event.target.files?.[0])} />
          </label>
          <small className="field-note">Sem capa, o curso mostra as iniciais do nome.</small>
        </aside>

        <div className="course-editor-actions">
          <Link className="button button-secondary" href={onCancel}>Cancelar</Link>
          <button
            type="submit"
            name="action"
            value="save-draft"
            className="button button-secondary"
            disabled={busy || Boolean(dateError) || Boolean(professorsError) || Boolean(institutionsError)}
          >
            <Icon name="check" size={16} /> {busy ? "Salvando..." : course ? "Salvar alterações" : "Salvar rascunho"}
          </button>
          {(!course || course.status === "DRAFT" || course.status === "REJECTED") && (
            <button
              type="submit"
              name="action"
              value="submit-for-approval"
              className="button button-primary"
              disabled={busy || Boolean(dateError) || Boolean(professorsError) || Boolean(institutionsError)}
            >
              <Icon name="check" size={16} /> {busy ? "Enviando..." : "Salvar e enviar para avaliação"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
