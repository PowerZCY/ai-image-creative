const OPENROUTER_MOCK_TYPES = new Set(['0', '1', '2', '3', '4', '5']);

export function readOpenRouterMockType() {
  const value = process.env.OPENROUTER_MOCK_TYPE?.trim();
  return value || undefined;
}

export function isOpenRouterMockEnabled() {
  const mockType = readOpenRouterMockType();
  return Boolean(mockType && OPENROUTER_MOCK_TYPES.has(mockType));
}

