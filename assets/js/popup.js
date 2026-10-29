// Popup script for MotmaenBash extension
// Handles displaying security information in the popup

import { getTypeName, getLevelName, getSecurityMessage } from './utils.js';

// Show the explanation that goes with the status below its title
function showStatusNote(statusTitle, text) {
  const note = document.createElement('div');
  note.id = 'status_note';
  note.className = 'status_note';
  note.textContent = text;
  statusTitle.parentNode.insertBefore(note, statusTitle.nextSibling);
}

// Function to update popup content based on current tab or stored security data
function updatePopupContent() {
  const statusIcon = document.getElementById('status_icon');
  const statusTitle = document.getElementById('status_title');
  const detailsContainer = document.getElementById('security_details') || document.createElement('div');
  detailsContainer.id = 'security_details';

  // Clear previous content
  detailsContainer.innerHTML = '';
  if (detailsContainer.parentNode) {
    detailsContainer.parentNode.removeChild(detailsContainer);
  }

  const previousNote = document.getElementById('status_note');
  if (previousNote) {
    previousNote.remove();
  }
  
  // Get security information from storage
  chrome.storage.local.get(['currentUrl', 'securityResult', 'message'], function(data) {
    // Get current tab to compare with stored data
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, function(tabs) {
      if (tabs && tabs[0] && tabs[0].url) {
        const currentTabUrl = tabs[0].url;
        
        // Check if stored data matches current tab
        if (data.currentUrl && data.message && data.currentUrl === currentTabUrl) {
          // Display stored security information
          statusIcon.src = data.message.icon;
          statusTitle.className = data.message.className || 'status_title_nok';
          statusTitle.innerHTML = data.message.title;

          if (data.message.text && !(data.securityResult && data.securityResult.secure === false)) {
            showStatusNote(statusTitle, data.message.text);
          }

          if (data.securityResult && data.securityResult.secure === false) {
            const typeName = getTypeName(data.securityResult.type);
            const levelName = getLevelName(data.securityResult.level);
            const matchType = data.securityResult.match === 1 ? 'دامنه' : 'آدرس کامل';
            
            detailsContainer.innerHTML = `
              <div class="security_detail">
                <span class="detail_label">نوع تهدید:</span> 
                <span class="detail_value">${typeName}</span>
              </div>
              <div class="security_detail">
                <span class="detail_label">سطح هشدار:</span> 
                <span class="detail_value">${levelName}</span>
              </div>
              <div class="security_detail">
                <span class="detail_label">تطابق:</span> 
                <span class="detail_value">${matchType}</span>
              </div>
            `;
            
            statusTitle.parentNode.insertBefore(detailsContainer, statusTitle.nextSibling);
          }
        } else {
          // If no matching data, show default content based on current URL
          const url = new URL(currentTabUrl);
          const isGateway = url.hostname.match(/\.shaparak\.ir$/i) && url.protocol === 'https:';
          const message = getSecurityMessage({ secure: isGateway ? true : null });

          statusTitle.className = message.className;
          statusTitle.innerHTML = message.title;
          statusIcon.src = message.icon;
          showStatusNote(statusTitle, message.text);
        }
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  // Initialize popup content
  updatePopupContent();
  
  // Listen for tab changes while popup is open
  chrome.tabs.onActivated.addListener(function(activeInfo) {
    updatePopupContent();
  });
  
  // Listen for URL changes in the current tab
  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.url) {
      updatePopupContent();
    }
  });
  
  // Handle database update button
  const updateButton = document.getElementById('update_database');
  if (updateButton) {
    updateButton.addEventListener('click', function() {
      updateButton.textContent = 'در حال بروزرسانی...';
      updateButton.disabled = true;
      
      // Send message to background script to update database
      chrome.runtime.sendMessage({ action: 'updateDatabase' }, function(response) {
        if (response && response.success) {
          updateButton.textContent = 'بروزرسانی با موفقیت انجام شد';
          setTimeout(() => {
            updateButton.textContent = 'بروزرسانی پایگاه داده';
            updateButton.disabled = false;
          }, 2000);
        } else {
          updateButton.textContent = 'خطا در بروزرسانی';
          updateButton.disabled = false;
        }
      });
    });
  }
});
