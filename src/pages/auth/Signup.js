import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, AlertCircle, Loader, CheckCircle } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { authService } from '../../services/authService';
import { inviteService } from '../../services/inviteService';

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  // Get invite token from URL if present
  const searchParams = new URLSearchParams(location.search);
  const inviteToken = searchParams.get('invite');

  // Fetch invite details if token present
  const { data: inviteData } = useQuery({
    queryKey: ['invite', inviteToken],
    queryFn: () => inviteService.getInvite(inviteToken),
    enabled: !!inviteToken,
    retry: false
  });

  // Pre-fill email if invite exists
  useEffect(() => {
    if (inviteData?.data?.invite?.email) {
      setFormData(prev => ({ ...prev, email: inviteData.data.invite.email }));
    }
  }, [inviteData]);

  const signupMutation = useMutation({
    mutationFn: (data) => authService.signup({ ...data, inviteToken }),
    onSuccess: (response) => {
      const { workspace } = response.data;
      
      // Redirect to workspace if invite was accepted, otherwise to create workspace
      if (workspace) {
        navigate(`/workspace/${workspace.id}`);
      } else {
        navigate('/create-workspace');
      }
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Signup failed';
      const fieldErrors = error.response?.data?.errors;
      
      if (fieldErrors) {
        const newErrors = {};
        fieldErrors.forEach(err => {
          newErrors[err.field] = err.message;
        });
        setErrors(newErrors);
      } else {
        setErrors({ general: message });
      }
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

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors = {};
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    const passwordError = validatePassword(formData.password);
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (passwordError) {
      newErrors.password = passwordError;
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Remove confirmPassword before sending
    const { confirmPassword, ...submitData } = formData;
    signupMutation.mutate(submitData);
  };

  const passwordStrength = () => {
    const password = formData.password;
    if (!password) return null;
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    const colors = ['bg-secondary-light', 'bg-warning-light', 'bg-warning-light', 'bg-success-light', 'bg-success-light'];
    const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    
    return { strength, color: colors[strength - 1], label: labels[strength - 1] };
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 mt-8 mb-8 rounded-r-xl ml-8 rounded-l-xl bg-gradient-to-br from-info-light to-success-light dark:from-info-dark dark:to-success-dark relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-black/20" />
        <img 
          src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2070&auto=format&fit=crop"
          alt="Team working together"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-5xl font-bold mb-6">Start Your Journey</h1>
            <p className="text-xl text-white/90 max-w-md">
              Join thousands of teams who manage their projects efficiently with TREK.
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-surface-light dark:bg-surface-dark overflow-y-auto">
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
              Create your account
            </p>
          </div>

          {/* Invite Banner */}
          {inviteData?.data?.invite && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-success-light/10 dark:bg-success-dark/10 border border-success-light dark:border-success-dark rounded-lg"
            >
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-success-light dark:text-success-dark flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-success-light dark:text-success-dark">
                    You're invited to join {inviteData.data.invite.workspace.name}
                  </p>
                  <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                    Role: {inviteData.data.invite.role} • By {inviteData.data.invite.invitedBy.fullName}
                  </p>
                </div>
              </div>
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
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="label">
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`input pl-10 ${errors.firstName ? 'border-secondary-light dark:border-secondary-dark' : ''}`}
                    placeholder="John"
                  />
                </div>
                {errors.firstName && (
                  <p className="mt-1 text-sm text-secondary-light dark:text-secondary-dark">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="label">
                  Last Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`input pl-10 ${errors.lastName ? 'border-secondary-light dark:border-secondary-dark' : ''}`}
                    placeholder="Doe"
                  />
                </div>
                {errors.lastName && (
                  <p className="mt-1 text-sm text-secondary-light dark:text-secondary-dark">
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

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
                  disabled={!!inviteData?.data?.invite}
                  className={`input pl-10 ${errors.email ? 'border-secondary-light dark:border-secondary-dark' : ''} ${inviteData?.data?.invite ? 'opacity-60' : ''}`}
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
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`input pl-10 ${errors.password ? 'border-secondary-light dark:border-secondary-dark' : ''}`}
                  placeholder="Create a password"
                />
              </div>
              
              {/* Password Strength Indicator */}
              {strength && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all duration-200 ${
                          level <= strength.strength ? strength.color : 'bg-neutral-200 dark:bg-neutral-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    Strength: {strength.label}
                  </p>
                </div>
              )}
              
              {errors.password && (
                <p className="mt-1 text-sm text-secondary-light dark:text-secondary-dark">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`input pl-10 ${errors.confirmPassword ? 'border-secondary-light dark:border-secondary-dark' : ''}`}
                  placeholder="Confirm your password"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-secondary-light dark:text-secondary-dark">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={signupMutation.isPending}
              className="w-full btn btn-primary py-3 text-lg font-semibold flex items-center justify-center gap-2"
            >
              {signupMutation.isPending ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center">
            <p className="text-neutral-600 dark:text-neutral-400">
              Already have an account?{' '}
              <Link 
                to={inviteToken ? `/login?invite=${inviteToken}` : '/login'} 
                className="link font-semibold"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Terms */}
          <div className="mt-8 text-center">
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;

