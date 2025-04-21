// Email Service - Integration with email providers
const nodemailer = require('nodemailer');

class EmailService {
  constructor(options = {}) {
    this.databaseService = options.databaseService;
    this.documentService = options.documentService;
    
    // Configure email transport
    this.transporter = nodemailer.createTransport({
      service: options.emailService || 'gmail',
      auth: {
        user: options.emailUser || process.env.EMAIL_USER,
        pass: options.emailPassword || process.env.EMAIL_PASSWORD
      }
    });
    
    // Default sender
    this.defaultSender = options.defaultSender || process.env.EMAIL_DEFAULT_SENDER || 'Zimbabwe Sables Rugby Team <no-reply@zimbabwesables.com>';
  }

  /**
   * Send an email
   * @param {Object} emailData Email data
   * @return {Promise<Object>} Result
   */
  async sendEmail(emailData) {
    try {
      // Validate email data
      if (!emailData.to) {
        throw new Error('Recipient email is required');
      }
      
      if (!emailData.subject) {
        throw new Error('Email subject is required');
      }
      
      // Prepare email options
      const mailOptions = {
        from: emailData.from || this.defaultSender,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.body || '',
        html: emailData.htmlBody || null
      };
      
      // Handle attachments
      if (emailData.attachments && emailData.attachments.length > 0) {
        mailOptions.attachments = [];
        
        for (const attachment of emailData.attachments) {
          if (attachment.documentId) {
            // Get document from Google Drive
            const document = await this.documentService.getDocument(attachment.documentId);
            
            if (!document) {
              console.warn(`Document ${attachment.documentId} not found for attachment`);
              continue;
            }
            
            // Download document content
            const content = await this.documentService.downloadDocument(
              attachment.documentId,
              attachment.format || 'pdf'
            );
            
            if (!content) {
              console.warn(`Failed to download content for document ${attachment.documentId}`);
              continue;
            }
            
            // Add attachment
            mailOptions.attachments.push({
              filename: `${attachment.name || document.title}.${attachment.format || 'pdf'}`,
              content
            });
          } else if (attachment.path) {
            // Add attachment from file path
            mailOptions.attachments.push({
              filename: attachment.name || attachment.path.split('/').pop(),
              path: attachment.path
            });
          } else if (attachment.content) {
            // Add attachment from content
            mailOptions.attachments.push({
              filename: attachment.name || 'attachment',
              content: attachment.content
            });
          }
        }
      }
      
      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      
      // Log email
      await this.logEmail(emailData, info);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('Error sending email:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send a template email
   * @param {string} templateName Template name
   * @param {Object} templateData Template data
   * @param {Object} emailData Email data
   * @return {Promise<Object>} Result
   */
  async sendTemplateEmail(templateName, templateData, emailData) {
    try {
      // Get template
      const template = this.getTemplate(templateName);
      
      if (!template) {
        throw new Error(`Email template "${templateName}" not found`);
      }
      
      // Render template
      const htmlBody = this.renderTemplate(template, templateData);
      
      // Send email
      return this.sendEmail({
        ...emailData,
        htmlBody
      });
    } catch (error) {
      console.error('Error sending template email:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get email template
   * @param {string} templateName Template name
   * @return {string} Template HTML
   */
  getTemplate(templateName) {
    // Basic templates
    const templates = {
      'welcome': `
        <h1>Welcome to the Zimbabwe Sables Rugby Team Document Management System</h1>
        <p>Hello {{name}},</p>
        <p>Your account has been created successfully. You can now access the system using your credentials.</p>
        <p>Role: {{role}}</p>
        <p>If you have any questions, please contact the team administrators.</p>
        <p>Best regards,<br>Zimbabwe Sables Rugby Team</p>
      `,
      'document_shared': `
        <h1>Document Shared With You</h1>
        <p>Hello {{name}},</p>
        <p>A document has been shared with you:</p>
        <p><strong>{{documentTitle}}</strong></p>
        <p>You can access it by logging into the system.</p>
        <p>Shared by: {{sharedBy}}</p>
        <p>Best regards,<br>Zimbabwe Sables Rugby Team</p>
      `,
      'event_invitation': `
        <h1>Event Invitation</h1>
        <p>Hello {{name}},</p>
        <p>You have been invited to the following event:</p>
        <p><strong>{{eventTitle}}</strong></p>
        <p>Date: {{eventDate}}</p>
        <p>Time: {{eventTime}}</p>
        <p>Location: {{eventLocation}}</p>
        <p>Please log into the system to accept or decline this invitation.</p>
        <p>Best regards,<br>Zimbabwe Sables Rugby Team</p>
      `,
      'notification': `
        <h1>{{notificationTitle}}</h1>
        <p>Hello {{name}},</p>
        <p>{{notificationMessage}}</p>
        <p>Best regards,<br>Zimbabwe Sables Rugby Team</p>
      `
    };
    
    return templates[templateName] || null;
  }

  /**
   * Render email template
   * @param {string} template Template HTML
   * @param {Object} data Template data
   * @return {string} Rendered HTML
   */
  renderTemplate(template, data) {
    let rendered = template;
    
    // Replace placeholders
    for (const key in data) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(placeholder, data[key]);
    }
    
    return rendered;
  }

  /**
   * Log email
   * @param {Object} emailData Email data
   * @param {Object} info Nodemailer info
   * @return {Promise<void>}
   */
  async logEmail(emailData, info) {
    try {
      if (!this.databaseService) {
        return;
      }
      
      const AuditLog = this.databaseService.getModels().AuditLog;
      
      await AuditLog.logAction({
        userId: emailData.userId,
        action: 'create',
        resourceType: 'system',
        details: {
          type: 'email',
          to: emailData.to,
          subject: emailData.subject,
          attachments: emailData.attachments ? emailData.attachments.length : 0,
          messageId: info.messageId
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error logging email:', error);
    }
  }
}

module.exports = EmailService;
