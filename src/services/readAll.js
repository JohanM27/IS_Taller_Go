// Paginate to avoid silently truncating totals at the API row limit.
export async function readAll(makeQuery) {
  const rows = [];
  const size = 500;
  for (let offset = 0; ; offset += size) {
    const { data, error } = await makeQuery().range(offset, offset + size - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < size) return rows;
  }
}
