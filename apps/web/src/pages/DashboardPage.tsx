import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, CheckCircle2, CircleDot, ClipboardList, UserRoundX } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { useOrgStore } from '../stores/orgStore';

type Slice = { name: string; value: number };
type Dashboard = { totals: { totalIssues: number; openIssues: number; completedIssues: number; assignedIssues: number; unassignedIssues: number }; issuesByStatus: Slice[]; issuesByPriority: Slice[]; issuesByType: Slice[]; recentActivity: Array<{ id: string; action: string; createdAt: string; actor: { name: string }; project?: { key: string } | null }> };
const colors = ['#818cf8', '#38bdf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa'];

export default function DashboardPage() {
  const currentOrg = useOrgStore((state) => state.currentOrg);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!currentOrg) return;
    apiClient.get(`/organizations/${currentOrg.id}/dashboard`).then((response) => setDashboard(response.data.data)).catch(() => setError('Unable to load dashboard data.'));
  }, [currentOrg]);
  if (!currentOrg) return <main className="min-h-screen bg-slate-950 text-slate-400 grid place-items-center">Choose an organization first.</main>;
  if (error) return <main className="min-h-screen bg-slate-950 text-red-400 grid place-items-center">{error}</main>;
  if (!dashboard) return <main className="min-h-screen bg-slate-950 text-slate-400 grid place-items-center">Loading dashboard…</main>;
  const cards = [
    ['Total issues', dashboard.totals.totalIssues, ClipboardList, 'text-indigo-400'],
    ['Open issues', dashboard.totals.openIssues, CircleDot, 'text-amber-400'],
    ['Completed', dashboard.totals.completedIssues, CheckCircle2, 'text-emerald-400'],
    ['Unassigned', dashboard.totals.unassignedIssues, UserRoundX, 'text-rose-400']
  ] as const;
  return <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 max-w-7xl mx-auto space-y-7">
    <header><p className="text-xs font-semibold tracking-widest uppercase text-indigo-400">{currentOrg.name}</p><h1 className="mt-1 text-3xl font-bold">Workspace dashboard</h1><p className="text-slate-400 text-sm mt-2">Issue health and recent activity, calculated server-side.</p></header>
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">{cards.map(([label, value, Icon, color]) => <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-5"><Icon className={`w-5 h-5 ${color}`} /><p className="mt-4 text-3xl font-bold">{value}</p><p className="text-xs text-slate-400 mt-1">{label}</p></div>)}</section>
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard title="Issues by status"><ResponsiveContainer width="100%" height={260}><BarChart data={dashboard.issuesByStatus}><XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fill: '#94a3b8' }} /><Tooltip /><Bar dataKey="value" fill="#818cf8" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Issues by priority"><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={dashboard.issuesByPriority} dataKey="value" nameKey="name" outerRadius={90} label>{dashboard.issuesByPriority.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Issues by type"><ResponsiveContainer width="100%" height={260}><BarChart data={dashboard.issuesByType}><XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fill: '#94a3b8' }} /><Tooltip /><Bar dataKey="value" fill="#34d399" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5"><div className="flex gap-2 items-center"><Activity className="w-5 h-5 text-indigo-400" /><h2 className="font-semibold">Recent activity</h2></div><div className="mt-4 divide-y divide-slate-800">{dashboard.recentActivity.length ? dashboard.recentActivity.map((event) => <div key={event.id} className="py-3 text-sm"><span className="font-medium">{event.actor.name}</span> <span className="text-slate-400">{event.action.replace(/_/g, ' ').toLowerCase()}</span>{event.project && <span className="ml-2 text-indigo-400 font-mono text-xs">{event.project.key}</span>}<p className="text-xs text-slate-500 mt-1">{new Date(event.createdAt).toLocaleString()}</p></div>) : <p className="py-8 text-center text-sm text-slate-500">No activity recorded yet.</p>}</div></section>
    </section>
  </main>;
}
function ChartCard({ title, children }: { title: string; children: ReactNode }) { return <section className="rounded-xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-semibold text-sm">{title}</h2><div className="mt-4">{children}</div></section>; }
