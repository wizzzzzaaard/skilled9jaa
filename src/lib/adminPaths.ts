/** Admin pages only an owner admin may open (money, settings, roles, personal data). */
export const OWNER_PATHS = ["/admin/payments", "/admin/withdrawals", "/admin/renewals", "/admin/team", "/admin/data-requests", "/admin/settings"];
export const isOwnerPath = (path: string) => OWNER_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
