"use client";

import { FormEvent, useMemo, useState } from "react";
import { Alert, EmptyState, Icon } from "./ui";
import type { PermissionRecord, RoleRecord } from "@/lib/types";

function validId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

function normalizePermission(raw: unknown, available: PermissionRecord[]): PermissionRecord | null {
  if (!raw) return null;

  if (typeof raw === "number" || typeof raw === "string") {
    const id = validId(raw);
    if (id === null) return null;
    return available.find((permission) => permission.id === id) ?? { id, name: "Permissão" };
  }

  if (typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;

  for (const key of ["permission", "data"])
    if (item[key] && typeof item[key] === "object") {
      const nested = normalizePermission(item[key], available);
      if (nested) return nested;
    }

  const id = validId(item.id ?? item.permissionId);
  if (id === null) return null;
  const known = available.find((permission) => permission.id === id);
  return {
    id,
    name: typeof item.name === "string"
      ? item.name
      : typeof item.slug === "string"
        ? item.slug
        : known?.name ?? "Permissão",
    slug: typeof item.slug === "string" ? item.slug : known?.slug,
    description: typeof item.description === "string" ? item.description : known?.description,
  };
}

function normalize(data: unknown): { roles: RoleRecord[]; permissions: PermissionRecord[] } {
  const root = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const rolesValue = Array.isArray(data)
    ? data
    : Array.isArray(root.roles)
      ? root.roles
      : [];
  const permissionsValue = Array.isArray(root.permissions)
    ? root.permissions
    : Array.isArray(root.availablePermissions)
      ? root.availablePermissions
      : [];

  const permissions: PermissionRecord[] = permissionsValue
    .map((raw) => normalizePermission(raw, []))
    .filter((permission): permission is PermissionRecord => permission !== null);

  const roles: RoleRecord[] = rolesValue
    .map((raw) => {
      const role = raw as Record<string, unknown>;
      const rolePermissions = Array.isArray(role.permissions)
        ? role.permissions
        : Array.isArray(role.permissionIds)
          ? role.permissionIds
          : [];
      const normalizedPermissions = rolePermissions
        .map((permission) => normalizePermission(permission, permissions))
        .filter((permission): permission is PermissionRecord => permission !== null);

      const uniquePermissions = [
        ...new Map(normalizedPermissions.map((permission) => [permission.id, permission])).values(),
      ];
      const id = validId(role.id);
      return {
        id: id ?? 0,
        name: typeof role.name === "string" ? role.name : "Cargo sem nome",
        permissions: uniquePermissions,
      };
    })
    .filter((role) => role.id > 0);

  if (!permissions.length) {
    const known = new Map<number, PermissionRecord>();
    roles.forEach((role) => role.permissions.forEach((permission) => known.set(permission.id, permission)));
    permissions.push(...known.values());
  }

  return { roles, permissions };
}

export function RolesPermissions({ initialData, initialError = false }: { initialData: unknown; initialError?: boolean }) {
  const initial = normalize(initialData);
  const [roles, setRoles] = useState(initial.roles);
  const [allPermissions, setAllPermissions] = useState(initial.permissions);
  const [selectedId, setSelectedId] = useState<number | null>(initial.roles[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(initialError ? "Não foi possível carregar os cargos e permissões." : "");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<"create" | "rename" | null>(null);
  const [roleName, setRoleName] = useState("");

  const selectedRole = roles.find((role) => role.id === selectedId) ?? null;
  const visibleRoles = useMemo(() => roles.filter((role) => role.name.toLowerCase().includes(search.toLowerCase())), [roles, search]);
  const visiblePermissions = useMemo(() => allPermissions.filter((permission) => {
    const text = `${permission.name} ${permission.slug ?? ""} ${permission.description ?? ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  }), [allPermissions, search]);

  async function reload() {
    const response = await fetch("/api/roles", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok || !body.success) throw new Error(body.error ?? "Não foi possível atualizar os dados.");
    const normalized = normalize(body.data);
    setRoles(normalized.roles);
    setAllPermissions(normalized.permissions);
  }

  async function submitRole(event: FormEvent) {
    event.preventDefault();
    if (roleName.trim().length < 2) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(dialog === "rename" && selectedRole ? `/api/roles/${selectedRole.id}` : "/api/roles", {
        method: dialog === "rename" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roleName.trim() }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error ?? "Não foi possível salvar o cargo.");
      await reload();
      setSuccess(dialog === "rename" ? "Cargo renomeado com sucesso." : "Cargo criado com sucesso.");
      setDialog(null);
      setRoleName("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar o cargo.");
    } finally {
      setBusy(false);
    }
  }

  async function togglePermission(permissionId: number, checked: boolean) {
    if (!selectedRole) return;
    setBusy(true);
    setError("");
    try {
      const permissionIds = checked
        ? [...new Set([...selectedRole.permissions.map((item) => item.id), permissionId].filter((id) => Number.isInteger(id) && id > 0))]
        : selectedRole.permissions
            .filter((item) => item.id !== permissionId)
            .map((item) => item.id)
            .filter((id) => Number.isInteger(id) && id > 0);
      const response = await fetch(`/api/roles/${selectedRole.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionIds }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error ?? "Não foi possível alterar a permissão.");
      await reload();
      setSuccess("Permissões atualizadas com sucesso.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível alterar a permissão.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteRole() {
    if (!selectedRole || !window.confirm(`Excluir o cargo “${selectedRole.name}”?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/roles/${selectedRole.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error ?? "Não foi possível excluir o cargo.");
      await reload();
      setSelectedId(null);
      setSuccess("Cargo excluído com sucesso.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível excluir o cargo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-header permissions-header">
        <div>
          <h1>Cargos e permissões</h1>
          <p>Gerencie os cargos da plataforma e o acesso de cada um.</p>
        </div>
        <button className="button button-primary" onClick={() => { setRoleName(""); setDialog("create"); }}>
          <Icon name="group" size={16} /> Novo cargo
        </button>
      </div>

      {error && <div className="permissions-alert"><Alert>{error}</Alert></div>}
      {success && <div className="permissions-alert"><Alert tone="success">{success}</Alert></div>}

      <div className="permissions-layout">
        <aside className="card roles-panel">
          <div className="roles-panel-head">
            <div>
              <h2>Cargos</h2>
              <span>{roles.length} cadastrados</span>
            </div>
          </div>
          <div className="roles-search field">
            <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cargo ou permissão" aria-label="Buscar cargo ou permissão" />
          </div>
          {visibleRoles.length ? (
            <div className="role-list">
              {visibleRoles.map((role) => (
                <button key={role.id} className={`role-item ${selectedId === role.id ? "role-item-active" : ""}`} onClick={() => setSelectedId(role.id)}>
                  <span className="role-icon"><Icon name="group" size={17} /></span>
                  <span><strong>{role.name}</strong><small>{role.permissions.length} permissões</small></span>
                  <Icon name="arrow" size={15} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhum cargo encontrado" />
          )}
        </aside>

        <section className="card permissions-panel">
          {selectedRole ? (
            <>
              <div className="permissions-panel-head">
                <div>
                  <span className="permissions-kicker">Cargo selecionado</span>
                  <h2>{selectedRole.name}</h2>
                </div>
                <div className="role-actions">
                  <button className="button button-secondary" disabled={busy} onClick={() => { setRoleName(selectedRole.name); setDialog("rename"); }}>Renomear</button>
                  <button className="icon-button delete-role" disabled={busy} onClick={deleteRole} aria-label="Excluir cargo" title="Excluir cargo">×</button>
                </div>
              </div>
              <div className="permission-list">
                {visiblePermissions.length ? visiblePermissions.map((permission) => {
                  const checked = selectedRole.permissions.some((item) => item.id === permission.id);
                  return (
                    <label className="permission-row" key={permission.id}>
                      <span><strong>{permission.name}</strong>{permission.description && <small>{permission.description}</small>}</span>
                      <input type="checkbox" checked={checked} disabled={busy} onChange={(event) => togglePermission(permission.id, event.target.checked)} />
                    </label>
                  );
                }) : <EmptyState title="Nenhuma permissão encontrada" />}
              </div>
            </>
          ) : (
            <EmptyState title="Selecione um cargo" detail="Escolha um cargo na lista para visualizar e alterar suas permissões." />
          )}
        </section>
      </div>

      {dialog && (
        <div className="role-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setDialog(null); }}>
          <form className="role-modal card" onSubmit={submitRole}>
            <div className="role-modal-head">
              <h2>{dialog === "rename" ? "Renomear cargo" : "Novo cargo"}</h2>
              <button type="button" className="icon-button" onClick={() => setDialog(null)} aria-label="Fechar">×</button>
            </div>
            <div className="field">
              <label htmlFor="role-name">Nome do cargo</label>
              <input id="role-name" className="input" value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="Ex.: Coordenador" autoFocus />
              <span className="field-note">Use um nome curto e fácil de identificar.</span>
            </div>
            <div className="role-modal-actions">
              <button type="button" className="button button-secondary" onClick={() => setDialog(null)}>Cancelar</button>
              <button className="button button-primary" disabled={busy || roleName.trim().length < 2}>{busy ? "Salvando..." : "Salvar cargo"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
