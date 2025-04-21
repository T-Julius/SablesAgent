const { expect } = require('chai');
const sinon = require('sinon');

// Import the modules to test
const AgentInterface = require('../../backend/agent/agent-interface');
const AgentService = require('../../backend/agent/agent-service');

describe('Intelligent Agent Tests', () => {
  let sandbox;
  let mockDatabaseService;
  let mockDocumentService;
  let mockEmailService;
  let mockCalendarService;
  let mockNotificationService;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock services
    mockDatabaseService = {
      getModels: sandbox.stub().returns({
        Document: {
          find: sandbox.stub(),
          findById: sandbox.stub()
        },
        User: {
          findById: sandbox.stub()
        },
        Event: {
          find: sandbox.stub(),
          findById: sandbox.stub(),
          create: sandbox.stub()
        },
        AgentConversation: {
          findById: sandbox.stub(),
          findOne: sandbox.stub(),
          find: sandbox.stub(),
          create: sandbox.stub()
        },
        AuditLog: {
          logAction: sandbox.stub()
        }
      })
    };
    
    mockDocumentService = {
      searchDocuments: sandbox.stub(),
      getDocument: sandbox.stub(),
      getDocumentSummary: sandbox.stub()
    };
    
    mockEmailService = {
      sendEmail: sandbox.stub()
    };
    
    mockCalendarService = {
      createEvent: sandbox.stub(),
      updateEvent: sandbox.stub(),
      deleteEvent: sandbox.stub(),
      listEvents: sandbox.stub()
    };
    
    mockNotificationService = {
      sendNotification: sandbox.stub()
    };
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('AgentInterface', () => {
    let agentInterface;
    
    beforeEach(() => {
      agentInterface = new AgentInterface({
        databaseService: mockDatabaseService,
        documentService: mockDocumentService,
        emailService: mockEmailService,
        calendarService: mockCalendarService,
        notificationService: mockNotificationService,
        openaiApiKey: 'test-api-key'
      });
      
      // Mock the NLP processing methods
      sandbox.stub(agentInterface, 'processNaturalLanguage').resolves({
        intent: 'document_search',
        entities: {
          query: 'training plan'
        },
        confidence: 0.95
      });
    });
    
    it('should process a document search query successfully', async () => {
      // Setup mocks
      const userId = 'user123';
      const query = 'Find documents about training plans';
      const conversationId = 'conv123';
      
      const mockDocuments = [
        { _id: 'doc1', title: 'Training Plan 2025', content: 'Training plan details...' },
        { _id: 'doc2', title: 'Fitness Program', content: 'Fitness program details...' }
      ];
      
      mockDocumentService.searchDocuments.resolves({
        documents: mockDocuments,
        total: 2
      });
      
      const AgentConversation = mockDatabaseService.getModels().AgentConversation;
      AgentConversation.findById.resolves({
        _id: conversationId,
        userId,
        messages: [],
        addMessage: sandbox.stub()
      });
      
      // Call the method
      const result = await agentInterface.processQuery(userId, query, conversationId);
      
      // Verify results
      expect(result).to.have.property('response');
      expect(result).to.have.property('relatedDocuments');
      expect(result.relatedDocuments).to.have.lengthOf(2);
      expect(mockDocumentService.searchDocuments.calledOnce).to.be.true;
      expect(mockDocumentService.searchDocuments.firstCall.args[0]).to.equal('training plan');
    });
    
    it('should handle document summary requests', async () => {
      // Override the NLP processing for this test
      agentInterface.processNaturalLanguage.resolves({
        intent: 'document_summary',
        entities: {
          documentId: 'doc123'
        },
        confidence: 0.95
      });
      
      // Setup mocks
      const userId = 'user123';
      const query = 'Summarize document doc123';
      const conversationId = 'conv123';
      
      const mockDocument = {
        _id: 'doc123',
        title: 'Training Plan 2025',
        content: 'Training plan details...'
      };
      
      mockDocumentService.getDocument.resolves(mockDocument);
      mockDocumentService.getDocumentSummary.resolves('This is a summary of the training plan for 2025.');
      
      const AgentConversation = mockDatabaseService.getModels().AgentConversation;
      AgentConversation.findById.resolves({
        _id: conversationId,
        userId,
        messages: [],
        addMessage: sandbox.stub()
      });
      
      // Call the method
      const result = await agentInterface.processQuery(userId, query, conversationId);
      
      // Verify results
      expect(result).to.have.property('response');
      expect(result).to.have.property('relatedDocuments');
      expect(result.relatedDocuments).to.have.lengthOf(1);
      expect(mockDocumentService.getDocument.calledOnce).to.be.true;
      expect(mockDocumentService.getDocumentSummary.calledOnce).to.be.true;
    });
    
    it('should handle event creation requests', async () => {
      // Override the NLP processing for this test
      agentInterface.processNaturalLanguage.resolves({
        intent: 'create_event',
        entities: {
          title: 'Team Meeting',
          startTime: '2025-04-25T10:00:00Z',
          endTime: '2025-04-25T11:00:00Z',
          location: 'Conference Room'
        },
        confidence: 0.95
      });
      
      // Setup mocks
      const userId = 'user123';
      const query = 'Schedule a team meeting on April 25th at 10am in the conference room';
      const conversationId = 'conv123';
      
      mockCalendarService.createEvent.resolves({
        success: true,
        eventId: 'event123',
        htmlLink: 'https://calendar.google.com/event123'
      });
      
      const AgentConversation = mockDatabaseService.getModels().AgentConversation;
      AgentConversation.findById.resolves({
        _id: conversationId,
        userId,
        messages: [],
        addMessage: sandbox.stub()
      });
      
      // Call the method
      const result = await agentInterface.processQuery(userId, query, conversationId);
      
      // Verify results
      expect(result).to.have.property('response');
      expect(result).to.have.property('actions');
      expect(result.actions).to.have.property('eventCreated');
      expect(mockCalendarService.createEvent.calledOnce).to.be.true;
      expect(mockCalendarService.createEvent.firstCall.args[0]).to.deep.include({
        title: 'Team Meeting',
        location: 'Conference Room'
      });
    });
    
    it('should handle email sending requests', async () => {
      // Override the NLP processing for this test
      agentInterface.processNaturalLanguage.resolves({
        intent: 'send_email',
        entities: {
          to: 'player@example.com',
          subject: 'Training Schedule',
          body: 'Here is your training schedule for next week.'
        },
        confidence: 0.95
      });
      
      // Setup mocks
      const userId = 'user123';
      const query = 'Send an email to player@example.com about the training schedule';
      const conversationId = 'conv123';
      
      mockEmailService.sendEmail.resolves({
        success: true,
        messageId: 'email123'
      });
      
      const AgentConversation = mockDatabaseService.getModels().AgentConversation;
      AgentConversation.findById.resolves({
        _id: conversationId,
        userId,
        messages: [],
        addMessage: sandbox.stub()
      });
      
      // Call the method
      const result = await agentInterface.processQuery(userId, query, conversationId);
      
      // Verify results
      expect(result).to.have.property('response');
      expect(result).to.have.property('actions');
      expect(result.actions).to.have.property('emailSent');
      expect(mockEmailService.sendEmail.calledOnce).to.be.true;
      expect(mockEmailService.sendEmail.firstCall.args[0]).to.deep.include({
        to: 'player@example.com',
        subject: 'Training Schedule'
      });
    });
  });
  
  describe('AgentService', () => {
    let agentService;
    let mockAgentInterface;
    
    beforeEach(() => {
      mockAgentInterface = {
        processQuery: sandbox.stub()
      };
      
      agentService = new AgentService({
        databaseService: mockDatabaseService,
        agentInterface: mockAgentInterface
      });
      
      // Replace the agent interface with our mock
      agentService.agentInterface = mockAgentInterface;
    });
    
    it('should process a query and log the interaction', async () => {
      // Setup mocks
      const userId = 'user123';
      const query = 'Find documents about training plans';
      const conversationId = 'conv123';
      
      const mockResponse = {
        response: 'I found 2 documents about training plans.',
        relatedDocuments: [
          { _id: 'doc1', title: 'Training Plan 2025' },
          { _id: 'doc2', title: 'Fitness Program' }
        ]
      };
      
      mockAgentInterface.processQuery.resolves(mockResponse);
      
      const AuditLog = mockDatabaseService.getModels().AuditLog;
      
      // Call the method
      const result = await agentService.processQuery(userId, query, conversationId);
      
      // Verify results
      expect(result).to.deep.equal(mockResponse);
      expect(mockAgentInterface.processQuery.calledOnce).to.be.true;
      expect(mockAgentInterface.processQuery.firstCall.args).to.deep.equal([userId, query, conversationId]);
      expect(AuditLog.logAction.calledTwice).to.be.true; // Once for query, once for response
    });
    
    it('should get conversation history', async () => {
      // Setup mocks
      const userId = 'user123';
      const conversationId = 'conv123';
      
      const mockConversation = {
        _id: conversationId,
        userId,
        messages: [
          {
            sender: 'user',
            content: 'Find documents about training plans',
            timestamp: new Date()
          },
          {
            sender: 'agent',
            content: 'I found 2 documents about training plans.',
            timestamp: new Date(),
            relatedDocuments: [
              { _id: 'doc1', title: 'Training Plan 2025' },
              { _id: 'doc2', title: 'Fitness Program' }
            ]
          }
        ]
      };
      
      const AgentConversation = mockDatabaseService.getModels().AgentConversation;
      AgentConversation.findById.resolves(mockConversation);
      
      // Call the method
      const result = await agentService.getConversationHistory(userId, conversationId);
      
      // Verify results
      expect(result).to.have.property('conversationId', conversationId);
      expect(result).to.have.property('messages');
      expect(result.messages).to.have.lengthOf(2);
      expect(AgentConversation.findById.calledOnce).to.be.true;
      expect(AgentConversation.findById.firstCall.args[0]).to.equal(conversationId);
    });
    
    it('should get user conversations', async () => {
      // Setup mocks
      const userId = 'user123';
      
      const mockConversations = [
        {
          _id: 'conv1',
          userId,
          startedAt: new Date(),
          endedAt: null,
          status: 'active',
          messages: [
            {
              sender: 'user',
              content: 'Find documents about training plans',
              timestamp: new Date()
            }
          ]
        },
        {
          _id: 'conv2',
          userId,
          startedAt: new Date(Date.now() - 86400000), // 1 day ago
          endedAt: new Date(),
          status: 'completed',
          messages: [
            {
              sender: 'user',
              content: 'Schedule a team meeting',
              timestamp: new Date(Date.now() - 86400000)
            }
          ]
        }
      ];
      
      const AgentConversation = mockDatabaseService.getModels().AgentConversation;
      AgentConversation.find.returns({
        sort: sandbox.stub().returns({
          limit: sandbox.stub().resolves(mockConversations)
        })
      });
      
      // Call the method
      const result = await agentService.getUserConversations(userId);
      
      // Verify results
      expect(result).to.have.lengthOf(2);
      expect(result[0]).to.have.property('id', 'conv1');
      expect(result[0]).to.have.property('status', 'active');
      expect(result[1]).to.have.property('id', 'conv2');
      expect(result[1]).to.have.property('status', 'completed');
      expect(AgentConversation.find.calledOnce).to.be.true;
      expect(AgentConversation.find.firstCall.args[0]).to.deep.equal({ userId });
    });
  });
});
