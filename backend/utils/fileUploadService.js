const AWS = require('aws-sdk');
const cloudinary = require('cloudinary').v2;
const config = require('../config/env.config');
const crypto = require('crypto');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: config.AWS_ACCESS_KEY_ID,
  secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  region: config.AWS_REGION
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET
});

// Generate unique filename
const generateFileName = (originalName) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const ext = originalName.split('.').pop();
  return `${timestamp}-${randomString}.${ext}`;
};

// Get file type category
const getFileType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.includes('pdf')) return 'pdf';
  if (mimetype.includes('document') || mimetype.includes('word')) return 'document';
  if (mimetype.includes('spreadsheet') || mimetype.includes('excel')) return 'spreadsheet';
  return 'file';
};

// S3 Upload Functions
exports.getS3PresignedUrl = async (filename, mimetype) => {
  try {
    const key = `uploads/${generateFileName(filename)}`;
    
    const params = {
      Bucket: config.AWS_S3_BUCKET,
      Key: key,
      Expires: 300, // 5 minutes
      ContentType: mimetype,
      ACL: 'private'
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    
    return {
      success: true,
      uploadUrl,
      key,
      fileType: getFileType(mimetype)
    };
  } catch (error) {
    console.error('S3 presigned URL error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

exports.getS3SignedDownloadUrl = async (key) => {
  try {
    const params = {
      Bucket: config.AWS_S3_BUCKET,
      Key: key,
      Expires: 3600 // 1 hour
    };

    const url = await s3.getSignedUrlPromise('getObject', params);
    
    return {
      success: true,
      url
    };
  } catch (error) {
    console.error('S3 download URL error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

exports.deleteS3File = async (key) => {
  try {
    const params = {
      Bucket: config.AWS_S3_BUCKET,
      Key: key
    };

    await s3.deleteObject(params).promise();
    
    return { success: true };
  } catch (error) {
    console.error('S3 delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Cloudinary Upload Functions
exports.getCloudinarySignature = async (filename, folder = 'trek-uploads') => {
  try {
    const timestamp = Math.round(Date.now() / 1000);
    const publicId = `${folder}/${generateFileName(filename)}`;
    
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        public_id: publicId,
        folder
      },
      config.CLOUDINARY_API_SECRET
    );

    return {
      success: true,
      signature,
      timestamp,
      publicId,
      cloudName: config.CLOUDINARY_CLOUD_NAME,
      apiKey: config.CLOUDINARY_API_KEY,
      uploadUrl: `https://api.cloudinary.com/v1_1/${config.CLOUDINARY_CLOUD_NAME}/auto/upload`
    };
  } catch (error) {
    console.error('Cloudinary signature error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

exports.deleteCloudinaryFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    
    return {
      success: result.result === 'ok',
      result
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Check if Cloudinary is configured
const isCloudinaryConfigured = () => {
  return config.CLOUDINARY_CLOUD_NAME && 
         config.CLOUDINARY_API_KEY && 
         config.CLOUDINARY_API_SECRET &&
         config.CLOUDINARY_CLOUD_NAME !== 'your-cloud-name';
};

// Check if S3 is configured
const isS3Configured = () => {
  return config.AWS_ACCESS_KEY_ID && 
         config.AWS_SECRET_ACCESS_KEY && 
         config.AWS_S3_BUCKET &&
         config.AWS_ACCESS_KEY_ID !== 'your-aws-access-key';
};

// Get presigned URL for direct upload (simplified for avatar)
exports.getPresignedUrl = async (filename, mimetype) => {
  // Try Cloudinary first
  if (isCloudinaryConfigured()) {
    const result = await exports.getCloudinarySignature(filename, 'avatars');
    if (result.success) {
      return {
        uploadUrl: result.uploadUrl,
        fileUrl: `https://res.cloudinary.com/${result.cloudName}/image/upload/${result.publicId}`,
        provider: 'cloudinary'
      };
    }
  }
  
  // Fallback to S3
  if (isS3Configured()) {
    const result = await exports.getS3PresignedUrl(filename, mimetype);
    if (result.success) {
      return {
        uploadUrl: result.uploadUrl,
        fileUrl: `https://${config.AWS_S3_BUCKET}.s3.${config.AWS_REGION}.amazonaws.com/${result.key}`,
        provider: 's3'
      };
    }
  }
  
  throw new Error('No file storage service configured');
};

// Unified upload interface - Cloudinary first, S3 fallback
exports.getUploadCredentials = async (filename, mimetype) => {
  // Try Cloudinary first
  if (isCloudinaryConfigured()) {
    console.log('Using Cloudinary for file upload');
    const result = await exports.getCloudinarySignature(filename);
    if (result.success) {
      return { ...result, provider: 'cloudinary' };
    }
    console.warn('Cloudinary failed, falling back to S3');
  }
  
  // Fallback to S3
  if (isS3Configured()) {
    console.log('Using S3 for file upload');
    const result = await exports.getS3PresignedUrl(filename, mimetype);
    return { ...result, provider: 's3' };
  }
  
  // No storage configured
  return {
    success: false,
    error: 'No file storage service configured. Please configure Cloudinary or AWS S3.'
  };
};

exports.deleteFile = async (fileKey, provider) => {
  // If provider specified, use it
  if (provider === 'cloudinary' && isCloudinaryConfigured()) {
    return await exports.deleteCloudinaryFile(fileKey);
  }
  if (provider === 's3' && isS3Configured()) {
    return await exports.deleteS3File(fileKey);
  }
  
  // Auto-detect based on key format
  if (fileKey.includes('trek-uploads/') || fileKey.includes('cloudinary')) {
    if (isCloudinaryConfigured()) {
      return await exports.deleteCloudinaryFile(fileKey);
    }
  }
  
  // Default to S3
  if (isS3Configured()) {
    return await exports.deleteS3File(fileKey);
  }
  
  return { success: false, error: 'No storage provider configured' };
};

exports.getFileUrl = async (fileKey, isPublic = false, provider) => {
  // If provider specified, use it
  if (provider === 'cloudinary' && isCloudinaryConfigured()) {
    return {
      success: true,
      url: cloudinary.url(fileKey, { secure: true })
    };
  }
  
  // Auto-detect Cloudinary URLs
  if (fileKey.includes('cloudinary') || fileKey.includes('trek-uploads/')) {
    if (isCloudinaryConfigured()) {
      return {
        success: true,
        url: cloudinary.url(fileKey, { secure: true })
      };
    }
  }
  
  // S3 URLs
  if (isS3Configured()) {
    if (isPublic) {
      return {
        success: true,
        url: `https://${config.AWS_S3_BUCKET}.s3.${config.AWS_REGION}.amazonaws.com/${fileKey}`
      };
    } else {
      return await exports.getS3SignedDownloadUrl(fileKey);
    }
  }
  
  return { success: false, error: 'No storage provider configured' };
};

