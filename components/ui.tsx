import type { ReactNode } from "react";
import Image from "next/image";

const paths: Record<string, ReactNode> = {
  home: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />,
  school: (
    <>
      <path d="m2 9 10-5 10 5-10 5zM6 11v5c4 3 8 3 12 0v-5M22 9v7" />
    </>
  ),
  assignment: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4.5h6M8 10h8M8 14h8M8 18h5" />
    </>
  ),
  list_alt: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M8 9h9M8 14h9" />
    </>
  ),
  badge: (
    <>
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M9 6V4h6v2M8 12h8M8 16h5" />
    </>
  ),
  group: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3 2-5 6-5s6 2 6 5M17 6a3 3 0 0 1 0 6M17 15c2.5.2 4 1.6 4 4" />
    </>
  ),
  apartment: (
    <>
      <path d="M4 21V5l8-3 8 3v16M2 21h20M8 9h1M15 9h1M8 13h1M15 13h1M10 21v-5h4v5" />
    </>
  ),
  bar_chart: (
    <>
      <path d="M4 20V11h4v9M10 20V4h4v16M16 20v-7h4v7M2 20h20" />
    </>
  ),
  admin_panel_settings: (
    <>
      <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5zM9 12l2 2 4-4" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3-6 8-6s8 2 8 6" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M5 5 19 19M19 5 5 19" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  eye: (
    <>
      <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 8l4 4-4 4M8 12h10" />
    </>
  ),
  warning: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6M12 17h.01" />
    </>
  ),
  check: <path d="m4 12 5 5L20 6" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4M17 3v4M3 10h18" />
    </>
  ),
};

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.warning}
    </svg>
  );
}

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className="brand">
      <span className="brand-mark">D</span>
      <span>
        <strong>DEPPI</strong>
        {!small && <small>IFCE · Extensão</small>}
      </span>
    </div>
  );
}

export function Avatar({
  name,
  photo = false,
  large = false,
}: {
  name: string;
  photo?: boolean;
  large?: boolean;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <span className={`avatar ${large ? "avatar-large" : ""}`}>
      {photo ? (
        <Image
          src="/api/profile/photo"
          alt=""
          width={48}
          height={48}
          unoptimized
        />
      ) : (
        initials
      )}
    </span>
  );
}

export function Alert({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: "error" | "success" | "info";
}) {
  return (
    <div
      className={`alert alert-${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon name={tone === "success" ? "check" : "warning"} size={17} />
      <span>{children}</span>
    </div>
  );
}

export function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div className="empty-state">
      <Icon name="assignment" size={28} />
      <strong>{title}</strong>
      {detail && <p>{detail}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const label: Record<string, string> = {
    PUBLISHED: "Publicado",
    APPROVED: "Aprovado",
    PENDING: "Pendente",
    PENDING_APPROVAL: "Em análise",
    CLOSED: "Encerrado",
    REJECTED: "Indeferido",
    CANCELLED: "Cancelado",
    WAITLISTED: "Lista de espera",
  };
  return (
    <span className={`badge badge-${status.toLowerCase().replace(/_/g, "-")}`}>
      {label[status] ?? status}
    </span>
  );
}
