// Event Model
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EventSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    default: ''
  },
  googleCalendarId: String,
  googleEventId: String,
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
  attendees: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    email: String,
    status: {
      type: String,
      enum: ['accepted', 'declined', 'pending'],
      default: 'pending'
    },
    notified: {
      type: Boolean,
      default: false
    }
  }],
  eventType: {
    type: String,
    enum: ['match', 'training', 'meeting', 'medical', 'social', 'other'],
    default: 'other'
  },
  relatedDocuments: [{
    type: Schema.Types.ObjectId,
    ref: 'Document'
  }],
  recurring: {
    type: Boolean,
    default: false
  },
  recurrenceRule: String,
  reminders: [{
    time: Number, // minutes before event
    type: {
      type: String,
      enum: ['email', 'notification'],
      default: 'notification'
    },
    sent: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Indexes
EventSchema.index({ startTime: 1 });
EventSchema.index({ endTime: 1 });
EventSchema.index({ 'attendees.userId': 1 });
EventSchema.index({ eventType: 1 });
EventSchema.index({ googleEventId: 1 });

// Methods
EventSchema.methods.toJSON = function() {
  const event = this.toObject();
  delete event.__v;
  return event;
};

EventSchema.methods.isAttendee = function(userId) {
  return this.attendees.some(attendee => 
    attendee.userId && attendee.userId.toString() === userId.toString()
  );
};

EventSchema.methods.updateAttendeeStatus = function(userId, status) {
  const attendee = this.attendees.find(a => 
    a.userId && a.userId.toString() === userId.toString()
  );
  
  if (attendee) {
    attendee.status = status;
    return true;
  }
  
  return false;
};

EventSchema.methods.addReminder = function(time, type = 'notification') {
  this.reminders.push({
    time,
    type,
    sent: false
  });
};

// Static methods
EventSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    $or: [
      { startTime: { $gte: startDate, $lte: endDate } },
      { endTime: { $gte: startDate, $lte: endDate } },
      {
        $and: [
          { startTime: { $lte: startDate } },
          { endTime: { $gte: endDate } }
        ]
      }
    ]
  }).sort({ startTime: 1 });
};

EventSchema.statics.findByUser = function(userId) {
  return this.find({
    'attendees.userId': userId
  }).sort({ startTime: 1 });
};

EventSchema.statics.findUpcoming = function(limit = 10) {
  return this.find({
    startTime: { $gte: new Date() }
  }).sort({ startTime: 1 }).limit(limit);
};

EventSchema.statics.findByType = function(eventType) {
  return this.find({ eventType }).sort({ startTime: 1 });
};

EventSchema.statics.findByGoogleEventId = function(googleEventId) {
  return this.findOne({ googleEventId });
};

const Event = mongoose.model('Event', EventSchema);

module.exports = Event;
