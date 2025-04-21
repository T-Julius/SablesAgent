// Calendar Service - Integration with Google Calendar
const { google } = require('googleapis');

class CalendarService {
  constructor(options = {}) {
    this.databaseService = options.databaseService;
    
    // Configure Google Calendar API
    this.auth = new google.auth.OAuth2(
      options.clientId || process.env.GOOGLE_CLIENT_ID,
      options.clientSecret || process.env.GOOGLE_CLIENT_SECRET,
      options.redirectUri || process.env.GOOGLE_REDIRECT_URI
    );
    
    // Set credentials if provided
    if (options.credentials) {
      this.auth.setCredentials(options.credentials);
    }
    
    // Create calendar client
    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
    
    // Default calendar ID
    this.defaultCalendarId = options.calendarId || process.env.GOOGLE_CALENDAR_ID || 'primary';
  }

  /**
   * Set OAuth2 credentials
   * @param {Object} credentials OAuth2 credentials
   */
  setCredentials(credentials) {
    this.auth.setCredentials(credentials);
  }

  /**
   * Get OAuth2 authorization URL
   * @param {Array} scopes OAuth2 scopes
   * @return {string} Authorization URL
   */
  getAuthUrl(scopes = ['https://www.googleapis.com/auth/calendar']) {
    return this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes
    });
  }

  /**
   * Exchange authorization code for tokens
   * @param {string} code Authorization code
   * @return {Promise<Object>} OAuth2 tokens
   */
  async getTokens(code) {
    const { tokens } = await this.auth.getToken(code);
    this.auth.setCredentials(tokens);
    return tokens;
  }

  /**
   * Create an event
   * @param {Object} eventData Event data
   * @param {string} calendarId Optional calendar ID
   * @return {Promise<Object>} Created event
   */
  async createEvent(eventData, calendarId = null) {
    try {
      // Validate event data
      if (!eventData.title) {
        throw new Error('Event title is required');
      }
      
      if (!eventData.startTime) {
        throw new Error('Event start time is required');
      }
      
      if (!eventData.endTime) {
        throw new Error('Event end time is required');
      }
      
      // Prepare event resource
      const event = {
        summary: eventData.title,
        description: eventData.description || '',
        location: eventData.location || '',
        start: {
          dateTime: new Date(eventData.startTime).toISOString(),
          timeZone: eventData.timezone || 'Africa/Harare'
        },
        end: {
          dateTime: new Date(eventData.endTime).toISOString(),
          timeZone: eventData.timezone || 'Africa/Harare'
        }
      };
      
      // Add attendees if provided
      if (eventData.attendees && eventData.attendees.length > 0) {
        event.attendees = [];
        
        for (const attendee of eventData.attendees) {
          if (attendee.email) {
            event.attendees.push({
              email: attendee.email,
              displayName: attendee.name || '',
              responseStatus: 'needsAction'
            });
          } else if (attendee.userId) {
            // Get user email from database
            const User = this.databaseService.getModels().User;
            const user = await User.findById(attendee.userId);
            
            if (user && user.email) {
              event.attendees.push({
                email: user.email,
                displayName: user.name || '',
                responseStatus: 'needsAction'
              });
            }
          }
        }
      }
      
      // Add reminders if provided
      if (eventData.reminders && eventData.reminders.length > 0) {
        event.reminders = {
          useDefault: false,
          overrides: eventData.reminders.map(reminder => ({
            method: reminder.method || 'email',
            minutes: reminder.minutes || 30
          }))
        };
      } else {
        event.reminders = {
          useDefault: true
        };
      }
      
      // Create event
      const response = await this.calendar.events.insert({
        calendarId: calendarId || this.defaultCalendarId,
        resource: event,
        sendUpdates: 'all'
      });
      
      // Log event creation
      await this.logCalendarAction('create', response.data, eventData.userId);
      
      return {
        success: true,
        calendarId: calendarId || this.defaultCalendarId,
        eventId: response.data.id,
        htmlLink: response.data.htmlLink,
        event: response.data
      };
    } catch (error) {
      console.error('Error creating calendar event:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get an event
   * @param {string} calendarId Calendar ID
   * @param {string} eventId Event ID
   * @return {Promise<Object>} Event
   */
  async getEvent(calendarId, eventId) {
    try {
      const response = await this.calendar.events.get({
        calendarId: calendarId || this.defaultCalendarId,
        eventId
      });
      
      return {
        success: true,
        event: response.data
      };
    } catch (error) {
      console.error('Error getting calendar event:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update an event
   * @param {string} calendarId Calendar ID
   * @param {string} eventId Event ID
   * @param {Object} updates Event updates
   * @return {Promise<Object>} Updated event
   */
  async updateEvent(calendarId, eventId, updates) {
    try {
      // Get current event
      const currentEvent = await this.getEvent(calendarId, eventId);
      
      if (!currentEvent.success) {
        throw new Error(`Event not found: ${eventId}`);
      }
      
      // Prepare update resource
      const event = { ...currentEvent.event };
      
      if (updates.title) {
        event.summary = updates.title;
      }
      
      if (updates.description) {
        event.description = updates.description;
      }
      
      if (updates.location) {
        event.location = updates.location;
      }
      
      if (updates.startTime) {
        event.start = {
          dateTime: new Date(updates.startTime).toISOString(),
          timeZone: updates.timezone || event.start.timeZone
        };
      }
      
      if (updates.endTime) {
        event.end = {
          dateTime: new Date(updates.endTime).toISOString(),
          timeZone: updates.timezone || event.end.timeZone
        };
      }
      
      // Update attendees if provided
      if (updates.attendees) {
        event.attendees = [];
        
        for (const attendee of updates.attendees) {
          if (attendee.email) {
            event.attendees.push({
              email: attendee.email,
              displayName: attendee.name || '',
              responseStatus: 'needsAction'
            });
          } else if (attendee.userId) {
            // Get user email from database
            const User = this.databaseService.getModels().User;
            const user = await User.findById(attendee.userId);
            
            if (user && user.email) {
              event.attendees.push({
                email: user.email,
                displayName: user.name || '',
                responseStatus: 'needsAction'
              });
            }
          }
        }
      }
      
      // Update reminders if provided
      if (updates.reminders) {
        event.reminders = {
          useDefault: false,
          overrides: updates.reminders.map(reminder => ({
            method: reminder.method || 'email',
            minutes: reminder.minutes || 30
          }))
        };
      }
      
      // Update event
      const response = await this.calendar.events.update({
        calendarId: calendarId || this.defaultCalendarId,
        eventId,
        resource: event,
        sendUpdates: 'all'
      });
      
      // Log event update
      await this.logCalendarAction('update', response.data, updates.userId);
      
      return {
        success: true,
        calendarId: calendarId || this.defaultCalendarId,
        eventId: response.data.id,
        htmlLink: response.data.htmlLink,
        event: response.data
      };
    } catch (error) {
      console.error('Error updating calendar event:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete an event
   * @param {string} calendarId Calendar ID
   * @param {string} eventId Event ID
   * @param {string} userId User ID
   * @return {Promise<Object>} Result
   */
  async deleteEvent(calendarId, eventId, userId) {
    try {
      await this.calendar.events.delete({
        calendarId: calendarId || this.defaultCalendarId,
        eventId,
        sendUpdates: 'all'
      });
      
      // Log event deletion
      await this.logCalendarAction('delete', { id: eventId }, userId);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List events
   * @param {Object} options List options
   * @param {string} calendarId Optional calendar ID
   * @return {Promise<Object>} Events
   */
  async listEvents(options = {}, calendarId = null) {
    try {
      const params = {
        calendarId: calendarId || this.defaultCalendarId,
        maxResults: options.maxResults || 100,
        singleEvents: true,
        orderBy: 'startTime'
      };
      
      if (options.timeMin) {
        params.timeMin = new Date(options.timeMin).toISOString();
      } else {
        params.timeMin = new Date().toISOString();
      }
      
      if (options.timeMax) {
        params.timeMax = new Date(options.timeMax).toISOString();
      }
      
      if (options.query) {
        params.q = options.query;
      }
      
      const response = await this.calendar.events.list(params);
      
      return {
        success: true,
        events: response.data.items || []
      };
    } catch (error) {
      console.error('Error listing calendar events:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create calendar
   * @param {string} summary Calendar summary
   * @param {string} description Calendar description
   * @param {string} timezone Calendar timezone
   * @return {Promise<Object>} Created calendar
   */
  async createCalendar(summary, description = '', timezone = 'Africa/Harare') {
    try {
      const response = await this.calendar.calendars.insert({
        resource: {
          summary,
          description,
          timeZone: timezone
        }
      });
      
      return {
        success: true,
        calendarId: response.data.id,
        calendar: response.data
      };
    } catch (error) {
      console.error('Error creating calendar:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Log calendar action
   * @param {string} action Action type
   * @param {Object} event Event data
   * @param {string} userId User ID
   * @return {Promise<void>}
   */
  async logCalendarAction(action, event, userId) {
    try {
      if (!this.databaseService) {
        return;
      }
      
      const AuditLog = this.databaseService.getModels().AuditLog;
      
      await AuditLog.logAction({
        userId,
        action: action === 'create' ? 'create' : action === 'update' ? 'update' : 'delete',
        resourceType: 'event',
        resourceId: event.id,
        details: {
          type: 'calendar',
          action,
          eventId: event.id,
          title: event.summary,
          startTime: event.start ? event.start.dateTime : null
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error logging calendar action:', error);
    }
  }
}

module.exports = CalendarService;
