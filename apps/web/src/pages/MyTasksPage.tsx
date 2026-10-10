import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { useOrgStore } from '../stores/orgStore';

type Task = { id: string; publicId: string; title: string; status: string; priority: string; dueDate?: string | null; project: { id: string; name: string; key: string } };
export default function MyTasksPage() {
  const currentOrg = useOrgStore((state) => state.currentOrg); const [tasks, setTasks] = useState<Task[]>([]); const [error, setError] = useState('');
  useEffect(() => { if (!currentOrg) return; apiClient.get(`/organizations/${currentOrg.id}/my-issues`).then((response) => setTasks(response.data.data)).catch(() => setError('Unable to load your assigned work.')); }, [currentOrg]);
  if (!currentOrg) return <main className="min-h-screen bg-slate-950 text-slate-400 grid place-items-center">Choose an organization first.</main>;
  return <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 max-w-5xl mx-auto space-y-6"><header><p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">{currentOrg.name}</p><h1 className="mt-1 text-3xl font-bold flex items-center gap-3"><ClipboardCheck className="text-indigo-400"/>My tasks</h1><p className="text-sm text-slate-400 mt-2">Issues assigned to you across this organization.</p></header>{error && <p className="text-sm text-red-400">{error}</p>}<section className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800">{tasks.length ? tasks.map((task) => <Link key={task.id} to={`/projects/${task.project.id}/issues`} className="block p-4 hover:bg-slate-800/50"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-xs text-indigo-400">{task.project.key} · {task.publicId}</p><p className="mt-1 font-medium">{task.title}</p><p className="mt-1 text-xs text-slate-400">{task.project.name} · {task.status.replace(/_/g, ' ')}</p></div><div className="text-right text-xs"><p className="text-amber-300">{task.priority}</p><p className="mt-1 text-slate-500">{task.dueDate ? `Due ${new Date(task.dueDate).toLocaleDateString()}` : 'No due date'}</p></div></div></Link>) : <p className="p-10 text-center text-sm text-slate-500">No tasks are assigned to you yet.</p>}</section></main>;
}
