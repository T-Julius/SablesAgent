// Change Processor for Google Drive
const { MongoClient } = require('mongodb');

class ChangeProcessor {
  constructor(options = {}) {
    this.driveClient = options.driveClient;
    this.contentExtractor = options.contentExtractor;
    this.indexingService = options.indexingService;
    this.mongoUrl = options.mongoUrl || 'mongodb://localhost:27017';
    this.dbName = options.dbName || 'rugby_docs_system';
    
    this.mongoClient = null;
    this.db = null;
  }

  /**
   * Initialize the change processor
   * @return {Promise<void>}
   */
  async initialize() {
    try {
      // Connect to MongoDB
      this.mongoClient = new MongoClient(this.mongoUrl);
      await this.mongoClient.connect();
      this.db = this.mongoClient.db(this.dbName);
      
      console.log('Change processor initialized successfully');
    } catch (error) {
      console.error('Error initializing change processor:', error);
      throw error;
    }
  }

  /**
   * Close connections
   * @return {Promise<void>}
   */
  async close() {
    try {
      if (this.mongoClient) {
        await this.mongoClient.close();
      }
      
      console.log('Change processor closed successfully');
    } catch (error) {
      console.error('Error closing change processor:', error);
    }
  }

  /**
   * Process a resource change
   * @param {string} resourceId Resource ID (file ID)
   * @param {Object} resourceData Optional resource data
   * @return {Promise<Object>} Processing result
   */
  async processResourceChange(resourceId, resourceData = null) {
    try {
      console.log(`Processing change for resource ${resourceId}`);
      
      // Record change in audit log
      await this.recordChange(resourceId, 'change');
      
      // Get file metadata if not provided
      let fileMetadata = resourceData;
      if (!fileMetadata) {
        try {
          fileMetadata = await this.driveClient.getFile(resourceId);
        } catch (error) {
          console.error(`Error getting metadata for file ${resourceId}:`, error);
          // If we can't get metadata, we can't process the change
          return { success: false, error: 'Failed to get file metadata' };
        }
      }
      
      // Check if this is a Google Docs/Sheets document we should process
      const supportedMimeTypes = [
        'application/vnd.google-apps.document',
        'application/vnd.google-apps.spreadsheet',
        'application/vnd.google-apps.presentation'
      ];
      
      if (!supportedMimeTypes.includes(fileMetadata.mimeType)) {
        console.log(`Skipping file ${resourceId} with unsupported MIME type: ${fileMetadata.mimeType}`);
        return { success: true, skipped: true, reason: 'Unsupported MIME type' };
      }
      
      // Extract content
      let content = null;
      if (this.contentExtractor) {
        try {
          const extractionResult = await this.contentExtractor.extractContent(
            resourceId,
            fileMetadata.mimeType,
            'text'
          );
          content = extractionResult.content;
          fileMetadata.metadata = extractionResult.metadata;
        } catch (error) {
          console.error(`Error extracting content from file ${resourceId}:`, error);
          // Continue with indexing even if content extraction fails
        }
      }
      
      // Index the document
      if (this.indexingService) {
        try {
          const indexResult = await this.indexingService.indexDocument({
            ...fileMetadata,
            content
          });
          
          console.log(`Indexed document ${resourceId}`);
          return { success: true, indexed: true, id: resourceId };
        } catch (error) {
          console.error(`Error indexing document ${resourceId}:`, error);
          return { success: false, error: 'Failed to index document' };
        }
      } else {
        console.warn('No indexing service configured for change processor');
        return { success: true, indexed: false, reason: 'No indexing service' };
      }
    } catch (error) {
      console.error(`Error processing change for resource ${resourceId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process a resource removal
   * @param {string} resourceId Resource ID (file ID)
   * @return {Promise<Object>} Processing result
   */
  async processResourceRemoval(resourceId) {
    try {
      console.log(`Processing removal for resource ${resourceId}`);
      
      // Record change in audit log
      await this.recordChange(resourceId, 'remove');
      
      // Remove from index
      if (this.indexingService) {
        try {
          const removeResult = await this.indexingService.removeDocument(resourceId);
          
          console.log(`Removed document ${resourceId} from index`);
          return { success: true, removed: true, id: resourceId };
        } catch (error) {
          console.error(`Error removing document ${resourceId} from index:`, error);
          return { success: false, error: 'Failed to remove document from index' };
        }
      } else {
        console.warn('No indexing service configured for change processor');
        return { success: true, removed: false, reason: 'No indexing service' };
      }
    } catch (error) {
      console.error(`Error processing removal for resource ${resourceId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process a resource exists notification
   * @param {string} resourceId Resource ID (file ID)
   * @return {Promise<Object>} Processing result
   */
  async processResourceExists(resourceId) {
    try {
      console.log(`Processing exists notification for resource ${resourceId}`);
      
      // Record change in audit log
      await this.recordChange(resourceId, 'exists');
      
      // Check if document is already indexed
      const document = await this.db.collection('documents').findOne({
        googleDriveId: resourceId
      });
      
      if (document) {
        console.log(`Document ${resourceId} already exists in index`);
        return { success: true, exists: true, id: resourceId };
      } else {
        // Document doesn't exist in our index, process it as a change
        return await this.processResourceChange(resourceId);
      }
    } catch (error) {
      console.error(`Error processing exists notification for resource ${resourceId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record a change in the audit log
   * @param {string} resourceId Resource ID (file ID)
   * @param {string} changeType Type of change (change, remove, exists)
   * @return {Promise<void>}
   */
  async recordChange(resourceId, changeType) {
    try {
      await this.db.collection('auditLogs').insertOne({
        resourceType: 'document',
        resourceId,
        action: `drive_${changeType}`,
        timestamp: new Date(),
        details: {
          source: 'google_drive',
          changeType
        }
      });
    } catch (error) {
      console.error(`Error recording change in audit log for ${resourceId}:`, error);
      // Continue processing even if audit logging fails
    }
  }
}

module.exports = ChangeProcessor;
