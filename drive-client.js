// Google Drive Client Wrapper
const { google } = require('googleapis');

class DriveClient {
  constructor(auth) {
    this.auth = auth;
    this.drive = google.drive({ version: 'v3', auth: this.auth });
  }

  /**
   * List files in Google Drive with optional query parameters
   * @param {Object} options Query options
   * @return {Promise<Object>} List of files
   */
  async listFiles(options = {}) {
    const defaultOptions = {
      pageSize: 100,
      fields: 'nextPageToken, files(id, name, mimeType, createdTime, modifiedTime, size, parents, webViewLink)',
      q: "trashed = false"
    };

    const queryOptions = { ...defaultOptions, ...options };
    
    try {
      const response = await this.drive.files.list(queryOptions);
      return response.data;
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  /**
   * Get file metadata by ID
   * @param {string} fileId Google Drive file ID
   * @param {string} fields Fields to include in the response
   * @return {Promise<Object>} File metadata
   */
  async getFile(fileId, fields = 'id, name, mimeType, createdTime, modifiedTime, size, parents, webViewLink') {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields
      });
      return response.data;
    } catch (error) {
      console.error(`Error getting file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Download file content
   * @param {string} fileId Google Drive file ID
   * @param {string} mimeType Optional mime type for export
   * @return {Promise<Buffer>} File content
   */
  async downloadFile(fileId, mimeType = null) {
    try {
      let response;
      
      // For Google Docs, Sheets, etc. we need to export them
      if (mimeType) {
        response = await this.drive.files.export({
          fileId,
          mimeType
        }, { responseType: 'arraybuffer' });
      } else {
        response = await this.drive.files.get({
          fileId,
          alt: 'media'
        }, { responseType: 'arraybuffer' });
      }
      
      return Buffer.from(response.data);
    } catch (error) {
      console.error(`Error downloading file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new file in Google Drive
   * @param {Object} fileMetadata File metadata
   * @param {Buffer|string} media File content
   * @param {string} mimeType MIME type of the file
   * @return {Promise<Object>} Created file metadata
   */
  async createFile(fileMetadata, media, mimeType) {
    try {
      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: {
          mimeType,
          body: media
        },
        fields: 'id, name, mimeType, webViewLink'
      });
      return response.data;
    } catch (error) {
      console.error('Error creating file:', error);
      throw error;
    }
  }

  /**
   * Update file metadata
   * @param {string} fileId Google Drive file ID
   * @param {Object} fileMetadata Updated metadata
   * @return {Promise<Object>} Updated file metadata
   */
  async updateFileMetadata(fileId, fileMetadata) {
    try {
      const response = await this.drive.files.update({
        fileId,
        resource: fileMetadata,
        fields: 'id, name, mimeType, modifiedTime'
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Update file content
   * @param {string} fileId Google Drive file ID
   * @param {Buffer|string} media Updated file content
   * @param {string} mimeType MIME type of the file
   * @return {Promise<Object>} Updated file metadata
   */
  async updateFileContent(fileId, media, mimeType) {
    try {
      const response = await this.drive.files.update({
        fileId,
        media: {
          mimeType,
          body: media
        },
        fields: 'id, name, mimeType, modifiedTime'
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating file content ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * List file revisions
   * @param {string} fileId Google Drive file ID
   * @return {Promise<Object>} List of file revisions
   */
  async listRevisions(fileId) {
    try {
      const response = await this.drive.revisions.list({
        fileId,
        fields: 'revisions(id, modifiedTime, lastModifyingUser)'
      });
      return response.data;
    } catch (error) {
      console.error(`Error listing revisions for file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * List file permissions
   * @param {string} fileId Google Drive file ID
   * @return {Promise<Object>} List of file permissions
   */
  async listPermissions(fileId) {
    try {
      const response = await this.drive.permissions.list({
        fileId,
        fields: 'permissions(id, type, role, emailAddress, domain)'
      });
      return response.data;
    } catch (error) {
      console.error(`Error listing permissions for file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new permission for a file
   * @param {string} fileId Google Drive file ID
   * @param {Object} permission Permission details
   * @return {Promise<Object>} Created permission
   */
  async createPermission(fileId, permission) {
    try {
      const response = await this.drive.permissions.create({
        fileId,
        resource: permission,
        fields: 'id, type, role, emailAddress'
      });
      return response.data;
    } catch (error) {
      console.error(`Error creating permission for file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a permission
   * @param {string} fileId Google Drive file ID
   * @param {string} permissionId Permission ID
   * @return {Promise<void>}
   */
  async deletePermission(fileId, permissionId) {
    try {
      await this.drive.permissions.delete({
        fileId,
        permissionId
      });
    } catch (error) {
      console.error(`Error deleting permission ${permissionId} for file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Watch for changes to a file or folder
   * @param {string} fileId Google Drive file ID
   * @param {string} webhookUrl Webhook URL to receive notifications
   * @param {string} channelId Unique channel ID
   * @param {number} expirationTime Expiration time in milliseconds
   * @return {Promise<Object>} Watch response
   */
  async watchFile(fileId, webhookUrl, channelId, expirationTime) {
    try {
      const response = await this.drive.files.watch({
        fileId,
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          expiration: Date.now() + expirationTime
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error watching file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * List changes in Google Drive
   * @param {string} pageToken Change token to start listing from
   * @param {boolean} includeRemoved Whether to include removed files
   * @return {Promise<Object>} List of changes
   */
  async listChanges(pageToken, includeRemoved = false) {
    try {
      const response = await this.drive.changes.list({
        pageToken,
        includeRemoved,
        fields: 'nextPageToken, newStartPageToken, changes(fileId, removed, file(id, name, mimeType))'
      });
      return response.data;
    } catch (error) {
      console.error('Error listing changes:', error);
      throw error;
    }
  }

  /**
   * Get the current change token
   * @return {Promise<string>} Current change token
   */
  async getStartPageToken() {
    try {
      const response = await this.drive.changes.getStartPageToken({});
      return response.data.startPageToken;
    } catch (error) {
      console.error('Error getting start page token:', error);
      throw error;
    }
  }
}

module.exports = DriveClient;
