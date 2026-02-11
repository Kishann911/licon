// LICON Background Service Worker - v3.0 - Fixed messaging with handshake protocol
console.log('🔥 LICON: Background service worker starting... [Version 3.0 - Feb 11, 2026 13:48]');


class LiconBackground {
  constructor() {
    console.log('🔥 LICON: Initializing background service worker...');
    this.isRunning = false;
    this.currentCompany = null;
    this.pageInfo = { currentPage: 1, totalPages: 1 };
    this.pagesProcessed = 0;
    this.stats = {
      totalProcessed: 0,
      connectionsAttempted: 0,
      connectionsSuccessful: 0,
      profilesSkipped: 0,
      errors: 0,
      // Detailed skip reasons
      skipReasons: {
        alreadyConnected: 0,
        pending: 0,
        noConnectButton: 0,
        followOnly: 0,
        other: 0
      }
    };
    this.failedProfiles = [];
    this.readyTabs = new Map(); // Track which tabs have content scripts ready
    this.setupListeners();
    console.log('✅ LICON: Background service worker initialized successfully');
  }

  setupListeners() {
    console.log('🔧 LICON: Setting up background listeners...');

    // Handle messages from content script and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📨 LICON: Received message:', message.type, 'from:', sender.tab?.url || 'popup');
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Handle tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url?.includes('linkedin.com')) {
        console.log('🔄 LICON: LinkedIn tab updated:', tab.url);
        // Content scripts are automatically injected via manifest
      }
    });

    // Handle extension startup
    chrome.runtime.onStartup.addListener(() => {
      console.log('🚀 LICON: Extension startup detected');
      this.initializeExtension();
    });

    chrome.runtime.onInstalled.addListener((details) => {
      console.log('📦 LICON: Extension installed/updated:', details.reason);
      this.initializeExtension();
    });

    // Handle action click to open side panel
    chrome.action.onClicked.addListener((tab) => {
      console.log('🔥 LICON: Extension icon clicked, opening side panel');
      chrome.sidePanel.open({ windowId: tab.windowId });
    });

    // Handle tab removal - clean up ready tabs tracking
    chrome.tabs.onRemoved.addListener((tabId) => {
      if (this.readyTabs.has(tabId)) {
        console.log('🗑️ LICON: Removing closed tab', tabId, 'from ready tabs');
        this.readyTabs.delete(tabId);
      }
    });

    console.log('✅ LICON: Background listeners setup complete');
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      console.log(`🔧 LICON: Processing message type: ${message.type}`);

      switch (message.type) {
        case 'START_AUTOMATION':
          console.log('🚀 LICON: Starting automation from background...');
          await this.startAutomation(message.data);
          sendResponse({ success: true });
          break;

        case 'STOP_AUTOMATION':
          console.log('🛑 LICON: Stopping automation from background...');
          await this.stopAutomation();
          sendResponse({ success: true });
          break;

        case 'GET_STATUS':
          const status = {
            isRunning: this.isRunning,
            currentCompany: this.currentCompany,
            stats: this.stats,
            pageInfo: this.pageInfo,
            pagesProcessed: this.pagesProcessed
          };
          console.log('📊 LICON: Sending status:', status);
          sendResponse(status);
          break;

        case 'PROFILE_PROCESSED':
          console.log('📈 LICON: Updating stats:', message.data);
          this.updateStats(message.data);
          sendResponse({ success: true });
          break;

        case 'PAGE_INFO_UPDATE':
          console.log('📄 LICON: Page info update:', message.data);
          this.pageInfo = message.data;
          sendResponse({ success: true });
          break;

        case 'CONNECTION_ATTEMPT':
          console.log('🔗 LICON: Handling connection attempt:', message.data);
          await this.handleConnectionAttempt(message.data, sender.tab?.id);
          sendResponse({ success: true });
          break;

        case 'GET_SETTINGS':
          const settings = await this.getSettings();
          console.log('⚙️ LICON: Sending settings:', settings);
          sendResponse(settings);
          break;

        case 'SAVE_SETTINGS':
          console.log('💾 LICON: Saving settings:', message.data);
          await this.saveSettings(message.data);
          sendResponse({ success: true });
          break;

        case 'CLOSE_TAB':
          if (sender.tab) {
            console.log('🗙 LICON: Closing tab:', sender.tab.id);
            chrome.tabs.remove(sender.tab.id);
          }
          sendResponse({ success: true });
          break;

        case 'ADD_FAILED_PROFILE':
          console.log('❌ LICON: Adding failed profile:', message.data);
          this.addFailedProfile(message.data);
          sendResponse({ success: true });
          break;

        case 'CONTENT_SCRIPT_READY':
          console.log('📡 LICON: Content script ready notification from tab:', sender.tab?.id);
          console.log('📡 LICON: Ready data:', message.data);
          if (sender.tab) {
            this.readyTabs.set(sender.tab.id, {
              url: message.data.url,
              pageType: message.data.pageType,
              timestamp: message.data.timestamp,
              readySince: Date.now()
            });
            console.log('✅ LICON: Tab', sender.tab.id, 'marked as ready');
            console.log('📊 LICON: Total ready tabs:', this.readyTabs.size);
          }
          sendResponse({ success: true, message: 'Ready status acknowledged' });
          break;

        case 'GET_FAILED_PROFILES':
          console.log('📋 LICON: Sending failed profiles:', this.failedProfiles.length);
          sendResponse({ failedProfiles: this.failedProfiles });
          break;

        case 'RESET_STATS':
          console.log('🔄 LICON: Resetting stats');
          this.stats = {
            totalProcessed: 0,
            connectionsAttempted: 0,
            connectionsSuccessful: 0,
            profilesSkipped: 0,
            errors: 0,
            skipReasons: {
              alreadyConnected: 0,
              pending: 0,
              noConnectButton: 0,
              followOnly: 0,
              other: 0
            }
          };
          this.pagesProcessed = 0;
          this.pageInfo = { currentPage: 1, totalPages: 1 };
          await chrome.storage.local.set({
            liconState: {
              isRunning: this.isRunning,
              currentCompany: this.currentCompany,
              stats: this.stats
            }
          });
          sendResponse({ success: true });
          break;

        case 'CLEAR_FAILED_PROFILES':
          console.log('🗑️ LICON: Clearing failed profiles');
          this.failedProfiles = [];
          await chrome.storage.local.set({ liconFailedProfiles: [] });
          sendResponse({ success: true });
          break;

        case 'EXPORT_FAILED_PROFILES':
          console.log('📤 LICON: Exporting failed profiles');
          sendResponse({ failedProfiles: this.failedProfiles });
          break;

        default:
          console.log('❓ LICON: Unknown message type:', message.type);
          sendResponse({ error: 'Unknown message type: ' + message.type });
      }
    } catch (error) {
      console.error('❌ LICON: Background script error:', error);
      sendResponse({ error: error.message });
    }
  }

  async startAutomation(data) {
    if (this.isRunning) {
      throw new Error('Automation is already running');
    }

    console.log('🚀 LICON: Starting automation for:', data.companyUrl);

    // STEP 1: Find LinkedIn tabs with matching URLs
    const tabs = await chrome.tabs.query({ url: '*://www.linkedin.com/*' });
    console.log(`📋 LICON: Found ${tabs.length} LinkedIn tabs`);

    if (tabs.length === 0) {
      throw new Error('No LinkedIn tabs found. Please open a LinkedIn search or company page.');
    }

    // Filter to supported pages only
    const supportedTabs = tabs.filter(tab => {
      const isCompanyPage = tab.url?.match(/linkedin\.com\/company\/[^\/]+\/people/);
      const isSearchPage = tab.url?.match(/linkedin\.com\/search\/results\/people/);
      return isCompanyPage || isSearchPage;
    });

    console.log(`📋 LICON: ${supportedTabs.length} supported tabs (company/search pages)`);

    if (supportedTabs.length === 0) {
      throw new Error('No supported LinkedIn pages found. Please navigate to a company people page or search results page.');
    }

    // STEP 2: Ensure all supported tabs are fully loaded
    const readyTabs = supportedTabs.filter(tab => tab.status === 'complete');
    console.log(`✅ LICON: ${readyTabs.length} tabs are fully loaded (status: complete)`);

    if (readyTabs.length === 0) {
      throw new Error('LinkedIn pages are still loading. Please wait for the page to finish loading.');
    }

    // STEP 3: Set state (content scripts are already injected via manifest)
    this.isRunning = true;
    this.currentCompany = data.companyUrl;
    this.pageInfo = { currentPage: 1, totalPages: 1 };
    this.pagesProcessed = 0;

    // Reset stats for new session
    this.stats = {
      totalProcessed: 0,
      connectionsAttempted: 0,
      connectionsSuccessful: 0,
      profilesSkipped: 0,
      errors: 0,
      startTime: Date.now(),
      skipReasons: {
        alreadyConnected: 0,
        pending: 0,
        noConnectButton: 0,
        followOnly: 0,
        other: 0
      }
    };
    this.failedProfiles = [];

    // Save state
    await chrome.storage.local.set({
      liconState: {
        isRunning: true,
        currentCompany: this.currentCompany,
        stats: this.stats
      }
    });

    // STEP 4: Send AUTOMATION_STARTED to ready tabs
    console.log('📡 LICON: Sending AUTOMATION_STARTED to ready tabs...');

    let successCount = 0;
    for (const tab of readyTabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { 
          type: 'AUTOMATION_STARTED',
          data: data
        });
        successCount++;
        console.log(`✅ LICON: AUTOMATION_STARTED sent to tab ${tab.id}`);
      } catch (error) {
        console.log(`⚠️ LICON: Failed to send message to tab ${tab.id}:`, error.message);
        // Content script might not be ready yet, but that's okay
      }
    }

    console.log(`✅ LICON: Automation started successfully on ${successCount} tab(s)`);
  }

  async stopAutomation() {
    this.isRunning = false;
    this.currentCompany = null;

    await chrome.storage.local.set({
      liconState: {
        isRunning: false,
        currentCompany: null,
        stats: this.stats
      }
    });

    // Notify all LinkedIn tabs
    this.broadcastToLinkedInTabs({ type: 'AUTOMATION_STOPPED' });
  }

  updateStats(data) {
    console.log('📊 LICON BG: updateStats called with data:', data);
    console.log('📊 LICON BG: Current stats before update:', JSON.parse(JSON.stringify(this.stats)));

    // Handle the new data format from content script
    if (data.processed) this.stats.totalProcessed++;
    if (data.attempted) this.stats.connectionsAttempted++;
    if (data.successful) this.stats.connectionsSuccessful++;
    if (data.skipped) this.stats.profilesSkipped++;
    if (data.error) this.stats.errors++;
    if (data.pageCompleted) this.pagesProcessed++;

    // Track detailed skip reasons
    if (data.skipReason && this.stats.skipReasons) {
      switch (data.skipReason) {
        case 'alreadyConnected':
          this.stats.skipReasons.alreadyConnected++;
          break;
        case 'pending':
          this.stats.skipReasons.pending++;
          break;
        case 'noActionButton':
          this.stats.skipReasons.noConnectButton++;
          break;
        case 'noConnectButton':
          this.stats.skipReasons.noConnectButton++;
          break;
        case 'followOnly':
          this.stats.skipReasons.followOnly++;
          break;
        case 'emailRequired':
          this.stats.skipReasons.other++;
          break;
        case 'modalSendFailed':
          this.stats.skipReasons.other++;
          break;
        default:
          this.stats.skipReasons.other++;
      }
    }

    console.log('📊 LICON BG: Stats after update:', JSON.parse(JSON.stringify(this.stats)));

    // Save updated stats immediately
    chrome.storage.local.set({
      liconState: {
        isRunning: this.isRunning,
        currentCompany: this.currentCompany,
        stats: this.stats
      }
    }).then(() => {
      console.log('📊 LICON BG: Stats saved to storage successfully');
    }).catch(error => {
      console.error('📊 LICON BG: Failed to save stats to storage:', error);
    });
  }

  addFailedProfile(profileData) {
    // Avoid duplicates
    const exists = this.failedProfiles.some(p => p.profileUrl === profileData.profileUrl);
    if (!exists) {
      this.failedProfiles.push({
        ...profileData,
        timestamp: Date.now(),
        id: `failed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });

      // Save to storage
      chrome.storage.local.set({ liconFailedProfiles: this.failedProfiles });
    }
  }

  async handleConnectionAttempt(data, tabId) {
    if (data.needsProfileVisit) {
      const newTab = await chrome.tabs.create({
        url: data.profileUrl,
        active: false
      });

      // Wait for tab to fully load before injecting
      const onTabUpdated = (updatedTabId, changeInfo) => {
        if (updatedTabId === newTab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(onTabUpdated);
          chrome.scripting.executeScript({
            target: { tabId: newTab.id },
            files: ['src/content/profile-connector.js']
          }).catch(error => {
            console.error('Failed to inject profile connector:', error);
            chrome.tabs.remove(newTab.id);
          });
        }
      };
      chrome.tabs.onUpdated.addListener(onTabUpdated);

      // Safety timeout - clean up listener if tab never loads
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(onTabUpdated);
      }, 30000);
    }
  }

  async broadcastToLinkedInTabs(message, options = {}) {
    const maxRetries = options.maxRetries || 2;
    const retryDelay = options.retryDelay || 1000;

    const tabs = await chrome.tabs.query({ url: '*://www.linkedin.com/*' });
    console.log(`🔄 LICON: Broadcasting message "${message.type}" to ${tabs.length} LinkedIn tabs`);

    let successCount = 0;
    let attemptCount = 0;
    const failedTabs = [];

    for (const tab of tabs) {
      try {
        // Process company people pages AND search results pages
        const isCompanyPage = tab.url?.match(/linkedin\.com\/company\/[^\/]+\/people/);
        const isSearchPage = tab.url?.match(/linkedin\.com\/search\/results\/people/);

        if (isCompanyPage || isSearchPage) {
          attemptCount++;
          console.log(`📤 LICON: Processing tab ${tab.id}: ${tab.url}`);

          // Check if tab is in ready state (received CONTENT_SCRIPT_READY)
          const isReady = this.readyTabs.has(tab.id);
          console.log(`📊 LICON: Tab ${tab.id} ready status: ${isReady}`);

          let delivered = false;
          let lastError = null;

          // Try to deliver message with retries
          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
              if (attempt > 0) {
                console.log(`🔄 LICON: Retry attempt ${attempt}/${maxRetries} for tab ${tab.id}`);
                await this.sleep(retryDelay);
              }

              // For critical messages (AUTOMATION_STARTED), PING first to validate connection
              if (message.type === 'AUTOMATION_STARTED' && attempt === 0) {
                console.log(`🏓 LICON: Sending PING to tab ${tab.id} before ${message.type}...`);
                try {
                  const pingResponse = await this.sendMessageWithTimeout(tab.id, { type: 'PING' }, 2000);
                  if (!pingResponse || !pingResponse.success) {
                    console.log(`⚠️ LICON: PING failed for tab ${tab.id}, will retry`);
                    throw new Error('PING failed');
                  }
                  console.log(`✅ LICON: PING successful for tab ${tab.id}`);
                } catch (pingError) {
                  console.log(`❌ LICON: PING error for tab ${tab.id}:`, pingError.message);
                  // Continue to retry with actual message
                  throw pingError;
                }
              }

              // Send the actual message
              await chrome.tabs.sendMessage(tab.id, message);
              delivered = true;
              successCount++;
              console.log(`✅ LICON: Message "${message.type}" delivered to tab ${tab.id}`);
              break; // Success, exit retry loop

            } catch (error) {
              lastError = error;
              console.log(`⚠️ LICON: Attempt ${attempt + 1} failed for tab ${tab.id}:`, error.message);
            }
          }

          if (!delivered) {
            failedTabs.push({
              tabId: tab.id,
              url: tab.url,
              isReady: isReady,
              error: lastError?.message || 'Unknown error'
            });
            console.log(`❌ LICON: Failed to deliver to tab ${tab.id} after ${maxRetries + 1} attempts`);
          }
        }

      } catch (error) {
        console.error(`❌ LICON: Error processing tab ${tab.id}:`, error.message);
      }
    }

    // Log detailed results
    console.log(`📊 LICON: Broadcast complete - ${successCount}/${attemptCount} tabs received message`);
    if (failedTabs.length > 0) {
      console.log('❌ LICON: Failed tabs:', failedTabs);
    }

    // CRITICAL: If we tried to send to tabs but none succeeded, automation cannot run
    if (attemptCount > 0 && successCount === 0 && message.type === 'AUTOMATION_STARTED') {
      console.log('🔴 LICON: ========================================');
      console.log('🔴 LICON: CRITICAL: No tabs could receive the message!');
      console.log('🔴 LICON: Content script is not loaded or not ready.');
      console.log('🔴 LICON: Possible causes:');
      console.log('   1. Page navigated via SPA before content script loaded');
      console.log('   2. Content script crashed or was garbage collected');
      console.log('   3. LinkedIn page is not fully loaded');
      console.log('🔴 LICON: ========================================');

      // Stop automation and save error state
      this.isRunning = false;
      await chrome.storage.local.set({
        liconState: {
          isRunning: false,
          currentCompany: null,
          stats: this.stats,
          lastError: 'Content script not reachable - no tabs received message'
        }
      });

      // Return error indicator
      return { success: false, successCount: 0, attemptCount, failedTabs };
    }

    return { success: successCount > 0, successCount, attemptCount, failedTabs };
  }

  async sendMessageWithTimeout(tabId, message, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Message timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      chrome.tabs.sendMessage(tabId, message, (response) => {
        clearTimeout(timer);
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getSettings() {
    const result = await chrome.storage.sync.get({
      liconSettings: {
        minDelay: 2000,
        maxDelay: 8000,
        profileLimit: 0, // 0 = unlimited
        pageLimit: 0, // 0 = unlimited
        respectRateLimits: true,
        autoScroll: true,
        skipConnected: true
      }
    });
    return result.liconSettings;
  }

  async saveSettings(settings) {
    await chrome.storage.sync.set({ liconSettings: settings });
  }

  async initializeExtension() {
    // Restore state if extension was restarted
    const result = await chrome.storage.local.get(['liconState', 'liconFailedProfiles']);
    if (result.liconState) {
      // Never restore isRunning - content scripts are dead after worker restart
      // User must click Start again to resume
      this.isRunning = false;
      this.currentCompany = null;
      this.stats = result.liconState.stats || this.stats;

      // Ensure skipReasons exists
      if (!this.stats.skipReasons) {
        this.stats.skipReasons = {
          alreadyConnected: 0,
          pending: 0,
          noConnectButton: 0,
          followOnly: 0,
          other: 0
        };
      }

      // Clear stale running state from storage
      if (result.liconState.isRunning) {
        await chrome.storage.local.set({
          liconState: {
            isRunning: false,
            currentCompany: null,
            stats: this.stats
          }
        });
      }
    }

    // Restore failed profiles
    if (result.liconFailedProfiles) {
      this.failedProfiles = result.liconFailedProfiles;
    }
  }
}

// Initialize background script with error handling
try {
  console.log('🔥 LICON: Initializing background script...');
  const liconBackground = new LiconBackground();
  console.log('✅ LICON: Background script initialized successfully');
} catch (error) {
  console.error('❌ LICON: Failed to initialize background script:', error);
}