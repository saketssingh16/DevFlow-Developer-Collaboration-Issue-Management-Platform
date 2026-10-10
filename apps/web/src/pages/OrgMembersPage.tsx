import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { OrgRole } from '@devflow/shared';
import { Users, UserPlus, Trash2, Shield } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { inviteMemberSchema, InviteMemberInput } from '@devflow/validation';
import { getErrorMessage } from '../lib/errorMessage';

interface MemberItem {
  id: string;
  role: OrgRole;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export function OrgMembersPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { role: OrgRole.DEVELOPER }
  });

  const fetchMembers = async () => {
    try {
      const res = await apiClient.get(`/organizations/${organizationId}/members`);
      setMembers(res.data.data);
    } catch {
      setErrorMsg('Failed to fetch organization members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) fetchMembers();
  }, [organizationId]);

  const onInvite = async (data: InviteMemberInput) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiClient.post(`/organizations/${organizationId}/invitations`, data);
      setSuccessMsg(`Invitation dispatched to ${data.email}`);
      reset();
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Failed to send invitation'));
    }
  };

  const onRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await apiClient.delete(`/organizations/${organizationId}/members/${memberId}`);
      fetchMembers();
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Failed to remove member'));
    }
  };

  const onRoleChange = async (memberId: string, newRole: OrgRole) => {
    try {
      await apiClient.patch(`/organizations/${organizationId}/members/${memberId}/role`, { role: newRole });
      fetchMembers();
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Failed to update member role'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-6 h-6 text-indigo-400" />
            Organization Members
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage team member roles and permissions</p>
        </div>
      </div>

      {errorMsg && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">{errorMsg}</div>}
      {successMsg && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-sm">{successMsg}</div>}

      {/* Invite Member Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-indigo-400" />
          Invite Team Member
        </h3>
        <form onSubmit={handleSubmit(onInvite)} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              {...register('email')}
              placeholder="colleague@company.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
          </div>

          <div className="w-40">
            <select
              {...register('role')}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {Object.values(OrgRole).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition disabled:opacity-50"
          >
            {isSubmitting ? 'Sending...' : 'Send Invite'}
          </button>
        </form>
      </div>

      {/* Member Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 font-semibold text-sm text-slate-300">
          Active Members ({members.length})
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading members...</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {members.map((mem) => (
              <div key={mem.id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-800/40 transition">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 text-sm">
                    {mem.user.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{mem.user.name}</h4>
                    <p className="text-xs text-slate-400">{mem.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-500" />
                    <select
                      value={mem.role}
                      onChange={(e) => onRoleChange(mem.id, e.target.value as OrgRole)}
                      className="bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-200 px-2 py-1 focus:outline-none"
                    >
                      {Object.values(OrgRole).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => onRemoveMember(mem.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                    title="Remove member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrgMembersPage;
