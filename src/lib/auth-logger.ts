import pool from '@/lib/db';

export interface AuthLogEntry {
  username: string;
  authMethod: 'credentials' | 'google_oauth';
  status: 'SUCCESS' | 'FAILED' | 'ACCESS_DENIED';
  ipAddress?: string | null;
  userAgent?: string | null;
  errorMessage?: string | null;
}

export async function logAuthEvent(entry: AuthLogEntry): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO auth_logs (username, auth_method, status, ip_address, user_agent, error_message, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, clock_timestamp())`,
      [
        entry.username,
        entry.authMethod,
        entry.status,
        entry.ipAddress || null,
        entry.userAgent || null,
        entry.errorMessage || null,
      ]
    );
  } catch (error) {
    console.error('Failed to record auth log entry:', error);
  }
}
