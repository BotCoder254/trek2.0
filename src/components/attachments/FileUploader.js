import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, X, File, Image as ImageIcon, FileText, 
  Film, Music, Archive, CheckCircle, XCircle, Loader
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import api from '../../services/api';

const FileUploader = ({ taskId, onUploadComplete }) => {
  const queryClient = useQueryClient();
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return ImageIcon;
    if (type.startsWith('video/')) return Film;
    if (type.startsWith('audio/')) return Music;
    if (type.includes('pdf')) return FileText;
    if (type.includes('zip') || type.includes('rar')) return Archive;
    return File;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      // Step 1: Get presigned URL
      const presignResponse = await api.post('/attachments/presign', {
        filename: file.name,
        mimetype: file.type,
        size: file.size
      });

      const { uploadUrl, key, fileType } = presignResponse.data.data;

      // Update file status
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      // Step 2: Upload directly to S3/Cloudinary
      const uploadConfig = {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, progress: percentCompleted } : f
          ));
        }
      };

      await axios.put(uploadUrl, file.file, uploadConfig);

      // Step 3: Register attachment in backend
      const registerResponse = await api.post(`/attachments/task/${taskId}`, {
        name: file.name,
        url: uploadUrl.split('?')[0], // Remove query params
        key: key,
        type: fileType || file.type,
        size: file.size
      });

      return { file, attachment: registerResponse.data.data.attachment };
    },
    onSuccess: ({ file }) => {
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'success' } : f
      ));
      queryClient.invalidateQueries(['task', taskId]);
      if (onUploadComplete) onUploadComplete();
    },
    onError: (error, file) => {
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'error', error: error.message } : f
      ));
    }
  });

  const handleFiles = useCallback((newFiles) => {
    const fileObjects = Array.from(newFiles).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      status: 'pending',
      progress: 0
    }));

    setFiles(prev => [...prev, ...fileObjects]);

    // Start uploading
    fileObjects.forEach(fileObj => {
      uploadMutation.mutate(fileObj);
    });
  }, [uploadMutation]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e) => {
    handleFiles(e.target.files);
  };

  const removeFile = (fileId) => {
    const file = files.find(f => f.id === fileId);
    if (file?.preview) {
      URL.revokeObjectURL(file.preview);
    }
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const retryUpload = (fileId) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'pending', error: null } : f
      ));
      uploadMutation.mutate(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging 
            ? 'border-primary-light dark:border-primary-dark bg-primary-light/10 dark:bg-primary-dark/10' 
            : 'border-border-light dark:border-border-dark hover:border-primary-light dark:hover:border-primary-dark'
        }`}
      >
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
        />
        
        <Upload className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
        <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
          Drop files here or click to browse
        </p>
        <p className="text-sm text-neutral-500">
          Supports images, videos, documents up to 50MB
        </p>
      </div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {files.map((file) => {
              const Icon = getFileIcon(file.type);
              
              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-border-light dark:border-border-dark"
                >
                  {/* Preview/Icon */}
                  <div className="w-12 h-12 rounded flex-shrink-0 overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                    {file.preview ? (
                      <img src={file.preview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Icon className="w-6 h-6 text-neutral-500" />
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatFileSize(file.size)}
                    </p>
                    
                    {/* Progress Bar */}
                    {file.status === 'uploading' && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${file.progress}%` }}
                            className="h-full bg-primary-light dark:bg-primary-dark"
                          />
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          {file.progress}% uploaded
                        </p>
                      </div>
                    )}

                    {/* Error Message */}
                    {file.status === 'error' && (
                      <p className="text-xs text-secondary-light mt-1">
                        {file.error || 'Upload failed'}
                      </p>
                    )}
                  </div>

                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {file.status === 'uploading' && (
                      <Loader className="w-5 h-5 text-primary-light dark:text-primary-dark animate-spin" />
                    )}
                    {file.status === 'success' && (
                      <CheckCircle className="w-5 h-5 text-success-light" />
                    )}
                    {file.status === 'error' && (
                      <button
                        onClick={() => retryUpload(file.id)}
                        className="text-secondary-light hover:text-secondary-dark"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    )}
                    {file.status === 'pending' && (
                      <button
                        onClick={() => removeFile(file.id)}
                        className="text-neutral-400 hover:text-neutral-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUploader;

