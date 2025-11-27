import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Users, 
  Trash2, 
  Save, 
  Mail,
  UserPlus,
  X,
  Loader,
  AlertCircle,
  Shield
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { workspaceService } from '../../services/workspaceService';
import { inviteService } from '../../services/inviteService';
import { getRoleBadgeColor, canModifyRole, ROLES } from '../../utils/roleUtils';

const WorkspaceSettings = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'Member' });
  const [inviteError, setInviteError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  // Fetch workspace details
  const { data: workspaceData } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => workspaceService.getWorkspace(workspaceId)
  });

  // Fetch members
  const { data: membersData } = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => workspaceService.getMembers(workspaceId)
  });

  // Fetch pending invites
  const { data: invitesData } = useQuery({
    queryKey: ['workspace-invites', workspaceId],
    queryFn: () => inviteService.getWorkspaceInvites(workspaceId),
    enabled: workspaceData?.data?.workspace?.role === ROLES.OWNER || 
             workspaceData?.data?.workspace?.role === ROLES.MANAGER
  });

  const workspace = workspaceData?.data?.workspace;
  const members = membersData?.data?.members || [];
  const invites = invitesData?.data?.invites || [];
  const currentUserRole = workspace?.role;

  // Initialize edit form when workspace data loads
  React.useEffect(() => {
    if (workspace) {
      setEditForm({
        name: workspace.name || '',
        description: workspace.description || ''
      });
    }
  }, [workspace]);

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: (data) => inviteService.createInvite({
      workspaceId,
      ...data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['workspace-invites', workspaceId]);
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'Member' });
      setInviteError('');
      toast.success('Invite sent successfully');
    },
    onError: (error) => {
      setInviteError(error.response?.data?.message || 'Failed to send invite');
    }
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ membershipId, role }) => 
      workspaceService.updateMemberRole(workspaceId, membershipId, role),
    onSuccess: () => {
      queryClient.invalidateQueries(['workspace-members', workspaceId]);
      toast.success('Member role updated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update role');
    }
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (membershipId) => 
      workspaceService.removeMember(workspaceId, membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries(['workspace-members', workspaceId]);
      toast.success('Member removed successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to remove member');
    }
  });

  // Update workspace mutation
  const updateWorkspaceMutation = useMutation({
    mutationFn: (data) => workspaceService.updateWorkspace(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['workspace', workspaceId]);
      queryClient.invalidateQueries(['workspaces']);
      setIsEditing(false);
      toast.success('Workspace updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update workspace');
    }
  });

  const handleInviteSubmit = (e) => {
    e.preventDefault();
    setInviteError('');
    
    if (!inviteForm.email) {
      setInviteError('Email is required');
      return;
    }
    
    inviteMutation.mutate(inviteForm);
  };

  const handleRoleChange = (membershipId, currentRole, newRole) => {
    if (window.confirm(`Change role to ${newRole}?`)) {
      updateRoleMutation.mutate({ membershipId, role: newRole });
    }
  };

  const handleRemoveMember = (membershipId, memberName) => {
    if (window.confirm(`Remove ${memberName} from workspace?`)) {
      removeMemberMutation.mutate(membershipId);
    }
  };

  const handleSaveWorkspace = () => {
    if (!editForm.name.trim()) {
      alert('Workspace name is required');
      return;
    }
    updateWorkspaceMutation.mutate(editForm);
  };

  const handleCancelEdit = () => {
    setEditForm({
      name: workspace.name || '',
      description: workspace.description || ''
    });
    setIsEditing(false);
  };

  const copyInviteLink = (token) => {
    const link = `${window.location.origin}/signup?invite=${token}`;
    navigator.clipboard.writeText(link);
    alert('Invite link copied to clipboard!');
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Settings },
    { id: 'members', label: 'Members', icon: Users },
    ...(currentUserRole === ROLES.OWNER || currentUserRole === ROLES.MANAGER 
      ? [{ id: 'audit', label: 'Audit Logs', icon: Shield }] 
      : [])
  ];

  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary-light dark:text-primary-dark" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl"
              style={{ backgroundColor: workspace.color }}
            >
              {workspace.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                {workspace.name}
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Workspace Settings
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border-light dark:border-border-dark">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 font-medium transition-colors relative
                  ${activeTab === tab.id
                    ? 'text-primary-light dark:text-primary-dark'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-light dark:bg-primary-dark"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  Workspace Information
                </h2>
                {(currentUserRole === ROLES.OWNER || currentUserRole === ROLES.MANAGER) && (
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleCancelEdit}
                          className="btn btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveWorkspace}
                          disabled={updateWorkspaceMutation.isPending}
                          className="btn btn-primary btn-sm flex items-center gap-2"
                        >
                          {updateWorkspaceMutation.isPending ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Save
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="btn btn-secondary btn-sm flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">Workspace Name</label>
                  <input
                    type="text"
                    value={isEditing ? editForm.name : workspace.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    disabled={!isEditing}
                    className={`input ${!isEditing ? 'opacity-60' : ''}`}
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    value={isEditing ? editForm.description : (workspace.description || '')}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    disabled={!isEditing}
                    rows="3"
                    className={`input resize-none ${!isEditing ? 'opacity-60' : ''}`}
                    placeholder="Add a description for your workspace..."
                  />
                </div>
                <div>
                  <label className="label">Your Role</label>
                  <span className={`badge ${getRoleBadgeColor(currentUserRole)}`}>
                    {currentUserRole}
                  </span>
                </div>
                <div>
                  <label className="label">Member Count</label>
                  <p className="text-neutral-900 dark:text-neutral-100">
                    {workspace.memberCount} members
                  </p>
                </div>
                <div>
                  <label className="label">Created</label>
                  <p className="text-neutral-900 dark:text-neutral-100">
                    {formatDate(workspace.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-6">
              {/* Invite Section */}
              {(currentUserRole === ROLES.OWNER || currentUserRole === ROLES.MANAGER) && (
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                      Invite Members
                    </h2>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <UserPlus className="w-5 h-5" />
                      Send Invite
                    </button>
                  </div>

                  {/* Pending Invites */}
                  {invites.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Pending Invites
                      </h3>
                      <div className="space-y-2">
                        {invites.map((invite) => (
                          <div
                            key={invite.id}
                            className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                {invite.email}
                              </p>
                              <p className="text-xs text-neutral-500">
                                Role: {invite.role} • Expires {formatDate(invite.expiresAt)}
                              </p>
                            </div>
                            <button
                              onClick={() => copyInviteLink(invite.token)}
                              className="text-xs btn btn-secondary"
                            >
                              Copy Link
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Members List */}
              <div className="card p-6">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                  Members ({members.length})
                </h2>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border-light dark:border-border-dark">
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                          Member
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                          Role
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                          Joined
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member) => (
                        <tr
                          key={member.id}
                          className="border-b border-border-light dark:border-border-dark last:border-0"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              {member.user.avatar ? (
                                <img
                                  src={member.user.avatar}
                                  alt={member.user.fullName}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-primary-light dark:bg-primary-dark flex items-center justify-center text-white font-semibold">
                                  {member.user.firstName[0]}{member.user.lastName[0]}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                                  {member.user.fullName}
                                </p>
                                <p className="text-sm text-neutral-500">
                                  {member.user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {canModifyRole(currentUserRole, member.role) ? (
                              <select
                                value={member.role}
                                onChange={(e) => handleRoleChange(member.id, member.role, e.target.value)}
                                className="text-sm px-3 py-1.5 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-neutral-800"
                              >
                                {currentUserRole === ROLES.OWNER && (
                                  <option value={ROLES.OWNER}>Owner</option>
                                )}
                                <option value={ROLES.MANAGER}>Manager</option>
                                <option value={ROLES.MEMBER}>Member</option>
                                <option value={ROLES.VIEWER}>Viewer</option>
                              </select>
                            ) : (
                              <span className={`badge ${getRoleBadgeColor(member.role)}`}>
                                {member.role}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-sm text-neutral-600 dark:text-neutral-400">
                            {formatDate(member.joinedAt)}
                          </td>
                          <td className="py-4 px-4 text-right">
                            {canModifyRole(currentUserRole, member.role) && (
                              <button
                                onClick={() => handleRemoveMember(member.id, member.user.fullName)}
                                className="text-secondary-light dark:text-secondary-dark hover:opacity-70 transition-opacity"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="card p-4">
                      <div className="flex items-start gap-3 mb-3">
                        {member.user.avatar ? (
                          <img
                            src={member.user.avatar}
                            alt={member.user.fullName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary-light dark:bg-primary-dark flex items-center justify-center text-white font-semibold">
                            {member.user.firstName[0]}{member.user.lastName[0]}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            {member.user.fullName}
                          </p>
                          <p className="text-sm text-neutral-500">
                            {member.user.email}
                          </p>
                          <p className="text-xs text-neutral-400 mt-1">
                            Joined {formatDate(member.joinedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`badge ${getRoleBadgeColor(member.role)}`}>
                          {member.role}
                        </span>
                        {canModifyRole(currentUserRole, member.role) && (
                          <button
                            onClick={() => handleRemoveMember(member.id, member.user.fullName)}
                            className="text-secondary-light dark:text-secondary-dark"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="card p-6">
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                  Audit Logs
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                  View detailed audit logs in the dedicated Audit Logs page
                </p>
                <button
                  onClick={() => navigate(`/workspace/${workspaceId}/audit`)}
                  className="btn btn-primary"
                >
                  Go to Audit Logs
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                Invite Member
              </h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteError('');
                }}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteError && (
              <div className="mb-4 p-3 bg-secondary-light/10 border border-secondary-light dark:border-secondary-dark rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-secondary-light dark:text-secondary-dark" />
                <p className="text-sm text-secondary-light dark:text-secondary-dark">
                  {inviteError}
                </p>
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                    className="input pl-10"
                    placeholder="colleague@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
                  className="input"
                >
                  <option value={ROLES.MANAGER}>Manager</option>
                  <option value={ROLES.MEMBER}>Member</option>
                  <option value={ROLES.VIEWER}>Viewer</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteError('');
                  }}
                  className="flex-1 btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                >
                  {inviteMutation.isPending ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Send Invite
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSettings;

