// User Model
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'player', 'coach', 'staff'],
    default: 'player'
  },
  playerInfo: {
    position: String,
    jerseyNumber: Number,
    joinDate: Date,
    status: {
      type: String,
      enum: ['active', 'injured', 'reserve', 'inactive'],
      default: 'active'
    }
  },
  googleId: {
    type: String,
    sparse: true
  },
  profilePicture: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: Date,
  preferences: {
    notificationSettings: {
      email: {
        type: Boolean,
        default: true
      },
      inApp: {
        type: Boolean,
        default: true
      }
    },
    timezone: {
      type: String,
      default: 'Africa/Harare'
    }
  }
}, {
  timestamps: true
});

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ googleId: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ 'playerInfo.status': 1 });

// Methods
UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.__v;
  return user;
};

UserSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

UserSchema.methods.isPlayer = function() {
  return this.role === 'player';
};

UserSchema.methods.isCoach = function() {
  return this.role === 'coach';
};

UserSchema.methods.isStaff = function() {
  return this.role === 'staff';
};

// Static methods
UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.findByGoogleId = function(googleId) {
  return this.findOne({ googleId });
};

UserSchema.statics.findAdmins = function() {
  return this.find({ role: 'admin' });
};

UserSchema.statics.findPlayers = function(status) {
  const query = { role: 'player' };
  if (status) {
    query['playerInfo.status'] = status;
  }
  return this.find(query);
};

UserSchema.statics.findCoaches = function() {
  return this.find({ role: 'coach' });
};

const User = mongoose.model('User', UserSchema);

module.exports = User;
