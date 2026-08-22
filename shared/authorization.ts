export function isAdministratorRole(role: unknown) {
  return role === "admin" || role === "content_admin" || role === "super_admin";
}
