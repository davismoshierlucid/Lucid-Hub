export function getPagination(query) {
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(query.limit ?? '20', 10) || 20)
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id
  );
}
