import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { Users, ShieldCheck, Calendar, ArrowLeft, UserPlus, X } from 'lucide-react';
import { getErrorMessage } from '../lib/errorMessage';

interface ProjectDetails {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  status: string;
  createdAt: string;
  userProjectRole?: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  members: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

interface OrganizationMember {
  userId: string;
  user: { id: string; name: string; email: string };
}

export function ProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [organizationMembers, setOrganizationMembers] = useState<OrganizationMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('MEMBER');
  const [addingMember, setAddingMember] = useState(false);

  const refreshProject = async () => {
    if (!projectId) return;
    const res = await apiClient.get(`/projects/${projectId}`);
    setProject(res.data.data);
  };

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        await refreshProject();
      } catch (err) {
        setErrorMsg(getErrorMessage(err, 'Failed to fetch project details'));
      } finally {
        setLoading(false);
      }
    };
    if (projectId) fetchDetails();
  }, [projectId]);

  useEffect(() => {
    if (!project || project.userProjectRole !== 'LEAD') return;
    apiClient.get(`/organizations/${project.organization.id}/members`)
      .then((res) => setOrganizationMembers(res.data.data))
      .catch(() => setErrorMsg('Unable to load organization members for this project.'));
  }, [project?.id, project?.organization.id, project?.userProjectRole]);

  const addMember = async () => {
    if (!projectId || !selectedUserId) return;
    setAddingMember(true);
    setErrorMsg(null);
    try {
      await apiClient.post(`/projects/${projectId}/members`, { userId: selectedUserId, role: selectedRole });
      setSelectedUserId('');
      await refreshProject();
    } catch (error) {
      setErrorMsg(getErrorMessage(error, 'Unable to add this member to the project.'));
    } finally {
      setAddingMember(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!projectId || !window.confirm('Remove this user from the project?')) return;
    try {
      await apiClient.delete(`/projects/${projectId}/members/${memberId}`);
      await refreshProject();
    } catch (error) {
      setErrorMsg(getErrorMessage(error, 'Unable to remove this project member.'));
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-slate-400 p-8 text-center text-sm">Loading project...</div>;
  }

  if (errorMsg || !project) {
    return (
      <div className="min-h-screen bg-slate-950 text-red-400 p-8 text-center text-sm">
        {errorMsg || 'Project not found'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-5xl mx-auto space-y-8">
      <Link to="/projects" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition">
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </Link>
      <Link to={`/projects/${project.id}/issues`} className="inline-flex ml-4 text-xs font-semibold text-indigo-400 hover:text-indigo-300">Open issue board</Link>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded">
                {project.key}
              </span>
              <h1 className="text-3xl font-bold text-white">{project.name}</h1>
            </div>
            <p className="text-slate-400 text-sm">{project.description || 'No description provided'}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-indigo-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Your Role: {project.userProjectRole}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1">
            <span className="text-xs text-slate-500 uppercase font-semibold">Project Lead</span>
            <p className="font-medium text-white">{project.owner.name}</p>
            <p className="text-xs text-slate-400">{project.owner.email}</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1">
            <span className="text-xs text-slate-500 uppercase font-semibold">Organization</span>
            <p className="font-medium text-white">{project.organization.name}</p>
            <p className="text-xs font-mono text-slate-400">/{project.organization.slug}</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1">
            <span className="text-xs text-slate-500 uppercase font-semibold">Created Date</span>
            <p className="font-medium text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Members List */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Project Members ({project.members.length})
            </h3>
            {project.userProjectRole === 'LEAD' && <span className="text-xs text-slate-400">Project lead controls</span>}
          </div>

          {project.userProjectRole === 'LEAD' && (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white"><UserPlus className="w-4 h-4 text-indigo-400" /> Add organization member to this project</div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-3">
                <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">Select an organization member</option>
                  {organizationMembers.filter((member) => !project.members.some((projectMember) => projectMember.user.id === member.userId)).map((member) => <option key={member.userId} value={member.userId}>{member.user.name} ({member.user.email})</option>)}
                </select>
                <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="MEMBER">Member</option><option value="VIEWER">Viewer</option><option value="LEAD">Lead</option>
                </select>
                <button onClick={addMember} disabled={!selectedUserId || addingMember} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-semibold">{addingMember ? 'Adding…' : 'Add member'}</button>
              </div>
              <p className="text-xs text-slate-500">Need to invite someone first? Use the organization’s Members & Settings page.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {project.members.map((mem) => (
              <div key={mem.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{mem.user.name}</p>
                  <p className="text-xs text-slate-400">{mem.user.email}</p>
                </div>
                <div className="flex items-center gap-2"><span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700">{mem.role}</span>{project.userProjectRole === 'LEAD' && mem.user.id !== project.owner.id && <button onClick={() => removeMember(mem.id)} title="Remove from project" className="p-1 text-slate-400 hover:text-red-400"><X className="w-4 h-4" /></button>}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectDetailsPage;
