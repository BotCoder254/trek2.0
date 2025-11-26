const nodemailer = require('nodemailer');
const config = require('../config/env.config');

// Create transporter
const transporter = nodemailer.createTransport({
  host: config.EMAIL_HOST || 'smtp.gmail.com',
  port: config.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASSWORD
  }
});

// Send invite email
exports.sendInviteEmail = async ({ to, workspaceName, inviterName, role, inviteLink, customMessage }) => {
  const emailTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitation to ${workspaceName}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #F97316 0%, #8B5CF6 100%);
          padding: 40px 20px;
          text-align: center;
        }
        .logo {
          font-size: 36px;
          font-weight: bold;
          color: white;
          margin-bottom: 10px;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 24px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 20px;
        }
        .message {
          font-size: 16px;
          color: #4B5563;
          margin-bottom: 30px;
          line-height: 1.8;
        }
        .custom-message {
          background: #F9FAFB;
          border-left: 4px solid #F97316;
          padding: 20px;
          margin: 30px 0;
          border-radius: 4px;
        }
        .workspace-info {
          background: #F3F4F6;
          padding: 20px;
          border-radius: 8px;
          margin: 30px 0;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #E5E7EB;
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          font-weight: 600;
          color: #6B7280;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .info-value {
          color: #111827;
          font-weight: 500;
          font-size: 18px;
          font-weight: 600;
        }
        .role-badge {
          display: inline-block;
          padding: px 12px;
          background: #F97316;
          color: white;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;

        }
        .button {
          display: inline-block;
          padding: 16px 40px;
          background: #F97316;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          margin: 20px 0;
          transition: background 0.3s;
        }
        .button:hover {
          background: #EA580C;
        }
        .cta-container {
          text-align: center;
          margin: 30px 0;
        }
        .footer {
          background: #F9FAFB;
          padding: 30px;
          text-align: center;
          color: #6B7280;
          font-size: 14px;
        }
        .footer-link {
          color: #F97316;
          text-decoration: none;
        }
        .divider {
          height: 1px;
          background: #E5E7EB;
          margin: 30px 0;
        }
        .note {
          font-size: 14px;
          color: #9CA3AF;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">TREK</div>
          <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 18px;">Project Management Platform</p>
        </div>
        
        <div class="content">
          <div class="greeting">You're Invited!</div>
          
          <div class="message">
            <strong>${inviterName}</strong> has invited you to join <strong>${workspaceName}</strong> on TREK.
          </div>
          
          ${customMessage ? `
            <div class="custom-message">
              <div style="font-weight: 600; color: #F97316; margin-bottom: 10px;">Message from ${inviterName}:</div>
              <div style="color: #4B5563;">${customMessage}</div>
            </div>
          ` : ''}
          
          <div class="workspace-info">
            <div class="info-row">
              <span class="info-label">Workspace</span>
              <span class="info-value">${workspaceName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Invited By</span>
              <span class="info-value">${inviterName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Your Role</span>
              <span class="role-badge">${role}</span>
            </div>
          </div>
          
          <div class="cta-container">
            <a href="${inviteLink}" class="button">Accept Invitation</a>
          </div>
          
          <div class="note">
            This invitation link will expire in 7 days. If you have any questions, please contact ${inviterName}.
          </div>
          
          <div class="divider"></div>
          
          <div style="font-size: 14px; color: #6B7280;">
            <p>What you can do as a <strong>${role}</strong>:</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              ${getRolePermissions(role)}
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p>You received this email because ${inviterName} invited you to ${workspaceName}.</p>
          <p style="margin-top: 15px;">
            <a href="${config.FRONTEND_URL}" class="footer-link">TREK</a> • 
            Where teams collaborate and projects succeed
          </p>
          <p style="margin-top: 15px; font-size: 12px; color: #9CA3AF;">
            © 2025 TREK. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"TREK" <${config.EMAIL_USER}>`,
      to,
      subject: `You're invited to join ${workspaceName} on TREK`,
      html: emailTemplate
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Get role permissions text
function getRolePermissions(role) {
  const permissions = {
    Owner: `
      <li>Full workspace control and management</li>
      <li>Add and remove members</li>
      <li>Create and manage all projects</li>
      <li>Delete workspace and transfer ownership</li>
    `,
    Manager: `
      <li>Create and manage projects</li>
      <li>Invite new members</li>
      <li>Assign tasks and manage workflows</li>
      <li>View workspace analytics</li>
    `,
    Member: `
      <li>Create and update tasks</li>
      <li>Collaborate on projects</li>
      <li>Comment and attach files</li>
      <li>View workspace content</li>
    `,
    Viewer: `
      <li>View projects and tasks</li>
      <li>Read comments and discussions</li>
      <li>Access reports and analytics</li>
      <li>Monitor project progress</li>
    `
  };
  return permissions[role] || permissions.Member;
}

// Generic send email function
exports.sendEmail = async ({ to, subject, html, text }) => {
  try {
    await transporter.sendMail({
      from: `"TREK" <${config.EMAIL_USER}>`,
      to,
      subject,
      html,
      text
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Test email configuration
exports.testEmailConfig = async () => {
  try {
    await transporter.verify();
    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

