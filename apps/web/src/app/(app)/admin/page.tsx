'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Users, Activity, DollarSign, Landmark, ShieldCheck, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { StatCard } from '@/components/dashboard/stat-card';
import { useAuth } from '@/providers/auth-provider';
import {
  useAdminMetrics,
  useAdminUsers,
  useAdminPositions,
  useAdminLogs,
  useAdminHealth,
} from '@/lib/hooks/use-admin';
import { formatUsd } from '@/lib/utils';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = React.useState('overview');

  React.useEffect(() => {
    if (!loading && user && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  if (loading || !user) return null;
  if (user.role !== 'ADMIN') return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Platform-wide metrics and operational tools.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="positions">
          <PositionsTab />
        </TabsContent>
        <TabsContent value="logs">
          <LogsTab />
        </TabsContent>
        <TabsContent value="health">
          <HealthTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab() {
  const { data: metrics, isLoading } = useAdminMetrics();
  const v = (n: number | undefined) => (isLoading || n === undefined ? '...' : formatUsd(n));

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Total users" icon={Users} value={isLoading ? '...' : String(metrics?.totalUsers ?? 0)} />
      <StatCard label="Active bots" icon={Activity} value={isLoading ? '...' : String(metrics?.activeBots ?? 0)} />
      <StatCard label="Total volume" icon={TrendingUp} value={v(metrics?.totalVolumeUsd)} />
      <StatCard label="Revenue" icon={DollarSign} value={v(metrics?.revenueUsd)} />
      <StatCard label="Trading pool (all)" icon={Landmark} value={v(metrics?.totalTradingPoolUsd)} />
      <StatCard label="Vault (all)" icon={ShieldCheck} value={v(metrics?.totalVaultUsd)} />
      <StatCard label="Open positions" value={isLoading ? '...' : String(metrics?.openPositions ?? 0)} />
      <StatCard label="Closed positions" value={isLoading ? '...' : String(metrics?.closedPositions ?? 0)} />
    </div>
  );
}

function UsersTab() {
  const { data, isLoading } = useAdminUsers({ pageSize: 20 });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">Loading...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.displayName ?? '--'}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'ADMIN' ? 'success' : 'outline'}>{u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function PositionsTab() {
  const { data, isLoading } = useAdminPositions({ pageSize: 20 });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Positions (open &amp; closed)</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">Loading...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Market</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>PnL</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="max-w-[240px] whitespace-normal">{p.marketQuestion}</TableCell>
                  <TableCell>
                    <Badge variant={p.direction === 'YES' ? 'success' : 'destructive'}>{p.direction}</Badge>
                  </TableCell>
                  <TableCell>{formatUsd(p.sizeUsd)}</TableCell>
                  <TableCell>{p.realizedPnlUsd == null ? '--' : formatUsd(p.realizedPnlUsd)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function LogsTab() {
  const { data, isLoading } = useAdminLogs({ pageSize: 30 });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent logs</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">Loading...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        log.level === 'error' ? 'destructive' : log.level === 'warn' ? 'outline' : 'secondary'
                      }
                    >
                      {log.level}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[420px] whitespace-normal">{log.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function HealthTab() {
  const { data, isLoading } = useAdminHealth();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Service health</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          (data ?? []).map((check) => (
            <div
              key={check.service}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3"
            >
              <div>
                <div className="text-sm font-medium">{check.service}</div>
                {check.latencyMs != null && (
                  <div className="text-xs text-muted-foreground">{check.latencyMs}ms</div>
                )}
              </div>
              <Badge
                variant={
                  check.status === 'ok' ? 'success' : check.status === 'degraded' ? 'outline' : 'destructive'
                }
              >
                {check.status}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
