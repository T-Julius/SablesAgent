// Document Model
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DocumentSchema = new Schema({
  googleDriveId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  googleDriveLink: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  fileExtension: {
    type: String,
    default: ''
  },
  size: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastSyncedAt: {
    type: Date,
    default: Date.now
  },
  tags: [String],
  category: {
    type: String,
    enum: ['contracts', 'medical', 'training', 'matches', 'players', 'administration', 'general'],
    default: 'general'
  },
  accessLevel: {
    type: String,
    enum: ['public', 'team', 'admin', 'specific'],
    default: 'team'
  },
  allowedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  version: {
    type: Number,
    default: 1
  },
  versionHistory: [{
    version: Number,
    updatedAt: Date,
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    googleDriveRevisionId: String
  }],
  metadata: {
    playerRelated: {
      type: Boolean,
      default: false
    },
    relatedPlayers: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    eventRelated: {
      type: Boolean,
      default: false
    },
    relatedEvents: [{
      type: Schema.Types.ObjectId,
      ref: 'Event'
    }],
    documentType: {
      type: String,
      enum: ['contract', 'medical', 'performance', 'training', 'match', 'administrative', 'other'],
      default: 'other'
    },
    customFields: {
      type: Map,
      of: Schema.Types.Mixed
    }
  },
  contentIndex: String
}, {
  timestamps: true
});

// Indexes
DocumentSchema.index({ googleDriveId: 1 });
DocumentSchema.index({ title: 'text', contentIndex: 'text' });
DocumentSchema.index({ tags: 1 });
DocumentSchema.index({ category: 1 });
DocumentSchema.index({ accessLevel: 1 });
DocumentSchema.index({ 'metadata.relatedPlayers': 1 });
DocumentSchema.index({ 'metadata.documentType': 1 });

// Methods
DocumentSchema.methods.toJSON = function() {
  const document = this.toObject();
  delete document.__v;
  return document;
};

DocumentSchema.methods.isAccessibleBy = function(user) {
  if (!user) return this.accessLevel === 'public';
  if (user.isAdmin()) return true;
  if (this.accessLevel === 'public' || this.accessLevel === 'team') return true;
  if (this.createdBy && this.createdBy.toString() === user._id.toString()) return true;
  if (this.accessLevel === 'specific') {
    return this.allowedUsers.some(userId => userId.toString() === user._id.toString());
  }
  return false;
};

DocumentSchema.methods.addVersion = function(updatedBy, revisionId) {
  this.version += 1;
  this.versionHistory.push({
    version: this.version,
    updatedAt: new Date(),
    updatedBy,
    googleDriveRevisionId: revisionId
  });
  return this.version;
};

// Static methods
DocumentSchema.statics.findByGoogleDriveId = function(googleDriveId) {
  return this.findOne({ googleDriveId });
};

DocumentSchema.statics.findByCategory = function(category) {
  return this.find({ category });
};

DocumentSchema.statics.findByTags = function(tags) {
  return this.find({ tags: { $in: tags } });
};

DocumentSchema.statics.findByPlayer = function(playerId) {
  return this.find({ 'metadata.relatedPlayers': playerId });
};

DocumentSchema.statics.findAccessibleByUser = function(user) {
  if (!user) return this.find({ accessLevel: 'public' });
  
  if (user.isAdmin()) return this.find({});
  
  return this.find({
    $or: [
      { accessLevel: 'public' },
      { accessLevel: 'team' },
      { createdBy: user._id },
      { accessLevel: 'specific', allowedUsers: user._id }
    ]
  });
};

DocumentSchema.statics.search = function(query, user) {
  const textQuery = { $text: { $search: query } };
  
  if (!user) {
    return this.find({
      ...textQuery,
      accessLevel: 'public'
    }).sort({ score: { $meta: 'textScore' } });
  }
  
  if (user.isAdmin()) {
    return this.find(textQuery).sort({ score: { $meta: 'textScore' } });
  }
  
  return this.find({
    ...textQuery,
    $or: [
      { accessLevel: 'public' },
      { accessLevel: 'team' },
      { createdBy: user._id },
      { accessLevel: 'specific', allowedUsers: user._id }
    ]
  }).sort({ score: { $meta: 'textScore' } });
};

const Document = mongoose.model('Document', DocumentSchema);

module.exports = Document;
