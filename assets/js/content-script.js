// Content script for MotmaenBash extension
// Handles displaying security verification mark on web pages

// Create security verification overlay
function createSecurityOverlay(message) {
  // Remove existing overlay if any
  const existingOverlay = document.getElementById('motmaenBashCornerSign');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  
  const overlayDiv = document.createElement('div');
  overlayDiv.id = 'motmaenBashCornerSign';
  
  if (message.className) {
    overlayDiv.className = message.className;
  }
  
  // Only verified or dangerous gateways get a sign
  let imgSrc;
  if (message.icon && message.icon.includes('icon_danger.png')) {
    imgSrc = chrome.runtime.getURL('assets/images/icon_danger.png');
  } else if (message.icon && message.icon.includes('icon_ok.png')) {
    imgSrc = chrome.runtime.getURL('assets/images/sign.png');
  } else {
    return;
  }

  overlayDiv.innerHTML = '<a href="https://motmaenbash.ir/" target="_blank"><img title="' + (message.title || '') + '" id="motmaenBashCornerSignLogo" src="' + imgSrc + '"/></a>'
  
  document.body.insertBefore(overlayDiv, document.body.firstChild);
}

const url = new URL(location.href);
if (url.hostname.match(/\.shaparak\.ir$/i)) {
  chrome.runtime.sendMessage({ action: 'checkSecurity', url: location.href }, (response) => {
    // Without an answer no sign is shown; the background script also
    // sends the result once the page has loaded
    if (chrome.runtime.lastError) return;

    if (response && response.message) {
      createSecurityOverlay(response.message);
    }
  });
}

// Listen for security updates from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateSecurity') {
    createSecurityOverlay(message.message);
    sendResponse({ success: true });
  }
  return true;
});
