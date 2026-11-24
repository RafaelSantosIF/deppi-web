import { describe, expect, it } from "vitest";
import { hasOpenEnrollment, normalizeCourses } from "@/lib/courses";
import {
  canAssignCourseResponsible,
  courseStatusActions,
} from "@/lib/course-permissions";
import { normalizeCourseProfessors } from "@/lib/course-professors";
import { normalizeInstitutions } from "@/lib/institutions";

describe("cursos", () => {
  it("normaliza os dados da API sem descartar campos de gestão", () => {
    const [course] = normalizeCourses({
      courses: [
        {
          id: 8,
          title: "Introdução à programação",
          campus: "Fortaleza",
          status: "PUBLISHED",
          startDate: "2026-11-10T18:30:00.000Z",
          endDateEstimated: "2026-12-10T21:30:00.000Z",
          executionHours: 40,
          maxBeneficiaries: 20,
          _count: { enrollments: 12 },
          activitiesPerformed: "Aulas e projeto final.",
        },
      ],
    });

    expect(course).toMatchObject({
      id: 8,
      title: "Introdução à programação",
      activitiesPerformed: "Aulas e projeto final.",
      _count: { enrollments: 12 },
    });
  });

  it("preserva a justificativa do indeferimento retornada pela API", () => {
    const [course] = normalizeCourses([
      {
        id: 11,
        title: "Curso revisado",
        status: "REJECTED",
        reason: "Atualize o cronograma.",
      },
    ]);

    expect(course.rejectionReason).toBe("Atualize o cronograma.");
  });

  it("considera vagas disponíveis ao ordenar os cursos publicados", () => {
    const [available, full, draft] = normalizeCourses([
      {
        id: 1,
        title: "Com vagas",
        status: "PUBLISHED",
        maxBeneficiaries: 20,
        _count: { enrollments: 10 },
      },
      {
        id: 2,
        title: "Lotado",
        status: "PUBLISHED",
        maxBeneficiaries: 20,
        _count: { enrollments: 20 },
      },
      {
        id: 3,
        title: "Rascunho",
        status: "DRAFT",
        maxBeneficiaries: 20,
      },
    ]);

    expect(hasOpenEnrollment(available)).toBe(true);
    expect(hasOpenEnrollment(full)).toBe(false);
    expect(hasOpenEnrollment(draft)).toBe(false);
  });

  it("permite atribuir o professor responsável somente à gestão DEPPI/ADM", () => {
    const user = (role: string, permissions: string[]) => ({
      id: 1,
      name: "Usuário",
      email: "user@ifce.edu.br",
      role,
      permissions,
    });

    expect(
      canAssignCourseResponsible(user("DEPPI", ["manage-courses"])),
    ).toBe(true);
    expect(
      canAssignCourseResponsible(user("Administrador", ["manage-courses"])),
    ).toBe(true);
    expect(
      canAssignCourseResponsible(user("Professor", ["manage-courses"])),
    ).toBe(false);
    expect(
      canAssignCourseResponsible(user("DEPPI", ["create-course"])),
    ).toBe(false);
  });

  it("normaliza a lista de professores ativos retornada pela API", () => {
    expect(
      normalizeCourseProfessors([
        { id: 4, name: "Ana Souza", email: "ana@ifce.edu.br", active: true },
        { id: "inválido", name: "Sem ID" },
        { id: 5, name: "Professor inativo", active: false },
      ]),
    ).toEqual([
      { id: 4, name: "Ana Souza", email: "ana@ifce.edu.br", active: true },
    ]);
  });

  it("normaliza as instituições cadastradas", () => {
    expect(
      normalizeInstitutions({
        institutions: [
          { id: 2, name: "Instituto Federal", active: true },
          { id: "inválido", name: "Sem ID" },
          null,
        ],
      }),
    ).toEqual([
      {
        id: 2,
        name: "Instituto Federal",
        cnpj: "",
        acronym: null,
        city: null,
        state: null,
        active: true,
        _count: undefined,
      },
    ]);
  });

  it("limita as transições de status do professor ao fluxo próprio", () => {
    expect(courseStatusActions("DRAFT", false, true)).toEqual([
      "PENDING_APPROVAL",
    ]);
    expect(courseStatusActions("PENDING_APPROVAL", false, true)).toEqual([]);
    expect(courseStatusActions("APPROVED", false, true)).toEqual(["PUBLISHED"]);
    expect(courseStatusActions("PUBLISHED", false, true)).toEqual(["CLOSED"]);
    expect(courseStatusActions("REJECTED", false, true)).toEqual([
      "PENDING_APPROVAL",
    ]);
    expect(courseStatusActions("PENDING_APPROVAL", false, false)).toEqual([]);
    expect(courseStatusActions("PENDING_APPROVAL", true, false)).toEqual([
      "APPROVED",
      "REJECTED",
    ]);
  });
});
