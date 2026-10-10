import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { useOrgStore } from '../stores/orgStore';
import { FolderGit2, Plus, ArrowRight, Layers, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProjectSchema, CreateProjectInput } from '@devflow/validation';
import { getErrorMessage } from '../lib/errorMessage';

interface ProjectItem {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  status: string;
  createdAt: string;
  _count?: {
    members: number;
    issues: number;
  };
}

export function ProjectsPage() {
  const { currentOrg } = useOrgStore();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema)
  });

  const fetchProjects = async () => {
    if (!currentOrg) return;
    try {
      const res = await apiClient.get(`/organizations/${currentOrg.id}/projects`);
      setProjects(res.data.data);
    } catch {
      setErrorMsg('Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [currentOrg]);

  const onCreateProject = async (data: CreateProjectInput) => {
    if (!currentOrg) return;
    setErrorMsg(null);
    try {
      await apiClient.post(`/organizations/${currentOrg.id}/projects`, data);
      await fetchProjects();
      setCreateOpen(false);
      reset();
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Failed to create project'));
    }
  };

  if (!currentOrg) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
        Please select an active organization workspace first.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <FolderGit2 className="w-8 h-8 text-indigo-400" />
            Projects
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Organization Workspace: <span className="font-semibold text-white">{currentOrg.name}</span>
          </p>
        </div>

        <button
          onClick={() => setCreateOpen(!createOpen)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          Create Project
        </button>
      </div>

      {createOpen && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Create New Project</h3>
          {errorMsg && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded">{errorMsg}</div>}
          <form onSubmit={handleSubmit(onCreateProject)} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Project Name
              </label>
              <input
                {...register('name')}
                placeholder="Engineering Platform"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Project Key (2-10 Uppercase Characters)
              </label>
              <input
                {...register('key')}
                placeholder="ENG"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              {errors.key && <p className="text-xs text-red-400 mt-1">{errors.key.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Description (Optional)
              </label>
              <textarea
                {...register('description')}
                placeholder="Core backend architecture and microservices"
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-lg text-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm py-12 text-center">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-3">
          <FolderGit2 className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-medium text-white">No projects yet</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            Create your first project to organize developer tasks, track bugs, and manage issues.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-6 transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                    {proj.key}
                  </span>
                  <span className="text-xs text-emerald-400 uppercase font-semibold">{proj.status}</span>
                </div>
                <h3 className="text-xl font-bold text-white">{proj.name}</h3>
                <p className="text-slate-400 text-xs line-clamp-2">{proj.description || 'No description provided'}</p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {proj._count?.members || 1} members
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    {proj._count?.issues || 0} issues
                  </span>
                </div>

                <Link
                  to={`/projects/${proj.id}`}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  View <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProjectsPage;
