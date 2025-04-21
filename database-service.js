// Database Service - Main interface for database operations
const DatabaseManager = require('./database-manager');
const User = require('./models/user');
const Document = require('./models/document');
const Event = require('./models/event');
const Notification = require('./models/notification');
const AuditLog = require('./models/audit-log');
const Folder = require('./models/folder');
const SearchQuery = require('./models/search-query');
const AgentConversation = require('./models/agent-conversation');

class DatabaseService {
  constructor(options = {}) {
    this.dbManager = new DatabaseManager(options);
    this.initialized = false;
  }

  /**
   * Initialize the database service
   * @return {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    
    await this.dbManager.initialize();
    this.initialized = true;
    console.log('Database service initialized');
  }

  /**
   * Close database connections
   * @return {Promise<void>}
   */
  async close() {
    if (!this.initialized) {
      return;
    }
    
    await this.dbManager.close();
    this.initialized = false;
    console.log('Database service closed');
  }

  /**
   * Get Mongoose models
   * @return {Object} Object containing all models
   */
  getModels() {
    return {
      User,
      Document,
      Event,
      Notification,
      AuditLog,
      Folder,
      SearchQuery,
      AgentConversation
    };
  }

  /**
   * Get MongoDB native client
   * @return {MongoClient} MongoDB client
   */
  getMongoClient() {
    return this.dbManager.getMongoClient();
  }

  /**
   * Get Elasticsearch client
   * @return {Client} Elasticsearch client
   */
  getElasticClient() {
    return this.dbManager.getElasticClient();
  }

  /**
   * Log an audit event
   * @param {Object} data Audit log data
   * @return {Promise<Object>} Created audit log
   */
  async logAudit(data) {
    return AuditLog.logAction(data);
  }

  /**
   * Search documents using Elasticsearch
   * @param {Object} query Search parameters
   * @param {Object} user Current user
   * @return {Promise<Object>} Search results
   */
  async searchDocuments(query, user) {
    try {
      const startTime = Date.now();
      const elasticClient = this.dbManager.getElasticClient();
      
      // Build Elasticsearch query
      const elasticQuery = {
        bool: {
          must: query.searchText ? {
            multi_match: {
              query: query.searchText,
              fields: ['title^3', 'content', 'description^2']
            }
          } : {
            match_all: {}
          },
          filter: []
        }
      };
      
      // Add access control filter
      if (!user || !user.isAdmin()) {
        const accessFilter = {
          bool: {
            should: [
              { term: { accessLevel: 'public' } }
            ]
          }
        };
        
        if (user) {
          accessFilter.bool.should.push({ term: { accessLevel: 'team' } });
          
          // Add specific access filter if we have user ID
          if (user._id) {
            accessFilter.bool.should.push({
              bool: {
                must: [
                  { term: { accessLevel: 'specific' } },
                  { term: { allowedUsers: user._id.toString() } }
                ]
              }
            });
          }
        }
        
        elasticQuery.bool.filter.push(accessFilter);
      }
      
      // Add other filters
      if (query.filters) {
        if (query.filters.mimeType) {
          elasticQuery.bool.filter.push({
            term: { mimeType: query.filters.mimeType }
          });
        }
        
        if (query.filters.category) {
          elasticQuery.bool.filter.push({
            term: { category: query.filters.category }
          });
        }
        
        if (query.filters.tags && query.filters.tags.length > 0) {
          elasticQuery.bool.filter.push({
            terms: { tags: query.filters.tags }
          });
        }
        
        if (query.filters.playerReferences && query.filters.playerReferences.length > 0) {
          elasticQuery.bool.filter.push({
            terms: { playerReferences: query.filters.playerReferences }
          });
        }
        
        if (query.filters.dateRange) {
          const dateFilter = {
            range: {
              modifiedTime: {}
            }
          };
          
          if (query.filters.dateRange.start) {
            dateFilter.range.modifiedTime.gte = query.filters.dateRange.start;
          }
          
          if (query.filters.dateRange.end) {
            dateFilter.range.modifiedTime.lte = query.filters.dateRange.end;
          }
          
          elasticQuery.bool.filter.push(dateFilter);
        }
      }
      
      // Execute search
      const result = await elasticClient.search({
        index: this.dbManager.elasticIndex,
        body: {
          query: elasticQuery,
          highlight: {
            fields: {
              content: { fragment_size: 150, number_of_fragments: 3 },
              title: { fragment_size: 150, number_of_fragments: 1 },
              description: { fragment_size: 150, number_of_fragments: 2 }
            }
          },
          from: (query.page - 1) * query.limit || 0,
          size: query.limit || 10,
          sort: [
            { _score: { order: 'desc' } },
            { modifiedTime: { order: 'desc' } }
          ]
        }
      });
      
      // Format results
      const hits = result.hits.hits.map(hit => {
        return {
          id: hit._source.id,
          title: hit._source.title,
          description: hit._source.description,
          mimeType: hit._source.mimeType,
          modifiedTime: hit._source.modifiedTime,
          tags: hit._source.tags,
          category: hit._source.category,
          score: hit._score,
          highlights: hit.highlight || {},
          folderPath: hit._source.folderPath
        };
      });
      
      const executionTime = Date.now() - startTime;
      
      // Log search query if user is provided
      if (user && user._id) {
        await SearchQuery.create({
          userId: user._id,
          query: query.searchText || '',
          filters: query.filters || {},
          resultCount: result.hits.total.value,
          timestamp: new Date(),
          executionTimeMs: executionTime
        });
      }
      
      return {
        total: result.hits.total.value,
        page: query.page || 1,
        limit: query.limit || 10,
        hits,
        executionTimeMs: executionTime
      };
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  /**
   * Create notification for multiple users
   * @param {Array} userIds Array of user IDs
   * @param {Object} notificationData Notification data
   * @return {Promise<Array>} Created notifications
   */
  async createNotifications(userIds, notificationData) {
    const notifications = [];
    
    for (const userId of userIds) {
      try {
        const notification = await Notification.create({
          userId,
          ...notificationData
        });
        
        notifications.push(notification);
      } catch (error) {
        console.error(`Error creating notification for user ${userId}:`, error);
      }
    }
    
    return notifications;
  }

  /**
   * Get document with related data
   * @param {string} documentId Document ID
   * @param {Object} options Query options
   * @return {Promise<Object>} Document with related data
   */
  async getDocumentWithRelated(documentId, options = {}) {
    const document = await Document.findById(documentId);
    
    if (!document) {
      return null;
    }
    
    // Populate related data
    if (options.populateCreatedBy) {
      await document.populate('createdBy', 'name email role');
    }
    
    if (options.populateAllowedUsers) {
      await document.populate('allowedUsers', 'name email role');
    }
    
    if (options.populateRelatedPlayers) {
      await document.populate('metadata.relatedPlayers', 'name email playerInfo');
    }
    
    if (options.populateRelatedEvents) {
      await document.populate('metadata.relatedEvents', 'title startTime endTime');
    }
    
    if (options.populateVersionHistory && document.versionHistory.length > 0) {
      await document.populate('versionHistory.updatedBy', 'name email');
    }
    
    return document;
  }

  /**
   * Get event with related data
   * @param {string} eventId Event ID
   * @param {Object} options Query options
   * @return {Promise<Object>} Event with related data
   */
  async getEventWithRelated(eventId, options = {}) {
    const event = await Event.findById(eventId);
    
    if (!event) {
      return null;
    }
    
    // Populate related data
    if (options.populateCreatedBy) {
      await event.populate('createdBy', 'name email role');
    }
    
    if (options.populateAttendees && event.attendees.length > 0) {
      await event.populate('attendees.userId', 'name email role');
    }
    
    if (options.populateRelatedDocuments && event.relatedDocuments.length > 0) {
      await event.populate('relatedDocuments', 'title googleDriveLink');
    }
    
    return event;
  }

  /**
   * Get user statistics
   * @param {string} userId User ID
   * @return {Promise<Object>} User statistics
   */
  async getUserStatistics(userId) {
    const user = await User.findById(userId);
    
    if (!user) {
      return null;
    }
    
    // Get document counts
    const documentCount = await Document.countDocuments({
      $or: [
        { createdBy: userId },
        { allowedUsers: userId },
        { accessLevel: 'team' }
      ]
    });
    
    // Get event counts
    const eventCount = await Event.countDocuments({
      'attendees.userId': userId
    });
    
    // Get upcoming events
    const upcomingEvents = await Event.find({
      'attendees.userId': userId,
      startTime: { $gte: new Date() }
    }).sort({ startTime: 1 }).limit(5);
    
    // Get unread notification count
    const unreadNotificationCount = await Notification.countDocuments({
      userId,
      status: 'unread'
    });
    
    // Get recent documents
    const recentDocuments = await Document.find({
      $or: [
        { createdBy: userId },
        { allowedUsers: userId },
        { accessLevel: 'team' }
      ]
    }).sort({ updatedAt: -1 }).limit(5);
    
    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      documentCount,
      eventCount,
      unreadNotificationCount,
      upcomingEvents,
      recentDocuments
    };
  }

  /**
   * Get system statistics
   * @return {Promise<Object>} System statistics
   */
  async getSystemStatistics() {
    // Get user counts
    const userCount = await User.countDocuments();
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    // Get document counts
    const documentCount = await Document.countDocuments();
    const documentsByCategory = await Document.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    // Get event counts
    const eventCount = await Event.countDocuments();
    const upcomingEventCount = await Event.countDocuments({
      startTime: { $gte: new Date() }
    });
    const eventsByType = await Event.aggregate([
      { $group: { _id: '$eventType', count: { $sum: 1 } } }
    ]);
    
    // Get storage stats
    const storageStats = await Document.aggregate([
      { $group: { _id: null, totalSize: { $sum: '$size' }, count: { $sum: 1 } } }
    ]);
    
    // Get activity stats
    const searchCount = await SearchQuery.countDocuments();
    const conversationCount = await AgentConversation.countDocuments();
    
    return {
      users: {
        total: userCount,
        byRole: Object.fromEntries(usersByRole.map(item => [item._id, item.count]))
      },
      documents: {
        total: documentCount,
        byCategory: Object.fromEntries(documentsByCategory.map(item => [item._id, item.count]))
      },
      events: {
        total: eventCount,
        upcoming: upcomingEventCount,
        byType: Object.fromEntries(eventsByType.map(item => [item._id, item.count]))
      },
      storage: storageStats.length > 0 ? {
        totalSize: storageStats[0].totalSize,
        documentCount: storageStats[0].count
      } : {
        totalSize: 0,
        documentCount: 0
      },
      activity: {
        searches: searchCount,
        conversations: conversationCount
      }
    };
  }
}

module.exports = DatabaseService;
