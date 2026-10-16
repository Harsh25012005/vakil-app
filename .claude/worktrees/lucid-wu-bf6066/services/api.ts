/**
 * Error type shared by every service: { status, code, message, fields } (FRS section 8), so screens
 * handle failures the same way whatever went wrong underneath. Supabase errors (Postgres SQLSTATE,
 * PostgREST PGRST codes, network failures) are translated here.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');

export const notFound = (what: string) => new ApiError(404, 'NOT_FOUND', `${what} not found`);

/** Shape shared by PostgrestError and the errors our RPC functions raise. */
export type DbError = { code?: string; message: string; details?: string | null; hint?: string | null };

const NETWORK = /network request failed|failed to fetch|fetch failed|load failed|networkerror/i;

export function fromDbError(e: DbError, what = 'Record'): ApiError {
  if (NETWORK.test(e.message)) return new ApiError(0, 'NETWORK', "Can't reach the server. Check your connection and try again.");
  switch (e.code) {
    case 'PGRST116': // .single() found no row (missing, or hidden by RLS)
    case 'P0002':
    case '22P02': // malformed id in a route param
      return notFound(what);
    case '23505':
      return new ApiError(409, 'CONFLICT', `This ${what.toLowerCase()} already exists.`);
    case '23503':
      return new ApiError(409, 'INVALID_REFERENCE', 'Something this depends on no longer exists. Refresh and try again.');
    case '23502':
    case '23514':
    case '22023':
      return new ApiError(422, 'VALIDATION_ERROR', 'Some details are not valid. Check them and try again.');
    case '42501':
      return new ApiError(403, 'FORBIDDEN', "You don't have access to this.");
    case 'PGRST301':
    case 'PGRST303':
      return new ApiError(401, 'UNAUTHENTICATED', 'Your session has expired. Please sign in again.');
  }
  return new ApiError(500, e.code || 'SERVER_ERROR', e.message || 'Something went wrong. Please try again.');
}

/**
 * Awaits a Supabase query and returns its data, or throws an ApiError.
 *   const rows = await unwrap(supabase.from('clients').select('*'), 'Client');
 */
export async function unwrap<T>(query: PromiseLike<{ data: T; error: DbError | null }>, what?: string): Promise<NonNullable<T>> {
  let res: { data: T; error: DbError | null };
  try {
    res = await query;
  } catch (e) {
    throw fromDbError({ message: errorMessage(e) }, what);
  }
  if (res.error) throw fromDbError(res.error, what);
  return res.data as NonNullable<T>;
}
