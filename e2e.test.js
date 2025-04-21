const { expect } = require('chai');
const request = require('supertest');
const express = require('express');
const sinon = require('sinon');

// Import the main application
const app = require('../../backend/app');

describe('End-to-End Integration Tests', () => {
  let sandbox;
  let authToken;
  
  before(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/rugby-docs-test';
    
    // Get authentication token for testing
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'testpassword'
      });
    
    authToken = loginResponse.body.data.token;
  });
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('Authentication Flow', () => {
    it('should register a new user', async () => {
      const userData = {
        name: 'Test Player',
        email: 'player@example.com',
        password: 'securepassword',
        role: 'player',
        playerDetails: {
          position: 'Flanker',
          jerseyNumber: 7
        }
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${authToken}`) // Only admins can register users
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body.success).to.be.true;
      expect(response.body.data.user).to.have.property('_id');
      expect(response.body.data.user.name).to.equal('Test Player');
      expect(response.body.data.user.email).to.equal('player@example.com');
      expect(response.body.data.user.role).to.equal('player');
    });
    
    it('should login a user', async () => {
      const loginData = {
        email: 'player@example.com',
        password: 'securepassword'
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('token');
      expect(response.body.data).to.have.property('user');
      expect(response.body.data.user.email).to.equal('player@example.com');
    });
    
    it('should get current user profile', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('user');
      expect(response.body.data.user).to.have.property('_id');
      expect(response.body.data.user).to.have.property('email');
    });
  });
  
  describe('Document Management', () => {
    let documentId;
    
    it('should list documents', async () => {
      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('documents');
      expect(response.body.data).to.have.property('total');
      expect(response.body.data.documents).to.be.an('array');
    });
    
    it('should create a document', async () => {
      const documentData = {
        title: 'Test Document',
        content: 'This is a test document content.',
        type: 'document',
        category: 'Training'
      };
      
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(documentData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('document');
      expect(response.body.data.document).to.have.property('_id');
      expect(response.body.data.document.title).to.equal('Test Document');
      
      // Save document ID for later tests
      documentId = response.body.data.document._id;
    });
    
    it('should get a document by ID', async () => {
      const response = await request(app)
        .get(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('document');
      expect(response.body.data.document._id).to.equal(documentId);
      expect(response.body.data.document.title).to.equal('Test Document');
    });
    
    it('should update a document', async () => {
      const updateData = {
        title: 'Updated Test Document',
        content: 'This is updated content.'
      };
      
      const response = await request(app)
        .put(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('document');
      expect(response.body.data.document._id).to.equal(documentId);
      expect(response.body.data.document.title).to.equal('Updated Test Document');
    });
    
    it('should search documents', async () => {
      const response = await request(app)
        .get('/api/documents/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ query: 'updated' })
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('documents');
      expect(response.body.data).to.have.property('total');
      expect(response.body.data.documents).to.be.an('array');
      expect(response.body.data.documents.length).to.be.greaterThan(0);
      expect(response.body.data.documents[0].title).to.include('Updated');
    });
    
    it('should delete a document', async () => {
      const response = await request(app)
        .delete(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).to.be.true;
      
      // Verify document is deleted
      const getResponse = await request(app)
        .get(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
      
      expect(getResponse.body.success).to.be.false;
    });
  });
  
  describe('Event Management', () => {
    let eventId;
    
    it('should create an event', async () => {
      const eventData = {
        title: 'Team Meeting',
        description: 'Weekly team meeting',
        location: 'Conference Room',
        startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        endTime: new Date(Date.now() + 86400000 + 3600000).toISOString(), // Tomorrow + 1 hour
        attendees: [
          { email: 'player@example.com', name: 'Test Player' }
        ]
      };
      
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eventData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('eventId');
      expect(response.body.data).to.have.property('htmlLink');
      
      // Save event ID for later tests
      eventId = response.body.data.eventId;
    });
    
    it('should list events', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('events');
      expect(response.body.data.events).to.be.an('array');
      expect(response.body.data.events.length).to.be.greaterThan(0);
    });
    
    it('should get an event by ID', async () => {
      const response = await request(app)
        .get(`/api/events/primary/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('event');
      expect(response.body.data.event.id).to.equal(eventId);
      expect(response.body.data.event.summary).to.equal('Team Meeting');
    });
    
    it('should update an event', async () => {
      const updateData = {
        title: 'Updated Team Meeting',
        location: 'New Conference Room'
      };
      
      const response = await request(app)
        .put(`/api/events/primary/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('eventId');
      expect(response.body.data.eventId).to.equal(eventId);
      
      // Verify update
      const getResponse = await request(app)
        .get(`/api/events/primary/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(getResponse.body.data.event.summary).to.equal('Updated Team Meeting');
      expect(getResponse.body.data.event.location).to.equal('New Conference Room');
    });
    
    it('should delete an event', async () => {
      const response = await request(app)
        .delete(`/api/events/primary/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).to.be.true;
      
      // Verify event is deleted
      const getResponse = await request(app)
        .get(`/api/events/primary/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
      
      expect(getResponse.body.success).to.be.false;
    });
  });
  
  describe('Agent Interface', () => {
    let conversationId;
    
    it('should process a query', async () => {
      const queryData = {
        query: 'Find documents about training',
        userId: 'user123'
      };
      
      const response = await request(app)
        .post('/api/agent/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send(queryData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('response');
      expect(response.body.data).to.have.property('conversationId');
      
      // Save conversation ID for later tests
      conversationId = response.body.data.conversationId;
    });
    
    it('should get conversation history', async () => {
      const response = await request(app)
        .get(`/api/agent/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('conversationId');
      expect(response.body.data).to.have.property('messages');
      expect(response.body.data.messages).to.be.an('array');
      expect(response.body.data.messages.length).to.be.greaterThan(0);
    });
    
    it('should get user conversations', async () => {
      const response = await request(app)
        .get('/api/agent/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('conversations');
      expect(response.body.data.conversations).to.be.an('array');
      expect(response.body.data.conversations.length).to.be.greaterThan(0);
    });
  });
  
  describe('Notification System', () => {
    let notificationId;
    
    it('should send a notification', async () => {
      const notificationData = {
        userId: 'user123',
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'system'
      };
      
      const response = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send(notificationData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('notification');
      expect(response.body.data.notification).to.have.property('_id');
      expect(response.body.data.notification.title).to.equal('Test Notification');
      
      // Save notification ID for later tests
      notificationId = response.body.data.notification._id;
    });
    
    it('should get user notifications', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ userId: 'user123' })
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('notifications');
      expect(response.body.data).to.have.property('total');
      expect(response.body.data.notifications).to.be.an('array');
      expect(response.body.data.notifications.length).to.be.greaterThan(0);
    });
    
    it('should mark a notification as read', async () => {
      const response = await request(app)
        .put(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).to.be.true;
      
      // Verify notification is marked as read
      const getResponse = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ userId: 'user123' })
        .expect(200);
      
      const notification = getResponse.body.data.notifications.find(n => n._id === notificationId);
      expect(notification.read).to.be.true;
    });
    
    it('should mark all notifications as read', async () => {
      const response = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: 'user123' })
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('count');
      
      // Verify all notifications are marked as read
      const getResponse = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ userId: 'user123', unread: true })
        .expect(200);
      
      expect(getResponse.body.data.notifications).to.have.lengthOf(0);
    });
  });
});
