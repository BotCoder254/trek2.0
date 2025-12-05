import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle, Loader } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../../services/authService';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});

  // Get invite token from URL if present
  const searchParams = new URLSearchParams(location.search);
  const inviteToken = searchParams.get('invite');

  const loginMutation = useMutation({
    mutationFn: (data) => authService.login({ ...data, inviteToken }),
    onSuccess: (response) => {
      const { inviteWorkspace } = response.data;
      
      // Redirect to workspace if invite was accepted, otherwise to dashboard
      if (inviteWorkspace) {
        navigate(`/workspace/${inviteWorkspace.id}`);
      } else {
        navigate('/dashboard');
      }
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Login failed';
      setErrors({ general: message });
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    loginMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-light to-info-light dark:from-primary-dark dark:to-info-dark relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-black/20" />
        <img 
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop"
          alt="Team collaboration"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-5xl font-bold mb-6">Welcome to TREK</h1>
            <p className="text-xl text-white/90 max-w-md">
              Powerful Open Source project management tool that brings teams together and gets work done.
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-surface-light dark:bg-surface-dark">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-primary-light dark:text-primary-dark mb-2">
              TREK
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              Sign in to your account
            </p>
          </div>

          {/* Invite Banner */}
          {inviteToken && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-info-light/10 dark:bg-info-dark/10 border border-info-light dark:border-info-dark rounded-lg"
            >
              <p className="text-sm text-info-light dark:text-info-dark font-medium">
                You've been invited to join a workspace! Sign in to accept.
              </p>
            </motion.div>
          )}

          {/* Error Message */}
          {errors.general && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-secondary-light/10 dark:bg-secondary-dark/10 border border-secondary-light dark:border-secondary-dark rounded-lg flex items-center gap-2"
            >
              <AlertCircle className="w-5 h-5 text-secondary-light dark:text-secondary-dark flex-shrink-0" />
              <p className="text-sm text-secondary-light dark:text-secondary-dark">
                {errors.general}
              </p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="label">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input pl-10 ${errors.email ? 'border-secondary-light dark:border-secondary-dark' : ''}`}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-secondary-light dark:text-secondary-dark">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="label mb-0">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-light dark:text-primary-dark hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`input pl-10 ${errors.password ? 'border-secondary-light dark:border-secondary-dark' : ''}`}
                  placeholder="Enter your password"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-secondary-light dark:text-secondary-dark">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full btn btn-primary py-3 text-lg font-semibold flex items-center justify-center gap-2"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 text-center">
            <p className="text-neutral-600 dark:text-neutral-400">
              Don't have an account?{' '}
              <Link 
                to={inviteToken ? `/signup?invite=${inviteToken}` : '/signup'} 
                className="link font-semibold"
              >
                Sign up
              </Link>
            </p>
          </div>

          {/* Mobile Logo for LG screens */}
          <div className="mt-12 text-center lg:hidden">
            <p className="text-sm text-neutral-500 dark:text-neutral-500">
              © 2025 TREK. All rights reserved.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;

