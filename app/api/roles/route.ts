import { apiErrorResponse } from "@/lib/api";
import { authorizedRequest } from "@/lib/session";

function unwrapRoot(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  const root = value as Record<string, unknown>;
  return root.role && typeof root.role === "object"
    ? root.role as Record<string, unknown>
    : root.data && typeof root.data === "object"
      ? root.data as Record<string, unknown>
      : root;
}

function rolesFrom(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  const root = unwrapRoot(value);
  if (Array.isArray(root.roles)) return root.roles.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  return [];
}

function availablePermissionsFrom(value: unknown): unknown[] {
  if (!value || typeof value !== "object") return [];
  const root = unwrapRoot(value);
  for (const key of ["permissions", "availablePermissions", "allPermissions"])
    if (Array.isArray(root[key])) return root[key];
  return [];
}

export async function GET() {
  try {
    const list = await authorizedRequest<unknown>("/roles");
    const roles = rolesFrom(list);
    const permissionsById = new Map<number, unknown>();
    for (const permission of availablePermissionsFrom(list))
      if (permission && typeof permission === "object") {
        const item = permission as Record<string, unknown>;
        const id = Number(item.id ?? item.permissionId);
        if (Number.isInteger(id) && id > 0) permissionsById.set(id, permission);
      }

    const enrichedRoles = await Promise.all(roles.map(async (role) => {
      const id = Number(role.id);
      if (!Number.isInteger(id) || id <= 0) return role;
      try {
        const detail = await authorizedRequest<unknown>(`/roles/${id}`);
        const detailRoot = unwrapRoot(detail);
        const detailPermissions = Array.isArray(detailRoot.permissions)
          ? detailRoot.permissions
          : Array.isArray((detail as Record<string, unknown>)?.permissions)
            ? (detail as Record<string, unknown>).permissions as unknown[]
            : [];
        for (const permission of detailPermissions)
          if (permission && typeof permission === "object") {
            const item = permission as Record<string, unknown>;
            const nested = item.permission && typeof item.permission === "object"
              ? item.permission as Record<string, unknown>
              : item;
            const permissionId = Number(nested.id ?? nested.permissionId ?? item.permissionId);
            if (Number.isInteger(permissionId) && permissionId > 0)
              permissionsById.set(permissionId, nested);
          }
        return {
          ...detailRoot,
          ...role,
          id,
          permissions: detailPermissions.length ? detailPermissions : role.permissions,
        };
      } catch {
        return role;
      }
    }));

    return Response.json({
      success: true,
      data: { roles: enrichedRoles, permissions: [...permissionsById.values()] },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length < 2) {
    return Response.json({ success: false, error: "Informe um nome válido para o cargo." }, { status: 400 });
  }
  try {
    const data = await authorizedRequest<unknown>("/roles", {
      method: "POST",
      body: JSON.stringify({ name: body.name.trim() }),
    });
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
