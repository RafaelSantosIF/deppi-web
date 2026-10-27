"use client";

import { FormEvent, useMemo, useState } from "react";
import { Alert, Avatar, EmptyState, Icon } from "./ui";
import type { ManagedUser, RoleRecord } from "@/lib/types";

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function normalizeUsers(data: unknown): ManagedUser[] {
  const root = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const source = Array.isArray(data) ? data : Array.isArray(root.users) ? root.users : [];
  return source.map((raw) => {
    const item = raw as Record<string, unknown>;
    const rawRole = item.role;
    const role = typeof rawRole === "object" && rawRole
      ? { id: Number((rawRole as Record<string, unknown>).id ?? 0), name: String((rawRole as Record<string, unknown>).name ?? "") }
      : typeof rawRole === "string"
        ? rawRole
        : { id: 0, name: "Sem cargo" };
    return {
      id: Number(item.id),
      name: String(item.name ?? "Usuário"),
      email: String(item.email ?? ""),
      personalEmail: typeof item.personalEmail === "string" ? item.personalEmail : null,
      institutionalPhones: arrayValue(item.institutionalPhones),
      personalPhones: arrayValue(item.personalPhones),
      role,
    };
  });
}

function normalizeRoles(data: unknown): RoleRecord[] {
  const root = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const source = Array.isArray(data) ? data : Array.isArray(root.roles) ? root.roles : [];
  return source.map((raw) => {
    const item = raw as Record<string, unknown>;
    return { id: Number(item.id), name: String(item.name ?? "Cargo"), permissions: [] };
  });
}

function roleName(user: ManagedUser) {
  return typeof user.role === "string" ? user.role : user.role.name;
}

function roleId(user: ManagedUser) {
  return typeof user.role === "string" ? 0 : user.role.id;
}

export function UsersManagement({ initialUsers, initialRoles, initialError = false }: { initialUsers: unknown; initialRoles: unknown; initialError?: boolean }) {
  const [users, setUsers] = useState(normalizeUsers(initialUsers));
  const [roles, setRoles] = useState(normalizeRoles(initialRoles));
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [error, setError] = useState(initialError ? "Não foi possível carregar os usuários." : "");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", personalEmail: "", password: "", roleId: "", personalPhones: "", institutionalPhones: "" });

  const visibleUsers = useMemo(() => users.filter((user) => {
    const matchesSearch = `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || roleId(user) === Number(roleFilter) || roleName(user) === roleFilter;
    return matchesSearch && matchesRole;
  }), [users, search, roleFilter]);

  function openCreate() {
    setForm({ name: "", email: "", personalEmail: "", password: "", roleId: roles[0] ? String(roles[0].id) : "", personalPhones: "", institutionalPhones: "" });
    setCreating(true);
    setEditing(null);
  }

  function openEdit(user: ManagedUser) {
    setEditing(user);
    setCreating(false);
    setForm({
      name: user.name,
      email: user.email,
      personalEmail: user.personalEmail ?? "",
      password: "",
      roleId: String(roleId(user) || roles.find((role) => role.name === roleName(user))?.id || ""),
      personalPhones: (user.personalPhones ?? []).join(", "),
      institutionalPhones: (user.institutionalPhones ?? []).join(", "),
    });
  }

  async function reload() {
    const [usersResponse, rolesResponse] = await Promise.all([
      fetch("/api/users", { cache: "no-store" }),
      fetch("/api/roles", { cache: "no-store" }),
    ]);
    const usersBody = await usersResponse.json();
    const rolesBody = await rolesResponse.json();
    if (!usersResponse.ok || !usersBody.success) throw new Error(usersBody.error ?? "Não foi possível atualizar os usuários.");
    if (!rolesResponse.ok || !rolesBody.success) throw new Error(rolesBody.error ?? "Não foi possível atualizar os cargos.");
    setUsers(normalizeUsers(usersBody.data));
    setRoles(normalizeRoles(rolesBody.data));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.email.includes("@") || !form.roleId || (!creating && editing === null)) {
      setError("Preencha nome, e-mail e cargo corretamente.");
      return;
    }
    if (creating && form.password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    const phones = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      roleId: Number(form.roleId),
      ...(form.personalEmail.trim() ? { personalEmail: form.personalEmail.trim() } : {}),
      personalPhones: phones(form.personalPhones),
      institutionalPhones: phones(form.institutionalPhones),
      ...(creating ? { password: form.password } : {}),
    };

    setBusy(true);
    setError("");
    try {
      const response = await fetch(creating ? "/api/users" : `/api/users/${editing?.id}`, {
        method: creating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error ?? "Não foi possível salvar o usuário.");
      await reload();
      setSuccess(creating ? "Usuário cadastrado com sucesso." : "Usuário atualizado com sucesso.");
      setCreating(false);
      setEditing(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar o usuário.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(user: ManagedUser) {
    if (!window.confirm(`Excluir o usuário “${user.name}”?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error ?? "Não foi possível excluir o usuário.");
      await reload();
      setEditing(null);
      setSuccess("Usuário excluído com sucesso.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível excluir o usuário.");
    } finally {
      setBusy(false);
    }
  }

  const modalOpen = creating || editing !== null;

  return (
    <>
      <div className="page-header users-header">
        <div>
          <h1>Usuários</h1>
          <p>Cadastre pessoas, mantenha seus dados e defina seus cargos.</p>
        </div>
        <button className="button button-primary" onClick={openCreate}><Icon name="group" size={16} /> Novo usuário</button>
      </div>

      {error && <div className="permissions-alert"><Alert>{error}</Alert></div>}
      {success && <div className="permissions-alert"><Alert tone="success">{success}</Alert></div>}

      <section className="card users-card">
        <div className="users-toolbar">
          <div className="users-search field">
            <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail" aria-label="Buscar usuários" />
          </div>
          <div className="field users-filter">
            <select className="input" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filtrar por cargo">
              <option value="all">Todos os cargos</option>
              {roles.map((role) => <option key={role.id} value={String(role.id)}>{role.name}</option>)}
            </select>
          </div>
        </div>

        {visibleUsers.length ? (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead><tr><th>Usuário</th><th>E-mail</th><th>Cargo</th><th aria-label="Ações" /></tr></thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user.id}>
                    <td><span className="user-name-cell"><Avatar name={user.name} /><strong>{user.name}</strong></span></td>
                    <td>{user.email}</td>
                    <td><span className="role-chip">{roleName(user) || "Sem cargo"}</span></td>
                    <td><div className="user-row-actions"><button className="button button-secondary" onClick={() => openEdit(user)}>Editar</button><button className="icon-button delete-role" onClick={() => deleteUser(user)} disabled={busy} aria-label={`Excluir ${user.name}`} title="Excluir usuário">×</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="Nenhum usuário encontrado" detail="Ajuste os filtros ou cadastre um novo usuário." />}
      </section>

      {modalOpen && (
        <div className="role-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) { setCreating(false); setEditing(null); } }}>
          <form className="role-modal card user-modal" onSubmit={submit}>
            <div className="role-modal-head"><h2>{creating ? "Novo usuário" : "Editar usuário"}</h2><button type="button" className="icon-button" onClick={() => { setCreating(false); setEditing(null); }} aria-label="Fechar">×</button></div>
            <div className="field-grid">
              <div className="field"><label htmlFor="user-name">Nome completo</label><input id="user-name" className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
              <div className="field"><label htmlFor="user-role">Cargo</label><select id="user-role" className="input" value={form.roleId} onChange={(event) => setForm({ ...form, roleId: event.target.value })}><option value="">Selecione um cargo</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></div>
              <div className="field"><label htmlFor="user-email">E-mail institucional</label><input id="user-email" className="input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
              <div className="field"><label htmlFor="user-personal-email">E-mail pessoal</label><input id="user-personal-email" className="input" type="email" value={form.personalEmail} onChange={(event) => setForm({ ...form, personalEmail: event.target.value })} /></div>
              {creating && <div className="field"><label htmlFor="user-password">Senha inicial</label><input id="user-password" className="input" type="password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><span className="field-note">Mínimo de 8 caracteres.</span></div>}
              <div className="field"><label htmlFor="user-phones">Telefones pessoais</label><input id="user-phones" className="input" value={form.personalPhones} onChange={(event) => setForm({ ...form, personalPhones: event.target.value })} placeholder="Separe por vírgula" /></div>
              <div className="field"><label htmlFor="institution-phones">Telefones institucionais</label><input id="institution-phones" className="input" value={form.institutionalPhones} onChange={(event) => setForm({ ...form, institutionalPhones: event.target.value })} placeholder="Separe por vírgula" /></div>
            </div>
            <div className="role-modal-actions"><button type="button" className="button button-secondary" onClick={() => { setCreating(false); setEditing(null); }}>Cancelar</button><button className="button button-primary" disabled={busy}>{busy ? "Salvando..." : "Salvar usuário"}</button></div>
          </form>
        </div>
      )}
    </>
  );
}
