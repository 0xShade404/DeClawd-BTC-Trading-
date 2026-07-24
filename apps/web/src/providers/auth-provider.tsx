'use client';

import * as React from 'react';
import type { UserDto } from '@declawd/shared';
import { apiGet, ApiClientError } from '@/lib/api-client';

interface AuthContextValue {
  user: UserDto | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

/**
 * Fetches the current session (`GET /auth/me`, cookie-authenticated) on
 * mount and exposes it app-wide. A 401 just means "not signed in" — it is
 * not surfaced as an error, `user` simply stays null.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserDto | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchUser = React.useCallback(async () => {
    try {
      const me = await apiGet<UserDto>('/auth/me');
      setUser(me);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        setUser(null);
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, loading, refetch: fetchUser }),
    [user, loading, fetchUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
