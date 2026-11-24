"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import type { CourseMaterial } from "@/lib/types";
import { Alert, EmptyState, Icon } from "./ui";
import { normalizeCourseMaterials } from "@/lib/course-materials";

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

export function CourseMaterialsManager({ courseId }: { courseId: number }) {
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<CourseMaterial | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadMaterials() {
    const response = await fetch(`/api/courses/${courseId}/files`, {
      cache: "no-store",
    });
    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error ?? "Não foi possível carregar os materiais.");
    }
    setMaterials(normalizeCourseMaterials(body.data));
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/courses/${courseId}/files`, {
          cache: "no-store",
        });
        const body = await response.json();
        if (!response.ok || !body.success) {
          throw new Error(body.error ?? "Não foi possível carregar os materiais.");
        }
        if (active) setMaterials(normalizeCourseMaterials(body.data));
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Não foi possível carregar os materiais.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [courseId]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch(`/api/courses/${courseId}/files`, {
        method: "POST",
        body: formData,
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error ?? "Não foi possível enviar o material.");
      }
      await loadMaterials();
      setSuccess("Material didático enviado.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível enviar o material.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeMaterial() {
    if (!deleting) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(
        `/api/courses/${courseId}/files/${encodeURIComponent(deleting.id)}`,
        { method: "DELETE" },
      );
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error ?? "Não foi possível remover o material.");
      }
      setMaterials((current) =>
        current.filter((material) => material.id !== deleting.id),
      );
      setDeleting(null);
      setSuccess("Material removido.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível remover o material.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card course-material-manager">
      <div className="course-material-manager-heading">
        <div>
          <h2>Materiais didáticos</h2>
          <p>Adicione arquivos para os alunos com inscrição deferida.</p>
        </div>
        <label className={`button button-primary ${busy ? "button-disabled" : ""}`}>
          <Icon name="assignment" size={15} />
          {busy ? "Enviando..." : "Adicionar material"}
          <input
            className="visually-hidden"
            type="file"
            aria-label="Adicionar material didático"
            disabled={busy}
            onChange={(event) => void upload(event)}
          />
        </label>
      </div>
      {error && <Alert>{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}
      {loading ? (
        <p className="field-note">Carregando materiais...</p>
      ) : materials.length ? (
        <div className="course-material-list">
          {materials.map((material) => (
            <div className="course-material-row" key={material.id}>
              <Icon name="assignment" size={17} />
              <span>
                <strong>{material.fileName}</strong>
                <small>
                  {[formatDate(material.createdAt), formatFileSize(material.size)]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </span>
              <button
                type="button"
                className="button button-danger-outline"
                onClick={() => setDeleting(material)}
                disabled={busy}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhum material anexado"
          detail="Os materiais enviados ficarão disponíveis para os alunos inscritos."
        />
      )}
      {deleting && (
        <div className="role-modal-backdrop" role="presentation">
          <div
            className="role-modal card"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="course-material-delete-title"
          >
            <div className="role-modal-head">
              <h2 id="course-material-delete-title">Remover material</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setDeleting(null)}
                disabled={busy}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <p>Deseja remover “{deleting.fileName}” do curso?</p>
            <div className="role-modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setDeleting(null)}
                disabled={busy}
              >
                Manter arquivo
              </button>
              <button
                type="button"
                className="button button-danger"
                onClick={() => void removeMaterial()}
                disabled={busy}
              >
                {busy ? "Removendo..." : "Remover material"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
