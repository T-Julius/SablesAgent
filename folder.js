// Folder Model
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FolderSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  googleDriveId: {
    type: String,
    required: true,
    unique: true
  },
  parentFolder: {
    type: Schema.Types.ObjectId,
    ref: 'Folder'
  },
  path: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  accessLevel: {
    type: String,
    enum: ['public', 'team', 'admin', 'specific'],
    default: 'team'
  },
  allowedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Indexes
FolderSchema.index({ googleDriveId: 1 });
FolderSchema.index({ parentFolder: 1 });
FolderSchema.index({ path: 1 });
FolderSchema.index({ accessLevel: 1 });

// Methods
FolderSchema.methods.toJSON = function() {
  const folder = this.toObject();
  delete folder.__v;
  return folder;
};

FolderSchema.methods.isAccessibleBy = function(user) {
  if (!user) return this.accessLevel === 'public';
  if (user.isAdmin()) return true;
  if (this.accessLevel === 'public' || this.accessLevel === 'team') return true;
  if (this.accessLevel === 'specific') {
    return this.allowedUsers.some(userId => userId.toString() === user._id.toString());
  }
  return false;
};

// Static methods
FolderSchema.statics.findByGoogleDriveId = function(googleDriveId) {
  return this.findOne({ googleDriveId });
};

FolderSchema.statics.findByPath = function(path) {
  return this.findOne({ path });
};

FolderSchema.statics.findChildren = function(folderId) {
  return this.find({ parentFolder: folderId });
};

FolderSchema.statics.findRootFolders = function() {
  return this.find({ parentFolder: null });
};

FolderSchema.statics.findAccessibleByUser = function(user) {
  if (!user) return this.find({ accessLevel: 'public' });
  
  if (user.isAdmin()) return this.find({});
  
  return this.find({
    $or: [
      { accessLevel: 'public' },
      { accessLevel: 'team' },
      { accessLevel: 'specific', allowedUsers: user._id }
    ]
  });
};

const Folder = mongoose.model('Folder', FolderSchema);

module.exports = Folder;
