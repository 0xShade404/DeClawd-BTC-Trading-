'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { NonCustodialBanner } from '@/components/layout/non-custodial-banner';

/**
 * Authenticated app shell shared by every route under (app)/. Redirects to
 * the landing page if the user isn't signed in (auth is resolved via
 * GET /auth/me — see providers/auth-provider.tsx).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-base-500" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={user.role} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header user={user} />
        <main className="flex-1 px-4 pb-24 pt-6 md:px-6 md:pb-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
        <div className="hidden md:block">
          <NonCustodialBanner />
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
