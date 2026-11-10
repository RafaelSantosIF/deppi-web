"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CourseProfessor, CourseSummary, Institution } from "@/lib/types";
import { CourseForm, type CoursePayload } from "./course-form";

export function CourseEditor({
  course,
  institutions,
  institutionsError = "",
  professors,
  professorsError = "",
  responsibleId,
  responsibleName,
  canAssignResponsible,
}: {
  course: CourseSummary | null;
  institutions: Institution[];
  institutionsError?: string;
  professors: CourseProfessor[];
  professorsError?: string;
  responsibleId: number;
  responsibleName: string;
  canAssignResponsible: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const savedId = useRef<number | null>(null);
  const router = useRouter();

  async function submit(
    payload: CoursePayload,
    cover: File | null,
    submitForApproval: boolean,
  ) {
    setBusy(true);
    setError("");
    try {
      let courseId = course?.id ?? savedId.current;
      if (!courseId) {
        const response = await fetch(
          "/api/courses",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const body = await response.json();
        if (!response.ok || !body.success) {
          throw new Error(body.error ?? "Não foi possível salvar o curso.");
        }
        if (!course) {
          const createdId = Number(body.data?.id);
          if (!Number.isInteger(createdId) || createdId < 1) {
            throw new Error("O curso foi salvo, mas a API não retornou seu identificador.");
          }
          courseId = createdId;
          savedId.current = createdId;
        }
      } else {
        const response = await fetch(`/api/courses/${courseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await response.json();
        if (!response.ok || !body.success) {
          throw new Error(body.error ?? "Não foi possível atualizar o curso.");
        }
      }

      if (cover && courseId) {
        const formData = new FormData();
        formData.set("cover", cover);
        const response = await fetch(`/api/courses/${courseId}/cover`, {
          method: "POST",
          body: formData,
        });
        const body = await response.json();
        if (!response.ok || !body.success) {
          throw new Error(
            `Curso salvo, mas não foi possível enviar a capa: ${body.error ?? "tente novamente."}`,
          );
        }
      }
      if (submitForApproval && courseId) {
        const response = await fetch(`/api/courses/${courseId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "PENDING_APPROVAL" }),
        });
        const body = await response.json();
        if (!response.ok || !body.success) {
          throw new Error(
            `Curso salvo, mas não foi enviado para avaliação: ${body.error ?? "tente novamente."}`,
          );
        }
      }
      if (!courseId) {
        throw new Error("A API não retornou o identificador do curso.");
      }
      router.push(`/cursos/${courseId}`);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar o curso.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <CourseForm
      course={course}
      institutions={institutions}
      institutionsError={institutionsError}
      responsibleId={responsibleId}
      responsibleName={responsibleName}
      professors={professors}
      professorsError={professorsError}
      canAssignResponsible={canAssignResponsible}
      busy={busy}
      error={error}
      onCancel={course ? `/cursos/${course.id}` : "/cursos"}
      onSubmit={submit}
    />
  );
}
