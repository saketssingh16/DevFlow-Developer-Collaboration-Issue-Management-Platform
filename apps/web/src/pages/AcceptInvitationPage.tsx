import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';

export default function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>(); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const accept = async () => { if (!token) return; setLoading(true); setError(''); try { await apiClient.post(`/organizations/invitations/${token}/accept`); setMessage('Invitation accepted. You can now select the organization from Organizations.'); } catch (reason) { setError(getErrorMessage(reason, 'Unable to accept this invitation.')); } finally { setLoading(false); } };
  return <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6"><section className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"><h1 className="text-xl font-bold">Organization invitation</h1><p className="text-sm text-slate-400">Accept this invitation using the DevFlow account for the email address that was invited.</p>{error && <p className="text-sm text-red-400">{error}</p>}{message ? <><p className="text-sm text-emerald-400">{message}</p><Link to="/organizations" className="text-sm text-indigo-400">Open organizations →</Link></> : <button onClick={accept} disabled={loading} className="bg-indigo-600 disabled:opacity-50 rounded px-4 py-2 text-sm font-semibold">{loading ? 'Accepting…' : 'Accept invitation'}</button>}</section></main>;
}
