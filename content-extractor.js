// Content Extractor for Google Drive Documents
const { google } = require('googleapis');
const cheerio = require('cheerio');

class ContentExtractor {
  constructor(driveClient) {
    this.driveClient = driveClient;
    this.exportFormats = {
      'application/vnd.google-apps.document': {
        text: 'text/plain',
        html: 'text/html',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      },
      'application/vnd.google-apps.spreadsheet': {
        csv: 'text/csv',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        html: 'text/html'
      },
      'application/vnd.google-apps.presentation': {
        text: 'text/plain',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        pdf: 'application/pdf'
      }
    };
  }

  /**
   * Extract content from a Google Drive document
   * @param {string} fileId Google Drive file ID
   * @param {string} mimeType Document MIME type
   * @param {string} format Desired export format (text, html, etc.)
   * @return {Promise<Object>} Extracted content and metadata
   */
  async extractContent(fileId, mimeType, format = 'text') {
    try {
      // Get document metadata
      const metadata = await this.driveClient.getFile(fileId);
      
      // Determine export format
      const exportFormat = this.getExportFormat(mimeType, format);
      if (!exportFormat) {
        throw new Error(`Unsupported export format '${format}' for MIME type '${mimeType}'`);
      }
      
      // Download content
      const contentBuffer = await this.driveClient.downloadFile(fileId, exportFormat);
      
      // Process content based on export format
      let processedContent;
      let extractedMetadata = {};
      
      if (exportFormat === 'text/plain') {
        processedContent = contentBuffer.toString('utf8');
        extractedMetadata = this.extractMetadataFromText(processedContent);
      } else if (exportFormat === 'text/html') {
        const htmlContent = contentBuffer.toString('utf8');
        processedContent = this.extractTextFromHtml(htmlContent);
        extractedMetadata = this.extractMetadataFromHtml(htmlContent);
      } else if (exportFormat === 'text/csv') {
        processedContent = contentBuffer.toString('utf8');
        extractedMetadata = this.extractMetadataFromCsv(processedContent);
      } else {
        // For binary formats, just return basic info
        processedContent = `Binary content (${exportFormat})`;
      }
      
      return {
        id: fileId,
        name: metadata.name,
        mimeType: metadata.mimeType,
        content: processedContent,
        metadata: {
          ...extractedMetadata,
          originalSize: metadata.size,
          modifiedTime: metadata.modifiedTime,
          createdTime: metadata.createdTime
        }
      };
    } catch (error) {
      console.error(`Error extracting content from ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Get export format for a document type
   * @param {string} mimeType Document MIME type
   * @param {string} format Desired format
   * @return {string|null} Export MIME type or null if not supported
   */
  getExportFormat(mimeType, format) {
    const formats = this.exportFormats[mimeType];
    if (!formats) {
      return null;
    }
    
    return formats[format] || formats.text || null;
  }

  /**
   * Extract metadata from plain text content
   * @param {string} text Plain text content
   * @return {Object} Extracted metadata
   */
  extractMetadataFromText(text) {
    const metadata = {
      wordCount: 0,
      characterCount: 0,
      tags: [],
      playerReferences: [],
      dateReferences: []
    };
    
    if (!text) {
      return metadata;
    }
    
    // Count words and characters
    metadata.characterCount = text.length;
    metadata.wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    
    // Extract potential tags (words with # prefix)
    const tagMatches = text.match(/#[a-zA-Z0-9_]+/g);
    if (tagMatches) {
      metadata.tags = tagMatches.map(tag => tag.substring(1));
    }
    
    // Extract potential player references
    // This is a simplified example - in a real system, you'd match against a database of player names
    const playerMatches = text.match(/Player:\s*([A-Za-z\s]+)/g);
    if (playerMatches) {
      metadata.playerReferences = playerMatches.map(match => {
        return match.replace(/Player:\s*/, '').trim();
      });
    }
    
    // Extract date references
    const dateMatches = text.match(/\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}/g);
    if (dateMatches) {
      metadata.dateReferences = dateMatches;
    }
    
    return metadata;
  }

  /**
   * Extract text content from HTML
   * @param {string} html HTML content
   * @return {string} Plain text content
   */
  extractTextFromHtml(html) {
    try {
      const $ = cheerio.load(html);
      
      // Remove script and style elements
      $('script, style').remove();
      
      // Get text content
      return $('body').text().trim();
    } catch (error) {
      console.error('Error extracting text from HTML:', error);
      return html;
    }
  }

  /**
   * Extract metadata from HTML content
   * @param {string} html HTML content
   * @return {Object} Extracted metadata
   */
  extractMetadataFromHtml(html) {
    try {
      const $ = cheerio.load(html);
      const metadata = {
        title: $('title').text(),
        headings: [],
        links: [],
        images: 0
      };
      
      // Extract headings
      $('h1, h2, h3, h4, h5, h6').each((i, el) => {
        metadata.headings.push({
          level: el.name.substring(1),
          text: $(el).text().trim()
        });
      });
      
      // Extract links
      $('a').each((i, el) => {
        const href = $(el).attr('href');
        if (href) {
          metadata.links.push({
            text: $(el).text().trim(),
            url: href
          });
        }
      });
      
      // Count images
      metadata.images = $('img').length;
      
      // Extract text content and get additional metadata
      const textContent = this.extractTextFromHtml(html);
      const textMetadata = this.extractMetadataFromText(textContent);
      
      return { ...metadata, ...textMetadata };
    } catch (error) {
      console.error('Error extracting metadata from HTML:', error);
      return {};
    }
  }

  /**
   * Extract metadata from CSV content
   * @param {string} csv CSV content
   * @return {Object} Extracted metadata
   */
  extractMetadataFromCsv(csv) {
    const metadata = {
      rowCount: 0,
      columnCount: 0,
      headers: []
    };
    
    if (!csv) {
      return metadata;
    }
    
    // Split into rows
    const rows = csv.split('\n').filter(row => row.trim().length > 0);
    metadata.rowCount = rows.length;
    
    // Extract headers from first row
    if (rows.length > 0) {
      const headerRow = rows[0];
      const headers = headerRow.split(',').map(header => header.trim().replace(/^"|"$/g, ''));
      metadata.headers = headers;
      metadata.columnCount = headers.length;
    }
    
    return metadata;
  }

  /**
   * Extract player-specific information from document content
   * @param {string} content Document content
   * @param {Array} playerNames List of player names to look for
   * @return {Object} Player-specific information
   */
  extractPlayerInformation(content, playerNames) {
    const playerInfo = {};
    
    if (!content || !playerNames || playerNames.length === 0) {
      return playerInfo;
    }
    
    // Look for mentions of each player
    for (const playerName of playerNames) {
      const regex = new RegExp(`\\b${playerName}\\b`, 'gi');
      const matches = content.match(regex);
      
      if (matches) {
        playerInfo[playerName] = {
          mentions: matches.length,
          contexts: this.extractContexts(content, playerName)
        };
      }
    }
    
    return playerInfo;
  }

  /**
   * Extract context snippets around mentions of a term
   * @param {string} content Document content
   * @param {string} term Term to find contexts for
   * @param {number} contextLength Length of context before and after the term
   * @return {Array} Context snippets
   */
  extractContexts(content, term, contextLength = 100) {
    const contexts = [];
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const start = Math.max(0, match.index - contextLength);
      const end = Math.min(content.length, match.index + term.length + contextLength);
      
      let context = content.substring(start, end);
      
      // Add ellipsis if context is truncated
      if (start > 0) {
        context = '...' + context;
      }
      if (end < content.length) {
        context = context + '...';
      }
      
      contexts.push(context);
      
      // Limit to 5 contexts per term
      if (contexts.length >= 5) {
        break;
      }
    }
    
    return contexts;
  }
}

module.exports = ContentExtractor;
