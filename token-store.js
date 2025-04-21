// Token Storage and Management for Google Drive API
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class TokenStore {
  constructor(options = {}) {
    this.tokenDir = options.tokenDir || path.join(process.cwd(), 'tokens');
    this.encryptionKey = options.encryptionKey || process.env.TOKEN_ENCRYPTION_KEY;
    this.algorithm = 'aes-256-cbc';
  }

  /**
   * Initialize the token store
   * @return {Promise<void>}
   */
  async initialize() {
    try {
      await fs.promises.mkdir(this.tokenDir, { recursive: true });
    } catch (error) {
      console.error('Error initializing token store:', error);
      throw error;
    }
  }

  /**
   * Generate a token filename for a user
   * @param {string} userId User identifier
   * @return {string} Token filename
   */
  getTokenFilename(userId) {
    // Create a hash of the userId to use as filename
    const hash = crypto.createHash('sha256').update(userId).digest('hex');
    return path.join(this.tokenDir, `${hash}.token`);
  }

  /**
   * Encrypt token data
   * @param {Object} data Token data to encrypt
   * @return {string} Encrypted data
   */
  encrypt(data) {
    if (!this.encryptionKey) {
      return JSON.stringify(data);
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm, 
      Buffer.from(this.encryptionKey, 'hex'), 
      iv
    );
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return JSON.stringify({
      iv: iv.toString('hex'),
      content: encrypted
    });
  }

  /**
   * Decrypt token data
   * @param {string} encryptedData Encrypted token data
   * @return {Object} Decrypted token data
   */
  decrypt(encryptedData) {
    if (!this.encryptionKey) {
      return JSON.parse(encryptedData);
    }

    const data = JSON.parse(encryptedData);
    const iv = Buffer.from(data.iv, 'hex');
    const decipher = crypto.createDecipheriv(
      this.algorithm, 
      Buffer.from(this.encryptionKey, 'hex'), 
      iv
    );
    
    let decrypted = decipher.update(data.content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * Store token for a user
   * @param {string} userId User identifier
   * @param {Object} token Token data to store
   * @return {Promise<void>}
   */
  async storeToken(userId, token) {
    try {
      await this.initialize();
      const filename = this.getTokenFilename(userId);
      const encryptedToken = this.encrypt(token);
      await fs.promises.writeFile(filename, encryptedToken);
    } catch (error) {
      console.error('Error storing token:', error);
      throw error;
    }
  }

  /**
   * Retrieve token for a user
   * @param {string} userId User identifier
   * @return {Promise<Object|null>} Token data or null if not found
   */
  async getToken(userId) {
    try {
      const filename = this.getTokenFilename(userId);
      const encryptedToken = await fs.promises.readFile(filename, 'utf8');
      return this.decrypt(encryptedToken);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      console.error('Error retrieving token:', error);
      throw error;
    }
  }

  /**
   * Delete token for a user
   * @param {string} userId User identifier
   * @return {Promise<boolean>} True if token was deleted, false if not found
   */
  async deleteToken(userId) {
    try {
      const filename = this.getTokenFilename(userId);
      await fs.promises.unlink(filename);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      console.error('Error deleting token:', error);
      throw error;
    }
  }

  /**
   * Check if a token exists for a user
   * @param {string} userId User identifier
   * @return {Promise<boolean>} True if token exists
   */
  async hasToken(userId) {
    try {
      const filename = this.getTokenFilename(userId);
      await fs.promises.access(filename, fs.constants.F_OK);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = TokenStore;
