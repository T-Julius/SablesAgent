// Agent Interface - Main controller for the intelligent workflow agent
const natural = require('natural');
const { Configuration, OpenAIApi } = require('openai');

class AgentInterface {
  constructor(options = {}) {
    this.databaseService = options.databaseService;
    this.documentService = options.documentService;
    this.emailService = options.emailService;
    this.calendarService = options.calendarService;
    this.notificationService = options.notificationService;
    
    // Initialize NLP components
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    
    // Initialize OpenAI if API key is provided
    if (options.openaiApiKey) {
      const configuration = new Configuration({
        apiKey: options.openaiApiKey,
      });
      this.openai = new OpenAIApi(configuration);
    }
    
    // Intent classification
    this.intents = {
      DOCUMENT_SEARCH: 'document_search',
      DOCUMENT_SUMMARY: 'document_summary',
      DOCUMENT_DETAILS: 'document_details',
      PLAYER_INFO: 'player_info',
      EVENT_CREATE: 'event_create',
      EVENT_UPDATE: 'event_update',
      EVENT_CANCEL: 'event_cancel',
      EVENT_LIST: 'event_list',
      EMAIL_SEND: 'email_send',
      NOTIFICATION_CREATE: 'notification_create',
      HELP: 'help',
      UNKNOWN: 'unknown'
    };
    
    // Intent patterns
    this.intentPatterns = {
      [this.intents.DOCUMENT_SEARCH]: [
        'find', 'search', 'look for', 'get', 'retrieve', 'documents', 'files',
        'about', 'related to', 'containing', 'with', 'where'
      ],
      [this.intents.DOCUMENT_SUMMARY]: [
        'summarize', 'summary', 'brief', 'overview', 'key points', 'main points'
      ],
      [this.intents.DOCUMENT_DETAILS]: [
        'details', 'information', 'specifics', 'tell me about', 'describe'
      ],
      [this.intents.PLAYER_INFO]: [
        'player', 'team member', 'athlete', 'rugby player', 'position', 'jersey'
      ],
      [this.intents.EVENT_CREATE]: [
        'schedule', 'create event', 'new event', 'add to calendar', 'appointment'
      ],
      [this.intents.EVENT_UPDATE]: [
        'update event', 'change event', 'reschedule', 'modify event'
      ],
      [this.intents.EVENT_CANCEL]: [
        'cancel event', 'delete event', 'remove event'
      ],
      [this.intents.EVENT_LIST]: [
        'list events', 'show calendar', 'upcoming events', 'schedule'
      ],
      [this.intents.EMAIL_SEND]: [
        'send email', 'email', 'message', 'send message'
      ],
      [this.intents.NOTIFICATION_CREATE]: [
        'notify', 'alert', 'reminder', 'send notification'
      ],
      [this.intents.HELP]: [
        'help', 'assist', 'support', 'how to', 'what can you do', 'capabilities'
      ]
    };
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
      // Get or create conversation
      const conversation = await this.getOrCreateConversation(userId, conversationId);
      
      // Add user message to conversation
      await conversation.addUserMessage(query);
      
      // Classify intent
      const intent = this.classifyIntent(query);
      conversation.intent = intent;
      await conversation.save();
      
      // Process based on intent
      let response;
      let relatedDocuments = [];
      let relatedEvents = [];
      let actions = [];
      
      switch (intent) {
        case this.intents.DOCUMENT_SEARCH:
          response = await this.handleDocumentSearch(query, userId, conversation);
          relatedDocuments = response.documents || [];
          break;
          
        case this.intents.DOCUMENT_SUMMARY:
          response = await this.handleDocumentSummary(query, userId, conversation);
          relatedDocuments = response.documents || [];
          break;
          
        case this.intents.DOCUMENT_DETAILS:
          response = await this.handleDocumentDetails(query, userId, conversation);
          relatedDocuments = response.documents || [];
          break;
          
        case this.intents.PLAYER_INFO:
          response = await this.handlePlayerInfo(query, userId, conversation);
          break;
          
        case this.intents.EVENT_CREATE:
          response = await this.handleEventCreate(query, userId, conversation);
          relatedEvents = response.events || [];
          actions = response.actions || [];
          break;
          
        case this.intents.EVENT_UPDATE:
          response = await this.handleEventUpdate(query, userId, conversation);
          relatedEvents = response.events || [];
          actions = response.actions || [];
          break;
          
        case this.intents.EVENT_CANCEL:
          response = await this.handleEventCancel(query, userId, conversation);
          relatedEvents = response.events || [];
          actions = response.actions || [];
          break;
          
        case this.intents.EVENT_LIST:
          response = await this.handleEventList(query, userId, conversation);
          relatedEvents = response.events || [];
          break;
          
        case this.intents.EMAIL_SEND:
          response = await this.handleEmailSend(query, userId, conversation);
          actions = response.actions || [];
          break;
          
        case this.intents.NOTIFICATION_CREATE:
          response = await this.handleNotificationCreate(query, userId, conversation);
          actions = response.actions || [];
          break;
          
        case this.intents.HELP:
          response = await this.handleHelp(query, userId, conversation);
          break;
          
        default:
          response = await this.handleUnknownIntent(query, userId, conversation);
      }
      
      // Add agent message to conversation
      await conversation.addAgentMessage(
        response.message,
        relatedDocuments.map(doc => doc._id || doc.id),
        relatedEvents.map(event => event._id || event.id),
        actions
      );
      
      // Format response for client
      return {
        response: response.message,
        conversationId: conversation._id,
        relatedDocuments: relatedDocuments.map(doc => ({
          id: doc._id || doc.id,
          title: doc.title,
          googleDriveLink: doc.googleDriveLink
        })),
        relatedEvents: relatedEvents.map(event => ({
          id: event._id || event.id,
          title: event.title,
          startTime: event.startTime
        })),
        actions: actions
      };
    } catch (error) {
      console.error('Error processing query:', error);
      throw error;
    }
  }

  /**
   * Get or create a conversation
   * @param {string} userId User ID
   * @param {string} conversationId Optional conversation ID
   * @return {Promise<Object>} Conversation
   */
  async getOrCreateConversation(userId, conversationId = null) {
    const AgentConversation = this.databaseService.getModels().AgentConversation;
    
    if (conversationId) {
      // Try to get existing conversation
      const conversation = await AgentConversation.findById(conversationId);
      
      if (conversation && conversation.userId.toString() === userId.toString()) {
        // If conversation is completed or archived, create a new one
        if (conversation.status !== 'active') {
          return AgentConversation.createNewConversation(userId);
        }
        
        return conversation;
      }
    }
    
    // Try to find active conversation for user
    const activeConversation = await AgentConversation.findActive(userId);
    
    if (activeConversation) {
      return activeConversation;
    }
    
    // Create new conversation
    return AgentConversation.createNewConversation(userId);
  }

  /**
   * Classify intent of user query
   * @param {string} query User query
   * @return {string} Intent
   */
  classifyIntent(query) {
    // Tokenize and normalize query
    const tokens = this.tokenizer.tokenize(query.toLowerCase());
    const stems = tokens.map(token => this.stemmer.stem(token));
    
    // Calculate intent scores
    const scores = {};
    
    for (const intent in this.intentPatterns) {
      scores[intent] = 0;
      
      for (const pattern of this.intentPatterns[intent]) {
        // Check for exact pattern matches
        if (query.toLowerCase().includes(pattern.toLowerCase())) {
          scores[intent] += 2;
          continue;
        }
        
        // Check for stem matches
        const patternTokens = this.tokenizer.tokenize(pattern.toLowerCase());
        const patternStems = patternTokens.map(token => this.stemmer.stem(token));
        
        for (const patternStem of patternStems) {
          if (stems.includes(patternStem)) {
            scores[intent] += 1;
          }
        }
      }
    }
    
    // Find intent with highest score
    let maxScore = 0;
    let maxIntent = this.intents.UNKNOWN;
    
    for (const intent in scores) {
      if (scores[intent] > maxScore) {
        maxScore = scores[intent];
        maxIntent = intent;
      }
    }
    
    // If score is too low, return unknown
    if (maxScore < 2) {
      return this.intents.UNKNOWN;
    }
    
    return maxIntent;
  }

  /**
   * Extract entities from query
   * @param {string} query User query
   * @param {Array} entityTypes Types of entities to extract
   * @return {Object} Extracted entities
   */
  extractEntities(query, entityTypes) {
    const entities = {};
    
    // Extract dates
    if (entityTypes.includes('date')) {
      const datePatterns = [
        // MM/DD/YYYY or MM-DD-YYYY
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,
        // Month name DD, YYYY
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/gi,
        // Today, tomorrow, next week
        /\b(today|tomorrow|next week|next month)\b/gi,
        // Day of week
        /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi
      ];
      
      entities.dates = [];
      
      for (const pattern of datePatterns) {
        const matches = query.match(pattern);
        if (matches) {
          entities.dates.push(...matches);
        }
      }
    }
    
    // Extract times
    if (entityTypes.includes('time')) {
      const timePatterns = [
        // HH:MM AM/PM
        /(\d{1,2}):(\d{2})\s*(am|pm)/gi,
        // HH AM/PM
        /(\d{1,2})\s*(am|pm)/gi,
        // Military time
        /(\d{1,2}):(\d{2})/g,
        // Words like noon, midnight
        /\b(noon|midnight)\b/gi
      ];
      
      entities.times = [];
      
      for (const pattern of timePatterns) {
        const matches = query.match(pattern);
        if (matches) {
          entities.times.push(...matches);
        }
      }
    }
    
    // Extract player names (simplified approach)
    if (entityTypes.includes('player')) {
      // This is a simplified approach - in a real system, we'd match against a database of player names
      const playerPattern = /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g;
      const matches = query.match(playerPattern);
      
      if (matches) {
        entities.players = matches;
      } else {
        entities.players = [];
      }
    }
    
    // Extract document references
    if (entityTypes.includes('document')) {
      const documentPatterns = [
        // Document with quotes
        /"([^"]+)"/g,
        // Document with "document" or "file" keyword
        /\b(document|file|doc)\s+(?:titled|named|called)?\s*"?([^"]+)"?/gi
      ];
      
      entities.documents = [];
      
      for (const pattern of documentPatterns) {
        const matches = query.match(pattern);
        if (matches) {
          entities.documents.push(...matches);
        }
      }
    }
    
    return entities;
  }

  /**
   * Handle document search intent
   * @param {string} query User query
   * @param {string} userId User ID
   * @param {Object} conversation Conversation object
   * @return {Promise<Object>} Response
   */
  async handleDocumentSearch(query, userId, conversation) {
    try {
      // Extract search terms
      const searchTerms = query.replace(/find|search|look for|get|documents|files|about|related to|containing/gi, '').trim();
      
      // Get user
      const User = this.databaseService.getModels().User;
      const user = await User.findById(userId);
      
      // Search documents
      const searchResults = await this.databaseService.searchDocuments({
        searchText: searchTerms,
        page: 1,
        limit: 5
      }, user);
      
      // Format response
      let message;
      
      if (searchResults.total === 0) {
        message = `I couldn't find any documents matching "${searchTerms}". Would you like to try a different search term?`;
        return { message, documents: [] };
      }
      
      message = `I found ${searchResults.total} document${searchResults.total === 1 ? '' : 's'} matching "${searchTerms}":\n\n`;
      
      for (let i = 0; i < searchResults.hits.length; i++) {
        const doc = searchResults.hits[i];
        message += `${i + 1}. ${doc.title}`;
        
        if (doc.description) {
          message += ` - ${doc.description.substring(0, 100)}${doc.description.length > 100 ? '...' : ''}`;
        }
        
        message += '\n';
      }
      
      if (searchResults.total > searchResults.hits.length) {
        message += `\nThere are ${searchResults.total - searchResults.hits.length} more results. Would you like to see more?`;
      }
      
      return {
        message,
        documents: searchResults.hits
      };
    } catch (error) {
      console.error('Error handling document search:', error);
      return {
        message: 'I encountered an error while searching for documents. Please try again later.',
        documents: []
      };
    }
  }

  /**
   * Handle document summary intent
   * @param {string} query User query
   * @param {string} userId User ID
   * @param {Object} conversation Conversation object
   * @return {Promise<Object>} Response
   */
  async handleDocumentSummary(query, userId, conversation) {
    try {
      // Extract document reference
      const entities = this.extractEntities(query, ['document']);
      
      if (!entities.documents || entities.documents.length === 0) {
        // No specific document mentioned, check if there are documents in context
        const contextDocuments = conversation.messages
          .filter(msg => msg.relatedDocuments && msg.relatedDocuments.length > 0)
          .flatMap(msg => msg.relatedDocuments);
        
        if (contextDocuments.length === 0) {
          return {
            message: 'Which document would you like me to summarize? Please provide the document name or search for it first.',
            documents: []
          };
        }
        
        // Use the most recent document in context
        const Document = this.databaseService.getModels().Document;
        const document = await Document.findById(contextDocuments[0]);
        
        if (!document) {
          return {
            message: 'I couldn\'t find the document you\'re referring to. Please provide the document name or search for it first.',
            documents: []
          };
        }
        
        return this.generateDocumentSummary(document, userId);
      }
      
      // Extract document name from the first match
      let documentName = entities.documents[0];
      
      // Clean up document name
      documentName = documentName.replace(/document|file|doc|titled|named|called|"/gi, '').trim();
      
      // Search for the document
      const User = this.databaseService.getModels().User;
      const user = await User.findById(userId);
      
      const searchResults = await this.databas
(Content truncated due to size limit. Use line ranges to read in chunks)