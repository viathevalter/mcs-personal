export type AppErrorCode = 'RLS_DENIED' | 'UNKNOWN' | 'NOT_FOUND' | 'VALIDATION_ERROR';

export class AppError extends Error {
    public code: AppErrorCode;

    constructor(message: string, code: AppErrorCode = 'UNKNOWN') {
        super(message);
        this.code = code;
        this.name = 'AppError';
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapSupabaseError(error: any): AppError {
    if (!error) {
        return new AppError('Unknown application error occurred.', 'UNKNOWN');
    }

    const code = error.code;
    const message = error.message || 'An error occurred while communicating with the server.';

    // Supabase / PostgREST common error codes for RLS / Permissions
    // 42501 = INSUFFICIENT PRIVILEGE
    if (code === '42501' || message.toLowerCase().includes('row level security') || message.toLowerCase().includes('policy')) {
        return new AppError(message, 'RLS_DENIED');
    }

    if (code === 'PGRST116') {
        return new AppError('Resource not found.', 'NOT_FOUND');
    }

    return new AppError(message, 'UNKNOWN');
}
