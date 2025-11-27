import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import api from '../../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email) => {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    },
    onSuccess: () => {
      setIsSubmitted(true);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    forgotPasswordMutation.mutate(email);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 mt-8 mb-8 rounded-r-xl ml-8 rounded-l-xl  from-info-light to-success-light dark:from-info-dark dark:to-success-dark  relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <img
          src= "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2070&auto=format&fit=crop"
          alt="Background"
          className=" w-full h-full object-cover "
        />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl font-bold mb-6">
              TREK
            </h1>
            <p className="text-2xl font-light mb-4">
              Reset Your Password
            </p>
            <p className="text-lg opacity-90">
              Don't worry! It happens. Enter your email and we'll send you a link to reset your password.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-light dark:bg-neutral-900">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-primary-light dark:hover:text-primary-dark mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Forgot Password?
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              No worries, we'll send you reset instructions.
            </p>
          </div>

          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              {forgotPasswordMutation.isError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg bg-secondary-light/10 border border-secondary-light text-secondary-light text-sm"
                >
                  {forgotPasswordMutation.error?.response?.data?.message || 'Something went wrong. Please try again.'}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={forgotPasswordMutation.isPending}
                className="btn btn-primary w-full"
              >
                {forgotPasswordMutation.isPending ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-success-light/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-success-light" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                Check Your Email
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-neutral-500 mb-6">
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="text-primary-light dark:text-primary-dark hover:underline"
                >
                  try again
                </button>
              </p>
              <Link to="/login" className="btn btn-secondary w-full">
                Back to Login
              </Link>
            </motion.div>
          )}

          <div className="mt-8 text-center text-sm text-neutral-600 dark:text-neutral-400">
            Remember your password?{' '}
            <Link
              to="/login"
              className="text-primary-light dark:text-primary-dark hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;

