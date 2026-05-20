export function normalizeErrorMessage(error, fallback = 'Something went wrong') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || fallback;

  const data = error?.response?.data || error?.data || error;
  if (typeof data === 'string') return data;

  return (
    data?.message ||
    data?.error?.message ||
    data?.error ||
    data?.code ||
    error?.message ||
    fallback
  );
}
