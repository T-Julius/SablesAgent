// Agent Service - Service layer for the intelligent workflow agent
const AgentInterface = require('./agent-interface');

class AgentService {
  constructor(options = {}) {
    this.agentInterface = new AgentInterface({
      databaseService: options.databaseService,
      documentService: options.documentService,
      emailService: options.emailService,
      calendarService: options.calendarService,
      notificationService: options.notificationService,
      openaiApiKey: options.openaiApiKey
    });
    
    this.databaseService = options.databaseService;
  }

  /**
   * Process a user query
   * @param {string} userId User ID
   * @param {string} query User query
   * @param {string} conversationId Optional conversation ID
   * @return {Promise<Object>} Agent response
   */
  async processQuery(userId, query, conversationId = null) {
    try {
      // Log the query
      await this.logAgentInteraction(userId, 'query', query);
      
      // Process the query
      const response = await this.agentInterface.processQuery(userId, query, conversationId);
      
      // Log the response
      await this.logAgentInteraction(userId, 'response', response.response, {
        relatedDocuments: response.relatedDocuments,
        relatedEvents: response.relatedEvents,
        actions: response.actions
      });
      
      return response;
    } catch (error) {
      console.error('Error processing query:', error);
      
      // Log the error
      await this.logAgentInteraction(userId, 'error', error.message);
      
      throw error;
    }
  }

  /**
   * Get conversation history
   * @param {string} userId User ID
   * @param {string} conversationId Optional conversation ID
   * @param {number} limit Optional limit
   * @return {Promise<Object>} Conversation history
   */
  async getConversationHistory(userId, conversationId = null, limit = 20) {
    try {
      const AgentConversation = this.databaseService.getModels().AgentConversation;
      
      let conversation;
      
      if (conversationId) {
        conversation = await AgentConversation.findById(conversationId);
        
        if (!conversation || conversation.userId.toString() !== userId.toString()) {
          throw new Error('Conversation not found or access denied');
        }
      } else {
        // Get most recent conversation
        conversation = await AgentConversation.findOne({
          userId
        }).sort({ startedAt: -1 });
        
        if (!conversation) {
          return {
            conversationId: null,
            messages: []
          };
        }
      }
      
      // Get messages
      const messages = conversation.messages
        .slice(-limit)
        .map(msg => ({
          sender: msg.sender,
          content: msg.content,
          timestamp: msg.timestamp,
          relatedDocuments: msg.relatedDocuments,
          relatedEvents: msg.relatedEvents,
          actions: msg.actions
        }));
      
      return {
        conversationId: conversation._id,
        messages
      };
    } catch (error) {
      console.error('Error getting conversation history:', error);
      throw error;
    }
  }

  /**
   * Get user conversations
   * @param {string} userId User ID
   * @param {number} limit Optional limit
   * @return {Promise<Array>} Conversations
   */
  async getUserConversations(userId, limit = 10) {
    try {
      const AgentConversation = this.databaseService.getModels().AgentConversation;
      
      const conversations = await AgentConversation.find({
        userId
      }).sort({ startedAt: -1 }).limit(limit);
      
      return conversations.map(conv => ({
        id: conv._id,
        startedAt: conv.startedAt,
        endedAt: conv.endedAt,
        status: conv.status,
        messageCount: conv.messages.length,
        lastMessage: conv.messages.length > 0 ? {
          sender: conv.messages[conv.messages.length - 1].sender,
          content: conv.messages[conv.messages.length - 1].content,
          timestamp: conv.messages[conv.messages.length - 1].timestamp
        } : null
      }));
    } catch (error) {
      console.error('Error getting user conversations:', error);
      throw error;
    }
  }

  /**
   * Complete a conversation
   * @param {string} userId User ID
   * @param {string} conversationId Conversation ID
   * @return {Promise<Object>} Result
   */
  async completeConversation(userId, conversationId) {
    try {
      const AgentConversation = this.databaseService.getModels().AgentConversation;
      
      const conversation = await AgentConversation.findById(conversationId);
      
      if (!conversation || conversation.userId.toString() !== userId.toString()) {
        throw new Error('Conversation not found or access denied');
      }
      
      await conversation.complete();
      
      return {
        success: true,
        conversationId
      };
    } catch (error) {
      console.error('Error completing conversation:', error);
      throw error;
    }
  }

  /**
   * Log agent interaction
   * @param {string} userId User ID
   * @param {string} type Interaction type
   * @param {string} content Interaction content
   * @param {Object} metadata Optional metadata
   * @return {Promise<void>}
   */
  async logAgentInteraction(userId, type, content, metadata = {}) {
    try {
      const AuditLog = this.databaseService.getModels().AuditLog;
      
      await AuditLog.logAction({
        userId,
        action: type === 'query' ? 'read' : 'create',
        resourceType: 'system',
        details: {
          interactionType: type,
          content,
          ...metadata
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error logging agent interaction:', error);
    }
  }
}

module.exports = AgentService;
