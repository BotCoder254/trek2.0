import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import { authService } from '../../services/authService';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const resetPasswordMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post(`/auth/reset-password/${token}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      // Save token
      authService.setToken(data.data.token);
      // Redirect to dashboard
      setTimeout(() => navigate('/dashboard'), 2000);
    }
  });

  const validatePassword = (pwd) => {
    const errors = [];
    if (pwd.length < 8) errors.push('At least 8 characters');
    if (!/[a-z]/.test(pwd)) errors.push('One lowercase letter');
    if (!/[A-Z]/.test(pwd)) errors.push('One uppercase letter');
    if (!/\d/.test(pwd)) errors.push('One number');
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validate password
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      newErrors.password = passwordErrors.join(', ');
    }

    // Validate password match
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    resetPasswordMutation.mutate({ password });
  };

  const passwordStrength = () => {
    if (!password) return null;
    const errors = validatePassword(password);
    if (errors.length === 0) return 'strong';
    if (errors.length <= 2) return 'medium';
    return 'weak';
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-light to-info-light relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <img
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80"
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay"
        />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl font-bold mb-6">
              🏔️ TREK
            </h1>
            <p className="text-2xl font-light mb-4">
              Create New Password
            </p>
            <p className="text-lg opacity-90">
              Choose a strong password to keep your account secure.
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
          {!resetPasswordMutation.isSuccess ? (
            <>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                  Set New Password
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Your new password must be different from previous passwords.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* New Password */}
                <div>
                  <label className="label">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors({ ...errors, password: null });
                      }}
                      className={`input pl-10 pr-12 ${errors.password ? 'border-secondary-light' : ''}`}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Password Strength */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-2">
                        <div className={`h-1 flex-1 rounded ${
                          strength === 'weak' ? 'bg-secondary-light' :
                          strength === 'medium' ? 'bg-warning-light' :
                          'bg-success-light'
                        }`} />
                        <div className={`h-1 flex-1 rounded ${
                          strength === 'medium' || strength === 'strong' ? 
                          strength === 'medium' ? 'bg-warning-light' : 'bg-success-light' :
                          'bg-neutral-200 dark:bg-neutral-700'
                        }`} />
                        <div className={`h-1 flex-1 rounded ${
                          strength === 'strong' ? 'bg-success-light' : 'bg-neutral-200 dark:bg-neutral-700'
                        }`} />
                      </div>
                      <p className={`text-xs ${
                        strength === 'weak' ? 'text-secondary-light' :
                        strength === 'medium' ? 'text-warning-light' :
                        'text-success-light'
                      }`}>
                        Password strength: {strength}
                      </p>
                    </div>
                  )}

                  {errors.password && (
                    <p className="mt-1 text-sm text-secondary-light">
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="label">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrors({ ...errors, confirmPassword: null });
                      }}
                      className={`input pl-10 pr-12 ${errors.confirmPassword ? 'border-secondary-light' : ''}`}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-secondary-light">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                {resetPasswordMutation.isError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg bg-secondary-light/10 border border-secondary-light text-secondary-light text-sm"
                  >
                    {resetPasswordMutation.error?.response?.data?.message || 'Reset link is invalid or has expired.'}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className="btn btn-primary w-full"
                >
                  {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
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
                Password Reset Successful!
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                Your password has been reset successfully. You're being redirected to the dashboard...
              </p>
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

export default ResetPassword;

