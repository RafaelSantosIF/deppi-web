"use client";

import Link from "next/link";
import {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { CourseSummary, EnrollmentSummary } from "@/lib/types";
import { Icon } from "./ui";

type HomeFeedbackNotificationsProps = {
  userId: number;
  enrollments: EnrollmentSummary[];
  rejectedCourses: CourseSummary[];
};

export function HomeFeedbackNotifications({
  userId,
  enrollments,
  rejectedCourses,
}: HomeFeedbackNotificationsProps) {
  const storageKey = `deppi:home-feedback:v1:${userId}`;
  const [sessionDismissedKeys, setSessionDismissedKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [writeError, setWriteError] = useState("");
  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener("deppi-home-feedback-updated", onStoreChange);
    return () => {
      window.removeEventListener("storage", onStoreChange);
      window.removeEventListener("deppi-home-feedback-updated", onStoreChange);
    };
  }, []);
  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(storageKey) ?? "[]";
    } catch {
      return "__unavailable__";
    }
  }, [storageKey]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => "[]");
  const { dismissedKeys, readError } = useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(snapshot);
      if (
        !Array.isArray(parsed) ||
        !parsed.every((key): key is string => typeof key === "string")
      ) {
        throw new Error("Formato de notificações inválido.");
      }
      return { dismissedKeys: new Set(parsed), readError: "" };
    } catch {
      return {
        dismissedKeys: new Set<string>(),
        readError: "Não foi possível carregar notificações já lidas.",
      };
    }
  }, [snapshot]);

  const notices = [
    ...enrollments
      .filter((enrollment) => enrollment.status === "REJECTED")
      .map((enrollment) => ({
        key: `enrollment-${enrollment.id}-${enrollment.statusUpdatedAt ?? "rejected"}`,
        title: `Inscrição indeferida: ${enrollment.course.title}`,
        reason:
          enrollment.rejectionReason?.trim() ||
          "A equipe não informou uma justificativa.",
        href: `/minhas-inscricoes/${enrollment.id}`,
        linkText: "Ver inscrição",
      })),
    ...rejectedCourses.map((course) => ({
      key: `course-${course.id}-${course.updatedAt ?? "rejected"}`,
      title: `Curso indeferido: ${course.title}`,
      reason:
        course.rejectionReason?.trim() ||
        "O DEPPI não informou uma justificativa.",
      href: `/cursos/${course.id}/editar`,
      linkText: "Corrigir e reenviar para avaliação",
    })),
  ];
  const visibleNotices = notices.filter(
    (notice) =>
      !dismissedKeys.has(notice.key) &&
      !sessionDismissedKeys.has(notice.key),
  );

  function markAsRead(key: string) {
    const updated = new Set(dismissedKeys);
    updated.add(key);
    setSessionDismissedKeys((current) => new Set([...current, key]));
    try {
      window.localStorage.setItem(storageKey, JSON.stringify([...updated]));
      window.dispatchEvent(new Event("deppi-home-feedback-updated"));
      setWriteError("");
    } catch {
      setWriteError(
        "A notificação foi ocultada, mas não foi possível salvar essa alteração.",
      );
    }
  }

  const storageError = readError || writeError;
  if (!visibleNotices.length && !storageError) return null;

  return (
    <section
      className="home-feedback-section"
      aria-label="Retornos do DEPPI"
    >
      <h2>Retornos do DEPPI</h2>
      {storageError && (
        <p className="home-feedback-storage-error" role="status">
          {storageError}
        </p>
      )}
      <div className="home-feedback-list">
        {visibleNotices.map((notice) => (
          <div
            className="alert alert-error home-feedback-alert"
            key={notice.key}
            role="alert"
          >
            <Icon name="warning" size={17} />
            <span className="home-feedback-copy">
              <strong>{notice.title}</strong>
              <span>Justificativa: {notice.reason}</span>
              <Link className="home-feedback-link" href={notice.href}>
                {notice.linkText}
              </Link>
            </span>
            <button
              className="icon-button home-feedback-dismiss"
              type="button"
              title="Marcar como lida"
              aria-label={`Marcar como lida: ${notice.title}`}
              onClick={() => markAsRead(notice.key)}
            >
              <Icon name="check_circle" size={18} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
