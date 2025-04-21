// Polling Service for Google Drive Changes
const { setTimeout } = require('timers/promises');

class PollingService {
  constructor(options = {}) {
    this.driveClient = options.driveClient;
    this.changeProcessor = options.changeProcessor;
    this.pollingInterval = options.pollingInterval || 15 * 60 * 1000; // 15 minutes by default
    this.pageToken = null;
    this.isPolling = false;
    this.lastPollTime = null;
    this.pollCount = 0;
  }

  /**
   * Start polling for changes
   * @return {Promise<void>}
   */
  async startPolling() {
    if (this.isPolling) {
      console.log('Polling already in progress');
      return;
    }
    
    this.isPolling = true;
    console.log(`Starting Google Drive change polling (interval: ${this.pollingInterval}ms)`);
    
    try {
      // Get initial page token if we don't have one
      if (!this.pageToken) {
        this.pageToken = await this.driveClient.getStartPageToken();
        console.log(`Initialized page token: ${this.pageToken}`);
      }
      
      // Start polling loop
      this.pollLoop();
    } catch (error) {
      console.error('Error starting polling:', error);
      this.isPolling = false;
    }
  }

  /**
   * Stop polling for changes
   */
  stopPolling() {
    console.log('Stopping Google Drive change polling');
    this.isPolling = false;
  }

  /**
   * Polling loop
   * @return {Promise<void>}
   */
  async pollLoop() {
    while (this.isPolling) {
      try {
        await this.pollForChanges();
        this.lastPollTime = new Date();
        this.pollCount++;
        
        // Wait for the polling interval
        await setTimeout(this.pollingInterval);
      } catch (error) {
        console.error('Error in polling loop:', error);
        
        // Wait a shorter time before retrying after an error
        await setTimeout(Math.min(60000, this.pollingInterval / 3));
      }
    }
  }

  /**
   * Poll for changes
   * @return {Promise<void>}
   */
  async pollForChanges() {
    try {
      console.log(`Polling for changes with page token: ${this.pageToken}`);
      
      const changes = await this.driveClient.listChanges(this.pageToken);
      
      // Process changes
      if (changes.changes && changes.changes.length > 0) {
        console.log(`Found ${changes.changes.length} changes`);
        
        for (const change of changes.changes) {
          await this.processChange(change);
        }
      } else {
        console.log('No changes found');
      }
      
      // Update page token for next poll
      if (changes.nextPageToken) {
        this.pageToken = changes.nextPageToken;
      } else if (changes.newStartPageToken) {
        this.pageToken = changes.newStartPageToken;
      }
    } catch (error) {
      console.error('Error polling for changes:', error);
      throw error;
    }
  }

  /**
   * Process a single change
   * @param {Object} change Change object
   * @return {Promise<void>}
   */
  async processChange(change) {
    try {
      if (!this.changeProcessor) {
        console.warn('No change processor configured for polling service');
        return;
      }
      
      if (change.removed) {
        // File was removed
        await this.changeProcessor.processResourceRemoval(change.fileId);
      } else if (change.file) {
        // File was changed
        await this.changeProcessor.processResourceChange(change.fileId, change.file);
      }
    } catch (error) {
      console.error(`Error processing change for file ${change.fileId}:`, error);
    }
  }

  /**
   * Get polling status
   * @return {Object} Polling status
   */
  getStatus() {
    return {
      isPolling: this.isPolling,
      lastPollTime: this.lastPollTime,
      pollCount: this.pollCount,
      pollingInterval: this.pollingInterval,
      currentPageToken: this.pageToken
    };
  }

  /**
   * Update polling interval
   * @param {number} interval New polling interval in milliseconds
   */
  updatePollingInterval(interval) {
    if (interval < 60000) {
      console.warn(`Polling interval ${interval}ms is too short, using 60000ms instead`);
      interval = 60000;
    }
    
    this.pollingInterval = interval;
    console.log(`Updated polling interval to ${interval}ms`);
  }
}

module.exports = PollingService;
