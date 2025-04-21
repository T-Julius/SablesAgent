# Zimbabwe Sables Rugby Team Document Management System - Database Schema

## Overview

This document outlines the database schema for the Zimbabwe Sables Rugby Team Document Management System. The system uses MongoDB as the primary database for storing document metadata, user information, and system data.

## Collections

### Users Collection

Stores information about system users including administrators and players.

```json
{
  "_id": "ObjectId",
  "email": "String",
  "name": "String",
  "role": "String (admin, player, coach, staff)",
  "playerInfo": {
    "position": "String",
    "jerseyNumber": "Number",
    "joinDate": "Date",
    "status": "String (active, injured, reserve)"
  },
  "googleId": "String",
  "profilePicture": "String (URL)",
  "createdAt": "Date",
  "updatedAt": "Date",
  "lastLogin": "Date",
  "preferences": {
    "notificationSettings": {
      "email": "Boolean",
      "inApp": "Boolean"
    },
    "timezone": "String"
  }
}
```

### Documents Collection

Stores metadata for all documents integrated from Google Drive.

```json
{
  "_id": "ObjectId",
  "title": "String",
  "description": "String",
  "googleDriveId": "String",
  "googleDriveLink": "String",
  "mimeType": "String",
  "fileExtension": "String",
  "size": "Number",
  "createdBy": "ObjectId (ref: Users)",
  "createdAt": "Date",
  "updatedAt": "Date",
  "lastSyncedAt": "Date",
  "tags": ["String"],
  "category": "String",
  "accessLevel": "String (public, team, admin, specific)",
  "allowedUsers": ["ObjectId (ref: Users)"],
  "version": "Number",
  "versionHistory": [
    {
      "version": "Number",
      "updatedAt": "Date",
      "updatedBy": "ObjectId (ref: Users)",
      "googleDriveRevisionId": "String"
    }
  ],
  "metadata": {
    "playerRelated": "Boolean",
    "relatedPlayers": ["ObjectId (ref: Users)"],
    "eventRelated": "Boolean",
    "relatedEvents": ["ObjectId (ref: Events)"],
    "documentType": "String (contract, medical, performance, training, etc.)",
    "customFields": {
      "key1": "value1",
      "key2": "value2"
    }
  },
  "contentIndex": "String (searchable content extract)"
}
```

### Folders Collection

Represents the folder structure from Google Drive.

```json
{
  "_id": "ObjectId",
  "name": "String",
  "googleDriveId": "String",
  "parentFolder": "ObjectId (ref: Folders)",
  "path": "String",
  "createdAt": "Date",
  "updatedAt": "Date",
  "accessLevel": "String (public, team, admin, specific)",
  "allowedUsers": ["ObjectId (ref: Users)"]
}
```

### Events Collection

Stores calendar events and appointments.

```json
{
  "_id": "ObjectId",
  "title": "String",
  "description": "String",
  "startTime": "Date",
  "endTime": "Date",
  "location": "String",
  "googleCalendarId": "String",
  "googleEventId": "String",
  "createdBy": "ObjectId (ref: Users)",
  "createdAt": "Date",
  "updatedAt": "Date",
  "attendees": [
    {
      "userId": "ObjectId (ref: Users)",
      "email": "String",
      "status": "String (accepted, declined, pending)",
      "notified": "Boolean"
    }
  ],
  "eventType": "String (match, training, meeting, medical, etc.)",
  "relatedDocuments": ["ObjectId (ref: Documents)"],
  "recurring": "Boolean",
  "recurrenceRule": "String (iCal RRule format)",
  "reminders": [
    {
      "time": "Number (minutes before event)",
      "type": "String (email, notification)",
      "sent": "Boolean"
    }
  ]
}
```

### Notifications Collection

Stores system notifications and reminders.

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: Users)",
  "title": "String",
  "message": "String",
  "type": "String (document, event, system)",
  "status": "String (unread, read, dismissed)",
  "createdAt": "Date",
  "readAt": "Date",
  "priority": "String (low, normal, high)",
  "relatedDocument": "ObjectId (ref: Documents)",
  "relatedEvent": "ObjectId (ref: Events)",
  "actionUrl": "String"
}
```

### AuditLogs Collection

Tracks all system activities for compliance and traceability.

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: Users)",
  "action": "String (create, read, update, delete, login, logout, etc.)",
  "resourceType": "String (document, user, event, etc.)",
  "resourceId": "ObjectId",
  "details": "Object",
  "ipAddress": "String",
  "userAgent": "String",
  "timestamp": "Date"
}
```

### SearchQueries Collection

Stores user search queries for analytics and improvement.

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: Users)",
  "query": "String",
  "filters": "Object",
  "resultCount": "Number",
  "timestamp": "Date",
  "executionTimeMs": "Number",
  "clickedResults": [
    {
      "documentId": "ObjectId (ref: Documents)",
      "position": "Number"
    }
  ]
}
```

### AgentConversations Collection

Stores conversations with the intelligent agent.

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: Users)",
  "startedAt": "Date",
  "endedAt": "Date",
  "messages": [
    {
      "sender": "String (user, agent)",
      "content": "String",
      "timestamp": "Date",
      "relatedDocuments": ["ObjectId (ref: Documents)"],
      "relatedEvents": ["ObjectId (ref: Events)"],
      "actions": [
        {
          "type": "String (document_retrieval, email_send, event_create, etc.)",
          "details": "Object",
          "status": "String (pending, completed, failed)",
          "timestamp": "Date"
        }
      ]
    }
  ],
  "context": "Object",
  "intent": "String",
  "status": "String (active, completed, archived)"
}
```

## Indexes

### Users Collection
- email (unique)
- googleId (unique)
- role

### Documents Collection
- googleDriveId (unique)
- title
- tags
- category
- accessLevel
- "metadata.relatedPlayers"
- contentIndex (text index)

### Folders Collection
- googleDriveId (unique)
- parentFolder
- path

### Events Collection
- startTime
- endTime
- "attendees.userId"
- eventType

### Notifications Collection
- userId
- status
- createdAt

### AuditLogs Collection
- userId
- action
- resourceType
- resourceId
- timestamp

### SearchQueries Collection
- userId
- timestamp

### AgentConversations Collection
- userId
- startedAt
- status

## Relationships

1. **Users to Documents**:
   - One-to-many: A user can create/own multiple documents
   - Many-to-many: Documents can be accessible to multiple users

2. **Users to Events**:
   - One-to-many: A user can create multiple events
   - Many-to-many: Events can have multiple attendees

3. **Documents to Events**:
   - Many-to-many: Events can have related documents

4. **Folders to Documents**:
   - One-to-many: A folder can contain multiple documents

5. **Folders to Folders**:
   - One-to-many: A folder can contain multiple subfolders (hierarchical)

6. **Users to Notifications**:
   - One-to-many: A user can have multiple notifications

7. **Users to AgentConversations**:
   - One-to-many: A user can have multiple conversations with the agent

## Data Migration and Synchronization

The system will implement the following strategies for data synchronization with Google Drive:

1. **Initial Import**:
   - Full scan of Google Drive folders and files
   - Creation of corresponding database records
   - Extraction of metadata and content for indexing

2. **Incremental Sync**:
   - Periodic polling for changes (every 5-15 minutes)
   - Webhook integration for real-time updates when available
   - Change tracking using Google Drive API's changes endpoint

3. **Conflict Resolution**:
   - Last-write-wins strategy for basic conflicts
   - Version history tracking for all document changes
   - Notification to administrators for manual resolution of complex conflicts

## Data Backup and Recovery

1. **Regular Backups**:
   - Daily full database backups
   - Hourly incremental backups
   - Retention policy: 7 daily backups, 4 weekly backups, 3 monthly backups

2. **Recovery Procedures**:
   - Point-in-time recovery capability
   - Automated recovery testing
   - Documented recovery procedures

## Data Security

1. **Encryption**:
   - Encryption at rest for all database data
   - Encryption in transit for all API communications

2. **Access Control**:
   - Field-level security for sensitive data
   - Collection-level access policies
   - Database user roles with least privilege

3. **Auditing**:
   - Comprehensive logging of all database operations
   - Regular security audits and reviews
