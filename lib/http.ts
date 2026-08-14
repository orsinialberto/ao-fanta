/**
 * Reads an error message out of a fetch Response, defaulting to a fallback
 * when the body isn't valid JSON (e.g. a 500 that returned an HTML error
 * page instead of the expected `{ error }` payload). Plain `await
 * res.json()` throws uncaught in that case, which silently swallows the
 * failure on the client — this makes the failure mode visible instead.
 */
export async function errorMessage(res: Response, fallback = "Errore"): Promise<string> {
  try {
    const body = await res.json();
    return body.error ?? fallback;
  } catch {
    return `Errore server (${res.status})`;
  }
}
