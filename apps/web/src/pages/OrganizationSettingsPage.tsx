import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';

type Organization = { id: string; name: string; slug: string; logoUrl?: string | null; userRole: string };

export default function OrganizationSettingsPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [name, setName] = useState(''); const [slug, setSlug] = useState(''); const [logoUrl, setLogoUrl] = useState('');
  const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const canEdit = organization?.userRole === 'OWNER' || organization?.userRole === 'ADMIN';
  useEffect(() => { if (!organizationId) return; apiClient.get(`/organizations/${organizationId}`).then((response) => { const item = response.data.data as Organization; setOrganization(item); setName(item.name); setSlug(item.slug); setLogoUrl(item.logoUrl || ''); }).catch((reason) => setError(getErrorMessage(reason, 'Unable to load organization settings.'))); }, [organizationId]);
  const save = async () => { if (!organizationId) return; setError(''); setMessage(''); try { const response = await apiClient.patch(`/organizations/${organizationId}`, { name, slug, logoUrl: logoUrl || null }); setOrganization((current) => current ? { ...current, ...response.data.data } : current); setMessage('Settings saved.'); } catch (reason) { setError(getErrorMessage(reason, 'Unable to save organization settings.')); } };
  if (!organization) return <main className="min-h-screen bg-slate-950 text-slate-300 p-8">{error || 'Loading settings…'}</main>;
  return <main className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-2xl mx-auto space-y-6"><Link to="/organizations" className="text-sm text-indigo-400">← Organizations</Link><section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"><h1 className="text-2xl font-bold">Organization settings</h1>{error && <p className="text-red-400 text-sm">{error}</p>}{message && <p className="text-emerald-400 text-sm">{message}</p>}<label className="block text-sm">Name<input disabled={!canEdit} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded p-2 disabled:opacity-50" /></label><label className="block text-sm">Slug<input disabled={!canEdit} value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded p-2 disabled:opacity-50" /></label><label className="block text-sm">Logo URL (optional)<input disabled={!canEdit} value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded p-2 disabled:opacity-50" /></label>{canEdit ? <button onClick={save} className="bg-indigo-600 rounded px-4 py-2 text-sm font-semibold">Save settings</button> : <p className="text-sm text-amber-300">Only organization owners and admins can change these settings.</p>}</section><Link to={`/organizations/${organization.id}/members`} className="text-sm text-indigo-400">Manage members and invitations →</Link></main>;
}
