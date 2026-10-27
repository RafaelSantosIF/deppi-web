"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { visibleNavigation } from "@/lib/permissions";
import type { SessionUser } from "@/lib/types";
import { Avatar, Icon, Logo } from "./ui";

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const current =
    path === "/perfil"
      ? "Perfil"
      : path === "/permissoes"
        ? "Permissões"
        : path === "/usuarios"
          ? "Usuários"
          : "Início";

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  function toggleMenu() {
    if (window.matchMedia("(max-width: 700px)").matches) setOpen(!open);
    else setCollapsed(!collapsed);
  }

  return (
    <div className={`app-layout ${collapsed ? "app-layout-collapsed" : ""}`}>
      <aside
        className={`sidebar ${open ? "sidebar-open" : ""}`}
        aria-label="Menu principal"
      >
        <div className="sidebar-brand">
          <Logo />
        </div>
        <nav className="nav-list">
          {visibleNavigation(user).map((item) =>
            item.comingSoon ? (
              <div
                className="nav-item nav-disabled"
                key={item.label}
                aria-disabled="true"
                aria-label={`${item.label}, em breve`}
                title="Em breve"
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                <small>Em breve</small>
              </div>
            ) : (
              <Link
                key={item.label}
                href={item.href!}
                onClick={() => setOpen(false)}
                className={`nav-item ${path === item.href ? "nav-active" : ""}`}
                aria-current={path === item.href ? "page" : undefined}
                aria-label={item.label}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            ),
          )}
        </nav>
        <button
          className="nav-item sidebar-logout"
          onClick={logout}
          disabled={busy}
          aria-label={busy ? "Saindo" : "Sair"}
        >
          <Icon name="logout" />
          <span>{busy ? "Saindo..." : "Sair"}</span>
        </button>
      </aside>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button menu-toggle"
              aria-label="Alternar menu"
              onClick={toggleMenu}
            >
              <Icon name={open ? "close" : "menu"} />
            </button>
            <span>{current}</span>
          </div>
          <Link href="/perfil" className="topbar-user">
            <span>
              <strong>{user.name}</strong>
              <small>{user.role}</small>
            </span>
            <Avatar name={user.name} />
          </Link>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
