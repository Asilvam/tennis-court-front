export function historyPagination(params: URLSearchParams) {
  const requested = Number(params.get('page') || 1);
  const size = Number(params.get('pageSize') || 25);
  return {
    page: Number.isInteger(requested) && requested >= 1 && requested <= 100000 ? requested : 1,
    pageSize: [25, 50, 100].includes(size) ? size : 25,
  };
}
