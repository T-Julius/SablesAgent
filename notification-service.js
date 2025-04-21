// Notification Service - Integration with notification providers
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

class NotificationService {
  constructor(options = {}) {
    this.databaseService = options.databaseService;
    
    // Configure email transport for email notifications
    this.emailTransporter = nodemailer.createTransport({
      service: options.emailService || 'gmail',
      auth: {
        user: options.emailUser || process.env.EMAIL_USER,
        pass: options.emailPassword || process.env.EMAIL_PASSWORD
      }
    });
    
    // Default sender for email notifications
    this.defaultSender = options.defaultSender || process.env.EMAIL_DEFAULT_SENDER || 'Zimbabwe Sables Rugby Team <no-reply@zimbabwesables.com>';
    
    // Initialize Firebase Admin SDK for push notifications if credentials are provided
    if (options.firebaseCredentials || process.env.FIREBASE_CREDENTIALS) {
      try {
        const credentials = options.firebaseCredentials || JSON.parse(process.env.FIREBASE_CREDENTIALS);
        
        admin.initializeApp({
          credential: admin.credential.cert(credentials)
        });
        
        this.firebaseAdmin = admin;
        console.log('Firebase Admin SDK initialized for push notifications');
      } catch (error) {
        console.error('Error initializing Firebase Admin SDK:', error);
      }
    }
  }

  /**
   * Send a notification to a user
   * @param {string} userId User ID
   * @param {Object} notificationData Notification data
   * @return {Promise<Object>} Result
   */
  async sendNotification(userId, notificationData) {
    try {
      // Validate notification data
      if (!notificationData.title) {
        throw new Error('Notification title is required');
      }
      
      if (!notificationData.message && !notificationData.body) {
        throw new Error('Notification message is required');
      }
      
      // Get user
      const User = this.databaseService.getModels().User;
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }
      
      // Create notification in database
      const Notification = this.databaseService.getModels().Notification;
      const notification = await Notification.create({
        userId,
        title: notificationData.title,
        message: notificationData.message || notificationData.body,
        type: notificationData.type || 'system',
        priority: notificationData.priority || 'normal',
        relatedDocument: notificationData.documentId,
        relatedEvent: notificationData.eventId,
        actionUrl: notificationData.actionUrl
      });
      
      // Send push notification if Firebase is configured and user has a device token
      let pushResult = null;
      if (this.firebaseAdmin && user.deviceToken) {
        try {
          const message = {
            notification: {
              title: notificationData.title,
              body: notificationData.message || notificationData.body
            },
            data: {
              notificationId: notification._id.toString(),
              type: notificationData.type || 'system',
              documentId: notificationData.documentId ? notificationData.documentId.toString() : '',
              eventId: notificationData.eventId ? notificationData.eventId.toString() : '',
              actionUrl: notificationData.actionUrl || ''
            },
            token: user.deviceToken
          };
          
          const response = await this.firebaseAdmin.messaging().send(message);
          pushResult = { success: true, messageId: response };
        } catch (error) {
          console.error('Error sending push notification:', error);
          pushResult = { success: false, error: error.message };
        }
      }
      
      // Send email notification if user preferences allow
      let emailResult = null;
      if (user.preferences && user.preferences.notificationSettings && user.preferences.notificationSettings.email) {
        try {
          const mailOptions = {
            from: this.defaultSender,
            to: user.email,
            subject: notificationData.title,
            text: notificationData.message || notificationData.body,
            html: notificationData.htmlBody || `<h1>${notificationData.title}</h1><p>${notificationData.message || notificationData.body}</p>`
          };
          
          const info = await this.emailTransporter.sendMail(mailOptions);
          emailResult = { success: true, messageId: info.messageId };
        } catch (error) {
          console.error('Error sending email notification:', error);
          emailResult = { success: false, error: error.message };
        }
      }
      
      // Log notification
      await this.logNotification(notification, user, pushResult, emailResult);
      
      return {
        success: true,
        notification,
        pushResult,
        emailResult
      };
    } catch (error) {
      console.error('Error sending notification:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send notifications to multiple users
   * @param {Array} userIds Array of user IDs
   * @param {Object} notificationData Notification data
   * @return {Promise<Object>} Result
   */
  async sendNotifications(userIds, notificationData) {
    try {
      const results = {
        success: true,
        sent: [],
        failed: []
      };
      
      for (const userId of userIds) {
        try {
          const result = await this.sendNotification(userId, notificationData);
          
          if (result.success) {
            results.sent.push({
              userId,
              notificationId: result.notification._id
            });
          } else {
            results.failed.push({
              userId,
              error: result.error
            });
          }
        } catch (error) {
          console.error(`Error sending notification to user ${userId}:`, error);
          
          results.failed.push({
            userId,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error sending notifications:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send a reminder for an event
   * @param {string} eventId Event ID
   * @param {number} minutesBefore Minutes before event
   * @return {Promise<Object>} Result
   */
  async sendEventReminder(eventId, minutesBefore = 30) {
    try {
      // Get event
      const Event = this.databaseService.getModels().Event;
      const event = await Event.findById(eventId);
      
      if (!event) {
        throw new Error(`Event not found: ${eventId}`);
      }
      
      // Check if event is in the future
      const eventTime = new Date(event.startTime);
      const now = new Date();
      
      if (eventTime <= now) {
        return {
          success: false,
          error: 'Event has already started or passed'
        };
      }
      
      // Calculate reminder time
      const reminderTime = new Date(eventTime);
      reminderTime.setMinutes(reminderTime.getMinutes() - minutesBefore);
      
      // Check if it's time to send the reminder
      if (reminderTime > now) {
        return {
          success: false,
          error: 'Not yet time to send reminder',
          nextReminderTime: reminderTime
        };
      }
      
      // Get attendees
      const attendeeIds = event.attendees
        .filter(a => a.userId)
        .map(a => a.userId);
      
      if (attendeeIds.length === 0) {
        return {
          success: false,
          error: 'No attendees found for event'
        };
      }
      
      // Prepare notification data
      const notificationData = {
        title: `Reminder: ${event.title}`,
        message: `Your event "${event.title}" starts in ${minutesBefore} minutes (${eventTime.toLocaleString()})${event.location ? ` at ${event.location}` : ''}.`,
        type: 'event',
        priority: 'high',
        eventId: event._id
      };
      
      // Send notifications to attendees
      const results = await this.sendNotifications(attendeeIds, notificationData);
      
      // Update reminder status in event
      const reminderIndex = event.reminders.findIndex(r => r.time === minutesBefore);
      
      if (reminderIndex >= 0) {
        event.reminders[reminderIndex].sent = true;
        await event.save();
      }
      
      return results;
    } catch (error) {
      console.error('Error sending event reminder:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process scheduled reminders
   * @return {Promise<Object>} Result
   */
  async processScheduledReminders() {
    try {
      const now = new Date();
      const results = {
        success: true,
        processed: 0,
        sent: 0,
        failed: 0
      };
      
      // Get events with upcoming start times and unsent reminders
      const Event = this.databaseService.getModels().Event;
      const events = await Event.find({
        startTime: { $gt: now },
        'reminders.sent': false
      });
      
      results.processed = events.length;
      
      for (const event of events) {
        for (const reminder of event.reminders.filter(r => !r.sent)) {
          // Calculate reminder time
          const reminderTime = new Date(event.startTime);
          reminderTime.setMinutes(reminderTime.getMinutes() - reminder.time);
          
          // Check if it's time to send the reminder
          if (reminderTime <= now) {
            const result = await this.sendEventReminder(event._id, reminder.time);
            
            if (result.success) {
              results.sent++;
            } else {
              results.failed++;
            }
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error processing scheduled reminders:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId Notification ID
   * @return {Promise<Object>} Result
   */
  async markNotificationAsRead(notificationId) {
    try {
      const Notification = this.databaseService.getModels().Notification;
      const notification = await Notification.findById(notificationId);
      
      if (!notification) {
        throw new Error(`Notification not found: ${notificationId}`);
      }
      
      await notification.markAsRead();
      
      return {
        success: true,
        notification
      };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId User ID
   * @return {Promise<Object>} Result
   */
  async markAllNotificationsAsRead(userId) {
    try {
      const Notification = this.databaseService.getModels().Notification;
      const result = await Notification.markAllAsRead(userId);
      
      return {
        success: true,
        count: result.modifiedCount
      };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Log notification
   * @param {Object} notification Notification object
   * @param {Object} user User object
   * @param {Object} pushResult Push notification result
   * @param {Object} emailResult Email notification result
   * @return {Promise<void>}
   */
  async logNotification(notification, user, pushResult, emailResult) {
    try {
      if (!this.databaseService) {
        return;
      }
      
      const AuditLog = this.databaseService.getModels().AuditLog;
      
      await AuditLog.logAction({
        userId: user._id,
        action: 'create',
        resourceType: 'notification',
        resourceId: notification._id,
        details: {
          type: notification.type,
          title: notification.title,
          push: pushResult,
          email: emailResult
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }
}

module.exports = NotificationService;
