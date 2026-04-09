export function formatAiError(e) {
  if (e?.response?.status === 503) {
    return (
      e.response?.data?.message ||
      'AI service not configured. Add ANTHROPIC_API_KEY on the server.'
    );
  }
  return (
    e?.response?.data?.error ||
    e?.response?.data?.message ||
    e?.message ||
    'Request failed'
  );
}
