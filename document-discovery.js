// Document Discovery and Traversal Service
const path = require('path');
const { google } = require('googleapis');

class DocumentDiscovery {
  constructor(driveClient) {
    this.driveClient = driveClient;
    this.googleDocsTypes = [
      'application/vnd.google-apps.document',
      'application/vnd.google-apps.spreadsheet',
      'application/vnd.google-apps.presentation'
    ];
  }

  /**
   * Discover all Google Docs and Sheets in a folder and its subfolders
   * @param {string} folderId Google Drive folder ID to start discovery from
   * @param {Object} options Discovery options
   * @return {Promise<Array>} List of discovered documents
   */
  async discoverDocuments(folderId, options = {}) {
    const defaultOptions = {
      recursive: true,
      includeSharedWithMe: true,
      documentTypes: this.googleDocsTypes,
      maxResults: 1000
    };

    const discoveryOptions = { ...defaultOptions, ...options };
    const allDocuments = [];
    const processedFolders = new Set();

    await this.traverseFolder(folderId, allDocuments, processedFolders, discoveryOptions);

    if (discoveryOptions.includeSharedWithMe) {
      await this.findSharedDocuments(allDocuments, discoveryOptions);
    }

    return allDocuments.slice(0, discoveryOptions.maxResults);
  }

  /**
   * Recursively traverse a folder and its subfolders to find documents
   * @param {string} folderId Google Drive folder ID
   * @param {Array} documents Array to collect discovered documents
   * @param {Set} processedFolders Set of already processed folder IDs
   * @param {Object} options Discovery options
   * @return {Promise<void>}
   */
  async traverseFolder(folderId, documents, processedFolders, options) {
    // Avoid processing the same folder multiple times (prevents infinite loops)
    if (processedFolders.has(folderId)) {
      return;
    }
    
    processedFolders.add(folderId);
    
    try {
      // Get folder metadata
      const folder = await this.driveClient.getFile(folderId);
      
      // Build query for files in this folder
      let query = `'${folderId}' in parents and trashed = false`;
      
      // Add document type filter if specified
      if (options.documentTypes && options.documentTypes.length > 0) {
        const typeFilters = options.documentTypes.map(type => `mimeType = '${type}'`);
        query += ` and (${typeFilters.join(' or ')})`;
      }
      
      // List files in the folder
      const response = await this.driveClient.listFiles({
        q: query,
        pageSize: 100
      });
      
      // Add discovered documents to the result array
      if (response.files && response.files.length > 0) {
        for (const file of response.files) {
          documents.push({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            createdTime: file.createdTime,
            modifiedTime: file.modifiedTime,
            size: file.size,
            parents: file.parents,
            webViewLink: file.webViewLink,
            folder: {
              id: folder.id,
              name: folder.name
            }
          });
        }
      }
      
      // If recursive option is enabled, find and process subfolders
      if (options.recursive) {
        const subfoldersResponse = await this.driveClient.listFiles({
          q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
          pageSize: 100
        });
        
        if (subfoldersResponse.files && subfoldersResponse.files.length > 0) {
          for (const subfolder of subfoldersResponse.files) {
            await this.traverseFolder(subfolder.id, documents, processedFolders, options);
          }
        }
      }
    } catch (error) {
      console.error(`Error traversing folder ${folderId}:`, error);
      // Continue with other folders even if one fails
    }
  }

  /**
   * Find documents shared with the user
   * @param {Array} documents Array to collect discovered documents
   * @param {Object} options Discovery options
   * @return {Promise<void>}
   */
  async findSharedDocuments(documents, options) {
    try {
      // Build query for shared documents
      let query = 'sharedWithMe = true and trashed = false';
      
      // Add document type filter if specified
      if (options.documentTypes && options.documentTypes.length > 0) {
        const typeFilters = options.documentTypes.map(type => `mimeType = '${type}'`);
        query += ` and (${typeFilters.join(' or ')})`;
      }
      
      // List shared files
      const response = await this.driveClient.listFiles({
        q: query,
        pageSize: 100
      });
      
      // Add discovered documents to the result array
      if (response.files && response.files.length > 0) {
        for (const file of response.files) {
          documents.push({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            createdTime: file.createdTime,
            modifiedTime: file.modifiedTime,
            size: file.size,
            parents: file.parents,
            webViewLink: file.webViewLink,
            shared: true
          });
        }
      }
    } catch (error) {
      console.error('Error finding shared documents:', error);
    }
  }

  /**
   * Build folder structure from discovered documents
   * @param {Array} documents List of discovered documents
   * @return {Object} Folder structure
   */
  buildFolderStructure(documents) {
    const folderMap = new Map();
    const rootFolders = [];
    
    // First pass: collect all folders
    for (const doc of documents) {
      if (doc.folder) {
        if (!folderMap.has(doc.folder.id)) {
          folderMap.set(doc.folder.id, {
            id: doc.folder.id,
            name: doc.folder.name,
            subfolders: [],
            documents: []
          });
        }
      }
    }
    
    // Second pass: assign documents to folders
    for (const doc of documents) {
      if (doc.folder && folderMap.has(doc.folder.id)) {
        const folder = folderMap.get(doc.folder.id);
        folder.documents.push(doc);
      }
    }
    
    // Third pass: build folder hierarchy
    for (const doc of documents) {
      if (doc.folder && doc.parents && doc.parents.length > 0) {
        const parentId = doc.parents[0];
        if (folderMap.has(parentId) && folderMap.has(doc.folder.id)) {
          const parentFolder = folderMap.get(parentId);
          const childFolder = folderMap.get(doc.folder.id);
          
          // Add as subfolder if not already added
          if (!parentFolder.subfolders.some(sf => sf.id === childFolder.id)) {
            parentFolder.subfolders.push(childFolder);
          }
        } else if (folderMap.has(doc.folder.id)) {
          // If parent not found, consider it a root folder
          const folder = folderMap.get(doc.folder.id);
          if (!rootFolders.some(rf => rf.id === folder.id)) {
            rootFolders.push(folder);
          }
        }
      }
    }
    
    return {
      rootFolders,
      folderMap
    };
  }

  /**
   * Get document details including content if requested
   * @param {string} documentId Google Drive document ID
   * @param {boolean} includeContent Whether to include document content
   * @return {Promise<Object>} Document details
   */
  async getDocumentDetails(documentId, includeContent = false) {
    try {
      // Get document metadata
      const document = await this.driveClient.getFile(documentId, 'id, name, mimeType, createdTime, modifiedTime, size, parents, webViewLink, description');
      
      const result = {
        id: document.id,
        name: document.name,
        mimeType: document.mimeType,
        createdTime: document.createdTime,
        modifiedTime: document.modifiedTime,
        size: document.size,
        parents: document.parents,
        webViewLink: document.webViewLink,
        description: document.description
      };
      
      // Get document content if requested
      if (includeContent) {
        let content = null;
        let exportMimeType = null;
        
        // Determine export MIME type based on document type
        switch (document.mimeType) {
          case 'application/vnd.google-apps.document':
            exportMimeType = 'text/plain';
            break;
          case 'application/vnd.google-apps.spreadsheet':
            exportMimeType = 'text/csv';
            break;
          case 'application/vnd.google-apps.presentation':
            exportMimeType = 'text/plain';
            break;
        }
        
        if (exportMimeType) {
          const contentBuffer = await this.driveClient.downloadFile(documentId, exportMimeType);
          content = contentBuffer.toString('utf8');
        } else {
          const contentBuffer = await this.driveClient.downloadFile(documentId);
          content = contentBuffer.toString('utf8');
        }
        
        result.content = content;
      }
      
      return result;
    } catch (error) {
      console.error(`Error getting document details for ${documentId}:`, error);
      throw error;
    }
  }
}

module.exports = DocumentDiscovery;
