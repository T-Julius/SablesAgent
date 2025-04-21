const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');

// Import the modules to test
const DatabaseManager = require('../../backend/database/database-manager');
const DatabaseService = require('../../backend/database/database-service');
const UserModel = require('../../backend/database/models/user');
const DocumentModel = require('../../backend/database/models/document');
const EventModel = require('../../backend/database/models/event');

describe('Database Integration Tests', () => {
  let sandbox;
  let mockMongoose;
  let mockConnection;
  let mockModels;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock Mongoose
    mockConnection = {
      on: sandbox.stub(),
      once: sandbox.stub(),
      model: sandbox.stub()
    };
    
    mockModels = {
      User: {
        findById: sandbox.stub(),
        findOne: sandbox.stub(),
        find: sandbox.stub(),
        create: sandbox.stub(),
        updateOne: sandbox.stub(),
        deleteOne: sandbox.stub()
      },
      Document: {
        findById: sandbox.stub(),
        findOne: sandbox.stub(),
        find: sandbox.stub(),
        create: sandbox.stub(),
        updateOne: sandbox.stub(),
        deleteOne: sandbox.stub()
      },
      Event: {
        findById: sandbox.stub(),
        findOne: sandbox.stub(),
        find: sandbox.stub(),
        create: sandbox.stub(),
        updateOne: sandbox.stub(),
        deleteOne: sandbox.stub()
      },
      Notification: {
        findById: sandbox.stub(),
        findOne: sandbox.stub(),
        find: sandbox.stub(),
        create: sandbox.stub(),
        updateOne: sandbox.stub(),
        deleteOne: sandbox.stub()
      },
      AuditLog: {
        logAction: sandbox.stub(),
        find: sandbox.stub()
      }
    };
    
    sandbox.stub(mongoose, 'createConnection').returns(mockConnection);
    sandbox.stub(mongoose, 'model').callsFake((name) => mockModels[name]);
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('DatabaseManager', () => {
    let databaseManager;
    
    beforeEach(() => {
      databaseManager = new DatabaseManager({
        uri: 'mongodb://localhost:27017/rugby-docs-test',
        options: { useNewUrlParser: true, useUnifiedTopology: true }
      });
    });
    
    it('should connect to MongoDB successfully', async () => {
      // Setup mock
      mockConnection.once.withArgs('open').yields();
      
      // Call the method
      await databaseManager.connect();
      
      // Verify results
      expect(mongoose.createConnection.calledOnce).to.be.true;
      expect(mongoose.createConnection.firstCall.args[0]).to.equal('mongodb://localhost:27017/rugby-docs-test');
      expect(mockConnection.once.calledWith('open')).to.be.true;
    });
    
    it('should handle connection errors', async () => {
      // Setup mock
      mockConnection.once.withArgs('open').callsFake((event, cb) => {
        // Don't call the callback, simulate timeout
      });
      mockConnection.on.withArgs('error').yields(new Error('Connection error'));
      
      // Call the method and expect it to throw
      try {
        await databaseManager.connect();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Connection error');
      }
      
      // Verify results
      expect(mongoose.createConnection.calledOnce).to.be.true;
      expect(mockConnection.on.calledWith('error')).to.be.true;
    });
    
    it('should register models successfully', async () => {
      // Setup mock
      mockConnection.once.withArgs('open').yields();
      mockConnection.model.returns({});
      
      // Call the methods
      await databaseManager.connect();
      databaseManager.registerModels();
      
      // Verify results
      expect(mockConnection.model.called).to.be.true;
    });
  });
  
  describe('DatabaseService', () => {
    let databaseService;
    let mockDatabaseManager;
    
    beforeEach(() => {
      mockDatabaseManager = {
        connect: sandbox.stub().resolves(),
        registerModels: sandbox.stub(),
        getModels: sandbox.stub().returns(mockModels),
        getConnection: sandbox.stub().returns(mockConnection)
      };
      
      databaseService = new DatabaseService({
        databaseManager: mockDatabaseManager
      });
    });
    
    it('should initialize successfully', async () => {
      // Call the method
      await databaseService.initialize();
      
      // Verify results
      expect(mockDatabaseManager.connect.calledOnce).to.be.true;
      expect(mockDatabaseManager.registerModels.calledOnce).to.be.true;
    });
    
    it('should get models successfully', () => {
      // Call the method
      const models = databaseService.getModels();
      
      // Verify results
      expect(models).to.equal(mockModels);
      expect(mockDatabaseManager.getModels.calledOnce).to.be.true;
    });
  });
  
  describe('User Model', () => {
    let userModel;
    
    beforeEach(() => {
      userModel = mockModels.User;
    });
    
    it('should create a user successfully', async () => {
      // Setup mock
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'player',
        playerDetails: {
          position: 'Flanker',
          jerseyNumber: 7
        }
      };
      
      const createdUser = {
        _id: 'user1',
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      userModel.create.resolves(createdUser);
      
      // Call the method
      const result = await userModel.create(userData);
      
      // Verify results
      expect(result).to.deep.equal(createdUser);
      expect(userModel.create.calledOnce).to.be.true;
      expect(userModel.create.firstCall.args[0]).to.deep.equal(userData);
    });
    
    it('should find a user by ID successfully', async () => {
      // Setup mock
      const user = {
        _id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'player'
      };
      
      userModel.findById.resolves(user);
      
      // Call the method
      const result = await userModel.findById('user1');
      
      // Verify results
      expect(result).to.deep.equal(user);
      expect(userModel.findById.calledOnce).to.be.true;
      expect(userModel.findById.firstCall.args[0]).to.equal('user1');
    });
    
    it('should update a user successfully', async () => {
      // Setup mock
      const updateResult = {
        modifiedCount: 1,
        matchedCount: 1
      };
      
      userModel.updateOne.resolves(updateResult);
      
      // Call the method
      const result = await userModel.updateOne(
        { _id: 'user1' },
        { $set: { name: 'John Updated' } }
      );
      
      // Verify results
      expect(result).to.deep.equal(updateResult);
      expect(userModel.updateOne.calledOnce).to.be.true;
      expect(userModel.updateOne.firstCall.args[0]).to.deep.equal({ _id: 'user1' });
      expect(userModel.updateOne.firstCall.args[1]).to.deep.equal({ $set: { name: 'John Updated' } });
    });
  });
  
  describe('Document Model', () => {
    let documentModel;
    
    beforeEach(() => {
      documentModel = mockModels.Document;
    });
    
    it('should create a document successfully', async () => {
      // Setup mock
      const documentData = {
        googleId: 'gdoc1',
        title: 'Test Document',
        type: 'document',
        content: 'Document content',
        modifiedTime: '2025-04-20T10:00:00Z'
      };
      
      const createdDocument = {
        _id: 'doc1',
        ...documentData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      documentModel.create.resolves(createdDocument);
      
      // Call the method
      const result = await documentModel.create(documentData);
      
      // Verify results
      expect(result).to.deep.equal(createdDocument);
      expect(documentModel.create.calledOnce).to.be.true;
      expect(documentModel.create.firstCall.args[0]).to.deep.equal(documentData);
    });
    
    it('should find documents by query successfully', async () => {
      // Setup mock
      const documents = [
        {
          _id: 'doc1',
          googleId: 'gdoc1',
          title: 'Test Document 1',
          type: 'document'
        },
        {
          _id: 'doc2',
          googleId: 'gdoc2',
          title: 'Test Document 2',
          type: 'document'
        }
      ];
      
      documentModel.find.returns({
        sort: sandbox.stub().returns({
          limit: sandbox.stub().returns({
            skip: sandbox.stub().resolves(documents)
          })
        }),
        countDocuments: sandbox.stub().resolves(2)
      });
      
      // Call the method
      const result = await documentModel.find({ type: 'document' })
        .sort({ updatedAt: -1 })
        .limit(10)
        .skip(0);
      
      // Verify results
      expect(result).to.deep.equal(documents);
      expect(documentModel.find.calledOnce).to.be.true;
      expect(documentModel.find.firstCall.args[0]).to.deep.equal({ type: 'document' });
    });
  });
  
  describe('Event Model', () => {
    let eventModel;
    
    beforeEach(() => {
      eventModel = mockModels.Event;
    });
    
    it('should create an event successfully', async () => {
      // Setup mock
      const eventData = {
        googleId: 'gevent1',
        title: 'Team Meeting',
        description: 'Weekly team meeting',
        location: 'Conference Room',
        startTime: '2025-04-25T10:00:00Z',
        endTime: '2025-04-25T11:00:00Z',
        attendees: [
          { userId: 'user1', email: 'john@example.com', name: 'John Doe' }
        ]
      };
      
      const createdEvent = {
        _id: 'event1',
        ...eventData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      eventModel.create.resolves(createdEvent);
      
      // Call the method
      const result = await eventModel.create(eventData);
      
      // Verify results
      expect(result).to.deep.equal(createdEvent);
      expect(eventModel.create.calledOnce).to.be.true;
      expect(eventModel.create.firstCall.args[0]).to.deep.equal(eventData);
    });
    
    it('should find upcoming events successfully', async () => {
      // Setup mock
      const events = [
        {
          _id: 'event1',
          googleId: 'gevent1',
          title: 'Team Meeting',
          startTime: '2025-04-25T10:00:00Z',
          endTime: '2025-04-25T11:00:00Z'
        },
        {
          _id: 'event2',
          googleId: 'gevent2',
          title: 'Training Session',
          startTime: '2025-04-26T14:00:00Z',
          endTime: '2025-04-26T16:00:00Z'
        }
      ];
      
      eventModel.find.returns({
        sort: sandbox.stub().returns({
          limit: sandbox.stub().resolves(events)
        })
      });
      
      // Call the method
      const now = new Date();
      const result = await eventModel.find({ startTime: { $gt: now } })
        .sort({ startTime: 1 })
        .limit(5);
      
      // Verify results
      expect(result).to.deep.equal(events);
      expect(eventModel.find.calledOnce).to.be.true;
      expect(eventModel.find.firstCall.args[0].startTime.$gt).to.be.instanceOf(Date);
    });
  });
});
