// Service Account Authentication for Google Drive
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class ServiceAccountAuth {
  constructor(keyFilePath) {
    this.keyFilePath = keyFilePath || path.join(process.cwd(), 'service-account-key.json');
    this.SCOPES = [
      'https://www.googleapis.com/auth/drive.metadata.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file'
    ];
  }

  /**
   * Authenticates with Google Drive API using a service account.
   * @param {string} userEmail Optional email for domain-wide delegation
   * @return {Promise<JWT>}
   */
  async authorize(userEmail = null) {
    try {
      const content = await fs.promises.readFile(this.keyFilePath);
      const serviceAccountKey = JSON.parse(content);
      
      const auth = new google.auth.JWT({
        email: serviceAccountKey.client_email,
        key: serviceAccountKey.private_key,
        scopes: this.SCOPES
      });
      
      // If user email is provided, impersonate that user (domain-wide delegation)
      if (userEmail) {
        auth.subject = userEmail;
      }
      
      // Verify the credentials
      await auth.authorize();
      return auth;
    } catch (error) {
      console.error('Error authenticating with service account:', error);
      throw error;
    }
  }

  /**
   * Gets an authenticated Google Drive client using service account.
   * @param {string} userEmail Optional email for domain-wide delegation
   * @return {Promise<drive_v3.Drive>}
   */
  async getDriveClient(userEmail = null) {
    const auth = await this.authorize(userEmail);
    return google.drive({ version: 'v3', auth });
  }

  /**
   * Creates a service account key file from environment variables.
   * This is useful for deployment environments where the key is stored as env vars.
   * @param {Object} envVars Environment variables containing service account details
   * @return {Promise<string>} Path to the created key file
   */
  async createKeyFileFromEnv(envVars) {
    const serviceAccountKey = {
      type: 'service_account',
      project_id: envVars.PROJECT_ID,
      private_key_id: envVars.PRIVATE_KEY_ID,
      private_key: envVars.PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: envVars.CLIENT_EMAIL,
      client_id: envVars.CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: envVars.CLIENT_CERT_URL
    };

    await fs.promises.writeFile(
      this.keyFilePath,
      JSON.stringify(serviceAccountKey, null, 2)
    );
    
    return this.keyFilePath;
  }
}

module.exports = ServiceAccountAuth;
