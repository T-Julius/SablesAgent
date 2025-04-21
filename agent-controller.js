// Agent API Controller - REST API endpoints for the intelligent workflow agent
const express = require('express');
const router = express.Router();

class AgentController {
  constructor(agentService) {
    this.agentService = agentService;
    this.router = router;
    
    this.setupRoutes();
  }
  
  setupRoutes() {
    // Process a query
    this.router.post('/query', this.processQuery.bind(this));
    
    // Get conversation history
    this.router.get('/conversations/:conversationId', this.getConversationHistory.bind(this));
    
    // Get user conversations
    this.router.get('/conversations', this.getUserConversations.bind(this));
    
    // Complete a conversation
    this.router.post('/conversations/:conversationId/complete', this.completeConversation.bind(this));
  }
  
  /**
   * Process a query
   * @param {Request} req Express request
   * @param {Response} res Express response
   * @return {Promise<void>}
   */
  async processQuery(req, res) {
    try {
      const { userId, query, conversationId } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Query is required'
        });
      }
      
      const response = await this.agentService.processQuery(userId, query, conversationId);
      
      return res.json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Error processing query:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Get conversation history
   * @param {Request} req Express request
   * @param {Response} res Express response
   * @return {Promise<void>}
   */
  async getConversationHistory(req, res) {
    try {
      const { conversationId } = req.params;
      const { userId, limit } = req.query;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const history = await this.agentService.getConversationHistory(
        userId,
        conversationId,
        limit ? parseInt(limit) : 20
      );
      
      return res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Error getting conversation history:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Get user conversations
   * @param {Request} req Express request
   * @param {Response} res Express response
   * @return {Promise<void>}
   */
  async getUserConversations(req, res) {
    try {
      const { userId, limit } = req.query;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const conversations = await this.agentService.getUserConversations(
        userId,
        limit ? parseInt(limit) : 10
      );
      
      return res.json({
        success: true,
        data: conversations
      });
    } catch (error) {
      console.error('Error getting user conversations:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Complete a conversation
   * @param {Request} req Express request
   * @param {Response} res Express response
   * @return {Promise<void>}
   */
  async completeConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await this.agentService.completeConversation(userId, conversationId);
      
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error completing conversation:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Get router
   * @return {Router} Express router
   */
  getRouter() {
    return this.router;
  }
}

module.exports = AgentController;
