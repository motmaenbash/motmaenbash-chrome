// Import required modules
import BackgroundHandler from "./background-handler.js";

// Initialize background handler
const handler = new BackgroundHandler();

// Set up alarm for daily database updates
function setupUpdateAlarm() {
  chrome.alarms.create("updateDatabase", {
    periodInMinutes: 1440, // Once per day (60 * 24)
  });
}

// Handle alarm events for database updates
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "updateDatabase") {
    console.log("Running scheduled database update");
    try {
      const result = await handler.handleDatabaseUpdate();
      console.log(`Database updated with ${result.count} entries`);
    } catch (error) {
      console.error("Error updating database:", error);
    }
  }
});

// Listen for extension installation or update
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install" || details.reason === "update") {
    try {
      await handler.init();
      await handler.handleDatabaseUpdate();
      console.log("Database initialized and data loaded");
      setupUpdateAlarm();
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }
});

// Listen for any changes to the URL of any tab
chrome.tabs.onUpdated.addListener(checkForValidUrl);

// Called when the url of a tab changes
async function checkForValidUrl(tabId, changeInfo, tab) {
  if (tab.url !== undefined && changeInfo.status === "complete") {
    try {
      // Make sure handler is initialized
      if (!handler.initialized) {
        await handler.init();
      }

      // Check if the database needs to be updated
      await handler.dataManager.checkForUpdate();

      // Check the security of the current URL
      const result = await handler.handleSecurityCheck(tab.url);
      const securityResult = result.securityResult;
      const message = result.message;

      // Update the extension icon and title based on security result
      const iconPath =
        message && message.icon
          ? message.icon
          : "/assets/images/icon_neutral.png";
      const title = message && message.title ? message.title : "Motmaen Bash";

      try {
        chrome.action.setIcon({
          tabId: tabId,
          path: {
            128: iconPath,
          },
        });
      } catch (error) {
        console.error("Error setting icon:", error);
        // Fallback to default icon
        try {
          chrome.action.setIcon({
            tabId: tabId,
            path: {
              128: "/assets/images/icon_neutral.png",
            },
          });
        } catch (innerError) {
          console.error("Error setting fallback icon:", innerError);
        }
      }

      try {
        chrome.action.setTitle({
          tabId: tabId,
          title: title,
        });
      } catch (error) {
        console.error("Error setting title:", error);
        // Fallback to default title
        try {
          chrome.action.setTitle({
            tabId: tabId,
            title: "Motmaen Bash",
          });
        } catch (innerError) {
          console.error("Error setting fallback title:", innerError);
        }
      }

      // Store the security result for the popup to access
      chrome.storage.local.set({
        currentUrl: tab.url,
        securityResult: securityResult,
        message: message,
      });

      // Automatically open the popup if a security threat is detected
      if (securityResult && securityResult.secure === false) {
        chrome.action.openPopup();
      }

      // Send message to content script if it's a shaparak.ir domain
      const url = new URL(tab.url);
      if (url.hostname.match(/\.shaparak\.ir$/i)) {
        try {
          // First check if the tab still exists
          chrome.tabs.get(tabId, (tabInfo) => {
            if (chrome.runtime.lastError) {
              // console.log(`Tab ${tabId} no longer exists, skipping message send`);
              return;
            }

            // Tab exists, send the message
            chrome.tabs
              .sendMessage(tabId, {
                action: "updateSecurity",
                securityResult: securityResult,
                message: message,
              })
              .catch((err) => {
                console.log(`Error sending message to tab ${tabId}:`, err);
              });
          });
        } catch (msgError) {
          console.error("Error sending message to tab:", msgError);
        }
      }
    } catch (error) {
      console.error("Error checking URL security:", error);
    }
  }
}
