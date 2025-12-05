import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Mail, User, CheckCircle, XCircle, Loader, Clock } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { inviteService } from '../../services/inviteService';
import { authService } from '../../services/authService';
import { getRoleBadgeColor } from '../../utils/roleUtils';

const AcceptInvite = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [isAccepting, setIsAccepting] = useState(false);

  // Check if user is authenticated
  const isAuthenticated = authService.isAuthenticated();

  // Fetch invite details
  const { data: inviteData, isLoading, error } = useQuery({
    queryKey: ['invite', token],
    queryFn: () => inviteService.getInvite(token),
    retry: false
  });

  // Accept invite mutation
  const acceptMutation = useMutation({
    mutationFn: () => inviteService.acceptInvite(token),
    onSuccess: (response) => {
      const workspace = response.data.workspace;
      setTimeout(() => {
        navigate(`/workspace/${workspace.id}/projects`);
      }, 2000);
    }
  });

  const invite = inviteData?.data?.invite;

  const handleAccept = () => {
    if (!isAuthenticated) {
      // Redirect to signup/login with invite token
      navigate(`/signup?invite=${token}`);
      return;
    }

    setIsAccepting(true);
    acceptMutation.mutate();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark">
        <div className="w-12 h-12 border-4 border-primary-light dark:border-primary-dark border-t-transparent rounded-full " />
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-8 max-w-md w-full text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary-light/10 dark:bg-secondary-dark/10 mb-4">
            <XCircle className="w-8 h-8 text-secondary-light dark:text-secondary-dark" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Invalid or Expired Invite
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            This invite link is no longer valid. It may have expired or already been used.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn btn-primary"
          >
            Go to Login
          </button>
        </motion.div>
      </div>
    );
  }

  if (acceptMutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-8 max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success-light/10 dark:bg-success-dark/10 mb-6"
          >
            <CheckCircle className="w-12 h-12 text-success-light dark:text-success-dark" />
          </motion.div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Welcome to {invite.workspace.name}! 🎉
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            You've successfully joined the workspace.
          </p>
          <div className="flex items-center justify-center">
            <Loader className="w-5 h-5 animate-spin text-primary-light dark:text-primary-dark mr-2" />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Redirecting to workspace...
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light/10 to-info-light/10 dark:from-primary-dark/10 dark:to-info-dark/10 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl"
      >
        {/* Card */}
        <div className="card p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
              style={{ backgroundColor: invite.workspace.color || '#F97316' }}
            >
              <Building2 className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              You're Invited!
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              {invite.invitedBy.fullName} invited you to join
            </p>
          </div>

          {/* Workspace Info */}
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl"
                style={{ backgroundColor: invite.workspace.color }}
              >
                {invite.workspace.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {invite.workspace.name}
                </h2>
                <span className={`badge ${getRoleBadgeColor(invite.role)} mt-2`}>
                  {invite.role}
                </span>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-surface-light dark:bg-neutral-900 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-primary-light/10 dark:bg-primary-dark/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-light dark:text-primary-dark" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Invited By</p>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {invite.invitedBy.fullName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-surface-light dark:bg-neutral-900 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-info-light/10 dark:bg-info-dark/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-info-light dark:text-info-dark" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Email</p>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {invite.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-surface-light dark:bg-neutral-900 rounded-lg md:col-span-2">
                <div className="w-10 h-10 rounded-lg bg-warning-light/10 dark:bg-warning-dark/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-warning-light dark:text-warning-dark" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Expires On</p>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {formatDate(invite.expiresAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Role Permissions */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
              As a {invite.role}, you can:
            </h3>
            <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
              {getRoleFeatures(invite.role).map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-success-light dark:text-success-dark mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Error Message */}
          {acceptMutation.error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-secondary-light/10 dark:bg-secondary-dark/10 border border-secondary-light dark:border-secondary-dark rounded-lg"
            >
              <p className="text-sm text-secondary-light dark:text-secondary-dark">
                {acceptMutation.error.response?.data?.message || 'Failed to accept invite'}
              </p>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 btn btn-secondary py-3"
                >
                  Decline
                </button>
                <button
                  onClick={handleAccept}
                  disabled={isAccepting || acceptMutation.isPending}
                  className="flex-1 btn btn-primary py-3 flex items-center justify-center gap-2"
                >
                  {isAccepting || acceptMutation.isPending ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Accept Invitation
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={handleAccept}
                className="w-full btn btn-primary py-3 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Sign Up to Accept
              </button>
            )}
          </div>

          {!isAuthenticated && (
            <p className="text-center text-sm text-neutral-600 dark:text-neutral-400 mt-4">
              Already have an account?{' '}
              <button
                onClick={() => navigate(`/login?invite=${token}`)}
                className="link font-semibold"
              >
                Sign in
              </button>
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-neutral-600 dark:text-neutral-400">
          <p>Powered by <span className="font-bold text-primary-light dark:text-primary-dark">TREK</span></p>
        </div>
      </motion.div>
    </div>
  );
};

// Helper function to get role features
const getRoleFeatures = (role) => {
  const features = {
    Owner: [
      'Full workspace control and management',
      'Add and remove members with any role',
      'Create, update, and delete all projects',
      'Delete workspace and transfer ownership',
      'Access all workspace settings and analytics'
    ],
    Manager: [
      'Create and manage projects and epics',
      'Invite new members to the workspace',
      'Assign tasks and manage workflows',
      'View workspace analytics and reports',
      'Update workspace settings (limited)'
    ],
    Member: [
      'Create and update tasks in projects',
      'Collaborate with team members',
      'Comment on tasks and attach files',
      'View all workspace content',
      'Participate in project discussions'
    ],
    Viewer: [
      'View all projects and tasks',
      'Read comments and discussions',
      'Access reports and analytics',
      'Monitor project progress',
      'Download attachments (read-only)'
    ]
  };
  return features[role] || features.Member;
};

export default AcceptInvite;

