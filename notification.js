// Notification Model
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['document', 'event', 'system'],
    default: 'system'
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'dismissed'],
    default: 'unread'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  readAt: Date,
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  relatedDocument: {
    type: Schema.Types.ObjectId,
    ref: 'Document'
  },
  relatedEvent: {
    type: Schema.Types.ObjectId,
    ref: 'Event'
  },
  actionUrl: String
}, {
  timestamps: true
});

// Indexes
NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ status: 1 });
NotificationSchema.index({ createdAt: 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ priority: 1 });

// Methods
NotificationSchema.methods.toJSON = function() {
  const notification = this.toObject();
  delete notification.__v;
  return notification;
};

NotificationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

NotificationSchema.methods.dismiss = function() {
  this.status = 'dismissed';
  return this.save();
};

// Static methods
NotificationSchema.statics.findByUser = function(userId, status) {
  const query = { userId };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

NotificationSchema.statics.findUnreadByUser = function(userId) {
  return this.find({
    userId,
    status: 'unread'
  }).sort({ priority: -1, createdAt: -1 });
};

NotificationSchema.statics.countUnreadByUser = function(userId) {
  return this.countDocuments({
    userId,
    status: 'unread'
  });
};

NotificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { userId, status: 'unread' },
    { 
      $set: { 
        status: 'read',
        readAt: new Date()
      } 
    }
  );
};

NotificationSchema.statics.createDocumentNotification = function(userId, document, action) {
  let title, message;
  
  switch (action) {
    case 'created':
      title = 'New Document Added';
      message = `A new document "${document.title}" has been added.`;
      break;
    case 'updated':
      title = 'Document Updated';
      message = `The document "${document.title}" has been updated.`;
      break;
    case 'shared':
      title = 'Document Shared With You';
      message = `The document "${document.title}" has been shared with you.`;
      break;
    default:
      title = 'Document Notification';
      message = `Notification about document "${document.title}".`;
  }
  
  return this.create({
    userId,
    title,
    message,
    type: 'document',
    relatedDocument: document._id
  });
};

NotificationSchema.statics.createEventNotification = function(userId, event, action) {
  let title, message;
  
  switch (action) {
    case 'created':
      title = 'New Event Scheduled';
      message = `A new event "${event.title}" has been scheduled for ${new Date(event.startTime).toLocaleString()}.`;
      break;
    case 'updated':
      title = 'Event Updated';
      message = `The event "${event.title}" has been updated.`;
      break;
    case 'reminder':
      title = 'Event Reminder';
      message = `Reminder: "${event.title}" starts at ${new Date(event.startTime).toLocaleString()}.`;
      break;
    default:
      title = 'Event Notification';
      message = `Notification about event "${event.title}".`;
  }
  
  return this.create({
    userId,
    title,
    message,
    type: 'event',
    relatedEvent: event._id
  });
};

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;
