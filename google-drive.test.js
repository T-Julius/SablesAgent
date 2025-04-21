const { expect } = require('chai');
const sinon = require('sinon');
const { google } = require('googleapis');

// Import the modules to test
const DriveClient = require('../../backend/google-drive/utils/drive-client');
const DocumentDiscovery = require('../../backend/google-drive/indexer/document-discovery');
const ContentExtractor = require('../../backend/google-drive/indexer/content-extractor');
const IndexingService = require('../../backend/google-drive/indexer/indexing-service');

describe('Google Drive Integration Tests', () => {
  let sandbox;
  let mockAuth;
  let mockDrive;
  let mockFiles;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock Google Drive API
    mockFiles = {
      list: sandbox.stub(),
      get: sandbox.stub(),
      export: sandbox.stub(),
      watch: sandbox.stub()
    };
    
    mockDrive = {
      files: mockFiles
    };
    
    mockAuth = {
      setCredentials: sandbox.stub()
    };
    
    sandbox.stub(google, 'drive').returns(mockDrive);
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('DriveClient', () => {
    let driveClient;
    
    beforeEach(() => {
      driveClient = new DriveClient({ auth: mockAuth });
    });
    
    it('should list files successfully', async () => {
      // Setup mock response
      const mockResponse = {
        data: {
          files: [
            { id: 'file1', name: 'Test Document 1', mimeType: 'application/vnd.google-apps.document' },
            { id: 'file2', name: 'Test Sheet 1', mimeType: 'application/vnd.google-apps.spreadsheet' }
          ],
          nextPageToken: 'token123'
        }
      };
      
      mockFiles.list.resolves(mockResponse);
      
      // Call the method
      const result = await driveClient.listFiles({
        pageSize: 10,
        query: "mimeType='application/vnd.google-apps.document'"
      });
      
      // Verify results
      expect(result.files).to.have.lengthOf(2);
      expect(result.nextPageToken).to.equal('token123');
      expect(mockFiles.list.calledOnce).to.be.true;
    });
    
    it('should get file metadata successfully', async () => {
      // Setup mock response
      const mockResponse = {
        data: {
          id: 'file1',
          name: 'Test Document 1',
          mimeType: 'application/vnd.google-apps.document',
          modifiedTime: '2025-04-20T10:00:00Z'
        }
      };
      
      mockFiles.get.resolves(mockResponse);
      
      // Call the method
      const result = await driveClient.getFile('file1');
      
      // Verify results
      expect(result.id).to.equal('file1');
      expect(result.name).to.equal('Test Document 1');
      expect(mockFiles.get.calledOnce).to.be.true;
      expect(mockFiles.get.firstCall.args[0]).to.deep.include({
        fileId: 'file1',
        fields: '*'
      });
    });
    
    it('should export file content successfully', async () => {
      // Setup mock response
      const mockResponse = {
        data: Buffer.from('Document content')
      };
      
      mockFiles.export.resolves(mockResponse);
      
      // Call the method
      const result = await driveClient.exportFile('file1', 'text/plain');
      
      // Verify results
      expect(result.toString()).to.equal('Document content');
      expect(mockFiles.export.calledOnce).to.be.true;
      expect(mockFiles.export.firstCall.args[0]).to.deep.include({
        fileId: 'file1',
        mimeType: 'text/plain'
      });
    });
  });
  
  describe('DocumentDiscovery', () => {
    let documentDiscovery;
    let mockDriveClient;
    
    beforeEach(() => {
      mockDriveClient = {
        listFiles: sandbox.stub()
      };
      
      documentDiscovery = new DocumentDiscovery({
        driveClient: mockDriveClient
      });
    });
    
    it('should discover Google Docs documents', async () => {
      // Setup mock response
      mockDriveClient.listFiles.resolves({
        files: [
          { id: 'doc1', name: 'Test Document 1', mimeType: 'application/vnd.google-apps.document' }
        ],
        nextPageToken: null
      });
      
      // Call the method
      const result = await documentDiscovery.discoverDocuments();
      
      // Verify results
      expect(result).to.have.lengthOf(1);
      expect(result[0].id).to.equal('doc1');
      expect(mockDriveClient.listFiles.calledOnce).to.be.true;
      expect(mockDriveClient.listFiles.firstCall.args[0]).to.deep.include({
        query: "mimeType='application/vnd.google-apps.document'"
      });
    });
    
    it('should discover Google Sheets documents', async () => {
      // Setup mock response
      mockDriveClient.listFiles.resolves({
        files: [
          { id: 'sheet1', name: 'Test Sheet 1', mimeType: 'application/vnd.google-apps.spreadsheet' }
        ],
        nextPageToken: null
      });
      
      // Call the method
      const result = await documentDiscovery.discoverSpreadsheets();
      
      // Verify results
      expect(result).to.have.lengthOf(1);
      expect(result[0].id).to.equal('sheet1');
      expect(mockDriveClient.listFiles.calledOnce).to.be.true;
      expect(mockDriveClient.listFiles.firstCall.args[0]).to.deep.include({
        query: "mimeType='application/vnd.google-apps.spreadsheet'"
      });
    });
  });
  
  describe('ContentExtractor', () => {
    let contentExtractor;
    let mockDriveClient;
    
    beforeEach(() => {
      mockDriveClient = {
        exportFile: sandbox.stub()
      };
      
      contentExtractor = new ContentExtractor({
        driveClient: mockDriveClient
      });
    });
    
    it('should extract text content from Google Docs', async () => {
      // Setup mock response
      mockDriveClient.exportFile.resolves(Buffer.from('Document content'));
      
      // Call the method
      const result = await contentExtractor.extractDocumentContent('doc1');
      
      // Verify results
      expect(result).to.equal('Document content');
      expect(mockDriveClient.exportFile.calledOnce).to.be.true;
      expect(mockDriveClient.exportFile.firstCall.args[0]).to.equal('doc1');
      expect(mockDriveClient.exportFile.firstCall.args[1]).to.equal('text/plain');
    });
    
    it('should extract CSV content from Google Sheets', async () => {
      // Setup mock response
      mockDriveClient.exportFile.resolves(Buffer.from('col1,col2\nval1,val2'));
      
      // Call the method
      const result = await contentExtractor.extractSpreadsheetContent('sheet1');
      
      // Verify results
      expect(result).to.equal('col1,col2\nval1,val2');
      expect(mockDriveClient.exportFile.calledOnce).to.be.true;
      expect(mockDriveClient.exportFile.firstCall.args[0]).to.equal('sheet1');
      expect(mockDriveClient.exportFile.firstCall.args[1]).to.equal('text/csv');
    });
  });
  
  describe('IndexingService', () => {
    let indexingService;
    let mockDocumentDiscovery;
    let mockContentExtractor;
    let mockDatabaseService;
    
    beforeEach(() => {
      mockDocumentDiscovery = {
        discoverDocuments: sandbox.stub(),
        discoverSpreadsheets: sandbox.stub()
      };
      
      mockContentExtractor = {
        extractDocumentContent: sandbox.stub(),
        extractSpreadsheetContent: sandbox.stub()
      };
      
      mockDatabaseService = {
        getModels: sandbox.stub().returns({
          Document: {
            findOne: sandbox.stub(),
            create: sandbox.stub(),
            updateOne: sandbox.stub()
          }
        })
      };
      
      indexingService = new IndexingService({
        documentDiscovery: mockDocumentDiscovery,
        contentExtractor: mockContentExtractor,
        databaseService: mockDatabaseService
      });
    });
    
    it('should index new documents', async () => {
      // Setup mock responses
      mockDocumentDiscovery.discoverDocuments.resolves([
        { id: 'doc1', name: 'Test Document 1', mimeType: 'application/vnd.google-apps.document', modifiedTime: '2025-04-20T10:00:00Z' }
      ]);
      
      mockContentExtractor.extractDocumentContent.resolves('Document content');
      
      const Document = mockDatabaseService.getModels().Document;
      Document.findOne.resolves(null);
      Document.create.resolves({ _id: 'dbdoc1', googleId: 'doc1' });
      
      // Call the method
      const result = await indexingService.indexDocuments();
      
      // Verify results
      expect(result.indexed).to.equal(1);
      expect(result.updated).to.equal(0);
      expect(result.failed).to.equal(0);
      expect(Document.create.calledOnce).to.be.true;
      expect(Document.create.firstCall.args[0]).to.deep.include({
        googleId: 'doc1',
        title: 'Test Document 1',
        type: 'document',
        content: 'Document content'
      });
    });
    
    it('should update existing documents', async () => {
      // Setup mock responses
      mockDocumentDiscovery.discoverDocuments.resolves([
        { id: 'doc1', name: 'Test Document 1', mimeType: 'application/vnd.google-apps.document', modifiedTime: '2025-04-20T10:00:00Z' }
      ]);
      
      mockContentExtractor.extractDocumentContent.resolves('Updated document content');
      
      const Document = mockDatabaseService.getModels().Document;
      Document.findOne.resolves({ 
        _id: 'dbdoc1', 
        googleId: 'doc1', 
        modifiedTime: '2025-04-19T10:00:00Z' 
      });
      Document.updateOne.resolves({ modifiedCount: 1 });
      
      // Call the method
      const result = await indexingService.indexDocuments();
      
      // Verify results
      expect(result.indexed).to.equal(0);
      expect(result.updated).to.equal(1);
      expect(result.failed).to.equal(0);
      expect(Document.updateOne.calledOnce).to.be.true;
      expect(Document.updateOne.firstCall.args[0]).to.deep.include({
        googleId: 'doc1'
      });
      expect(Document.updateOne.firstCall.args[1].$set).to.deep.include({
        content: 'Updated document content',
        modifiedTime: '2025-04-20T10:00:00Z'
      });
    });
  });
});
