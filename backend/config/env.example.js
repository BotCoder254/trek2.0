// Copy this file and rename to env.config.js with your actual values
module.exports = {
  // Server
  PORT: 5000,
  NODE_ENV: 'development',
  
  // Database
  MONGODB_URI: 'mongodb://localhost:27017/trek',
  
  // JWT
  JWT_SECRET: 'your_jwt_secret_key_change_this_in_production',
  JWT_EXPIRES_IN: '7d',
  
  // Frontend
  FRONTEND_URL: 'http://localhost:3000',
  
  // Email (Nodemailer)
  EMAIL_HOST: 'smtp.gmail.com',
  EMAIL_PORT: 587,
  EMAIL_USER: 'your-email@gmail.com',
  EMAIL_PASSWORD: 'your-app-password', // For Gmail, use App Password
  
  // File Storage - Choose one: S3 or Cloudinary
  STORAGE_TYPE: 's3', // 's3' or 'cloudinary'
  
  // AWS S3 Configuration
  AWS_ACCESS_KEY_ID: 'your-aws-access-key',
  AWS_SECRET_ACCESS_KEY: 'your-aws-secret-key',
  AWS_REGION: 'us-east-1',
  AWS_S3_BUCKET: 'your-bucket-name',
  
  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: 'your-cloud-name',
  CLOUDINARY_API_KEY: 'your-api-key',
  CLOUDINARY_API_SECRET: 'your-api-secret'
};
