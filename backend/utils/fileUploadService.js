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

// Unified upload interface
exports.getUploadCredentials = async (filename, mimetype) => {
  if (config.STORAGE_TYPE === 'cloudinary') {
    return await exports.getCloudinarySignature(filename);
  } else {
    return await exports.getS3PresignedUrl(filename, mimetype);
  }
};

exports.deleteFile = async (fileKey) => {
  if (config.STORAGE_TYPE === 'cloudinary') {
    return await exports.deleteCloudinaryFile(fileKey);
  } else {
    return await exports.deleteS3File(fileKey);
  }
};

exports.getFileUrl = async (fileKey, isPublic = false) => {
  if (config.STORAGE_TYPE === 'cloudinary') {
    // Cloudinary URLs are already accessible
    return {
      success: true,
      url: cloudinary.url(fileKey, { secure: true })
    };
  } else {
    if (isPublic) {
      return {
        success: true,
        url: `https://${config.AWS_S3_BUCKET}.s3.${config.AWS_REGION}.amazonaws.com/${fileKey}`
      };
    } else {
      return await exports.getS3SignedDownloadUrl(fileKey);
    }
  }
};

