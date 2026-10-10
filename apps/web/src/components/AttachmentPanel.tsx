import { ChangeEvent, useEffect, useState } from 'react';
import { Download, FileText, Paperclip, Trash2, Upload, X } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';

type Attachment = { id: string; originalName: string; mimeType: string; size: number; createdAt: string; uploader: { name: string } };
type Props = { projectId: string; issueId: string; canManage?: boolean };
const readableSize = (size: number) => size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;

export function AttachmentPanel({ projectId, issueId, canManage = true }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([]); const [progress, setProgress] = useState<number | null>(null); const [error, setError] = useState<string | null>(null);
  const endpoint = `/projects/${projectId}/issues/${issueId}/attachments`;
  const load = async () => { try { const response = await apiClient.get(endpoint); setAttachments(response.data.data); } catch { setError('Unable to load attachments.'); } };
  useEffect(() => { load(); }, [projectId, issueId]);
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    setError(null); setProgress(0); const form = new FormData(); form.append('file', file);
    try { await apiClient.post(endpoint, form, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress: (update) => setProgress(update.total ? Math.round((update.loaded / update.total) * 100) : 0) }); await load(); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Upload failed. Confirm the file type and size, then try again.')); }
    finally { setProgress(null); }
  };
  const download = async (attachment: Attachment) => {
    try { const response = await apiClient.get(`${endpoint}/${attachment.id}/download`, { responseType: 'blob' }); const url = URL.createObjectURL(response.data); const link = document.createElement('a'); link.href = url; link.download = attachment.originalName; link.click(); URL.revokeObjectURL(url); }
    catch { setError('Download failed.'); }
  };
  const remove = async (attachmentId: string) => { if (!window.confirm('Delete this attachment?')) return; try { await apiClient.delete(`${endpoint}/${attachmentId}`); setAttachments((items) => items.filter((item) => item.id !== attachmentId)); } catch { setError('Could not delete the attachment.'); } };
  return <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4"><div className="flex items-center justify-between"><div><h2 className="font-semibold flex gap-2 items-center"><Paperclip className="w-4 h-4 text-indigo-400" />Attachments</h2><p className="text-xs text-slate-400 mt-1">PNG, JPEG, GIF, PDF, text, Markdown, or ZIP · up to 10 MB</p></div>{canManage && <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 px-3 py-2 rounded-lg text-xs font-semibold flex gap-2 items-center"><Upload className="w-3.5 h-3.5" />Upload<input type="file" className="hidden" accept=".png,.jpg,.jpeg,.gif,.pdf,.txt,.md,.zip" onChange={upload} /></label>}</div>{progress !== null && <div><div className="flex justify-between text-xs text-slate-400 mb-1"><span>Uploading…</span><span>{progress}%</span></div><div className="h-2 rounded bg-slate-800 overflow-hidden"><div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} /></div></div>}{error && <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded p-3 flex justify-between gap-2"><span>{error}</span><button onClick={() => setError(null)}><X className="w-4 h-4" /></button></div>}<div className="divide-y divide-slate-800">{attachments.length ? attachments.map((attachment) => <div key={attachment.id} className="py-3 flex items-center gap-3"><FileText className="w-4 h-4 text-slate-400" /><div className="min-w-0 flex-1"><p className="text-sm truncate">{attachment.originalName}</p><p className="text-xs text-slate-500">{readableSize(attachment.size)} · {attachment.uploader.name} · {new Date(attachment.createdAt).toLocaleDateString()}</p></div><button onClick={() => download(attachment)} className="p-2 text-slate-300 hover:text-white"><Download className="w-4 h-4" /></button>{canManage && <button onClick={() => remove(attachment.id)} className="p-2 text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>}</div>) : <p className="text-sm text-slate-500 py-5 text-center">No attachments yet.</p>}</div></section>;
}
