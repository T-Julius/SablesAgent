// Document Service for Google Drive
const path = require('path');

class DocumentService {
  constructor(options = {}) {
    this.driveClient = options.driveClient;
    this.documentDiscovery = options.documentDiscovery;
    this.contentExtractor = options.contentExtractor;
    this.indexingService = options.indexingService;
  }

  /**
   * Get document by ID
   * @param {string} documentId Google Drive document ID
   * @param {boolean} includeContent Whether to include document content
   * @return {Promise<Object>} Document details
   */
  async getDocument(documentId, includeContent = false) {
    try {
      // Get document metadata
      const metadata = await this.driveClient.getFile(documentId);
      
      // Get document content if requested
      let content = null;
      let extractedMetadata = {};
      
      if (includeContent && this.contentExtractor) {
        try {
          const extractionResult = await this.contentExtractor.extractContent(
            documentId,
            metadata.mimeType,
            'text'
          );
          
          content = extractionResult.content;
          extractedMetadata = extractionResult.metadata;
        } catch (error) {
          console.error(`Error extracting content from document ${documentId}:`, error);
        }
      }
      
      return {
        id: metadata.id,
        name: metadata.name,
        mimeType: metadata.mimeType,
        createdTime: metadata.createdTime,
        modifiedTime: metadata.modifiedTime,
        size: metadata.size,
        webViewLink: metadata.webViewLink,
        content,
        metadata: extractedMetadata
      };
    } catch (error) {
      console.error(`Error getting document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * List documents with optional filtering
   * @param {Object} options Filtering options
   * @return {Promise<Array>} List of documents
   */
  async listDocuments(options = {}) {
    try {
      const query = options.query || '';
      const mimeTypes = options.mimeTypes || [
        'application/vnd.google-apps.document',
        'application/vnd.google-apps.spreadsheet'
      ];
      const folderId = options.folderId || 'root';
      const limit = options.limit || 100;
      
      // Build query string
      let queryString = `trashed = false`;
      
      if (query) {
        queryString += ` and name contains '${query}'`;
      }
      
      if (mimeTypes && mimeTypes.length > 0) {
        const mimeTypeFilters = mimeTypes.map(type => `mimeType = '${type}'`);
        queryString += ` and (${mimeTypeFilters.join(' or ')})`;
      }
      
      if (folderId && folderId !== 'root') {
        queryString += ` and '${folderId}' in parents`;
      }
      
      // List files
      const response = await this.driveClient.listFiles({
        q: queryString,
        pageSize: limit,
        fields: 'files(id, name, mimeType, createdTime, modifiedTime, size, webViewLink)'
      });
      
      return response.files || [];
    } catch (error) {
      console.error('Error listing documents:', error);
      throw error;
    }
  }

  /**
   * Create a new document
   * @param {Object} documentData Document data
   * @return {Promise<Object>} Created document
   */
  async createDocument(documentData) {
    try {
      const { name, content, mimeType, folderId } = documentData;
      
      // Determine MIME type
      let finalMimeType = mimeType;
      if (!finalMimeType) {
        // Default to Google Docs
        finalMimeType = 'application/vnd.google-apps.document';
      }
      
      // Create file metadata
      const fileMetadata = {
        name,
        mimeType: finalMimeType
      };
      
      // Add to folder if specified
      if (folderId) {
        fileMetadata.parents = [folderId];
      }
      
      // Create the file
      let response;
      
      if (content) {
        // Create with content
        response = await this.driveClient.createFile(
          fileMetadata,
          content,
          'text/plain'
        );
      } else {
        // Create empty file
        response = await this.driveClient.createFile(
          fileMetadata,
          '',
          'text/plain'
        );
      }
      
      return {
        id: response.id,
        name: response.name,
        mimeType: response.mimeType,
        webViewLink: response.webViewLink
      };
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  /**
   * Update document metadata
   * @param {string} documentId Google Drive document ID
   * @param {Object} metadata Updated metadata
   * @return {Promise<Object>} Updated document
   */
  async updateDocumentMetadata(documentId, metadata) {
    try {
      const fileMetadata = {};
      
      // Only include fields that are provided
      if (metadata.name) {
        fileMetadata.name = metadata.name;
      }
      
      if (metadata.description) {
        fileMetadata.description = metadata.description;
      }
      
      // Update the file metadata
      const response = await this.driveClient.updateFileMetadata(documentId, fileMetadata);
      
      return {
        id: response.id,
        name: response.name,
        mimeType: response.mimeType,
        modifiedTime: response.modifiedTime
      };
    } catch (error) {
      console.error(`Error updating document metadata for ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Share document with users
   * @param {string} documentId Google Drive document ID
   * @param {Array} users Array of user emails to share with
   * @param {string} role Permission role (reader, writer, commenter)
   * @return {Promise<Object>} Sharing results
   */
  async shareDocument(documentId, users, role = 'reader') {
    try {
      const results = {
        documentId,
        shared: [],
        failed: []
      };
      
      // Share with each user
      for (const email of users) {
        try {
          const permission = {
            type: 'user',
            role,
            emailAddress: email
          };
          
          const response = await this.driveClient.createPermission(documentId, permission);
          
          results.shared.push({
            email,
            permissionId: response.id,
            role: response.role
          });
        } catch (error) {
          console.error(`Error sharing document ${documentId} with ${email}:`, error);
          
          results.failed.push({
            email,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error(`Error sharing document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Download document content
   * @param {string} documentId Google Drive document ID
   * @param {string} format Export format (pdf, docx, xlsx, etc.)
   * @return {Promise<Buffer>} Document content
   */
  async downloadDocument(documentId, format = 'pdf') {
    try {
      // Get document metadata
      const metadata = await this.driveClient.getFile(documentId);
      
      // Determine export MIME type based on document type and requested format
      let exportMimeType = null;
      
      switch (metadata.mimeType) {
        case 'application/vnd.google-apps.document':
          switch (format) {
            case 'pdf':
              exportMimeType = 'application/pdf';
              break;
            case 'docx':
              exportMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
              break;
            case 'txt':
              exportMimeType = 'text/plain';
              break;
            case 'html':
              exportMimeType = 'text/html';
              break;
            default:
              exportMimeType = 'application/pdf';
          }
          break;
          
        case 'application/vnd.google-apps.spreadsheet':
          switch (format) {
            case 'xlsx':
              exportMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
              break;
            case 'csv':
              exportMimeType = 'text/csv';
              break;
            case 'pdf':
              exportMimeType = 'application/pdf';
              break;
            default:
              exportMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          }
          break;
          
        case 'application/vnd.google-apps.presentation':
          switch (format) {
            case 'pptx':
              exportMimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
              break;
            case 'pdf':
              exportMimeType = 'application/pdf';
              break;
            default:
              exportMimeType = 'application/pdf';
          }
          break;
          
        default:
          // For non-Google formats, download directly
          exportMimeType = null;
      }
      
      // Download the file
      const content = await this.driveClient.downloadFile(documentId, exportMimeType);
      
      return content;
    } catch (error) {
      console.error(`Error downloading document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Discover and index documents
   * @param {string} folderId Google Drive folder ID to start discovery from
   * @param {Object} options Discovery options
   * @return {Promise<Object>} Indexing results
   */
  async discoverAndIndexDocuments(folderId, options = {}) {
    try {
      if (!this.documentDiscovery) {
        throw new Error('Document discovery service not configured');
      }
      
      if (!this.indexingService) {
        throw new Error('Indexing service not configured');
      }
      
      // Discover documents
      console.log(`Starting document discovery from folder ${folderId}`);
      const documents = await this.documentDiscovery.discoverDocuments(folderId, options);
      console.log(`Discovered ${documents.length} documents`);
      
      // Extract content for each document
      const documentsWithContent = [];
      
      for (const document of documents) {
        try {
          if (this.contentExtractor) {
            const extractionResult = await this.contentExtractor.extractContent(
              document.id,
              document.mimeType,
              'text'
            );
            
            documentsWithContent.push({
              ...document,
              content: extractionResult.content,
              metadata: extractionResult.metadata
            });
          } else {
            documentsWithContent.push(document);
          }
        } catch (error) {
          console.error(`Error extracting content from document ${document.id}:`, error);
          documentsWithContent.push(document);
        }
      }
      
      // Index documents
      console.log(`Indexing ${documentsWithContent.length} documents`);
      const indexingResults = await this.indexingService.bulkIndexDocuments(documentsWithContent);
      
      return {
        discovered: documents.length,
        indexed: indexingResults.successful,
        failed: indexingResults.failed,
        errors: indexingResults.errors
      };
    } catch (error) {
      console.error(`Error discovering and indexing documents from folder ${folderId}:`, error);
      throw error;
    }
  }
}

module.exports = DocumentService;
