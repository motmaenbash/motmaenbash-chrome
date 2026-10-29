// Background handler for MotmaenBash extension
// Handles messages from content scripts and popup

import DataManager from './data-manager.js';
import { getSecurityMessage } from './utils.js';

class BackgroundHandler {
  constructor() {
    this.dataManager = new DataManager();
    this.initialized = false;

    // Registered right away so the service worker can answer after it restarts
    this.setupMessageListeners();
  }

  // Initialize the handler
  async init() {
    await this.dataManager.init();
    this.initialized = true;
  }

  // Set up message listeners for communication with content scripts and popup
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'checkSecurity' && message.url) {
        this.handleSecurityCheck(message.url)
          .then(result => sendResponse(result))
          .catch(error => {
            console.error('Error checking security:', error);
            sendResponse({ error: error.message });
          });
        return true;
      }
      
      // Handle database update request from popup
      if (message.action === 'updateDatabase') {
        this.handleDatabaseUpdate()
          .then(result => sendResponse(result))
          .catch(error => {
            console.error('Error updating database:', error);
            sendResponse({ error: error.message });
          });
        return true;
      }
    });
  }

  // Handle security check request
  async handleSecurityCheck(url) {
    try {
      if (!this.initialized) await this.dataManager.init();
      
      // Validate URL
      if (!url || typeof url !== 'string') {
        console.warn('Invalid URL provided to handleSecurityCheck:', url);
        return {
          securityResult: {
            secure: null,
            type: 0,
            level: 0,
            match: 0,
            error: 'Invalid URL'
          },
          message: {
            title: 'Invalid URL',
            text: 'The URL could not be verified',
            icon: '/assets/images/icon_neutral.png'
          }
        };
      }
      
      const securityResult = await this.dataManager.checkUrlSecurity(url);
      const message = this.getSecurityMessage(securityResult);
      
      if (!message || typeof message !== 'object') {
        console.error('Invalid message object returned from getSecurityMessage');
        message = {
          title: 'Verification Status',
          text: 'URL verification status unknown',
          icon: '/assets/images/icon_neutral.png'
        };
      }
      
      if (!message.title) message.title = 'Verification Status';
      if (!message.text) message.text = 'URL verification completed';
      if (!message.icon) message.icon = '/assets/images/icon_neutral.png';
      
      return {
        securityResult,
        message
      };
    } catch (error) {
      console.error('Error in handleSecurityCheck:', error);
      return {
        securityResult: {
          secure: null,
          type: 0,
          level: 0,
          match: 0,
          error: error.message
        },
        message: {
          title: 'Error checking security',
          text: 'An error occurred while verifying the URL',
          icon: '/assets/images/icon_neutral.png'
        }
      };
    }
  }

  // Handle database update request
  async handleDatabaseUpdate() {
    try {
      if (!this.initialized) {
        await this.dataManager.init();
      }
      
      //console.log('Starting database update...');
      const result = await this.dataManager.updateDatabase();
      //console.log('Database update completed successfully:', result);
      
      return {
        success: true,
        count: result.count,
        timestamp: result.timestamp
      };
    } catch (error) {
      console.error('Error in handleDatabaseUpdate:', error);
      return {
        success: false,
        error: error.message || 'Unknown error updating database'
      };
    }
  }

  // Get security message based on security check result
  getSecurityMessage(result) {
    try {
      return getSecurityMessage(result);
    } catch (error) {
      console.error('Error getting security message:', error);
      return {
        title: 'Verification Error',
        text: 'Could not determine security status',
        icon: '/assets/images/icon_neutral.png'
      };
    }
  }
}

export default BackgroundHandler;
