import React, { useEffect, useState } from 'react';
import { apiClient } from '../lib/apiClient';
import { useOrgStore } from '../stores/orgStore';
import { getErrorMessage } from '../lib/errorMessage';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createOrgSchema, CreateOrgInput } from '@devflow/validation';
import { Link } from 'react-router-dom';
import { Building2, Plus, ArrowRight, ShieldCheck } from 'lucide-react';

export function OrganizationsPage() {
  const { organizations, setOrganizations, setCurrentOrg, currentOrg } = useOrgStore();
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateOrgInput>({
    resolver: zodResolver(createOrgSchema)
  });

  const fetchOrganizations = async () => {
    try {
      const res = await apiClient.get('/organizations');
      setOrganizations(res.data.data);
    } catch {
      setErrorMsg('Failed to load organizations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const onCreateOrg = async (data: CreateOrgInput) => {
    setErrorMsg(null);
    try {
      const res = await apiClient.post('/organizations', data);
      await fetchOrganizations();
      setCurrentOrg(res.data.data);
      setCreateOpen(false);
      reset();
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Failed to create organization'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Building2 className="w-8 h-8 text-indigo-400" />
            Organizations
          </h1>
          <p className="text-slate-400 text-sm mt-1">Select or manage your organization workspaces</p>
        </div>

        <button
          onClick={() => setCreateOpen(!createOpen)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          Create Organization
        </button>
      </div>

      {createOpen && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Create New Organization</h3>
          {errorMsg && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded">{errorMsg}</div>}
          <form onSubmit={handleSubmit(onCreateOrg)} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Organization Name
              </label>
              <input
                {...register('name')}
                placeholder="Acme Corp"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                URL Slug
              </label>
              <input
                {...register('slug')}
                placeholder="acme-corp"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.slug && <p className="text-xs text-red-400 mt-1">{errors.slug.message}</p>}
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
                {isSubmitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm py-12 text-center">Loading organizations...</div>
      ) : organizations.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-3">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-medium text-white">No organizations yet</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            Create your first organization workspace to collaborate on projects and manage issues.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => {
            const isSelected = currentOrg?.id === org.id;
            return (
              <div
                key={org.id}
                className={`bg-slate-900 border rounded-xl p-6 transition flex flex-col justify-between space-y-4 ${
                  isSelected ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">{org.name}</h3>
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700">
                      <ShieldCheck className="w-3 h-3" />
                      {org.role}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-500">/{org.slug}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setCurrentOrg(org)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                      isSelected
                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {isSelected ? 'Active Workspace' : 'Select Workspace'}
                  </button>

                  <div className="flex items-center gap-3 text-xs">
                    <Link
                      to={`/organizations/${org.id}/settings`}
                      className="text-slate-400 hover:text-white transition flex items-center gap-1"
                    >
                      Settings <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default OrganizationsPage;
