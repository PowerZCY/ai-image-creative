export type MonicaApiError = {
  code?: string;
  error?: string;
};

export async function readMonicaApiError(response: Response): Promise<MonicaApiError> {
  try {
    const data = await response.json() as MonicaApiError;
    return data;
  } catch {
    return {};
  }
}

export function isRegistrationRequired(code?: string) {
  return code === 'LOGIN_REQUIRED'
    || code === 'ANONYMOUS_TRIAL_EXHAUSTED'
    || code === 'ANONYMOUS_CREDITS_EXHAUSTED';
}
