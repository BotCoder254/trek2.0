import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { userService } from '../../services/userService';

const ConfirmEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const response = await userService.confirmEmailChange(token);
        setStatus('success');
        setMessage(response.message || 'Email changed successfully');
        setTimeout(() => {
          navigate('/settings/profile');
        }, 3000);
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Failed to confirm email change');
      }
    };

    if (token) {
      confirmEmail();
    }
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card max-w-md w-full p-8 text-center"
      >
        {status === 'loading' && (
          <>
            <Loader className="w-16 h-16 text-primary-light dark:text-primary-dark mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Confirming Email Change
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              Please wait while we confirm your email change...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-success-light dark:text-success-dark mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Email Changed Successfully
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              {message}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500">
              Redirecting to profile...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-secondary-light dark:text-secondary-dark mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Confirmation Failed
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              {message}
            </p>
            <button
              onClick={() => navigate('/settings/profile')}
              className="btn btn-primary"
            >
              Go to Profile
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ConfirmEmail;
