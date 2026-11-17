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

function formatIncome(value: number | null, size: number | null) {
  if (value === null) return "Renda não informada";
  const total = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
  return size ? `${total} · ${size} pessoa${size === 1 ? "" : "s"}` : total;
}

function pageHref(
  page: number,
  filters: { status: string; search: string; courseId: string },
) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.courseId) params.set("courseId", filters.courseId);
  return `/inscricoes?${params.toString()}`;
}

export function EnrollmentQueue({
  items,
  pagination,
  filters,
}: {
  items: EnrollmentQueueItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  filters: { status: string; search: string; courseId: string };
}) {
  return (
    <>
      <div className="page-header users-header">
        <div>
          <h1>Inscrições</h1>
          <p>Analise os dados e documentos enviados pelos alunos.</p>
        </div>
        <span className="enrollment-queue-total">{pagination.total} solicitações</span>
      </div>

      <form className="enrollment-queue-filters" method="get" aria-label="Filtros de inscrições">
        <label className="field">
          <span>Buscar</span>
          <input
            className="input"
            name="search"
            defaultValue={filters.search}
            placeholder="Aluno, curso ou instituição"
          />
        </label>
        <label className="field">
          <span>Situação</span>
          <select className="input" name="status" defaultValue={filters.status}>
            <option value="">Todas</option>
            <option value="PENDING">Pendentes</option>
            <option value="APPROVED">Aprovadas</option>
            <option value="REJECTED">Rejeitadas</option>
            <option value="WAITLISTED">Lista de espera</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
        </label>
        <label className="field">
          <span>ID do curso</span>
          <input
            className="input"
            name="courseId"
            type="number"
            min="1"
            defaultValue={filters.courseId}
          />
        </label>
        <button className="button button-primary" type="submit">
          <Icon name="search" size={15} /> Filtrar
        </button>
      </form>

      {items.length ? (
        <div className="card enrollment-queue-table-wrap">
          <table className="enrollment-queue-table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Curso</th>
                <th>Dados familiares</th>
                <th>Documentos</th>
                <th>Solicitada em</th>
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
                  <td>
                    <strong>{item.course.title}</strong>
                    <small>{item.category} · {item.bond}</small>
                  </td>
                  <td>{formatIncome(item.householdIncomeCents, item.householdSize)}</td>
                  <td>{item.documents.length} arquivo{item.documents.length === 1 ? "" : "s"}</td>
                  <td>{formatDate(item.createdAt)}</td>
                  <td><StatusBadge status={item.status} kind="enrollment" /></td>
                  <td>
                    <Link
                      className="button button-secondary"
                      href={`/inscricoes/${item.id}?course=${encodeURIComponent(item.course.title)}`}
                    >
                      Analisar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <EmptyState
            title="Nenhuma inscrição encontrada"
            detail="Altere os filtros ou volte quando houver novas solicitações."
          />
        </div>
      )}

      {pagination.totalPages > 1 && (
        <nav className="enrollment-queue-pagination" aria-label="Paginação das inscrições">
          <span>
            Página {pagination.page} de {pagination.totalPages}
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
          </div>
        </nav>
      )}
    </>
  );
}
