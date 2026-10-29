// Data Manager module for MotmaenBash extension
// Handles fetching, parsing, and updating security data

import Database from './database.js';
import { sha256 } from './utils.js';

class DataManager {
  constructor() {
    this.db = new Database();
    this.dataUrl = 'https://raw.githubusercontent.com/miladnouri/motmaenbash-data/refs/heads/main/data/data.json';
    this.initialized = false;
  }

  // Initialize the data manager
  async init() {
    await this.db.init();
    this.initialized = true;
  }

  // Fetch the latest data from the GitHub repository
  async fetchData() {
    try {
      // console.log('Fetching data from:', this.dataUrl);
      
      // Use fetch options to avoid caching issues
      const response = await fetch(this.dataUrl, {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Warning: Response content type is not JSON:', contentType);
        // Continue anyway - GitHub raw content might return text/plain even for JSON
      }
      
      const data = await response.json();
      
      // Validate data structure
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format: Expected an array');
      }
      
      //console.log('Data fetched successfully, found', data.length, 'top-level arrays');
      return data;
    } catch (error) {
      console.error('Error fetching data:', error);

      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Unable to connect to the data source. Please check your internet connection.');
      } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
        throw new Error('Invalid JSON format: The data source returned invalid JSON. Please check the data source.');
      }
      throw error;
    }
  }

  // Process and store the fetched data
  async processData(data) {
    if (!this.initialized) await this.init();
    
    // Clear existing data before storing new data
    await this.db.clearAll();
    
    let totalHashes = 0;
    
    // Process and store each group of hashes
    if (!Array.isArray(data)) {
      throw new Error('Invalid data format: Expected an array');
    }
    
    // console.log('Processing data structure:', data.length, 'top-level items');
    
    // Handle nested array structure - data is an array of arrays of objects
    for (const subArray of data) {
      // Check if this is an array
      if (!Array.isArray(subArray)) {
        // console.warn('Expected array at top level, got:', typeof subArray);
        continue;
      }
      
      // console.log('Processing sub-array with', subArray.length, 'groups');
      
      // Process each group in the sub-array
      for (const group of subArray) {
        // Validate group structure
        if (!group || typeof group !== 'object') {
          console.warn('Invalid group structure, skipping');
          continue;
        }
        
        // Validate required properties
        if (!Array.isArray(group.hashes) || 
            typeof group.type !== 'number' || 
            typeof group.match !== 'number' || 
            typeof group.level !== 'number') {
          console.warn('Group missing required properties, skipping:', group);
          continue;
        }
        
        const type = group.type;
        const level = group.level;
        const match = group.match;
        
        // Process each hash in this group
        for (const hash of group.hashes) {
          if (typeof hash === 'string' && hash.trim() !== '') {
            
            let processedHash = hash.trim();
            
            // If the hash looks like a URL or domain, normalize it
            if (match === 1 && (processedHash.includes('.') || processedHash.startsWith('www.'))) {
              // For domains, remove www. if present
              if (processedHash.startsWith('www.')) {
                processedHash = processedHash.substring(4);
              }
            } else if (match === 2 && (processedHash.includes('://') || processedHash.startsWith('www.'))) {
              // For full URLs, try to normalize using the URL class
              try {
                // If it's a valid URL, normalize it
                if (processedHash.includes('://')) {
                  const normalized = this.normalizeUrl(processedHash);
                  processedHash = normalized.fullUrl;
                } 
                // If it starts with www but doesn't have protocol, add one temporarily to normalize
                else if (processedHash.startsWith('www.')) {
                  const normalized = this.normalizeUrl('http://' + processedHash);
                  processedHash = normalized.fullUrl;
                }
              } catch (error) {
                // If normalization fails, just use the original hash
              }
            }
            
            await this.db.storeHash(processedHash, type, level, match);
            totalHashes++;
          }
        }
      }
    }
    
    // console.log(`Processed ${totalHashes} total hashes`);
    
    // Store the update timestamp
    await this.db.storeMetadata('lastUpdate', Date.now());
    
    return {
      count: totalHashes,
      timestamp: Date.now()
    };
  }

  // Update the database with the latest data
  async updateDatabase() {
    try {
      if (!this.initialized) await this.init();
      
      // console.log('Updating database from:', this.dataUrl);

      // processData() replaces the old data, so it is kept if the download fails
      const data = await this.fetchData();
      // console.log('Data fetched successfully, processing...');
      
      const result = await this.processData(data);
      // console.log('Database update completed successfully:', result);
      
      return result;
    } catch (error) {
      console.error('Error updating database:', error);
      throw error;
    }
  }

  // Check if the database needs to be updated (once per day)
  async checkForUpdate() {
    if (!this.initialized) await this.init();
    
    const lastUpdate = await this.db.getMetadata('lastUpdate');
    const now = Date.now();
    
    // If no last update or it's been more than a day
    if (!lastUpdate || (now - lastUpdate) > 86400000) {
      return await this.updateDatabase();
    }
    
    return {
      updated: false,
      lastUpdate: lastUpdate
    };
  }

  // Calculate SHA-256 hash of a text
  async calculateHash(text) {
    return await sha256(text.toLowerCase());
  }

  // Normalize URL by removing protocol and www
  normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      let hostname = urlObj.hostname.toLowerCase();
      
      // Remove www. if present
      if (hostname.startsWith('www.')) {
        hostname = hostname.substring(4);
      }
      
      // For domain-only normalization, just return the hostname
      const normalizedDomain = hostname;
      
      // For full URL normalization, reconstruct without protocol and www
      // Note: We're testing multiple normalization formats to ensure we catch all hash variations
      const normalizedFullUrl = hostname + urlObj.pathname + urlObj.search + urlObj.hash;
      
      // Also keep the original URL for exact matching
      const originalUrl = url.toLowerCase();
      
      return {
        domain: normalizedDomain,
        fullUrl: normalizedFullUrl,
        originalUrl: originalUrl
      };
    } catch (error) {
      console.warn('Error normalizing URL:', error);
      return {
        domain: url.toLowerCase(),
        fullUrl: url.toLowerCase(),
        originalUrl: url.toLowerCase()
      };
    }
  }
  
  // Check URL security against the database
  async checkUrlSecurity(url) {
    try {
      if (!this.initialized) await this.init();
      
      // console.log('Checking security for URL:', url);
      
      // Normalize the URL
      const normalized = this.normalizeUrl(url);
      
      // Calculate hashes for domain and full URL
      const domainHash = await this.calculateHash(normalized.domain);
      const fullUrlHash = await this.calculateHash(normalized.fullUrl);
      const originalUrlHash = await this.calculateHash(normalized.originalUrl);
      const directUrlHash = await this.calculateHash(url);
      
      // Log all hashes for debugging
      // console.log('URL hash checks:', {
      //   directUrlHash,
      //   domainHash,
      //   fullUrlHash,
      //   originalUrlHash
      // });
      
      // Check direct URL hash first
      const directResult = await this.db.checkUrlHash(directUrlHash);
      if (directResult) {
        // console.log('Direct URL hash match found in database');
        return {
          secure: false,
          type: directResult.type,
          level: directResult.level,
          match: directResult.match
        };
      }
      
      // Check domain hash first (match type 1)
      const domainResult = await this.db.checkDomainHash(domainHash);
      if (domainResult) {
        return {
          secure: false,
          type: domainResult.type,
          level: domainResult.level,
          match: domainResult.match
        };
      }
      
      // Check full URL hash (match type 2)
      const urlResult = await this.db.checkUrlHash(fullUrlHash);
      if (urlResult) {
        return {
          secure: false,
          type: urlResult.type,
          level: urlResult.level,
          match: urlResult.match
        };
      }
      
      // Check original URL hash as a fallback
      const originalResult = await this.db.checkUrlHash(originalUrlHash);
      if (originalResult) {
        return {
          secure: false,
          type: originalResult.type,
          level: originalResult.level,
          match: originalResult.match
        };
      }
      
      // If no matches found and it's a shaparak.ir domain with HTTPS, it's secure
      try {
        const urlObj = new URL(url);
        if (normalized.domain.endsWith('.shaparak.ir') && urlObj.protocol === 'https:') {
          return {
            secure: true,
            type: 0, // No threat
            level: 0, // No threat level
            match: 0 // No match
          };
        }
      } catch (error) {
        
      }
      
      // Otherwise, it's not a verified payment gateway
      return {
        secure: null, // Not a payment gateway
        type: 0,
        level: 0,
        match: 0
      };
    } catch (error) {
      // console.error('Error checking URL security:', error);
      // console.error('URL that caused the error:', url);
      // console.error('Normalized URL data:', normalized);
      return {
        secure: null,
        type: 0,
        level: 0,
        match: 0,
        error: error.message
      };
    }
  }
}

export default DataManager;
