// Webhook Handler for Google Drive Change Notifications
const express = require('express');
const crypto = require('crypto');

class WebhookHandler {
  constructor(options = {}) {
    this.changeProcessor = options.changeProcessor;
    this.secretToken = options.secretToken || process.env.WEBHOOK_SECRET_TOKEN;
    this.channelIds = new Map(); // Map of channel IDs to resource IDs
    this.router = express.Router();
    
    this.setupRoutes();
  }

  /**
   * Set up webhook routes
   */
  setupRoutes() {
    this.router.post('/google/webhook', this.handleWebhook.bind(this));
    this.router.get('/google/webhook/status', this.getStatus.bind(this));
  }

  /**
   * Get Express router
   * @return {Router} Express router
   */
  getRouter() {
    return this.router;
  }

  /**
   * Handle webhook notification from Google Drive
   * @param {Request} req Express request
   * @param {Response} res Express response
   */
  async handleWebhook(req, res) {
    try {
      // Verify headers
      const channelId = req.headers['x-goog-channel-id'];
      const resourceId = req.headers['x-goog-resource-id'];
      const resourceState = req.headers['x-goog-resource-state'];
      const messageNumber = req.headers['x-goog-message-number'];
      
      // Verify channel ID
      if (!channelId || !this.channelIds.has(channelId)) {
        console.warn(`Received notification for unknown channel ID: ${channelId}`);
        return res.status(404).send('Channel not found');
      }
      
      // Verify signature if secret token is set
      if (this.secretToken) {
        const signature = req.headers['x-goog-channel-token'];
        if (!signature || !this.verifySignature(signature, JSON.stringify(req.body))) {
          console.warn('Invalid signature in webhook notification');
          return res.status(403).send('Invalid signature');
        }
      }
      
      console.log(`Received webhook notification: ${resourceState} for resource ${resourceId} (message ${messageNumber})`);
      
      // Send immediate response to acknowledge receipt
      res.status(200).send('OK');
      
      // Process the change asynchronously
      if (this.changeProcessor) {
        this.processChange(channelId, resourceId, resourceState, req.body);
      }
    } catch (error) {
      console.error('Error handling webhook notification:', error);
      res.status(500).send('Internal server error');
    }
  }

  /**
   * Get webhook status
   * @param {Request} req Express request
   * @param {Response} res Express response
   */
  getStatus(req, res) {
    const status = {
      activeChannels: this.channelIds.size,
      channels: Array.from(this.channelIds.entries()).map(([channelId, resourceId]) => ({
        channelId,
        resourceId
      }))
    };
    
    res.status(200).json(status);
  }

  /**
   * Register a channel for webhook notifications
   * @param {string} channelId Channel ID
   * @param {string} resourceId Resource ID
   */
  registerChannel(channelId, resourceId) {
    this.channelIds.set(channelId, resourceId);
    console.log(`Registered webhook channel ${channelId} for resource ${resourceId}`);
  }

  /**
   * Unregister a channel
   * @param {string} channelId Channel ID
   * @return {boolean} True if channel was unregistered
   */
  unregisterChannel(channelId) {
    const result = this.channelIds.delete(channelId);
    if (result) {
      console.log(`Unregistered webhook channel ${channelId}`);
    }
    return result;
  }

  /**
   * Verify webhook signature
   * @param {string} signature Signature from header
   * @param {string} body Request body
   * @return {boolean} True if signature is valid
   */
  verifySignature(signature, body) {
    const hmac = crypto.createHmac('sha256', this.secretToken);
    hmac.update(body);
    const calculatedSignature = hmac.digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculatedSignature)
    );
  }

  /**
   * Process change notification
   * @param {string} channelId Channel ID
   * @param {string} resourceId Resource ID
   * @param {string} resourceState Resource state
   * @param {Object} data Notification data
   */
  async processChange(channelId, resourceId, resourceState, data) {
    try {
      if (!this.changeProcessor) {
        console.warn('No change processor configured for webhook handler');
        return;
      }
      
      switch (resourceState) {
        case 'sync':
          // Initial sync message, no action needed
          console.log(`Received sync notification for channel ${channelId}`);
          break;
          
        case 'change':
          // Resource changed
          await this.changeProcessor.processResourceChange(resourceId, data);
          break;
          
        case 'remove':
          // Resource removed
          await this.changeProcessor.processResourceRemoval(resourceId);
          break;
          
        case 'exists':
          // Resource exists
          await this.changeProcessor.processResourceExists(resourceId);
          break;
          
        default:
          console.warn(`Unknown resource state: ${resourceState}`);
      }
    } catch (error) {
      console.error(`Error processing change for resource ${resourceId}:`, error);
    }
  }

  /**
   * Generate a new channel ID
   * @return {string} New channel ID
   */
  generateChannelId() {
    return crypto.randomUUID();
  }
}

module.exports = WebhookHandler;
