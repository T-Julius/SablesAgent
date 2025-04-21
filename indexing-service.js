// Indexing Service for Google Drive Documents
const { MongoClient } = require('mongodb');
const elasticsearch = require('@elastic/elasticsearch');

class IndexingService {
  constructor(options = {}) {
    this.mongoUrl = options.mongoUrl || 'mongodb://localhost:27017';
    this.dbName = options.dbName || 'rugby_docs_system';
    this.elasticUrl = options.elasticUrl || 'http://localhost:9200';
    this.elasticIndex = options.elasticIndex || 'rugby_documents';
    
    this.mongoClient = null;
    this.db = null;
    this.elasticClient = null;
  }

  /**
   * Initialize the indexing service
   * @return {Promise<void>}
   */
  async initialize() {
    try {
      // Connect to MongoDB
      this.mongoClient = new MongoClient(this.mongoUrl);
      await this.mongoClient.connect();
      this.db = this.mongoClient.db(this.dbName);
      
      // Connect to Elasticsearch
      this.elasticClient = new elasticsearch.Client({
        node: this.elasticUrl
      });
      
      // Create Elasticsearch index if it doesn't exist
      const indexExists = await this.elasticClient.indices.exists({
        index: this.elasticIndex
      });
      
      if (!indexExists.body) {
        await this.createElasticsearchIndex();
      }
      
      console.log('Indexing service initialized successfully');
    } catch (error) {
      console.error('Error initializing indexing service:', error);
      throw error;
    }
  }

  /**
   * Create Elasticsearch index with mapping
   * @return {Promise<void>}
   */
  async createElasticsearchIndex() {
    try {
      await this.elasticClient.indices.create({
        index: this.elasticIndex,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              content: { type: 'text' },
              mimeType: { type: 'keyword' },
              createdTime: { type: 'date' },
              modifiedTime: { type: 'date' },
              tags: { type: 'keyword' },
              category: { type: 'keyword' },
              playerReferences: { type: 'keyword' },
              folderPath: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              accessLevel: { type: 'keyword' }
            }
          }
        }
      });
      
      console.log(`Created Elasticsearch index: ${this.elasticIndex}`);
    } catch (error) {
      console.error('Error creating Elasticsearch index:', error);
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
      
      console.log('Indexing service closed successfully');
    } catch (error) {
      console.error('Error closing indexing service:', error);
    }
  }

  /**
   * Index a document in both MongoDB and Elasticsearch
   * @param {Object} document Document to index
   * @return {Promise<Object>} Indexed document
   */
  async indexDocument(document) {
    try {
      // Prepare document for MongoDB
      const mongoDocument = {
        googleDriveId: document.id,
        title: document.name,
        description: document.description || '',
        googleDriveLink: document.webViewLink,
        mimeType: document.mimeType,
        fileExtension: this.getFileExtension(document.name),
        size: document.size,
        createdBy: document.createdBy || null,
        createdAt: new Date(document.createdTime),
        updatedAt: new Date(document.modifiedTime),
        lastSyncedAt: new Date(),
        tags: document.metadata?.tags || [],
        category: document.category || this.determineCategory(document),
        accessLevel: document.accessLevel || 'team',
        allowedUsers: document.allowedUsers || [],
        version: document.version || 1,
        versionHistory: document.versionHistory || [{
          version: 1,
          updatedAt: new Date(document.modifiedTime),
          updatedBy: document.createdBy || null
        }],
        metadata: {
          playerRelated: document.metadata?.playerReferences?.length > 0,
          relatedPlayers: document.metadata?.playerReferences || [],
          eventRelated: document.metadata?.dateReferences?.length > 0,
          relatedEvents: [],
          documentType: this.determineDocumentType(document),
          customFields: document.metadata?.customFields || {}
        }
      };
      
      // Insert or update document in MongoDB
      const result = await this.db.collection('documents').updateOne(
        { googleDriveId: document.id },
        { $set: mongoDocument },
        { upsert: true }
      );
      
      // Prepare document for Elasticsearch
      const elasticDocument = {
        id: document.id,
        name: document.name,
        content: document.content || '',
        mimeType: document.mimeType,
        createdTime: document.createdTime,
        modifiedTime: document.modifiedTime,
        tags: document.metadata?.tags || [],
        category: document.category || this.determineCategory(document),
        playerReferences: document.metadata?.playerReferences || [],
        folderPath: document.folderPath || '',
        accessLevel: document.accessLevel || 'team'
      };
      
      // Index document in Elasticsearch
      await this.elasticClient.index({
        index: this.elasticIndex,
        id: document.id,
        body: elasticDocument
      });
      
      console.log(`Indexed document: ${document.name} (${document.id})`);
      
      return {
        id: document.id,
        mongoId: result.upsertedId,
        indexed: true
      };
    } catch (error) {
      console.error(`Error indexing document ${document.id}:`, error);
      throw error;
    }
  }

  /**
   * Bulk index multiple documents
   * @param {Array} documents Array of documents to index
   * @return {Promise<Object>} Indexing results
   */
  async bulkIndexDocuments(documents) {
    try {
      const results = {
        total: documents.length,
        successful: 0,
        failed: 0,
        errors: []
      };
      
      // Process documents in batches of 50
      const batchSize = 50;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        
        // Prepare MongoDB batch operations
        const mongoOps = batch.map(document => {
          const mongoDocument = {
            googleDriveId: document.id,
            title: document.name,
            description: document.description || '',
            googleDriveLink: document.webViewLink,
            mimeType: document.mimeType,
            fileExtension: this.getFileExtension(document.name),
            size: document.size,
            createdBy: document.createdBy || null,
            createdAt: new Date(document.createdTime),
            updatedAt: new Date(document.modifiedTime),
            lastSyncedAt: new Date(),
            tags: document.metadata?.tags || [],
            category: document.category || this.determineCategory(document),
            accessLevel: document.accessLevel || 'team',
            allowedUsers: document.allowedUsers || [],
            version: document.version || 1,
            versionHistory: document.versionHistory || [{
              version: 1,
              updatedAt: new Date(document.modifiedTime),
              updatedBy: document.createdBy || null
            }],
            metadata: {
              playerRelated: document.metadata?.playerReferences?.length > 0,
              relatedPlayers: document.metadata?.playerReferences || [],
              eventRelated: document.metadata?.dateReferences?.length > 0,
              relatedEvents: [],
              documentType: this.determineDocumentType(document),
              customFields: document.metadata?.customFields || {}
            }
          };
          
          return {
            updateOne: {
              filter: { googleDriveId: document.id },
              update: { $set: mongoDocument },
              upsert: true
            }
          };
        });
        
        // Execute MongoDB batch operation
        const mongoResult = await this.db.collection('documents').bulkWrite(mongoOps);
        
        // Prepare Elasticsearch bulk operations
        const elasticOps = [];
        for (const document of batch) {
          elasticOps.push(
            { index: { _index: this.elasticIndex, _id: document.id } },
            {
              id: document.id,
              name: document.name,
              content: document.content || '',
              mimeType: document.mimeType,
              createdTime: document.createdTime,
              modifiedTime: document.modifiedTime,
              tags: document.metadata?.tags || [],
              category: document.category || this.determineCategory(document),
              playerReferences: document.metadata?.playerReferences || [],
              folderPath: document.folderPath || '',
              accessLevel: document.accessLevel || 'team'
            }
          );
        }
        
        // Execute Elasticsearch bulk operation
        const elasticResult = await this.elasticClient.bulk({
          body: elasticOps
        });
        
        // Update results
        results.successful += mongoResult.upsertedCount + mongoResult.modifiedCount;
        
        if (elasticResult.errors) {
          for (const item of elasticResult.items) {
            if (item.index.error) {
              results.failed++;
              results.errors.push({
                id: item.index._id,
                error: item.index.error
              });
            }
          }
        }
        
        console.log(`Indexed batch of ${batch.length} documents`);
      }
      
      return results;
    } catch (error) {
      console.error('Error bulk indexing documents:', error);
      throw error;
    }
  }

  /**
   * Remove a document from both MongoDB and Elasticsearch
   * @param {string} documentId Google Drive document ID
   * @return {Promise<Object>} Removal results
   */
  async removeDocument(documentId) {
    try {
      // Remove from MongoDB
      const mongoResult = await this.db.collection('documents').deleteOne({
        googleDriveId: documentId
      });
      
      // Remove from Elasticsearch
      const elasticResult = await this.elasticClient.delete({
        index: this.elasticIndex,
        id: documentId
      });
      
      return {
        id: documentId,
        removed: {
          mongo: mongoResult.deletedCount > 0,
          elastic: elasticResult.result === 'deleted'
        }
      };
    } catch (error) {
      console.error(`Error removing document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Search for documents
   * @param {Object} query Search query parameters
   * @return {Promise<Object>} Search results
   */
  async searchDocuments(query) {
    try {
      const { searchText, filters = {}, page = 1, limit = 10 } = query;
      
      // Build Elasticsearch query
      const elasticQuery = {
        bool: {
          must: searchText ? {
            multi_match: {
              query: searchText,
              fields: ['name^3', 'content', 'folderPath']
            }
          } : {
            match_all: {}
          },
          filter: []
        }
      };
      
      // Add filters
      if (filters.mimeType) {
        elasticQuery.bool.filter.push({
          term: { mimeType: filters.mimeType }
        });
      }
      
      if (filters.category) {
        elasticQuery.bool.filter.push({
          term: { category: filters.category }
        });
      }
      
      if (filters.tags && filters.tags.length > 0) {
        elasticQuery.bool.filter.push({
          terms: { tags: filters.tags }
        });
      }
      
      if (filters.playerReferences && filters.playerReferences.length > 0) {
        elasticQuery.bool.filter.push({
          terms: { playerReferences: filters.playerReferences }
        });
      }
      
      if (filters.accessLevel) {
        elasticQuery.bool.filter.push({
          term: { accessLevel: filters.accessLevel }
        });
      }
      
      if (filters.dateRange) {
        const dateFilter = {
          range: {
            modifiedTime: {}
          }
        };
        
        if (filters.dateRange.start) {
          dateFilter.range.modifiedTime.gte = filters.dateRange.start;
        }
        
        if (filters.dateRange.end) {
          dateFilter.range.modifiedTime.lte = filters.dateRange.end;
        }
        
        elasticQuery.bool.filter.push(dateFilter);
      }
      
      // Execute search
      const result = await this.elasticClient.search({
        index: this.elasticIndex,
        body: {
          query: elasticQuery,
          highlight: {
            fields: {
              content: { fragment_size: 150, number_of_fragments: 3 },
              name: { fragment_size: 150, number_of_fragments: 1 }
            }
          },
          from: (page - 1) * limit,
          size: limit,
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
          name: hit._source.name,
          mimeType: hit._source.mimeType,
          modifiedTime: hit._source.modifiedTime,
          tags: hit._source.tags,
          category: hit._source.category,
          score: hit._score,
          highlights: hit.highlight || {},
          folderPath: hit._source.folderPath
        };
      });
      
      return {
        total: result.hits.total.value,
        page,
        limit,
        hits
      };
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  /**
   * Get file extension from filename
   * @param {string} filename Filename
   * @return {string} File extension
   */
  getFileExtension(filename) {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  }

  /**
   * Determine document category based on metadata
   * @param {Object} document Document object
   * @return {string} Document category
   */
  determineCategory(document) {
    // Check if category is explicitly set
    if (document.category) {
      return document.category;
    }
    
    // Check folder path for category hints
    if (document.folderPath) {
      const folderPath = document.folderPath.toLowerCase();
      
      if (folderPath.includes('contract') || folderPath.includes('agreement')) {
        return 'contracts';
      }
      
      if (folderPath.includes('medical') || folderPath.includes('health')) {
        return 'medical';
      }
      
      if (folderPath.includes('training') || folderPath.includes('practice')) {
        return 'training';
      }
      
      if (folderPath.includes('match') || folderPath.includes('game')) {
        return 'matches';
      }
      
      if (folderPath.includes('player') || folderPath.includes('roster')) {
        return 'players';
      }
      
      if (folderPath.includes('admin') || folderPath.includes('management')) {
        return 'administration';
      }
    }
    
    // Check document name for category hints
    const name = document.name.toLowerCase();
    
    if (name.includes('contract') || name.includes('agreement')) {
      return 'contracts';
    }
    
    if (name.includes('medical') || name.includes('health') || name.includes('injury')) {
      return 'medical';
    }
    
    if (name.includes('training') || name.includes('practice') || name.includes('drill')) {
      return 'training';
    }
    
    if (name.includes('match') || name.includes('game') || name.includes('vs')) {
      return 'matches';
    }
    
    if (name
(Content truncated due to size limit. Use line ranges to read in chunks)