import Link from "next/link";
import type { CourseMaterial } from "@/lib/types";
import { EmptyState, Icon } from "./ui";

function formatFileSize(value?: number) {
  if (typeof value !== "number") return "";
  return value >= 1024 * 1024
    ? `${(value / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`
    : `${Math.max(1, Math.round(value / 1024))} KB`;
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeZone: "America/Fortaleza",
      }).format(date);
}

export function CourseMaterialsLibrary({
  courseId,
  courseTitle,
  materials,
}: {
  courseId: number;
  courseTitle: string;
  materials: CourseMaterial[];
}) {
  return (
    <div className="course-materials-page">
      <div className="course-breadcrumb">
        <Link href="/cursos">Cursos</Link>
        <Icon name="arrow" size={14} />
        <Link href={`/cursos/${courseId}`}>{courseTitle}</Link>
        <Icon name="arrow" size={14} />
        <span>Materiais didáticos</span>
      </div>
      <div className="page-header">
        <div>
          <h1>Materiais didáticos</h1>
          <p>{courseTitle}</p>
        </div>
        <Link className="button button-secondary" href={`/cursos/${courseId}`}>
          Voltar ao curso
        </Link>
      </div>
      <section className="card course-material-library">
        {materials.length ? (
          <div className="course-material-list">
            {materials.map((material) => (
              <div className="course-material-row" key={material.id}>
                <Icon name="assignment" size={18} />
                <span>
                  <strong>{material.fileName}</strong>
                  <small>
                    {[formatDate(material.createdAt), formatFileSize(material.size)]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </span>
                <a
                  className="button button-secondary"
                  href={`/api/courses/${courseId}/files/${encodeURIComponent(material.id)}/download`}
                >
                  <Icon name="arrow" size={14} /> Baixar
                </a>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nenhum material disponível"
            detail="O professor ainda não adicionou materiais didáticos a este curso."
          />
        )}
      </section>
    </div>
  );
}
