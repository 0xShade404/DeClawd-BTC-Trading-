'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import type { UserDto } from '@declawd/shared';
import { WalletConnectButton } from '@/components/layout/wallet-connect-button';
import { apiPost } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';

export function Header({ user }: { user: UserDto | null }) {
  const router = useRouter();
  const { refetch } = useAuth();

  async function handleLogout() {
    try {
      await apiPost('/auth/logout');
    } finally {
      await refetch();
      router.push('/');
    }
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-black/30 px-4 py-3 backdrop-blur-glass md:px-6">
      <div className="md:hidden text-base font-semibold tracking-tight">DeClawd</div>
      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        <WalletConnectButton />
        {user && (
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-base-500 text-[10px] font-bold text-white">
                {(user.displayName ?? user.email).charAt(0).toUpperCase()}
              </span>
            )}
            <span className="hidden text-sm font-medium sm:inline">
              {user.displayName ?? user.email}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Log out"
              className="ml-1 rounded-full p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
