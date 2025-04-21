// Calendar Controller - REST API endpoints for calendar service
const express = require('express');
const router = express.Router();

class CalendarController {
  constructor(calendarService) {
    this.calendarService = calendarService;
    this.router = router;
    
    this.setupRoutes();
  }
  
  setupRoutes() {
    // Get OAuth2 authorization URL
    this.router.get('/auth-url', this.getAuthUrl.bind(this));
    
    // Exchange authorization code for tokens
    this.router.post('/auth-callback', this.handleAuthCallback.bind(this));
    
    // Create an event
    this.router.post('/events', this.createEvent.bind(this));
    
    // Get an event
    this.router.get('/events/:calendarId/:eventId', this.getEvent.bind(this));
    
    // Update an event
    this.router.put('/events/:calendarId/:eventId', this.updateEvent.bind(this));
    
    // Delete an event
    this.router.delete('/events/:calendarId/:eventId', this.deleteEvent.bind(this));
    
    // List events
    this.router.get('/events', this.listEvents.bind(this));
    
    // Create calendar
    this.router.post('/calendars', this.createCalendar.bind(this));
  }
  
  /**
   * Get OAuth2 authorization URL
   * @param {Request} req Express request
   * @param {Response} res Express response
   * @return {Promise<void>}
   */
  async getAuthUrl(req, res) {
    try {
      const { scopes } = req.query;
      
      const authUrl = this.calendarService.getAuthUrl(
        scopes ? scopes.split(',') : undefined
      );
      
      return res.json({
        success: true,
        data: {
          authUrl
        }
      });
    } catch (error) {
      console.error('Error getting auth URL:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Handle OAuth2 callback
   * @param {Request} req Express request
   * @param {Response} res Express response
   * @return {Promise<void>}
   */
  async handleAuthCallback(req, res) {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'Authorization code is required'
        });
      }
      
      const tokens = await this.calendarService.getTokens(code);
      
      return res.json({
        success: true,
        data: {
          tokens
        }
      });
    } catch (error) {
      console.error('Error handling auth callback:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Create an event
   * @param {Request} req Express request
   * @param {Response} res Express response
   * @return {Promise<void>}
   */
  async createEvent(req, res) {
    try {
      const { userId, title, description, location, startTime, endTime, timezone, attendees, reminders, calendarId } = req.body;
      
      if (!title) {
        return res.status(400).json({
          success: false,
          error: 'Event title is required'
        });
      }
      
      if (!startTime) {
        return res.status(400).json({
          success: false,
          error: 'Event start time is required'
        });
      }
      
      if (!endTime) {
        return res.status(400).json({
          success: false,
          error: 'Event end time is required'
        });
      }
      
      const result = await this.calendarService.createEvent(
        {
          userId,
          title,
          description,
          location,
          startTime,
          endTime,
          timezone,
          attendees,
          reminders
        },
        calendarId
      );
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }
      
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error creating event:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Get an event
   * @param {Request} req Express request
   * @param {Response} res Express response
   * @return {Promise<void>}
   */
  async getEvent(req, res) {
    try {
      const { calendarId, eventId } = req.params;
      
      if (!eventId) {
        return res.status(400).json({
          success: false,
          error: 'Event ID is required'
        });
      }
      
      const result = await this.calendarService.getEvent(calendarId, eventId);
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }
      
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting event:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Update an event
   * @param {Request} req Express request
   * @param {Response} res Express response
   * @return {Promise<void>}
   */
  async updateEvent(req, res) {
    try {
      const { calendarId, eventId } = req.params;
      const { userId, title, description, location, startTime, endTime, timezone, attendees, reminders } = req.body;
      
      if (!eventId) {
        return res.status(400).json({
          success: false,
          error: 'Event ID is required'
        });
      }
      
      const updates = {};
      
      if (title) updates.title = title;
      if (description) updates.description = description;
      if (location) updates.location = location;
      if (startTime) updates.startTime = startTime;
      if (endTime) updates.endTime = endTime;
      if (timezone) updates.timezone = timezone;
      if (attendees) updates.attendees = attendees;
      if (reminders) updates.reminders = reminders;
      if (userId) updates.userId = userId;
      
      const result = await this.calendarService.updateEvent(calendarId, eventId, updates);
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }
      
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error updating event:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Delete an event
   * @param {Request} req Express request
   * @param {Response} res Express response
   * @return {Promise<void>}
   */
  async deleteEvent(req, res) {
    try {
      const { calendarId, eventId } = req.params;
      const { userId } = req.body;
      
      if (!eventId) {
        return res.status(400).json({
          success: false,
          error: 'Event ID is required'
        });
      }
      
      const result = await this.calendarService.deleteEvent(calendarId, eventId, userId);
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }
      
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * List events
   * @param {Request} req Express request
   * @param {Response} res Express response
   * @return {Promise<void>}
   */
  async listEvents(req, res) {
    try {
      const { calendarId, timeMin, timeMax, maxResults, query } = req.query;
      
      const result = await this.calendarService.listEvents(
        {
          timeMin,
          timeMax,
          maxResults: maxResults ? parseInt(maxResults) : undefined,
          query
        },
        calendarId
      );
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }
      
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error listing events:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Create calendar
   * @param {Request} req Express request
   * @param {Response} res Express response
   * @return {Promise<void>}
   */
  async createCalendar(req, res) {
    try {
      const { summary, description, timezone } = req.body;
      
      if (!summary) {
        return res.status(400).json({
          success: false,
          error: 'Calendar summary is required'
        });
      }
      
      const result = await this.calendarService.createCalendar(
        summary,
        description,
        timezone
      );
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }
      
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error creating calendar:', error);
      
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

module.exports = CalendarController;
