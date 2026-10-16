import { ApiError } from "@/lib/api";
import { can } from "@/lib/permissions";
import { getCurrentUser, pageRequest } from "@/lib/session";
import type {
  CourseSummary,
  DashboardData,
  EnrollmentSummary,
} from "@/lib/types";
import { EmptyState, Icon, StatusBadge } from "@/components/ui";

const numberFormatter = new Intl.NumberFormat("pt-BR");

function formatTotal(value: number | undefined) {
  return value === undefined ? "—" : numberFormatter.format(value);
}

function roleTotal(data: DashboardData, role: string) {
  return data.charts.usersByRole
    .filter(
      (item) =>
        item.role.localeCompare(role, "pt-BR", { sensitivity: "base" }) === 0,
    )
    .reduce((sum, item) => sum + item.total, 0);
}

function today() {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
  );
  return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}

async function loadDashboard() {
  try {
    return {
      data: await pageRequest<DashboardData>("/dashboard", "/inicio"),
      error: false,
    };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return { data: null, error: true };
  }
}

async function loadStudentData() {
  try {
    const [courses, enrollments] = await Promise.all([
      pageRequest<CourseSummary[]>("/courses?status=PUBLISHED", "/inicio"),
      pageRequest<EnrollmentSummary[]>("/enroll/enrollments/me", "/inicio"),
    ]);
    return { courses, enrollments, error: false };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return { courses: [], enrollments: [], error: true };
  }
}

function ErrorPanel() {
  return (
    <div className="card">
      <EmptyState
        title="Não foi possível carregar os dados"
        detail="Tente atualizar a página em alguns instantes."
      />
    </div>
  );
}

function AdminHome({ data }: { data: DashboardData }) {
  const students = roleTotal(data, "Aluno");
  const professors = roleTotal(data, "Professor");
  const enrollmentTotal =
    data.summary.totalEnrollments ??
    data.charts.enrollmentsByCourse.reduce(
      (sum, course) => sum + course.enrolled,
      0,
    );
  const remainingVacancies =
    data.summary.remainingVacancies ??
    data.charts.enrollmentsByCourse.reduce(
      (sum, course) =>
        sum + Math.max(course.maxBeneficiaries - course.enrolled, 0),
      0,
    );
  const courseStatuses = data.charts.coursesByStatus ?? [
    { status: "Em andamento", total: data.summary.activeCourses },
    { status: "Concluídos", total: data.summary.finishedCourses },
    {
      status: "Outros",
      total: Math.max(
        data.summary.totalCourses -
          data.summary.activeCourses -
          data.summary.finishedCourses,
        0,
      ),
    },
  ];
  const courseTotal = Math.max(
    courseStatuses.reduce((sum, item) => sum + item.total, 0),
    1,
  );
  const activeShare = (courseStatuses[0]?.total ?? 0) / courseTotal;
  const finishedShare = (courseStatuses[1]?.total ?? 0) / courseTotal;

  return (
    <>
      <div className="admin-metrics" aria-label="Resumo geral">
        {[
          ["Usuários", data.summary.totalUsers],
          ["Alunos", students],
          ["Professores", professors],
          ["Cursos", data.summary.totalCourses],
          ["Inscrições", enrollmentTotal],
          ["Instituições", data.summary.totalInstitutions],
          ["Vagas restantes", remainingVacancies],
        ].map(([label, value], index) => (
          <div
            className={`admin-metric ${index === 6 ? "admin-metric-accent" : ""}`}
            key={String(label)}
          >
            <small>{label}</small>
            <strong>{formatTotal(value as number | undefined)}</strong>
          </div>
        ))}
      </div>

      <div className="admin-dashboard-panels">
        <section className="card dashboard-panel">
          <div className="dashboard-panel-head">
            <h2>Inscrições por curso</h2>
            <span>{formatTotal(enrollmentTotal)} no total</span>
          </div>
          {data.charts.enrollmentsByCourse.length ? (
            <div className="progress-list">
              {data.charts.enrollmentsByCourse.slice(0, 5).map((item) => {
                const percentage = item.maxBeneficiaries
                  ? Math.min((item.enrolled / item.maxBeneficiaries) * 100, 100)
                  : 0;

                return (
                  <div className="progress-row" key={item.courseId}>
                    <span title={item.title}>{item.title}</span>
                    <div
                      className="progress-track"
                      role="progressbar"
                      aria-label={`${item.title}: ${item.enrolled} de ${item.maxBeneficiaries} vagas`}
                      aria-valuemin={0}
                      aria-valuemax={item.maxBeneficiaries}
                      aria-valuenow={item.enrolled}
                    >
                      <span style={{ width: `${percentage}%` }} />
                    </div>
                    <strong>{numberFormatter.format(item.enrolled)}</strong>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="Nenhum curso com inscrições" />
          )}
        </section>

        <section className="card dashboard-panel">
          <div className="dashboard-panel-head">
            <h2>Cursos por situação</h2>
          </div>
          <div className="course-status-chart">
            <div
              className="donut-chart"
              style={
                {
                  "--active-share": `${activeShare * 100}%`,
                  "--finished-share": `${(activeShare + finishedShare) * 100}%`,
                } as React.CSSProperties
              }
              role="img"
              aria-label={`Cursos por situação: ${courseStatuses
                .map((item) => `${item.status}, ${item.total}`)
                .join("; ")}`}
            >
              <span>
                <strong>{formatTotal(data.summary.totalCourses)}</strong>
                <small>cursos</small>
              </span>
            </div>
            <div className="status-legend">
              {courseStatuses.slice(0, 3).map((item, index) => (
                <div key={item.status}>
                  <span className={`status-dot status-dot-${index + 1}`} />
                  <span>{item.status}</span>
                  <strong>{numberFormatter.format(item.total)}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="card activity-panel">
        <div className="dashboard-panel-head">
          <h2>Atividades recentes</h2>
        </div>
        {data.recentActivity.length ? (
          data.recentActivity.slice(0, 5).map((item) => (
            <div className="list-row" key={item.id}>
              <span>
                <strong>{item.description}</strong>
                <small>{item.course.title}</small>
              </span>
              <small className="mono">
                {new Intl.DateTimeFormat("pt-BR").format(
                  new Date(item.createdAt),
                )}
              </small>
            </div>
          ))
        ) : (
          <EmptyState title="Nenhuma atividade recente" />
        )}
      </section>
    </>
  );
}

function StudentHome({
  courses,
  enrollments,
}: {
  courses: CourseSummary[];
  enrollments: EnrollmentSummary[];
}) {
  return (
    <>
      <div className="home-grid">
        <div className="card metric-card metric-primary">
          <Icon name="school" size={22} />
          <span>
            <h2>Ver Cursos</h2>
            <br />
            <small>{courses.length} cursos com inscrições abertas</small>
          </span>
        </div>
        <div className="card metric-card">
          <Icon name="assignment" size={22} />
          <span>
            <small>Minhas inscrições</small>
            <br />
            <strong>{enrollments.length}</strong>
          </span>
        </div>
        <div className="card metric-card">
          <Icon name="check" size={22} />
          <span>
            <small>Inscrições aprovadas</small>
            <br />
            <strong>
              {enrollments.filter((item) => item.status === "APPROVED").length}
            </strong>
          </span>
        </div>
      </div>
      <div className="section-head section-spaced">
        <h2>Cursos disponíveis</h2>
        <span className="muted">{courses.length} publicados</span>
      </div>
      {courses.length ? (
        <div className="course-grid">
          {courses.slice(0, 6).map((course) => (
            <article className="card course-card" key={course.id}>
              <div className="course-cover">
                <strong>
                  {course.title
                    .split(" ")
                    .slice(0, 2)
                    .map((word) => word[0])
                    .join("")
                    .toUpperCase()}
                </strong>
                <StatusBadge status={course.status} />
              </div>
              <div className="course-body">
                <h3>{course.title}</h3>
                <p>{course.campus}</p>
                <div className="course-meta">
                  <span>
                    <Icon name="calendar" size={14} />{" "}
                    {new Intl.DateTimeFormat("pt-BR").format(
                      new Date(course.startDate),
                    )}
                  </span>
                  <span>{course.executionHours} h</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState title="Ainda não há cursos publicados" />
        </div>
      )}
      <div className="section-head section-spaced">
        <h2>Minhas inscrições</h2>
      </div>
      <div className="card list-card">
        {enrollments.length ? (
          enrollments.slice(0, 5).map((item) => (
            <div className="list-row" key={item.id}>
              <strong>{item.course.title}</strong>
              <StatusBadge status={item.status} />
            </div>
          ))
        ) : (
          <EmptyState title="Você ainda não tem inscrições" />
        )}
      </div>
    </>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser("/inicio");
  let content: React.ReactNode;

  if (can(user, "view-dashboard")) {
    const result = await loadDashboard();
    content = result.data ? <AdminHome data={result.data} /> : <ErrorPanel />;
  } else if (can(user, "view-courses")) {
    const result = await loadStudentData();
    content = result.error ? (
      <ErrorPanel />
    ) : (
      <StudentHome courses={result.courses} enrollments={result.enrollments} />
    );
  } else {
    content = (
      <div className="card">
        <EmptyState
          title="Bem-vindo ao DEPPI"
          detail="Seu perfil está disponível no menu. Novas áreas serão liberadas conforme suas permissões."
        />
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>
          {greeting()}, {user.name.trim().split(" ")[0]}
        </h1>
        <p>{today()}</p>
      </div>
      {content}
    </>
  );
}
