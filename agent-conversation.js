// Agent Conversation Model
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AgentConversationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: Date,
  messages: [{
    sender: {
      type: String,
      enum: ['user', 'agent'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    relatedDocuments: [{
      type: Schema.Types.ObjectId,
      ref: 'Document'
    }],
    relatedEvents: [{
      type: Schema.Types.ObjectId,
      ref: 'Event'
    }],
    actions: [{
      type: {
        type: String,
        enum: [
          'document_retrieval', 
          'email_send', 
          'event_create', 
          'event_update',
          'notification_create',
          'search'
        ]
      },
      details: Schema.Types.Mixed,
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  context: Schema.Types.Mixed,
  intent: String,
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Indexes
AgentConversationSchema.index({ userId: 1 });
AgentConversationSchema.index({ startedAt: 1 });
AgentConversationSchema.index({ status: 1 });
AgentConversationSchema.index({ 'messages.relatedDocuments': 1 });
AgentConversationSchema.index({ 'messages.relatedEvents': 1 });

// Methods
AgentConversationSchema.methods.toJSON = function() {
  const conversation = this.toObject();
  delete conversation.__v;
  return conversation;
};

AgentConversationSchema.methods.addUserMessage = function(content) {
  this.messages.push({
    sender: 'user',
    content,
    timestamp: new Date()
  });
  return this.save();
};

AgentConversationSchema.methods.addAgentMessage = function(content, relatedDocuments = [], relatedEvents = [], actions = []) {
  this.messages.push({
    sender: 'agent',
    content,
    timestamp: new Date(),
    relatedDocuments,
    relatedEvents,
    actions
  });
  return this.save();
};

AgentConversationSchema.methods.complete = function() {
  this.status = 'completed';
  this.endedAt = new Date();
  return this.save();
};

AgentConversationSchema.methods.archive = function() {
  this.status = 'archived';
  if (!this.endedAt) {
    this.endedAt = new Date();
  }
  return this.save();
};

// Static methods
AgentConversationSchema.statics.findByUser = function(userId, status) {
  const query = { userId };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query).sort({ startedAt: -1 });
};

AgentConversationSchema.statics.findActive = function(userId) {
  return this.findOne({
    userId,
    status: 'active'
  }).sort({ startedAt: -1 });
};

AgentConversationSchema.statics.createNewConversation = function(userId) {
  return this.create({
    userId,
    startedAt: new Date(),
    messages: [],
    status: 'active'
  });
};

const AgentConversation = mongoose.model('AgentConversation', AgentConversationSchema);

module.exports = AgentConversation;
