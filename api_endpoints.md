# Zimbabwe Sables Rugby Team Document Management System - API Endpoints

## Overview

This document outlines the API endpoints for the Zimbabwe Sables Rugby Team Document Management System. The API follows RESTful principles and uses JSON for data exchange.

## Base URL

```
https://api.sables-docs.cloud/v1
```

## Authentication

All API endpoints require authentication using JWT tokens, except for the authentication endpoints.

Authentication headers:
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Authentication

#### POST /auth/login
Authenticates a user with Google OAuth.

**Request:**
```json
{
  "googleIdToken": "string"
}
```

**Response:**
```json
{
  "token": "string",
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "string",
    "profilePicture": "string"
  }
}
```

#### POST /auth/refresh
Refreshes an authentication token.

**Request:**
```json
{
  "refreshToken": "string"
}
```

**Response:**
```json
{
  "token": "string"
}
```

#### POST /auth/logout
Logs out a user.

**Response:**
```json
{
  "success": true
}
```

### Users

#### GET /users
Returns a list of users.

**Query Parameters:**
- role (string, optional): Filter by user role
- limit (number, optional): Limit the number of results
- offset (number, optional): Offset for pagination

**Response:**
```json
{
  "users": [
    {
      "id": "string",
      "email": "string",
      "name": "string",
      "role": "string",
      "profilePicture": "string",
      "playerInfo": {
        "position": "string",
        "jerseyNumber": "number",
        "status": "string"
      }
    }
  ],
  "total": "number",
  "limit": "number",
  "offset": "number"
}
```

#### GET /users/:id
Returns a specific user.

**Response:**
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "role": "string",
  "profilePicture": "string",
  "playerInfo": {
    "position": "string",
    "jerseyNumber": "number",
    "joinDate": "string",
    "status": "string"
  },
  "createdAt": "string",
  "updatedAt": "string",
  "lastLogin": "string",
  "preferences": {
    "notificationSettings": {
      "email": "boolean",
      "inApp": "boolean"
    },
    "timezone": "string"
  }
}
```

#### POST /users
Creates a new user (admin only).

**Request:**
```json
{
  "email": "string",
  "name": "string",
  "role": "string",
  "playerInfo": {
    "position": "string",
    "jerseyNumber": "number",
    "status": "string"
  }
}
```

**Response:**
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "role": "string"
}
```

#### PUT /users/:id
Updates a user.

**Request:**
```json
{
  "name": "string",
  "role": "string",
  "playerInfo": {
    "position": "string",
    "jerseyNumber": "number",
    "status": "string"
  },
  "preferences": {
    "notificationSettings": {
      "email": "boolean",
      "inApp": "boolean"
    },
    "timezone": "string"
  }
}
```

**Response:**
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "role": "string",
  "updatedAt": "string"
}
```

#### DELETE /users/:id
Deletes a user (admin only).

**Response:**
```json
{
  "success": true
}
```

### Documents

#### GET /documents
Returns a list of documents.

**Query Parameters:**
- query (string, optional): Search query
- category (string, optional): Filter by category
- tags (array, optional): Filter by tags
- accessLevel (string, optional): Filter by access level
- limit (number, optional): Limit the number of results
- offset (number, optional): Offset for pagination

**Response:**
```json
{
  "documents": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "googleDriveLink": "string",
      "mimeType": "string",
      "fileExtension": "string",
      "size": "number",
      "createdBy": {
        "id": "string",
        "name": "string"
      },
      "createdAt": "string",
      "updatedAt": "string",
      "tags": ["string"],
      "category": "string",
      "accessLevel": "string"
    }
  ],
  "total": "number",
  "limit": "number",
  "offset": "number"
}
```

#### GET /documents/:id
Returns a specific document.

**Response:**
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "googleDriveId": "string",
  "googleDriveLink": "string",
  "mimeType": "string",
  "fileExtension": "string",
  "size": "number",
  "createdBy": {
    "id": "string",
    "name": "string"
  },
  "createdAt": "string",
  "updatedAt": "string",
  "lastSyncedAt": "string",
  "tags": ["string"],
  "category": "string",
  "accessLevel": "string",
  "allowedUsers": [
    {
      "id": "string",
      "name": "string"
    }
  ],
  "version": "number",
  "versionHistory": [
    {
      "version": "number",
      "updatedAt": "string",
      "updatedBy": {
        "id": "string",
        "name": "string"
      }
    }
  ],
  "metadata": {
    "playerRelated": "boolean",
    "relatedPlayers": [
      {
        "id": "string",
        "name": "string"
      }
    ],
    "eventRelated": "boolean",
    "relatedEvents": [
      {
        "id": "string",
        "title": "string"
      }
    ],
    "documentType": "string",
    "customFields": {
      "key1": "value1",
      "key2": "value2"
    }
  }
}
```

#### POST /documents
Creates a new document reference.

**Request:**
```json
{
  "title": "string",
  "description": "string",
  "googleDriveId": "string",
  "tags": ["string"],
  "category": "string",
  "accessLevel": "string",
  "allowedUsers": ["string"],
  "metadata": {
    "playerRelated": "boolean",
    "relatedPlayers": ["string"],
    "eventRelated": "boolean",
    "relatedEvents": ["string"],
    "documentType": "string",
    "customFields": {
      "key1": "value1",
      "key2": "value2"
    }
  }
}
```

**Response:**
```json
{
  "id": "string",
  "title": "string",
  "googleDriveId": "string",
  "createdAt": "string"
}
```

#### PUT /documents/:id
Updates a document.

**Request:**
```json
{
  "title": "string",
  "description": "string",
  "tags": ["string"],
  "category": "string",
  "accessLevel": "string",
  "allowedUsers": ["string"],
  "metadata": {
    "playerRelated": "boolean",
    "relatedPlayers": ["string"],
    "eventRelated": "boolean",
    "relatedEvents": ["string"],
    "documentType": "string",
    "customFields": {
      "key1": "value1",
      "key2": "value2"
    }
  }
}
```

**Response:**
```json
{
  "id": "string",
  "title": "string",
  "updatedAt": "string"
}
```

#### DELETE /documents/:id
Deletes a document reference (does not delete from Google Drive).

**Response:**
```json
{
  "success": true
}
```

#### POST /documents/:id/share
Shares a document with specific users.

**Request:**
```json
{
  "userIds": ["string"],
  "message": "string"
}
```

**Response:**
```json
{
  "success": true,
  "sharedWith": ["string"]
}
```

### Folders

#### GET /folders
Returns a list of folders.

**Query Parameters:**
- parentId (string, optional): Filter by parent folder
- path (string, optional): Filter by path
- limit (number, optional): Limit the number of results
- offset (number, optional): Offset for pagination

**Response:**
```json
{
  "folders": [
    {
      "id": "string",
      "name": "string",
      "googleDriveId": "string",
      "parentFolder": "string",
      "path": "string",
      "createdAt": "string",
      "updatedAt": "string",
      "accessLevel": "string"
    }
  ],
  "total": "number",
  "limit": "number",
  "offset": "number"
}
```

#### GET /folders/:id
Returns a specific folder.

**Response:**
```json
{
  "id": "string",
  "name": "string",
  "googleDriveId": "string",
  "parentFolder": {
    "id": "string",
    "name": "string"
  },
  "path": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "accessLevel": "string",
  "allowedUsers": [
    {
      "id": "string",
      "name": "string"
    }
  ]
}
```

#### GET /folders/:id/contents
Returns the contents of a folder (documents and subfolders).

**Response:**
```json
{
  "folders": [
    {
      "id": "string",
      "name": "string",
      "path": "string"
    }
  ],
  "documents": [
    {
      "id": "string",
      "title": "string",
      "mimeType": "string",
      "updatedAt": "string"
    }
  ]
}
```

### Events

#### GET /events
Returns a list of events.

**Query Parameters:**
- startDate (string, optional): Filter by start date
- endDate (string, optional): Filter by end date
- eventType (string, optional): Filter by event type
- limit (number, optional): Limit the number of results
- offset (number, optional): Offset for pagination

**Response:**
```json
{
  "events": [
    {
      "id": "string",
      "title": "string",
      "startTime": "string",
      "endTime": "string",
      "location": "string",
      "eventType": "string",
      "createdBy": {
        "id": "string",
        "name": "string"
      }
    }
  ],
  "total": "number",
  "limit": "number",
  "offset": "number"
}
```

#### GET /events/:id
Returns a specific event.

**Response:**
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "startTime": "string",
  "endTime": "string",
  "location": "string",
  "googleCalendarId": "string",
  "googleEventId": "string",
  "createdBy": {
    "id": "string",
    "name": "string"
  },
  "createdAt": "string",
  "updatedAt": "string",
  "attendees": [
    {
      "userId": "string",
      "name": "string",
      "email": "string",
      "status": "string"
    }
  ],
  "eventType": "string",
  "relatedDocuments": [
    {
      "id": "string",
      "title": "string"
    }
  ],
  "recurring": "boolean",
  "recurrenceRule": "string",
  "reminders": [
    {
      "time": "number",
      "type": "string"
    }
  ]
}
```

#### POST /events
Creates a new event.

**Request:**
```json
{
  "title": "string",
  "description": "string",
  "startTime": "string",
  "endTime": "string",
  "location": "string",
  "attendees": [
    {
      "userId": "string",
      "email": "string"
    }
  ],
  "eventType": "string",
  "relatedDocuments": ["string"],
  "recurring": "boolean",
  "recurrenceRule": "string",
  "reminders": [
    {
      "time": "number",
      "type": "string"
    }
  ]
}
```

**Response:**
```json
{
  "id": "string",
  "title": "string",
  "googleEventId": "string",
  "createdAt": "string"
}
```

#### PUT /events/:id
Updates an event.

**Request:**
```json
{
  "title": "string",
  "description": "string",
  "startTime": "string",
  "endTime": "string",
  "location": "string",
  "attendees": [
    {
      "userId": "string",
      "email": "string"
    }
  ],
  "eventType": "string",
  "relatedDocuments": ["string"],
  "recurring": "boolean",
  "recurrenceRule": "string",
  "reminders": [
    {
      "time": "number",
      "type": "string"
    }
  ]
}
```

**Response:**
```json
{
  "id": "string",
  "title": "string",
  "updatedAt": "string"
}
```

#### DELETE /events/:id
Deletes an event.

**Response:**
```json
{
  "success": true
}
```

### Notifications

#### GET /notifications
Returns a list of notifications for the current user.

**Query Parameters:**
- status (string, optional): Filter by status (unread, read, dismissed)
- limit (number, optional): Limit the number of results
- offset (number, optional): Offset for pagination

**Response:**
```json
{
  "notifications": [
    {
      "id": "string",
      "title": "string",
      "message": "string",
      "type": "string",
      "status": "string",
      "createdAt": "string",
      "priority": "string"
    }
  ],
  "total": "number",
  "limit": "number",
  "offset": "number"
}
```

#### PUT /notifications/:id
Updates a notification status.

**Request:**
```json
{
  "status": "string"
}
```

**Response:**
```json
{
  "id": "string",
  "status": "string",
  "updatedAt": "string"
}
```

#### POST /notifications
Creates a new notification (admin only).

**Request:**
```json
{
  "userId": "string",
  "title": "string",
  "message": "string",
  "type": "string",
  "priority": "string",
  "relatedDocument": "string",
  "relatedEvent": "string",
  "actionUrl": "string"
}
```

**Response:**
```json
{
  "id": "string",
  "title": "string",
  "createdAt": "string"
}
```

### Agent

#### POST /agent/query
Sends a query to the intelligent agent.

**Request:**
```json
{
  "query": "string",
  "conversationId": "string (optional)"
}
```

**Response:**
```json
{
  "response": "string",
  "conversationId": "string",
  "relatedDocuments": [
    {
      "id": "string",
      "title": "string",
      "googleDriveLink": "string"
    }
  ],
  "relatedEvents": [
    {
      "id": "string",
      "title": "string",
      "startTime": "string"
    }
  ],
  "actions": [
    {
      "type": "string",
      "status": "string",
      "details": {}
    }
  ]
}
```

#### POST /agent/action
Executes an action through the intelligent agent.

**Request:**
```json
{
  "action": "string",
  "parameters": {},
  "conversationId": "string"
}
```

**Response:**
```json
{
  "success": "boolean",
  "result": {},
  "message": "string"
}
```

#### GET /agent/conversations
Returns a list of agent conversations for the current user.

**Response:**
```json
{
  "conversations": [
    {
      "id": "string",
      "startedAt": "string",
      "lastMessageAt": "string",
      "status": "string"
    }
  ]
}
```

#### GET /agent/conversations/:id
Returns a specific agent conversation.

**Response:**
```json
{
  "id": "string",
  "startedAt": "string",
  "endedAt": "string",
  "messages": [
    {
      "sender": "string",
      "content": "string",
      "timestamp": "string",
      "actions": [
        {
          "type": "string",
          "details": {},
          "status": "string"
        }
      ]
    }
  ],
  "status": "string"
}
```

### Search

#### POST /search
Performs a search across all documents.

**Request:**
```json
{
  "query": "string",
  "filters": {
    "category": "string",
    "tags": ["string"],
    "documentType": "string",
    "playerRelated": "boolean",
    "relatedPlayers": ["string"],
    "eventRelated": "boolean",
    "relatedEvents": ["string"],
    "dateRange": {
      "start": "string",
      "end": "string"
    }
  },
  "limit": "number",
  "offset": "number"
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "googleDriveLink": "string",
      "mimeType": "string",
      "updatedAt": "string",
      "category": "string",
      "tags": ["string"],
      "relevanceScore": "number",
      "highlight": "string"
    }
  ],
  "total": "number",
  "executionTimeMs": "number"
}
```

### System

#### GET /system/stats
Returns system statistics (admin only).

**Response:**
```json
{
  "users": {
    "total": "number",
    "byRole": {
      "admin": "number",
      "player": "number",
      "coach": "number",
      "staff": "number"
    }
  },
  "documents": {
    "total": "number",
    "byCategory": {},
    "byType": {}
  },
  "events": {
    "total": "number",
    "upcoming": "number",
    "byType": {}
  },
  "storage": {
    "totalSize": "number",
    "documentCount": "number"
  },
  "activity": {
    "searches": "number",
    "documentViews": "number",
    "agentQueries": "number"
  }
}
```

#### GET /system/audit-logs
Returns system audit logs (admin only).

**Query Parameters:**
- userId (string, optional): Filter by user
- action (string, optional): Filter by action
- resourceType (string, optional): Filter by resource type
- startDate (string, optional): Filter by start date
- endDate (string, optional): Filter by end date
- limit (number, optional): Limit the number of results
- offset (number, optional): Offset for pagination

**Response:**
```json
{
  "logs": [
    {
      "id": "string",
      "userId": "string",
      "userName": "string",
      "action": "string",
      "resourceType": "string",
      "resourceId": "string",
      "details": {},
      "timestamp": "string",
      "ipAddress": "string"
    }
  ],
  "total": "number",
  "limit": "number",
  "offset": "nu
(Content truncated due to size limit. Use line ranges to read in chunks)