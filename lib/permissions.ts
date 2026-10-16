import type { PermissionSlug, SessionUser } from "./types";

const names: Record<string, string> = {
  "Gerenciar Usuários": "manage-users",
  "Gerenciar Instituições": "manage-institutions",
  "Gerenciar Cursos": "manage-courses",
  "Gerenciar Inscrições": "manage-enrollments",
  "Gerenciar Permissões": "manage-permissions",
  "Manter Professores": "maintain-teachers",
  "Gerar Relatórios": "generate-reports",
  "Visualizar Relatórios": "view-reports",
  "Visualizar Dashboard": "view-dashboard",
  "Visualizar Perfil": "view-profile",
  "Editar Perfil": "edit-profile",
  "Visualizar Cursos": "view-courses",
  "Realizar Inscrição": "enroll",
  "Gerenciar Inscrições (próprio)": "manage-own-enrollments",
  "Gerenciar Inscrições (qualquer)": "manage-any-enrollments",
};

export function normalizePermissions(value: unknown): PermissionSlug[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => names[item] ?? item),
    ),
  ];
}

export function can(user: SessionUser, ...permissions: PermissionSlug[]) {
  return permissions.some((permission) =>
    user.permissions.includes(permission),
  );
}

export type NavigationItem = {
  label: string;
  icon: string;
  href?: string;
  permissions?: PermissionSlug[];
  comingSoon?: boolean;
};

export const navigation: NavigationItem[] = [
  { label: "Início", icon: "home", href: "/inicio" },
  {
    label: "Cursos",
    icon: "school",
    permissions: ["view-courses", "manage-courses"],
    comingSoon: true,
  },
  {
    label: "Minhas inscrições",
    icon: "assignment",
    permissions: ["enroll", "manage-own-enrollments"],
    comingSoon: true,
  },
  {
    label: "Inscrições",
    icon: "list_alt",
    permissions: ["manage-enrollments", "manage-any-enrollments"],
    comingSoon: true,
  },
  {
    label: "Professores",
    icon: "badge",
    permissions: ["maintain-teachers"],
    comingSoon: true,
  },
  {
    label: "Usuários",
    icon: "group",
    permissions: ["manage-users"],
    comingSoon: true,
  },
  {
    label: "Instituições",
    icon: "apartment",
    permissions: ["manage-institutions"],
    comingSoon: true,
  },
  {
    label: "Relatórios",
    icon: "bar_chart",
    permissions: ["view-reports", "generate-reports"],
    comingSoon: true,
  },
  {
    label: "Permissões",
    icon: "admin_panel_settings",
    permissions: ["manage-permissions"],
    comingSoon: true,
  },
  { label: "Perfil", icon: "person", href: "/perfil" },
];

export function visibleNavigation(user: SessionUser) {
  return navigation.filter(
    (item) => !item.permissions || can(user, ...item.permissions),
  );
}
