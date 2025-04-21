// Notification Controller - REST API endpoints for notification service
const express = require('express');
const router = express.Router();

class NotificationController {
  constructor(notificationService) {
    this.notificationService = notificationService;
    this.router = router;
    
    this.setupRoutes();
  }
  
  setupRoutes() {
    // Send a notification
    this.router.post('/send', this.sendNotification.bind(this));
    
    // Send notifications to multiple users
    this.router.post('/send-bulk', this.sendNotifications.bind(this));
    
    // Send event reminder
    this.router.post('/event-reminder/:eventId', this.sendEventReminder.bind(this));
    
    // Process scheduled reminders
    this.router.post('/process-reminders', this.processScheduledReminders.bind(this));
    
    // Mark notification as read
    this.router.put('/:notificationId/read', this.markNotificationAsRead.bind(this));
    
    // Mark all notifications as read
    this.router.put('/read-all', this.markAllNotificationsAsRead.bind(this));
  }
  
  /**
   * Send a notification
   * @param {Request} req Express request
   * @param {Response} res Express response
   * @return {Promise<void>}
   */
  async sendNotification(req, res) {
    try {
      const { userId, title, message, body, type, priority, documentId, eventId, actionUrl } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      if (!title) {
        return res.status(400).json({
          success: false,
          error: 'Notification title is required'
        });
      }
      
      if (!message && !body) {
        return res.status(400).json({
          success: false,
          error: 'Notification message is required'
        });
      }
      
      const result = await this.notificationService.sendNotification(
        userId,
        {
          title,
          message: message || body,
          body: body || message,
          type,
          priority,
          documentId,
          eventId,
          actionUrl
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
      console.error('Error sending notification:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Send notifications to multiple users
   * @param {Request} req Express request
   * @param {Response} res Express response
   * @return {Promise<void>}
   */
  async sendNotifications(req, res) {
    try {
      const { userIds, title, message, body, type, priority, documentId, eventId, actionUrl } = req.body;
      
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'User IDs array is required'
        });
      }
      
      if (!title) {
        return res.status(400).json({
          success: false,
          error: 'Notification title is required'
        });
      }
      
      if (!message && !body) {
        return res.status(400).json({
          success: false,
          error: 'Notification message is required'
        });
      }
      
      const result = await this.notificationService.sendNotifications(
        userIds,
        {
          title,
          message: message || body,
          body: body || message,
          type,
          priority,
          documentId,
          eventId,
          actionUrl
        }
      );
      
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error sending notifications:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Send event reminder
   * @param {Request} req Express request
   * @param {Response} res Express response
   * @return {Promise<void>}
   */
  async sendEventReminder(req, res) {
    try {
      const { eventId } = req.params;
      const { minutesBefore } = req.body;
      
      if (!eventId) {
        return res.status(400).json({
          success: false,
          error: 'Event ID is required'
        });
      }
      
      const result = await this.notificationService.sendEventReminder(
        eventId,
        minutesBefore || 30
      );
      
      if (!result.success && result.error !== 'Not yet time to send reminder') {
        return res.status(500).json({
          success: false,
          error: result.error,
          nextReminderTime: result.nextReminderTime
        });
      }
      
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error sending event reminder:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Process scheduled reminders
   * @param {Request} req Express request
   * @param {Response} res Express response
   * @return {Promise<void>}
   */
  async processScheduledReminders(req, res) {
    try {
      const result = await this.notificationService.processScheduledReminders();
      
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
      console.error('Error processing scheduled reminders:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Mark notification as read
   * @param {Request} req Express request
   * @param {Response} res Express response
   * @return {Promise<void>}
   */
  async markNotificationAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      
      if (!notificationId) {
        return res.status(400).json({
          success: false,
          error: 'Notification ID is required'
        });
      }
      
      const result = await this.notificationService.markNotificationAsRead(notificationId);
      
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
      console.error('Error marking notification as read:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Mark all notifications as read
   * @param {Request} req Express request
   * @param {Response} res Express response
   * @return {Promise<void>}
   */
  async markAllNotificationsAsRead(req, res) {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await this.notificationService.markAllNotificationsAsRead(userId);
      
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
      console.error('Error marking all notifications as read:', error);
      
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

module.exports = NotificationController;
