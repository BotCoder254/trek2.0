import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Camera, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../../services/userService';
import toast from 'react-hot-toast';
import axios from 'axios';

const AvatarUploadModal = ({ isOpen, onClose, currentAvatar }) => {
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const presignedData = await userService.getAvatarPresignedUrl(file.type, file.name);
      const { uploadUrl, fileUrl } = presignedData.data;
      
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type }
      });
      
      return userService.updateProfile({ avatarUrl: fileUrl });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['userProfile'], data);
      queryClient.invalidateQueries(['currentUser']);
      toast.success('Avatar updated successfully');
      handleClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to upload avatar');
    }
  });

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUpload = () => {
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const handleClose = () => {
    setPreview(null);
    setFile(null);
    setIsDragging(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="card w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                  Update Avatar
                </h2>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Current Avatar */}
                {currentAvatar && !preview && (
                  <div className="flex flex-col items-center">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                      Current Avatar
                    </p>
                    <img
                      src={currentAvatar}
                      alt="Current avatar"
                      className="w-32 h-32 rounded-full object-cover"
                    />
                  </div>
                )}

                {/* Preview */}
                {preview && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center"
                  >
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                      Preview
                    </p>
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-32 h-32 rounded-full object-cover"
                    />
                  </motion.div>
                )}

                {/* Upload Area */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging
                      ? 'border-primary-light dark:border-primary-dark bg-primary-light/5 dark:bg-primary-dark/5'
                      : 'border-border-light dark:border-border-dark hover:border-primary-light dark:hover:border-primary-dark'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                    className="hidden"
                  />

                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <Upload className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        Drop your image here, or{' '}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-primary-light dark:text-primary-dark hover:underline"
                        >
                          browse
                        </button>
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        PNG, JPG up to 5MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mobile Camera Button */}
                <button
                  onClick={() => {
                    fileInputRef.current?.setAttribute('capture', 'user');
                    fileInputRef.current?.click();
                  }}
                  className="w-full md:hidden btn btn-secondary"
                >
                  <Camera className="w-4 h-4" />
                  Take Photo
                </button>
              </div>

              <div className="flex gap-3 p-6 border-t border-border-light dark:border-border-dark">
                <button
                  onClick={handleClose}
                  className="flex-1 btn btn-secondary"
                  disabled={uploadMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!file || uploadMutation.isPending}
                  className="flex-1 btn btn-primary"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AvatarUploadModal;
