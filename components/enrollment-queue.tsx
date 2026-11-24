import Link from "next/link";
import type { EnrollmentQueueItem } from "@/lib/types";
import { EmptyState, Icon, StatusBadge } from "./ui";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Fortaleza",
});

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

function pageHref(
  page: number,
  filters: { status: string; search: string; courseId: string },
) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.courseId) params.set("courseId", filters.courseId);
  return `/inscricoes?${params.toString()}`;
}

export function EnrollmentQueue({
  items,
  pagination,
  filters,
  statusCounts,
}: {
  items: EnrollmentQueueItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  filters: { status: string; search: string; courseId: string };
  statusCounts: Record<string, number>;
}) {
  const tabs = [
    { status: "PENDING", label: "Pendentes" },
    { status: "APPROVED", label: "Deferidas" },
    { status: "REJECTED", label: "Indeferidas" },
    { status: "CANCELLED", label: "Canceladas" },
    { status: "", label: "Todas" },
  ];

  return (
    <>
      <div className="page-header users-header">
        <div>
          <h1>Inscrições</h1>
          <p>Analise, defira ou indefira as inscrições dos alunos.</p>
        </div>
      </div>

      <div className="enrollment-queue-toolbar">
        <nav className="enrollment-queue-tabs" aria-label="Situação das inscrições">
          {tabs.map((tab) => (
            <Link
              key={tab.status || "ALL"}
              className={`enrollment-queue-tab ${filters.status === tab.status ? "enrollment-queue-tab-active" : ""}`}
              href={pageHref(1, { ...filters, status: tab.status })}
              aria-current={filters.status === tab.status ? "page" : undefined}
            >
              {tab.label}
              <span>{statusCounts[tab.status || "ALL"] ?? 0}</span>
            </Link>
          ))}
        </nav>
        <form className="enrollment-queue-search" method="get" aria-label="Buscar inscrições">
          <input type="hidden" name="status" value={filters.status} />
          {filters.courseId && (
            <input type="hidden" name="courseId" value={filters.courseId} />
          )}
          <label className="enrollment-queue-search-field">
            <Icon name="search" size={16} />
            <input
              name="search"
              defaultValue={filters.search}
              placeholder="Buscar aluno ou curso"
              aria-label="Buscar aluno ou curso"
            />
          </label>
        </form>
      </div>

      {items.length ? (
        <div className="card enrollment-queue-table-wrap">
          <table className="enrollment-queue-table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>E-mail</th>
                <th>Matrícula</th>
                <th>Curso</th>
                <th>Data</th>
                <th>Situação</th>
                <th aria-label="Ação" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    <small>{item.institution}</small>
                  </td>
                  <td title={item.email ?? ""}>
                    <span className="enrollment-queue-truncate">
                      {item.email || "—"}
                    </span>
                  </td>
                  <td className="enrollment-queue-registration">
                    {item.registration || "—"}
                  </td>
                  <td>
                    <span className="enrollment-queue-truncate" title={item.course.title}>
                      {item.course.title}
                    </span>
                  </td>
                  <td>{formatDate(item.createdAt)}</td>
                  <td><StatusBadge status={item.status} kind="enrollment" /></td>
                  <td>
                    <Link
                      className="enrollment-queue-open"
                      href={`/inscricoes/${item.id}?course=${encodeURIComponent(item.course.title)}`}
                      aria-label={`Analisar inscrição de ${item.name}`}
                    >
                      <Icon name="arrow" size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length > 0 && (
            <nav className="enrollment-queue-pagination" aria-label="Paginação das inscrições">
              <span>
                Mostrando {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} inscrições
              </span>
              <div>
                <Link
                  className={`button button-secondary ${pagination.page <= 1 ? "button-disabled" : ""}`}
                  href={pageHref(Math.max(1, pagination.page - 1), filters)}
                  aria-disabled={pagination.page <= 1}
                  tabIndex={pagination.page <= 1 ? -1 : undefined}
                >
                  Anterior
                </Link>
                <Link
                  className={`button button-secondary ${pagination.page >= pagination.totalPages ? "button-disabled" : ""}`}
                  href={pageHref(Math.min(pagination.totalPages, pagination.page + 1), filters)}
                  aria-disabled={pagination.page >= pagination.totalPages}
                  tabIndex={pagination.page >= pagination.totalPages ? -1 : undefined}
                >
                  Próxima
                </Link>
                <span className="enrollment-queue-page-number">
                  {pagination.page} / {pagination.totalPages}
                </span>
              </div>
            </nav>
          )}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            title="Nenhuma inscrição encontrada"
            detail="Altere os filtros ou volte quando houver novas solicitações."
          />
        </div>
      )}

    </>
  );
}
