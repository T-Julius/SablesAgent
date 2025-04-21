// AuditLog Model
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AuditLogSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  action: {
    type: String,
    required: true,
    enum: [
      'create', 'read', 'update', 'delete', 
      'login', 'logout', 'share', 'download',
      'search', 'export', 'import', 'sync',
      'permission_change', 'system_config'
    ]
  },
  resourceType: {
    type: String,
    required: true,
    enum: ['document', 'user', 'event', 'notification', 'system']
  },
  resourceId: Schema.Types.ObjectId,
  details: Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

// Indexes
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ resourceType: 1 });
AuditLogSchema.index({ resourceId: 1 });
AuditLogSchema.index({ timestamp: 1 });

// Methods
AuditLogSchema.methods.toJSON = function() {
  const auditLog = this.toObject();
  delete auditLog.__v;
  return auditLog;
};

// Static methods
AuditLogSchema.statics.logAction = function(data) {
  return this.create(data);
};

AuditLogSchema.statics.findByUser = function(userId) {
  return this.find({ userId }).sort({ timestamp: -1 });
};

AuditLogSchema.statics.findByAction = function(action) {
  return this.find({ action }).sort({ timestamp: -1 });
};

AuditLogSchema.statics.findByResource = function(resourceType, resourceId) {
  return this.find({
    resourceType,
    resourceId
  }).sort({ timestamp: -1 });
};

AuditLogSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ timestamp: -1 });
};

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

module.exports = AuditLog;
