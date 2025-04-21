// Search Query Model
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SearchQuerySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  query: {
    type: String,
    required: true
  },
  filters: Schema.Types.Mixed,
  resultCount: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  executionTimeMs: {
    type: Number,
    default: 0
  },
  clickedResults: [{
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document'
    },
    position: Number
  }]
}, {
  timestamps: false
});

// Indexes
SearchQuerySchema.index({ userId: 1 });
SearchQuerySchema.index({ timestamp: 1 });
SearchQuerySchema.index({ query: 'text' });

// Methods
SearchQuerySchema.methods.toJSON = function() {
  const searchQuery = this.toObject();
  delete searchQuery.__v;
  return searchQuery;
};

SearchQuerySchema.methods.addClickedResult = function(documentId, position) {
  this.clickedResults.push({
    documentId,
    position
  });
  return this.save();
};

// Static methods
SearchQuerySchema.statics.findByUser = function(userId) {
  return this.find({ userId }).sort({ timestamp: -1 });
};

SearchQuerySchema.statics.findPopularQueries = function(limit = 10) {
  return this.aggregate([
    { $group: { _id: '$query', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
};

SearchQuerySchema.statics.findQueriesWithNoResults = function() {
  return this.find({ resultCount: 0 }).sort({ timestamp: -1 });
};

const SearchQuery = mongoose.model('SearchQuery', SearchQuerySchema);

module.exports = SearchQuery;
