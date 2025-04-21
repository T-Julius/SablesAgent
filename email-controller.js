// Email Controller - REST API endpoints for email service
const express = require('express');
const router = express.Router();

class EmailController {
  constructor(emailService) {
    this.emailService = emailService;
    this.router = router;
    
    this.setupRoutes();
  }
  
  setupRoutes() {
    // Send an email
    this.router.post('/send', this.sendEmail.bind(this));
    
    // Send a template email
    this.router.post('/send-template', this.sendTemplateEmail.bind(this));
  }
  
  /**
   * Send an email
   * @param {Request} req Express request
   * @param {Response} res Express response
   * @return {Promise<void>}
   */
  async sendEmail(req, res) {
    try {
      const { userId, to, subject, body, htmlBody, attachments } = req.body;
      
      if (!to) {
        return res.status(400).json({
          success: false,
          error: 'Recipient email is required'
        });
      }
      
      if (!subject) {
        return res.status(400).json({
          success: false,
          error: 'Email subject is required'
        });
      }
      
      const result = await this.emailService.sendEmail({
        userId,
        to,
        subject,
        body,
        htmlBody,
        attachments
      });
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }
      
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error sending email:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Send a template email
   * @param {Request} req Express request
   * @param {Response} res Express response
   * @return {Promise<void>}
   */
  async sendTemplateEmail(req, res) {
    try {
      const { userId, templateName, templateData, to, subject, attachments } = req.body;
      
      if (!templateName) {
        return res.status(400).json({
          success: false,
          error: 'Template name is required'
        });
      }
      
      if (!to) {
        return res.status(400).json({
          success: false,
          error: 'Recipient email is required'
        });
      }
      
      if (!subject) {
        return res.status(400).json({
          success: false,
          error: 'Email subject is required'
        });
      }
      
      const result = await this.emailService.sendTemplateEmail(
        templateName,
        templateData || {},
        {
          userId,
          to,
          subject,
          attachments
        }
      );
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }
      
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error sending template email:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Get router
   * @return {Router} Express router
   */
  getRouter() {
    return this.router;
  }
}

module.exports = EmailController;
