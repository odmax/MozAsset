import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Activity, Download, Search } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';

function getSessionUser() {
  const sessionCookie = cookies().get('session');
  if (sessionCookie?.value) {
    try {
      const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
  return null;
}

export const metadata = { title: 'Audit Logs | Asset Manager' };

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  ASSIGN: 'bg-purple-100 text-purple-800',
  TRANSFER: 'bg-yellow-100 text-yellow-800',
  CHECK_IN: 'bg-cyan-100 text-cyan-800',
  CHECK_OUT: 'bg-indigo-100 text-indigo-800',
  MAINTENANCE: 'bg-orange-100 text-orange-800',
  RETIRE: 'bg-gray-100 text-gray-800',
  DISPOSE: 'bg-pink-100 text-pink-800',
  ACTIVATE: 'bg-green-100 text-green-800',
  DEACTIVATE: 'bg-red-100 text-red-800',
  PASSWORD_RESET: 'bg-yellow-100 text-yellow-800',
};

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const user = getSessionUser();
  if (!user) return null;

  const page = Number(searchParams.page) || 1;
  const limit = 25;
  const search = searchParams.search as string || '';
  const action = searchParams.action as string || '';
  const entityType = searchParams.entityType as string || '';

  const where: any = {};
  if (search) {
    where.OR = [
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { asset: { assetTag: { contains: search, mode: 'insensitive' } } },
      { asset: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;

  const [logs, total, actions, entityTypes] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        asset: { select: { id: true, assetTag: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ['action'], _count: { action: true } }),
    prisma.auditLog.groupBy({ by: ['entityType'], _count: { entityType: true } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const csvData = logs.map(log => ({
    Timestamp: formatDateTime(log.createdAt),
    User: log.user.name || log.user.email,
    Email: log.user.email,
    Action: log.action,
    EntityType: log.entityType,
    EntityId: log.entityId,
    AssetTag: log.asset?.assetTag || '',
    AssetName: log.asset?.name || '',
    Changes: log.changes ? JSON.stringify(log.changes) : '',
    Metadata: log.metadata ? JSON.stringify(log.metadata) : '',
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">Track all system activities and changes</p>
        </div>
        <Link href={`/api/export/audit-logs?${new URLSearchParams({ search, action, entityType }).toString()}`}>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity History ({total})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap gap-2 mb-4">
            <Input
              placeholder="Search user, asset..."
              name="search"
              defaultValue={search}
              className="max-w-[200px]"
            />
            <select name="action" defaultValue={action} className="px-3 py-2 border rounded-md text-sm">
              <option value="">All Actions</option>
              {actions.map(a => (
                <option key={a.action} value={a.action}>{a.action}</option>
              ))}
            </select>
            <select name="entityType" defaultValue={entityType} className="px-3 py-2 border rounded-md text-sm">
              <option value="">All Entities</option>
              {entityTypes.map(e => (
                <option key={e.entityType} value={e.entityType}>{e.entityType}</option>
              ))}
            </select>
            <Button type="submit" variant="secondary">
              <Search className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </form>

          <div className="rounded-md border">
            <div className="grid grid-cols-5 gap-4 p-4 font-medium text-sm text-muted-foreground bg-muted/50">
              <div>Timestamp</div>
              <div>User</div>
              <div>Action</div>
              <div>Entity</div>
              <div>Asset</div>
            </div>
            {logs.map((log) => (
              <div key={log.id} className="grid grid-cols-5 gap-4 p-4 border-t text-sm">
                <div className="text-muted-foreground text-xs">{formatDateTime(log.createdAt)}</div>
                <div>
                  <div className="font-medium">{log.user.name || 'System'}</div>
                  <div className="text-xs text-muted-foreground">{log.user.email}</div>
                </div>
                <div><Badge className={actionColors[log.action] || ''}>{log.action}</Badge></div>
                <div>{log.entityType}</div>
                <div>
                  {log.asset ? (
                    <Link href={`/dashboard/assets/${log.asset.id}`} className="text-primary hover:underline">
                      {log.asset.assetTag}
                    </Link>
                  ) : (
                    '-'
                  )}
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No audit logs found
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={`/dashboard/audit-logs?page=${page - 1}&search=${search}&action=${action}&entityType=${entityType}`}>
                    <Button variant="outline" size="sm">Previous</Button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={`/dashboard/audit-logs?page=${page + 1}&search=${search}&action=${action}&entityType=${entityType}`}>
                    <Button variant="outline" size="sm">Next</Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
