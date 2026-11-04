"use client";

import { FormEvent, useMemo, useState } from "react";
import { Alert, EmptyState, Icon } from "./ui";
import type { Institution } from "@/lib/types";
import { formatCnpj } from "@/lib/validation";

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

function normalizeInstitutions(data: unknown): Institution[] {
  const root = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const source = Array.isArray(data)
    ? data
    : Array.isArray(root.institutions)
      ? root.institutions
      : [];
  return source.map((raw) => {
    const item = raw as Record<string, unknown>;
    const count = item._count && typeof item._count === "object"
      ? (item._count as Record<string, unknown>).departments
      : undefined;
    return {
      id: Number(item.id),
      name: String(item.name ?? "Instituição"),
      cnpj: String(item.cnpj ?? ""),
      acronym: typeof item.acronym === "string" ? item.acronym : null,
      city: typeof item.city === "string" ? item.city : null,
      state: typeof item.state === "string" ? item.state : null,
      active: item.active !== false,
      _count: typeof count === "number" ? { departments: count } : undefined,
    };
  });
}

export function InstitutionsManagement({
  initialInstitutions,
  initialError = false,
}: {
  initialInstitutions: unknown;
  initialError?: boolean;
}) {
  const [institutions, setInstitutions] = useState(normalizeInstitutions(initialInstitutions));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState(initialError ? "Não foi possível carregar as instituições." : "");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Institution | null>(null);
  const [form, setForm] = useState({ name: "", cnpj: "", acronym: "", city: "", state: "" });

  const visibleInstitutions = useMemo(() => institutions.filter((institution) => {
    const text = `${institution.name} ${institution.cnpj} ${institution.acronym ?? ""} ${institution.city ?? ""} ${institution.state ?? ""}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && institution.active) ||
      (statusFilter === "inactive" && !institution.active);
    return matchesSearch && matchesStatus;
  }), [institutions, search, statusFilter]);

  function openCreate() {
    setForm({ name: "", cnpj: "", acronym: "", city: "", state: "" });
    setCreating(true);
    setEditing(null);
  }

  function openEdit(institution: Institution) {
    setEditing(institution);
    setCreating(false);
    setForm({
      name: institution.name,
      cnpj: institution.cnpj,
      acronym: institution.acronym ?? "",
      city: institution.city ?? "",
      state: institution.state ?? "",
    });
  }

  function changeCnpj(value: string) {
    setForm((current) => ({ ...current, cnpj: formatCnpj(value) }));
  }

  function changeAcronym(value: string) {
    setForm((current) => ({ ...current, acronym: value.toUpperCase() }));
  }

  async function reload() {
    const response = await fetch("/api/institutions", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok || !body.success) throw new Error(body.error ?? "Não foi possível atualizar as instituições.");
    setInstitutions(normalizeInstitutions(body.data));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (form.name.trim().length < 2 || form.cnpj.trim().length === 0) {
      setError("Preencha o nome e o CNPJ da instituição.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      cnpj: form.cnpj.trim(),
      acronym: form.acronym.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
    };
    setBusy(true);
    setError("");
    try {
      const response = await fetch(creating ? "/api/institutions" : `/api/institutions/${editing?.id}`, {
        method: creating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error ?? "Não foi possível salvar a instituição.");
      await reload();
      setSuccess(creating ? "Instituição cadastrada com sucesso." : "Instituição atualizada com sucesso.");
      setCreating(false);
      setEditing(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar a instituição.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleInstitution(institution: Institution) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/institutions/${institution.id}/toggle`, { method: "PATCH" });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error ?? "Não foi possível alterar o status.");
      await reload();
      setSuccess(institution.active ? "Instituição inativada com sucesso." : "Instituição ativada com sucesso.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível alterar o status.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteInstitution(institution: Institution) {
    if (!window.confirm(`Excluir a instituição “${institution.name}”?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/institutions/${institution.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error ?? "Não foi possível excluir a instituição.");
      await reload();
      setEditing(null);
      setSuccess("Instituição excluída com sucesso.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível excluir a instituição.");
    } finally {
      setBusy(false);
    }
  }

  const modalOpen = creating || editing !== null;

  return (
    <>
      <div className="page-header users-header">
        <h1>Instituições</h1>
        <button className="button button-primary" onClick={openCreate}>
          <Icon name="apartment" size={16} /> Nova instituição
        </button>
      </div>

      {error && <div className="permissions-alert"><Alert>{error}</Alert></div>}
      {success && <div className="permissions-alert"><Alert tone="success">{success}</Alert></div>}

      <section className="card users-card">
        <div className="users-toolbar institutions-toolbar">
          <div className="users-search field">
            <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, CNPJ ou cidade" aria-label="Buscar instituições" />
          </div>
          <div className="field users-filter">
            <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrar por status">
              <option value="all">Todas</option>
              <option value="active">Ativas</option>
              <option value="inactive">Inativas</option>
            </select>
          </div>
        </div>

        {visibleInstitutions.length ? (
          <div className="users-table-wrap">
            <table className="users-table institutions-table">
              <thead>
                <tr><th>Instituição</th><th>CNPJ</th><th>Localização</th><th>Status</th><th aria-label="Ações" /></tr>
              </thead>
              <tbody>
                {visibleInstitutions.map((institution) => (
                  <tr key={institution.id}>
                    <td>
                      <div className="institution-name">
                        <strong>{institution.name}</strong>
                        {institution.acronym && <small>{institution.acronym}</small>}
                      </div>
                    </td>
                    <td>{institution.cnpj || "—"}</td>
                    <td>{[institution.city, institution.state].filter(Boolean).join(" - ") || "—"}</td>
                    <td><span className={`badge ${institution.active ? "badge-approved" : "badge-rejected"}`}>{institution.active ? "Ativa" : "Inativa"}</span></td>
                    <td>
                      <div className="user-row-actions institution-actions">
                        <button className="button button-secondary" onClick={() => openEdit(institution)}>Editar</button>
                        <button className="button button-secondary" onClick={() => toggleInstitution(institution)} disabled={busy}>
                          {institution.active ? "Inativar" : "Ativar"}
                        </button>
                        <button className="icon-button delete-role" onClick={() => deleteInstitution(institution)} disabled={busy} aria-label={`Excluir ${institution.name}`} title="Excluir instituição">×</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="Nenhuma instituição encontrada" detail="Ajuste os filtros ou cadastre uma nova instituição." />}
      </section>

      {modalOpen && (
        <div className="role-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) {
            setCreating(false);
            setEditing(null);
          }
        }}>
          <form className="role-modal card user-modal" onSubmit={submit}>
            <div className="role-modal-head">
              <h2>{creating ? "Nova instituição" : "Editar instituição"}</h2>
              <button type="button" className="icon-button" onClick={() => { setCreating(false); setEditing(null); }} aria-label="Fechar">×</button>
            </div>
            <div className="field-grid">
              <div className="field field-span-2"><label htmlFor="institution-name">Nome</label><input id="institution-name" className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
              <div className="field"><label htmlFor="institution-cnpj">CNPJ</label><input id="institution-cnpj" className="input" value={form.cnpj} onChange={(event) => changeCnpj(event.target.value)} inputMode="numeric" placeholder="00.000.000/0000-00" /></div>
              <div className="field"><label htmlFor="institution-acronym">Sigla</label><input id="institution-acronym" className="input" value={form.acronym} onChange={(event) => changeAcronym(event.target.value)} /></div>
              <div className="field"><label htmlFor="institution-city">Cidade</label><input id="institution-city" className="input" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></div>
              <div className="field">
                <label htmlFor="institution-state">UF</label>
                <select id="institution-state" className="input" value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })}>
                  <option value="">Selecione a UF</option>
                  {BRAZILIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                </select>
              </div>
            </div>
            <div className="role-modal-actions">
              <button type="button" className="button button-secondary" onClick={() => { setCreating(false); setEditing(null); }}>Cancelar</button>
              <button className="button button-primary" disabled={busy}>{busy ? "Salvando..." : "Salvar instituição"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
