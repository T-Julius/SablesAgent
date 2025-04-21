// Database Connection Manager
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const elasticsearch = require('@elastic/elasticsearch');

class DatabaseManager {
  constructor(options = {}) {
    this.mongoUrl = options.mongoUrl || process.env.MONGO_URL || 'mongodb://localhost:27017/rugby_docs_system';
    this.elasticUrl = options.elasticUrl || process.env.ELASTIC_URL || 'http://localhost:9200';
    this.elasticIndex = options.elasticIndex || 'rugby_documents';
    
    this.mongooseConnection = null;
    this.mongoClient = null;
    this.elasticClient = null;
    this.isConnected = false;
  }

  /**
   * Initialize database connections
   * @return {Promise<void>}
   */
  async initialize() {
    try {
      // Connect to MongoDB with Mongoose
      await mongoose.connect(this.mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      this.mongooseConnection = mongoose.connection;
      console.log('Connected to MongoDB with Mongoose');
      
      // Connect with MongoDB native client
      this.mongoClient = new MongoClient(this.mongoUrl);
      await this.mongoClient.connect();
      console.log('Connected to MongoDB with native client');
      
      // Connect to Elasticsearch
      this.elasticClient = new elasticsearch.Client({
        node: this.elasticUrl
      });
      
      // Check Elasticsearch connection
      const elasticInfo = await this.elasticClient.info();
      console.log(`Connected to Elasticsearch ${elasticInfo.body.version.number}`);
      
      // Create Elasticsearch index if it doesn't exist
      const indexExists = await this.elasticClient.indices.exists({
        index: this.elasticIndex
      });
      
      if (!indexExists.body) {
        await this.createElasticsearchIndex();
      }
      
      this.isConnected = true;
      console.log('Database connections initialized successfully');
    } catch (error) {
      console.error('Error initializing database connections:', error);
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
              title: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              content: { type: 'text' },
              description: { type: 'text' },
              mimeType: { type: 'keyword' },
              createdTime: { type: 'date' },
              modifiedTime: { type: 'date' },
              tags: { type: 'keyword' },
              category: { type: 'keyword' },
              playerReferences: { type: 'keyword' },
              folderPath: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              accessLevel: { type: 'keyword' },
              documentType: { type: 'keyword' }
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
   * Close database connections
   * @return {Promise<void>}
   */
  async close() {
    try {
      if (this.mongooseConnection) {
        await mongoose.disconnect();
      }
      
      if (this.mongoClient) {
        await this.mongoClient.close();
      }
      
      this.isConnected = false;
      console.log('Database connections closed');
    } catch (error) {
      console.error('Error closing database connections:', error);
    }
  }

  /**
   * Get Mongoose connection
   * @return {Connection} Mongoose connection
   */
  getMongooseConnection() {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call initialize() first.');
    }
    
    return this.mongooseConnection;
  }

  /**
   * Get MongoDB native client
   * @return {MongoClient} MongoDB client
   */
  getMongoClient() {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call initialize() first.');
    }
    
    return this.mongoClient;
  }

  /**
   * Get Elasticsearch client
   * @return {Client} Elasticsearch client
   */
  getElasticClient() {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call initialize() first.');
    }
    
    return this.elasticClient;
  }

  /**
   * Get MongoDB database
   * @param {string} dbName Optional database name
   * @return {Db} MongoDB database
   */
  getDb(dbName) {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call initialize() first.');
    }
    
    const url = new URL(this.mongoUrl);
    const defaultDbName = url.pathname.substring(1) || 'rugby_docs_system';
    
    return this.mongoClient.db(dbName || defaultDbName);
  }
}

module.exports = DatabaseManager;
