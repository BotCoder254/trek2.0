import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, User, Lock, Bell, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { userService } from '../../services/userService';
import ProfileInfo from '../../components/profile/ProfileInfo';
import PreferencesTab from '../../components/profile/PreferencesTab';
import SecurityTab from '../../components/profile/SecurityTab';
import NotificationsTab from '../../components/profile/NotificationsTab';
import ActivityTab from '../../components/profile/ActivityTab';
import AvatarUploadModal from '../../components/profile/AvatarUploadModal';

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState('preferences');
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: userService.getProfile
  });

  const user = profileData?.data?.user;

  const tabs = [
    { id: 'preferences', label: 'Preferences', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'activity', label: 'Activity', icon: Activity }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-light dark:border-primary-dark" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-neutral-50 dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            Profile Settings
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ProfileInfo 
              user={user} 
              onAvatarClick={() => setIsAvatarModalOpen(true)}
            />
          </div>

          <div className="lg:col-span-2">
            <div className="card">
              <div className="border-b border-border-light dark:border-border-dark">
                <div className="flex overflow-x-auto">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 font-medium transition-colors whitespace-nowrap relative ${
                          activeTab === tab.id
                            ? 'text-primary-light dark:text-primary-dark'
                            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
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
              </div>

              <div className="p-4 md:p-6">
                {activeTab === 'preferences' && <PreferencesTab user={user} />}
                {activeTab === 'security' && <SecurityTab />}
                {activeTab === 'notifications' && <NotificationsTab user={user} />}
                {activeTab === 'activity' && <ActivityTab />}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AvatarUploadModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatar={user?.avatar}
      />
    </div>
  );
};

export default ProfilePage;
