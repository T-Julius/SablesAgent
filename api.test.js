const { expect } = require('chai');
const request = require('supertest');
const sinon = require('sinon');
const express = require('express');

// Import the controllers to test
const AgentController = require('../../backend/agent/agent-controller');
const EmailController = require('../../backend/services/email/email-controller');
const CalendarController = require('../../backend/services/calendar/calendar-controller');
const NotificationController = require('../../backend/services/notification/notification-controller');

describe('API Integration Tests', () => {
  let app;
  let sandbox;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    app = express();
    app.use(express.json());
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('AgentController', () => {
    let mockAgentService;
    let agentController;
    
    beforeEach(() => {
      mockAgentService = {
        processQuery: sandbox.stub(),
        getConversationHistory: sandbox.stub(),
        getUserConversations: sandbox.stub(),
        completeConversation: sandbox.stub()
      };
      
      agentController = new AgentController(mockAgentService);
      app.use('/api/agent', agentController.getRouter());
    });
    
    it('should process a query successfully', async () => {
      // Setup mock
      const queryData = {
        userId: 'user123',
        query: 'Find documents about training plans',
        conversationId: 'conv123'
      };
      
      const mockResponse = {
        response: 'I found 2 documents about training plans.',
        relatedDocuments: [
          { _id: 'doc1', title: 'Training Plan 2025' },
          { _id: 'doc2', title: 'Fitness Program' }
        ]
      };
      
      mockAgentService.processQuery.resolves(mockResponse);
      
      // Make request
      const response = await request(app)
        .post('/api/agent/query')
        .send(queryData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Verify response
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.deep.equal(mockResponse);
      expect(mockAgentService.processQuery.calledOnce).to.be.true;
      expect(mockAgentService.processQuery.firstCall.args).to.deep.equal([
        'user123',
        'Find documents about training plans',
        'conv123'
      ]);
    });
    
    it('should get conversation history successfully', async () => {
      // Setup mock
      const mockHistory = {
        conversationId: 'conv123',
        messages: [
          {
            sender: 'user',
            content: 'Find documents about training plans',
            timestamp: new Date().toISOString()
          },
          {
            sender: 'agent',
            content: 'I found 2 documents about training plans.',
            timestamp: new Date().toISOString(),
            relatedDocuments: [
              { _id: 'doc1', title: 'Training Plan 2025' },
              { _id: 'doc2', title: 'Fitness Program' }
            ]
          }
        ]
      };
      
      mockAgentService.getConversationHistory.resolves(mockHistory);
      
      // Make request
      const response = await request(app)
        .get('/api/agent/conversations/conv123')
        .query({ userId: 'user123' })
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Verify response
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.deep.equal(mockHistory);
      expect(mockAgentService.getConversationHistory.calledOnce).to.be.true;
      expect(mockAgentService.getConversationHistory.firstCall.args[0]).to.equal('user123');
      expect(mockAgentService.getConversationHistory.firstCall.args[1]).to.equal('conv123');
    });
  });
  
  describe('EmailController', () => {
    let mockEmailService;
    let emailController;
    
    beforeEach(() => {
      mockEmailService = {
        sendEmail: sandbox.stub(),
        sendTemplateEmail: sandbox.stub()
      };
      
      emailController = new EmailController(mockEmailService);
      app.use('/api/email', emailController.getRouter());
    });
    
    it('should send an email successfully', async () => {
      // Setup mock
      const emailData = {
        userId: 'user123',
        to: 'player@example.com',
        subject: 'Training Schedule',
        body: 'Here is your training schedule for next week.',
        attachments: [
          { documentId: 'doc123', format: 'pdf' }
        ]
      };
      
      const mockResult = {
        success: true,
        messageId: 'email123'
      };
      
      mockEmailService.sendEmail.resolves(mockResult);
      
      // Make request
      const response = await request(app)
        .post('/api/email/send')
        .send(emailData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Verify response
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.deep.equal(mockResult);
      expect(mockEmailService.sendEmail.calledOnce).to.be.true;
      expect(mockEmailService.sendEmail.firstCall.args[0]).to.deep.equal(emailData);
    });
    
    it('should send a template email successfully', async () => {
      // Setup mock
      const templateData = {
        userId: 'user123',
        templateName: 'welcome',
        templateData: {
          name: 'John Doe',
          role: 'Player'
        },
        to: 'player@example.com',
        subject: 'Welcome to the Team'
      };
      
      const mockResult = {
        success: true,
        messageId: 'email123'
      };
      
      mockEmailService.sendTemplateEmail.resolves(mockResult);
      
      // Make request
      const response = await request(app)
        .post('/api/email/send-template')
        .send(templateData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Verify response
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.deep.equal(mockResult);
      expect(mockEmailService.sendTemplateEmail.calledOnce).to.be.true;
      expect(mockEmailService.sendTemplateEmail.firstCall.args[0]).to.equal('welcome');
      expect(mockEmailService.sendTemplateEmail.firstCall.args[1]).to.deep.equal({
        name: 'John Doe',
        role: 'Player'
      });
    });
  });
  
  describe('CalendarController', () => {
    let mockCalendarService;
    let calendarController;
    
    beforeEach(() => {
      mockCalendarService = {
        getAuthUrl: sandbox.stub(),
        getTokens: sandbox.stub(),
        createEvent: sandbox.stub(),
        getEvent: sandbox.stub(),
        updateEvent: sandbox.stub(),
        deleteEvent: sandbox.stub(),
        listEvents: sandbox.stub(),
        createCalendar: sandbox.stub()
      };
      
      calendarController = new CalendarController(mockCalendarService);
      app.use('/api/calendar', calendarController.getRouter());
    });
    
    it('should create an event successfully', async () => {
      // Setup mock
      const eventData = {
        userId: 'user123',
        title: 'Team Meeting',
        description: 'Weekly team meeting',
        location: 'Conference Room',
        startTime: '2025-04-25T10:00:00Z',
        endTime: '2025-04-25T11:00:00Z',
        attendees: [
          { email: 'player@example.com', name: 'John Doe' }
        ]
      };
      
      const mockResult = {
        success: true,
        eventId: 'event123',
        htmlLink: 'https://calendar.google.com/event123'
      };
      
      mockCalendarService.createEvent.resolves(mockResult);
      
      // Make request
      const response = await request(app)
        .post('/api/calendar/events')
        .send(eventData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Verify response
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.deep.equal(mockResult);
      expect(mockCalendarService.createEvent.calledOnce).to.be.true;
      expect(mockCalendarService.createEvent.firstCall.args[0]).to.deep.include({
        userId: 'user123',
        title: 'Team Meeting',
        description: 'Weekly team meeting'
      });
    });
    
    it('should list events successfully', async () => {
      // Setup mock
      const mockResult = {
        success: true,
        events: [
          {
            id: 'event123',
            summary: 'Team Meeting',
            start: { dateTime: '2025-04-25T10:00:00Z' },
            end: { dateTime: '2025-04-25T11:00:00Z' }
          }
        ]
      };
      
      mockCalendarService.listEvents.resolves(mockResult);
      
      // Make request
      const response = await request(app)
        .get('/api/calendar/events')
        .query({
          timeMin: '2025-04-20T00:00:00Z',
          timeMax: '2025-04-30T00:00:00Z',
          maxResults: '10',
          query: 'meeting'
        })
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Verify response
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.deep.equal(mockResult);
      expect(mockCalendarService.listEvents.calledOnce).to.be.true;
      expect(mockCalendarService.listEvents.firstCall.args[0]).to.deep.include({
        timeMin: '2025-04-20T00:00:00Z',
        timeMax: '2025-04-30T00:00:00Z',
        maxResults: 10,
        query: 'meeting'
      });
    });
  });
  
  describe('NotificationController', () => {
    let mockNotificationService;
    let notificationController;
    
    beforeEach(() => {
      mockNotificationService = {
        sendNotification: sandbox.stub(),
        sendNotifications: sandbox.stub(),
        sendEventReminder: sandbox.stub(),
        processScheduledReminders: sandbox.stub(),
        markNotificationAsRead: sandbox.stub(),
        markAllNotificationsAsRead: sandbox.stub()
      };
      
      notificationController = new NotificationController(mockNotificationService);
      app.use('/api/notifications', notificationController.getRouter());
    });
    
    it('should send a notification successfully', async () => {
      // Setup mock
      const notificationData = {
        userId: 'user123',
        title: 'New Document',
        message: 'A new training document has been shared with you.',
        type: 'document',
        documentId: 'doc123'
      };
      
      const mockResult = {
        success: true,
        notification: {
          _id: 'notif123',
          title: 'New Document',
          message: 'A new training document has been shared with you.'
        }
      };
      
      mockNotificationService.sendNotification.resolves(mockResult);
      
      // Make request
      const response = await request(app)
        .post('/api/notifications/send')
        .send(notificationData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Verify response
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.deep.equal(mockResult);
      expect(mockNotificationService.sendNotification.calledOnce).to.be.true;
      expect(mockNotificationService.sendNotification.firstCall.args[0]).to.equal('user123');
      expect(mockNotificationService.sendNotification.firstCall.args[1]).to.deep.include({
        title: 'New Document',
        message: 'A new training document has been shared with you.'
      });
    });
    
    it('should mark all notifications as read successfully', async () => {
      // Setup mock
      const mockResult = {
        success: true,
        count: 5
      };
      
      mockNotificationService.markAllNotificationsAsRead.resolves(mockResult);
      
      // Make request
      const response = await request(app)
        .put('/api/notifications/read-all')
        .send({ userId: 'user123' })
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Verify response
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.deep.equal(mockResult);
      expect(mockNotificationService.markAllNotificationsAsRead.calledOnce).to.be.true;
      expect(mockNotificationService.markAllNotificationsAsRead.firstCall.args[0]).to.equal('user123');
    });
  });
});
