const { expect } = require('chai');
const sinon = require('sinon');

// Import the modules to test
const EmailService = require('../../backend/services/email/email-service');
const CalendarService = require('../../backend/services/calendar/calendar-service');
const NotificationService = require('../../backend/services/notification/notification-service');

describe('Service Integration Tests', () => {
  let sandbox;
  let mockDatabaseService;
  let mockDocumentService;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock services
    mockDatabaseService = {
      getModels: sandbox.stub().returns({
        User: {
          findById: sandbox.stub()
        },
        AuditLog: {
          logAction: sandbox.stub()
        },
        Notification: {
          create: sandbox.stub(),
          findById: sandbox.stub(),
          markAllAsRead: sandbox.stub()
        },
        Event: {
          findById: sandbox.stub()
        }
      })
    };
    
    mockDocumentService = {
      getDocument: sandbox.stub(),
      downloadDocument: sandbox.stub()
    };
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('EmailService', () => {
    let emailService;
    let mockTransporter;
    
    beforeEach(() => {
      mockTransporter = {
        sendMail: sandbox.stub().resolves({
          messageId: 'email123'
        })
      };
      
      emailService = new EmailService({
        databaseService: mockDatabaseService,
        documentService: mockDocumentService
      });
      
      // Replace the nodemailer transporter with our mock
      emailService.transporter = mockTransporter;
    });
    
    it('should send an email successfully', async () => {
      // Setup test data
      const emailData = {
        to: 'player@example.com',
        subject: 'Training Schedule',
        body: 'Here is your training schedule for next week.',
        userId: 'user123'
      };
      
      // Call the method
      const result = await emailService.sendEmail(emailData);
      
      // Verify results
      expect(result.success).to.be.true;
      expect(result.messageId).to.equal('email123');
      expect(mockTransporter.sendMail.calledOnce).to.be.true;
      expect(mockTransporter.sendMail.firstCall.args[0]).to.deep.include({
        to: 'player@example.com',
        subject: 'Training Schedule',
        text: 'Here is your training schedule for next week.'
      });
      
      // Verify audit logging
      const AuditLog = mockDatabaseService.getModels().AuditLog;
      expect(AuditLog.logAction.calledOnce).to.be.true;
    });
    
    it('should send an email with document attachments', async () => {
      // Setup test data
      const emailData = {
        to: 'player@example.com',
        subject: 'Training Documents',
        body: 'Here are your training documents.',
        attachments: [
          { documentId: 'doc123', format: 'pdf' }
        ],
        userId: 'user123'
      };
      
      // Setup mocks
      mockDocumentService.getDocument.resolves({
        _id: 'doc123',
        title: 'Training Plan 2025'
      });
      
      mockDocumentService.downloadDocument.resolves(Buffer.from('PDF content'));
      
      // Call the method
      const result = await emailService.sendEmail(emailData);
      
      // Verify results
      expect(result.success).to.be.true;
      expect(mockTransporter.sendMail.calledOnce).to.be.true;
      expect(mockTransporter.sendMail.firstCall.args[0].attachments).to.have.lengthOf(1);
      expect(mockTransporter.sendMail.firstCall.args[0].attachments[0]).to.deep.include({
        filename: 'Training Plan 2025.pdf'
      });
      
      // Verify document service calls
      expect(mockDocumentService.getDocument.calledOnce).to.be.true;
      expect(mockDocumentService.downloadDocument.calledOnce).to.be.true;
    });
    
    it('should send a template email successfully', async () => {
      // Setup test data
      const templateName = 'welcome';
      const templateData = {
        name: 'John Doe',
        role: 'Player'
      };
      const emailData = {
        to: 'player@example.com',
        subject: 'Welcome to the Team',
        userId: 'user123'
      };
      
      // Spy on the template methods
      sandbox.spy(emailService, 'getTemplate');
      sandbox.spy(emailService, 'renderTemplate');
      
      // Call the method
      const result = await emailService.sendTemplateEmail(templateName, templateData, emailData);
      
      // Verify results
      expect(result.success).to.be.true;
      expect(emailService.getTemplate.calledOnce).to.be.true;
      expect(emailService.getTemplate.firstCall.args[0]).to.equal('welcome');
      expect(emailService.renderTemplate.calledOnce).to.be.true;
      expect(mockTransporter.sendMail.calledOnce).to.be.true;
      expect(mockTransporter.sendMail.firstCall.args[0]).to.have.property('html');
    });
  });
  
  describe('CalendarService', () => {
    let calendarService;
    let mockCalendar;
    
    beforeEach(() => {
      mockCalendar = {
        events: {
          insert: sandbox.stub().resolves({
            data: {
              id: 'event123',
              htmlLink: 'https://calendar.google.com/event123'
            }
          }),
          get: sandbox.stub().resolves({
            data: {
              id: 'event123',
              summary: 'Team Meeting',
              start: { dateTime: '2025-04-25T10:00:00Z' },
              end: { dateTime: '2025-04-25T11:00:00Z' }
            }
          }),
          update: sandbox.stub().resolves({
            data: {
              id: 'event123',
              htmlLink: 'https://calendar.google.com/event123'
            }
          }),
          delete: sandbox.stub().resolves({}),
          list: sandbox.stub().resolves({
            data: {
              items: [
                {
                  id: 'event123',
                  summary: 'Team Meeting',
                  start: { dateTime: '2025-04-25T10:00:00Z' },
                  end: { dateTime: '2025-04-25T11:00:00Z' }
                }
              ]
            }
          })
        },
        calendars: {
          insert: sandbox.stub().resolves({
            data: {
              id: 'calendar123'
            }
          })
        }
      };
      
      calendarService = new CalendarService({
        databaseService: mockDatabaseService
      });
      
      // Replace the Google Calendar client with our mock
      calendarService.calendar = mockCalendar;
    });
    
    it('should create an event successfully', async () => {
      // Setup test data
      const eventData = {
        title: 'Team Meeting',
        description: 'Weekly team meeting',
        location: 'Conference Room',
        startTime: '2025-04-25T10:00:00Z',
        endTime: '2025-04-25T11:00:00Z',
        attendees: [
          { email: 'player@example.com', name: 'John Doe' }
        ],
        userId: 'user123'
      };
      
      // Call the method
      const result = await calendarService.createEvent(eventData);
      
      // Verify results
      expect(result.success).to.be.true;
      expect(result.eventId).to.equal('event123');
      expect(result.htmlLink).to.equal('https://calendar.google.com/event123');
      expect(mockCalendar.events.insert.calledOnce).to.be.true;
      
      // Verify event resource
      const eventResource = mockCalendar.events.insert.firstCall.args[0].resource;
      expect(eventResource.summary).to.equal('Team Meeting');
      expect(eventResource.description).to.equal('Weekly team meeting');
      expect(eventResource.location).to.equal('Conference Room');
      expect(eventResource.start.dateTime).to.equal('2025-04-25T10:00:00Z');
      expect(eventResource.end.dateTime).to.equal('2025-04-25T11:00:00Z');
      expect(eventResource.attendees).to.have.lengthOf(1);
      
      // Verify audit logging
      const AuditLog = mockDatabaseService.getModels().AuditLog;
      expect(AuditLog.logAction.calledOnce).to.be.true;
    });
    
    it('should get an event successfully', async () => {
      // Call the method
      const result = await calendarService.getEvent('primary', 'event123');
      
      // Verify results
      expect(result.success).to.be.true;
      expect(result.event.id).to.equal('event123');
      expect(result.event.summary).to.equal('Team Meeting');
      expect(mockCalendar.events.get.calledOnce).to.be.true;
      expect(mockCalendar.events.get.firstCall.args[0]).to.deep.include({
        calendarId: 'primary',
        eventId: 'event123'
      });
    });
    
    it('should update an event successfully', async () => {
      // Setup test data
      const updates = {
        title: 'Updated Team Meeting',
        location: 'New Conference Room',
        userId: 'user123'
      };
      
      // Call the method
      const result = await calendarService.updateEvent('primary', 'event123', updates);
      
      // Verify results
      expect(result.success).to.be.true;
      expect(result.eventId).to.equal('event123');
      expect(mockCalendar.events.get.calledOnce).to.be.true;
      expect(mockCalendar.events.update.calledOnce).to.be.true;
      
      // Verify update resource
      const updateResource = mockCalendar.events.update.firstCall.args[0].resource;
      expect(updateResource.summary).to.equal('Updated Team Meeting');
      expect(updateResource.location).to.equal('New Conference Room');
      
      // Verify audit logging
      const AuditLog = mockDatabaseService.getModels().AuditLog;
      expect(AuditLog.logAction.calledOnce).to.be.true;
    });
    
    it('should list events successfully', async () => {
      // Setup test data
      const options = {
        timeMin: '2025-04-20T00:00:00Z',
        timeMax: '2025-04-30T00:00:00Z',
        maxResults: 10,
        query: 'meeting'
      };
      
      // Call the method
      const result = await calendarService.listEvents(options);
      
      // Verify results
      expect(result.success).to.be.true;
      expect(result.events).to.have.lengthOf(1);
      expect(result.events[0].summary).to.equal('Team Meeting');
      expect(mockCalendar.events.list.calledOnce).to.be.true;
      expect(mockCalendar.events.list.firstCall.args[0]).to.deep.include({
        timeMin: '2025-04-20T00:00:00Z',
        timeMax: '2025-04-30T00:00:00Z',
        maxResults: 10,
        q: 'meeting'
      });
    });
  });
  
  describe('NotificationService', () => {
    let notificationService;
    let mockEmailTransporter;
    let mockFirebaseAdmin;
    
    beforeEach(() => {
      mockEmailTransporter = {
        sendMail: sandbox.stub().resolves({
          messageId: 'email123'
        })
      };
      
      mockFirebaseAdmin = {
        messaging: sandbox.stub().returns({
          send: sandbox.stub().resolves('message123')
        })
      };
      
      notificationService = new NotificationService({
        databaseService: mockDatabaseService
      });
      
      // Replace the email transporter with our mock
      notificationService.emailTransporter = mockEmailTransporter;
      
      // Replace Firebase Admin with our mock
      notificationService.firebaseAdmin = mockFirebaseAdmin;
    });
    
    it('should send a notification to a user successfully', async () => {
      // Setup test data
      const userId = 'user123';
      const notificationData = {
        title: 'New Document',
        message: 'A new training document has been shared with you.',
        type: 'document',
        documentId: 'doc123'
      };
      
      // Setup mocks
      const User = mockDatabaseService.getModels().User;
      User.findById.resolves({
        _id: userId,
        name: 'John Doe',
        email: 'player@example.com',
        deviceToken: 'device123',
        preferences: {
          notificationSettings: {
            email: true
          }
        }
      });
      
      const Notification = mockDatabaseService.getModels().Notification;
      Notification.create.resolves({
        _id: 'notif123',
        userId,
        title: 'New Document',
        message: 'A new training document has been shared with you.',
        type: 'document',
        relatedDocument: 'doc123'
      });
      
      // Call the method
      const result = await notificationService.sendNotification(userId, notificationData);
      
      // Verify results
      expect(result.success).to.be.true;
      expect(result.notification._id).to.equal('notif123');
      expect(result.pushResult.success).to.be.true;
      expect(result.emailResult.success).to.be.true;
      
      // Verify database calls
      expect(User.findById.calledOnce).to.be.true;
      expect(Notification.create.calledOnce).to.be.true;
      
      // Verify Firebase messaging call
      expect(mockFirebaseAdmin.messaging().send.calledOnce).to.be.true;
      
      // Verify email call
      expect(mockEmailTransporter.sendMail.calledOnce).to.be.true;
      expect(mockEmailTransporter.sendMail.firstCall.args[0]).to.deep.include({
        to: 'player@example.com',
        subject: 'New Document'
      });
      
      // Verify audit logging
      const AuditLog = mockDatabaseService.getModels().AuditLog;
      expect(AuditLog.logAction.calledOnce).to.be.true;
    });
    
    it('should send notifications to multiple users', async () => {
      // Setup test data
      const userIds = ['user1', 'user2'];
      const notificationData = {
        title: 'Team Announcement',
        message: 'Important team announcement.',
        type: 'system'
      };
      
      // Stub the sendNotification method
      sandbox.stub(notificationService, 'sendNotification')
        .onFirstCall().resolves({
          success: true,
          notification: { _id: 'notif1' }
        })
        .onSecondCall().resolves({
          success: true,
          notification: { _id: 'notif2' }
        });
      
      // Call the method
      const result = await notificationService.sendNotifications(userIds, notificationData);
      
      // Verify results
      expect(result.success).to.be.true;
      expect(result.sent).to.have.lengthOf(2);
      expect(result.failed).to.have.lengthOf(0);
      expect(notificationService.sendNotification.calledTwice).to.be.true;
      expect(notificationService.sendNotification.firstCall.args[0]).to.equal('user1');
      expect(notificationService.sendNotification.secondCall.args[0]).to.equal('user2');
    });
    
    it('should send an event reminder', async () => {
      // Setup test data
      const eventId = 'event123';
      const minutesBefore = 30;
      
      // Setup mocks
      const Event = mockDatabaseService.getModels().Event;
      Event.findById.resolves({
        _id: eventId,
        title: 'Team Meeting',
        startTime: new Date(Date.now() + 20 * 60 * 1000), // 20 minutes from now
        location: 'Conference Room',
        attendees: [
          { userId: 'user1' },
          { userId: 'user2' }
        ],
        reminders: [
          { time: 30, sent: false }
        ],
        save: sandbox.stub().resolves()
      });
      
      // Stub the sendNotifications method
      sandbox.stub(notificationService, 'sendNotifications').resolves({
        success: true,
        sent: [{ userId: 'user1' }, { userId: 'user2' }],
        failed: []
      });
      
      // Call the method
      const result = await notificationService.sendEventReminder(eventId, minutesBefore);
      
      // Verify results
      expect(result.success).to.be.true;
      expect(result.sent).to.have.lengthOf(2);
      expect(Event.findById.calledOnce).to.be.true;
      expect(notificationService.sendNotifications.calledOnce).to.be.true;
      
      // Verify notification data
      const notificationData = notificationService.sendNotifications.firstCall.args[1];
      expect(notificationData.title).to.include('Reminder');
      expect(notificationData.message).to.include('Team M
(Content truncated due to size limit. Use line ranges to read in chunks)