// ============================================================================
// LICON - IMMORTAL CONTENT SCRIPT ENGINE
// ============================================================================
// This script NEVER exits. It runs infinite loops and observers that keep
// the execution context alive indefinitely, preventing garbage collection.
// ============================================================================

(function () {
  'use strict';

  const SCRIPT_VERSION = '4.0.0-IMMORTAL';
  const INJECTION_TIME = Date.now();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔥 LICON IMMORTAL ENGINE INITIALIZING');
  console.log(`📦 Version: ${SCRIPT_VERSION}`);
  console.log(`⏰ Injected: ${new Date(INJECTION_TIME).toISOString()}`);
  console.log(`🌐 URL: ${window.location.href}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // ============================================================================
  // GLOBAL ENGINE STATE (prevents garbage collection)
  // ============================================================================
  const ENGINE = {
    // Identity
    version: SCRIPT_VERSION,
    injectionTime: INJECTION_TIME,
    scriptId: `licon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

    // Automation state
    isAutomationActive: false,
    settings: {
      minDelay: 2000,
      maxDelay: 8000,
      profileLimit: 0,
      skipConnected: true,
      autoScroll: true
    },

    // Processing tracking
    processed: new Set(),
    totalProcessed: 0,

    // Lifecycle tracking
    heartbeatCount: 0,
    lastHeartbeat: Date.now(),
    domCheckCount: 0,

    // Active timers and observers (keeps script alive)
    heartbeatInterval: null,
    domPollingInterval: null,
    mutationObserver: null,
    navigationObserver: null,

    // Automation loop
    automationLoopActive: false,

    // SPA navigation detection
    lastUrl: window.location.href,
    navigationCount: 0
  };

  // CRITICAL: Attach to window to prevent garbage collection
  window.LICON_ENGINE = ENGINE;

  console.log('✅ Engine state attached to window.LICON_ENGINE');
  console.log(`🆔 Script ID: ${ENGINE.scriptId}`);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function getUptime() {
    return Math.floor((Date.now() - INJECTION_TIME) / 1000);
  }

  function detectPageType() {
    const url = window.location.href;
    if (url.match(/linkedin\.com\/company\/[^\/]+\/people/)) return 'company';
    if (url.match(/linkedin\.com\/search\/results\/people/)) return 'search';
    return 'unknown';
  }

  function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  }

  // ============================================================================
  // HEARTBEAT SYSTEM (Infinite Loop #1)
  // ============================================================================
  // This runs FOREVER via setInterval, proving the script is alive
  // ============================================================================

  function startHeartbeat() {
    console.log('💓 Starting immortal heartbeat (2s interval)');

    ENGINE.heartbeatInterval = setInterval(() => {
      ENGINE.heartbeatCount++;
      ENGINE.lastHeartbeat = Date.now();
      const uptime = getUptime();
      const pageType = detectPageType();

      console.log(
        `💓 HEARTBEAT #${ENGINE.heartbeatCount} | ` +
        `Uptime: ${formatUptime(uptime)} | ` +
        `Automation: ${ENGINE.isAutomationActive ? 'ACTIVE' : 'IDLE'} | ` +
        `Processed: ${ENGINE.totalProcessed} | ` +
        `Page: ${pageType} | ` +
        `URL: ${window.location.pathname}`
      );

      // Send heartbeat to background (with full error handling)
      try {
        chrome.runtime.sendMessage({
          type: 'HEARTBEAT',
          data: {
            scriptId: ENGINE.scriptId,
            heartbeatCount: ENGINE.heartbeatCount,
            uptime: uptime,
            isActive: ENGINE.isAutomationActive,
            processed: ENGINE.totalProcessed,
            pageType: pageType,
            url: window.location.href
          }
        }, (response) => {
          // Response handling (background may or may not respond)
          if (chrome.runtime.lastError) {
            // Service worker might be restarting, this is normal
            // Don't log to avoid spam
          }
        });
      } catch (error) {
        // Ignore errors - background might be unavailable
      }

    }, 2000); // Every 2 seconds

    console.log('✅ Heartbeat started - will run forever');
  }

  // ============================================================================
  // MUTATION OBSERVER (Infinite Observer #1)
  // ============================================================================
  // Monitors DOM for LinkedIn SPA navigation and profile card changes
  // ============================================================================

  function startMutationObserver() {
    console.log('👁️  Starting DOM mutation observer...');

    ENGINE.mutationObserver = new MutationObserver((mutations) => {
      // Check if we're still on LinkedIn
      const pageType = detectPageType();

      // Detect SPA navigation by URL change
      if (window.location.href !== ENGINE.lastUrl) {
        ENGINE.navigationCount++;
        console.log(
          `🔄 SPA NAVIGATION DETECTED #${ENGINE.navigationCount} | ` +
          `FROM: ${ENGINE.lastUrl} | ` +
          `TO: ${window.location.href}`
        );
        ENGINE.lastUrl = window.location.href;

        // If automation is running, it will detect new profiles automatically
        // in the next iteration of the automation loop
      }

      // Check for profile containers appearing/disappearing
      const hasProfiles = document.querySelector('[data-view-name="people-search-result"]') ||
        document.querySelector('.org-people-profile-card__profile-card-spacing');

      if (hasProfiles && ENGINE.isAutomationActive) {
        // Profiles are available - automation loop will handle them
      }
    });

    // Observe the entire document for changes
    ENGINE.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });

    console.log('✅ Mutation observer started - monitoring forever');
  }

  // ============================================================================
  // DOM READINESS GATE - Hybrid MutationObserver + Polling
  // ============================================================================
  // Waits for LinkedIn SPA to hydrate and profiles to appear
  // Uses BOTH MutationObserver (reactive) AND polling (fallback)
  // Supports infinite scroll, virtualized lists, and React lazy loading
  // ============================================================================

  /**
   * Waits for profile elements to appear in the DOM
   * @param {Object} options - Configuration options
   * @returns {Promise<Array>} - Array of profile elements found
   */
  async function waitForProfiles(options = {}) {
    const {
      minProfiles = 1,           // Minimum number to consider ready
      maxWaitTime = 15000,       // 15 seconds max wait
      pollInterval = 500,        // Check every 500ms
      useObserver = true,        // Use MutationObserver
      logPrefix = '🔍 DOM Gate'  // Log prefix for identification
    } = options;

    console.log(`${logPrefix}: Starting profile detection...`);
    console.log(`${logPrefix}: Config - minProfiles: ${minProfiles}, maxWait: ${maxWaitTime}ms, poll: ${pollInterval}ms`);

    const startTime = Date.now();
    const pageType = detectPageType();

    let attempt = 0;
    let lastProfileCount = 0;

    // Helper: Check for profiles in DOM
    function checkProfiles() {
      attempt++;
      const elapsed = Date.now() - startTime;

      let profiles = [];
      let containerType = 'unknown';

      if (pageType === 'search') {
        // LinkedIn Search Results - New structure
        const containers = document.querySelectorAll('[data-view-name="people-search-result"]');
        containerType = 'search-result';

        containers.forEach(container => {
          const nameElement = container.querySelector('a[data-view-name="search-result-lockup-title"]');
          const profileLink = container.querySelector('a[href*="/in/"]');

          if (nameElement && profileLink) {
            profiles.push(container);
          }
        });

        // Fallback: Check for main search container
        if (profiles.length === 0) {
          const mainContainer = document.querySelector('[role="main"]');
          const searchList = mainContainer?.querySelector('.reusable-search__entity-result-list');

          if (searchList) {
            console.log(`${logPrefix}: Found search list container, but no profiles yet (React may still be hydrating)`);
          }
        }

      } else if (pageType === 'company') {
        // Company People Page
        const containers = document.querySelectorAll('.org-people-profile-card__profile-card-spacing, .artdeco-card');
        containerType = 'company-card';

        containers.forEach(container => {
          const nameElement = container.querySelector('.artdeco-entity-lockup__title a') ||
            container.querySelector('[id*="org-people-profile-card__profile-image"]');

          if (nameElement) {
            profiles.push(container);
          }
        });
      }

      // Log attempt with detailed info
      if (profiles.length !== lastProfileCount || attempt === 1 || attempt % 5 === 0) {
        const status = profiles.length >= minProfiles ? '✅' : '⏳';
        console.log(
          `${status} ${logPrefix}: Attempt #${attempt} | ` +
          `Elapsed: ${elapsed}ms | ` +
          `Found: ${profiles.length} ${containerType}s | ` +
          `Page: ${pageType} | ` +
          `Target: ${minProfiles}+`
        );
        lastProfileCount = profiles.length;
      }

      return profiles;
    }

    // Strategy 1: MutationObserver (reactive - triggers immediately when profiles appear)
    if (useObserver) {
      console.log(`${logPrefix}: Starting MutationObserver (watching for profile insertion)...`);

      const observerPromise = new Promise((resolve) => {
        let checkTimer = null;

        const observer = new MutationObserver((mutations) => {
          // Debounce checks to avoid excessive DOM queries during rapid mutations
          if (checkTimer) return;

          checkTimer = setTimeout(() => {
            checkTimer = null;
            const profiles = checkProfiles();

            if (profiles.length >= minProfiles) {
              console.log(`${logPrefix}: ✅ MutationObserver detected ${profiles.length} profiles!`);
              observer.disconnect();
              resolve(profiles);
            }
          }, 100); // 100ms debounce
        });

        // Observe the main content area where profiles appear
        const observeTarget = document.querySelector('[role="main"]') || document.body;

        observer.observe(observeTarget, {
          childList: true,
          subtree: true,
          attributes: false,
          characterData: false
        });

        console.log(`${logPrefix}: Observer attached to ${observeTarget.tagName} (monitoring ${observeTarget.childElementCount} children)`);

        // Timeout: Stop observing after maxWaitTime
        setTimeout(() => {
          observer.disconnect();
          resolve(null); // Return null if timed out
        }, maxWaitTime);
      });

      // Strategy 2: Polling (fallback - runs in parallel)
      const pollingPromise = new Promise(async (resolve) => {
        const maxAttempts = Math.ceil(maxWaitTime / pollInterval);

        for (let i = 0; i < maxAttempts; i++) {
          const profiles = checkProfiles();

          if (profiles.length >= minProfiles) {
            console.log(`${logPrefix}: ✅ Polling detected ${profiles.length} profiles!`);
            resolve(profiles);
            return;
          }

          // Check if we've exceeded max wait time
          if (Date.now() - startTime >= maxWaitTime) {
            console.log(`${logPrefix}: ⏱️  Polling timeout after ${maxWaitTime}ms`);
            resolve(null);
            return;
          }

          await sleep(pollInterval);
        }

        resolve(null);
      });

      // Race: Return whichever finds profiles first
      const result = await Promise.race([observerPromise, pollingPromise]);

      if (result && result.length >= minProfiles) {
        const elapsed = Date.now() - startTime;
        console.log(`${logPrefix}: 🎯 SUCCESS! Found ${result.length} profiles in ${elapsed}ms`);
        console.log(`${logPrefix}: Profile detection completed after ${attempt} attempts`);
        return result;
      }
    } else {
      // Observer disabled - use polling only
      console.log(`${logPrefix}: Using polling-only mode (observer disabled)`);

      const maxAttempts = Math.ceil(maxWaitTime / pollInterval);

      for (let i = 0; i < maxAttempts; i++) {
        const profiles = checkProfiles();

        if (profiles.length >= minProfiles) {
          const elapsed = Date.now() - startTime;
          console.log(`${logPrefix}: 🎯 SUCCESS! Found ${profiles.length} profiles in ${elapsed}ms`);
          return profiles;
        }

        if (Date.now() - startTime >= maxWaitTime) {
          break;
        }

        await sleep(pollInterval);
      }
    }

    // Failed to find profiles within timeout
    const elapsed = Date.now() - startTime;
    console.log(`${logPrefix}: ⚠️  TIMEOUT after ${elapsed}ms (${attempt} attempts)`);
    console.log(`${logPrefix}: ❌ Could not find ${minProfiles}+ profiles on ${pageType} page`);
    console.log(`${logPrefix}: This usually means:`);
    console.log(`${logPrefix}:   1. LinkedIn page is still loading (network delay)`);
    console.log(`${logPrefix}:   2. No search results match your query`);
    console.log(`${logPrefix}:   3. LinkedIn changed their DOM structure`);
    console.log(`${logPrefix}:   4. Page type detection is incorrect`);
    console.log(`${logPrefix}: Automation will retry in next iteration...`);

    return []; // Return empty array (never silently fails)
  }

  /**
   * Legacy wrapper for backwards compatibility
   * @deprecated Use waitForProfiles() instead
   */
  async function waitForDOMReady() {
    console.log('⏳ [DEPRECATED] waitForDOMReady() called - use waitForProfiles() instead');

    const profiles = await waitForProfiles({
      minProfiles: 1,
      maxWaitTime: 15000,
      pollInterval: 500,
      useObserver: true,
      logPrefix: '⏳ DOM Ready'
    });

    return profiles.length > 0;
  }

  // ============================================================================
  // PROFILE COLLECTION
  // ============================================================================

  function collectProfiles() {
    const profiles = [];
    const pageType = detectPageType();

    if (pageType === 'search') {
      const containers = document.querySelectorAll('[data-view-name="people-search-result"]');
      console.log(`🔍 Found ${containers.length} search result containers`);

      containers.forEach((container, index) => {
        try {
          const profileLink = container.querySelector('a[href*="/in/"]');
          const nameElement = container.querySelector('a[data-view-name="search-result-lockup-title"]');
          const headlineElement = container.querySelector('p._2919cedb.ff97483a._05592fe4');

          if (nameElement && profileLink) {
            const profile = {
              name: nameElement.textContent.trim(),
              headline: headlineElement ? headlineElement.textContent.trim() : 'No headline',
              profileUrl: profileLink.href,
              element: container
            };
            profiles.push(profile);
          }
        } catch (error) {
          console.log(`⚠️  Error extracting search profile ${index}:`, error.message);
        }
      });

    } else if (pageType === 'company') {
      const containers = document.querySelectorAll('.org-people-profile-card__profile-card-spacing, .artdeco-card');
      const profileCards = Array.from(containers).filter(container => {
        return container.querySelector('.artdeco-entity-lockup__title a') ||
          container.querySelector('[id*="org-people-profile-card__profile-image"]');
      });

      console.log(`🔍 Found ${profileCards.length} company profile cards`);

      profileCards.forEach((container, index) => {
        try {
          const nameElement = container.querySelector('.artdeco-entity-lockup__title a') ||
            container.querySelector('[aria-label*="View"][aria-label*="profile"]') ||
            container.querySelector('a[href*="/in/"]');

          const headlineElement = container.querySelector('.artdeco-entity-lockup__subtitle') ||
            container.querySelector('.t-14.t-black--light');

          if (nameElement) {
            const profile = {
              name: nameElement.textContent.trim() || nameElement.getAttribute('aria-label')?.replace("View ", "").replace("'s profile", "") || 'Unknown',
              headline: headlineElement ? headlineElement.textContent.trim() : 'No headline',
              profileUrl: nameElement.href,
              element: container
            };
            profiles.push(profile);
          }
        } catch (error) {
          console.log(`⚠️  Error extracting company profile ${index}:`, error.message);
        }
      });
    }

    if (profiles.length > 0) {
      console.log(`✅ Collected ${profiles.length} profiles`);
      console.log('📋 Sample profiles:');
      profiles.slice(0, 3).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} - ${p.headline}`);
      });
      if (profiles.length > 3) {
        console.log(`   ... and ${profiles.length - 3} more`);
      }
    }

    return profiles;
  }

  // ============================================================================
  // PROFILE PROCESSING
  // ============================================================================

  async function processProfile(profile) {
    console.log(`▶️  Processing: ${profile.name}`);

    try {
      // Verify element is still in DOM (LinkedIn SPA might have removed it)
      if (!document.body.contains(profile.element)) {
        console.log(`⚠️  Profile element detached from DOM (SPA navigation) - skipping`);
        return { success: true, action: 'skipped', reason: 'elementDetached' };
      }

      // Scroll to profile
      profile.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(500);

      // Find action button
      let actionBtn = null;
      let actionType = null;

      // Strategy 1: Connect button by aria-label
      actionBtn = profile.element.querySelector('a[aria-label*="Invite"][aria-label*="connect"]');
      if (actionBtn) {
        actionType = 'connect';
        console.log(`   🔗 Found Connect button (aria-label)`);
      }

      // Strategy 2: Connect button by data-view-name
      if (!actionBtn) {
        actionBtn = profile.element.querySelector('[data-view-name="edge-creation-connect-action"] a');
        if (actionBtn) {
          actionType = 'connect';
          console.log(`   🔗 Found Connect button (data-view-name)`);
        }
      }

      // Strategy 3: Follow button
      if (!actionBtn) {
        actionBtn = profile.element.querySelector('button[aria-label*="Follow"]');
        if (actionBtn) {
          actionType = 'follow';
          console.log(`   👥 Found Follow button`);
        }
      }

      // Strategy 4: Text search
      if (!actionBtn) {
        const actionElements = profile.element.querySelectorAll('a, button');
        for (const element of actionElements) {
          const text = element.textContent.trim();
          const ariaLabel = element.getAttribute('aria-label') || '';

          if ((text === 'Connect' || ariaLabel.includes('connect')) && element.offsetParent !== null) {
            actionBtn = element;
            actionType = 'connect';
            console.log(`   🔗 Found Connect button (text search)`);
            break;
          } else if ((text === 'Follow' || ariaLabel.includes('Follow')) && element.offsetParent !== null) {
            actionBtn = element;
            actionType = 'follow';
            console.log(`   👥 Found Follow button (text search)`);
            break;
          }
        }
      }

      if (actionBtn && actionBtn.offsetParent !== null) {
        console.log(`   📤 Clicking ${actionType} button`);
        actionBtn.click();
        await sleep(1500);

        // Handle connection modal (only for connect actions)
        if (actionType === 'connect') {
          const modal = document.querySelector('[data-test-modal-id="send-invite-modal"]') ||
            document.querySelector('.send-invite') ||
            document.querySelector('.artdeco-modal-overlay--is-top-layer') ||
            document.querySelector('[role="dialog"]') ||
            document.querySelector('dialog[open]');

          if (modal) {
            console.log(`   📝 Connection modal appeared`);
            const modalText = modal.textContent || '';

            if (modalText.includes('How do you know') || modalText.includes('email address')) {
              console.log(`   ⚠️  Email required - closing modal`);
              const closeBtn = modal.querySelector('[data-test-modal-close-btn]') ||
                modal.querySelector('.artdeco-modal__dismiss') ||
                modal.querySelector('button[aria-label*="Dismiss"]');
              if (closeBtn) closeBtn.click();
              return { success: true, action: 'skipped', reason: 'emailRequired' };
            }

            if (modalText.includes('invitation limit') || modalText.includes('weekly limit')) {
              console.log(`   ⚠️  Weekly limit reached`);
              const closeBtn = modal.querySelector('[data-test-modal-close-btn]') ||
                modal.querySelector('.artdeco-modal__dismiss') ||
                modal.querySelector('button[aria-label*="Dismiss"]');
              if (closeBtn) closeBtn.click();
              return { success: false, action: 'error', reason: 'weeklyLimit' };
            }

            // Look for send button
            const sendBtn = modal.querySelector('button[aria-label*="Send without a note"]') ||
              modal.querySelector('button[aria-label*="Send now"]') ||
              modal.querySelector('button[type="submit"]') ||
              [...modal.querySelectorAll('button')].find(btn =>
                btn.textContent.includes('Send') && !btn.textContent.includes('message')
              );

            if (sendBtn) {
              console.log(`   ✅ Sending connection request`);
              sendBtn.click();
              await sleep(1000);
              return { success: true, action: 'connected' };
            } else {
              console.log(`   ⚠️  Could not find send button`);
              const closeBtn = modal.querySelector('[data-test-modal-close-btn]') ||
                modal.querySelector('.artdeco-modal__dismiss') ||
                modal.querySelector('button[aria-label*="Dismiss"]');
              if (closeBtn) closeBtn.click();
              return { success: true, action: 'skipped', reason: 'modalSendFailed' };
            }
          } else {
            console.log(`   ✅ Connection action completed (no modal)`);
            return { success: true, action: 'connected' };
          }
        } else if (actionType === 'follow') {
          console.log(`   ✅ Follow action completed`);
          return { success: true, action: 'followed' };
        }

      } else {
        // Check if already connected
        const messageBtn = profile.element.querySelector('button[aria-label*="Message"]') ||
          profile.element.querySelector('a[aria-label*="Message"]');
        const pendingText = profile.element.textContent;

        if (messageBtn) {
          console.log(`   ⏭️  Already connected (Message button found)`);
          return { success: true, action: 'skipped', reason: 'alreadyConnected' };
        } else if (pendingText.includes('Pending') || pendingText.includes('pending')) {
          console.log(`   ⏭️  Connection pending`);
          return { success: true, action: 'skipped', reason: 'pending' };
        } else {
          console.log(`   ⏭️  No Connect or Follow button found`);
          return { success: true, action: 'skipped', reason: 'noActionButton' };
        }
      }

    } catch (error) {
      console.error(`   ❌ Error processing profile:`, error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // INFINITE AUTOMATION ENGINE (Infinite Loop #3)
  // ============================================================================
  // This is a while(true) loop that runs FOREVER once started
  // ============================================================================

  async function runInfiniteAutomationEngine() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 INFINITE AUTOMATION ENGINE STARTED');
    console.log('⚡ This loop will run FOREVER until explicitly stopped');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    ENGINE.automationLoopActive = true;
    let iteration = 0;

    // 🔥 INFINITE LOOP - NEVER EXITS
    while (true) {
      // Check if automation should be paused (but loop never stops)
      if (!ENGINE.isAutomationActive) {
        // Automation paused, but we keep looping
        await sleep(1000);
        continue;
      }

      iteration++;
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`🔄 AUTOMATION ITERATION #${iteration}`);
      console.log(`${'═'.repeat(60)}`);

      try {
        // STEP 1: Wait for profiles to appear in DOM (hybrid observer + polling)
        console.log('📋 Step 1: Waiting for profiles to appear...');
        const profileElements = await waitForProfiles({
          minProfiles: 1,
          maxWaitTime: 15000,      // 15 seconds max
          pollInterval: 500,       // Check every 500ms
          useObserver: true,       // Use MutationObserver for reactive detection
          logPrefix: `🔍 Iteration #${iteration}`
        });

        if (profileElements.length === 0) {
          console.log('⚠️  No profiles detected after 15s wait');
          console.log('⚠️  This could mean:');
          console.log('     - LinkedIn is still loading (slow network)');
          console.log('     - No results for current search/page');
          console.log('     - LinkedIn changed their DOM structure');
          console.log('🔄 Will retry in 5 seconds...');
          await sleep(5000);
          continue; // Go to next iteration
        }

        console.log(`✅ Profile elements ready! Found ${profileElements.length} containers`);

        // STEP 2: Extract profile data from elements
        console.log('📋 Step 2: Extracting profile data from containers...');
        const profiles = collectProfiles();

        if (profiles.length === 0) {
          console.log('⚠️  No profiles found, will retry in 5s...');
          await sleep(5000);
          continue; // Go to next iteration
        }

        console.log(`✅ Found ${profiles.length} profiles to process`);

        // STEP 3: Process each profile
        console.log('📋 Step 3: Processing profiles...');

        for (let i = 0; i < profiles.length && ENGINE.isAutomationActive; i++) {
          const profile = profiles[i];

          // Skip if already processed
          if (ENGINE.processed.has(profile.profileUrl)) {
            console.log(`⏭️  [${i + 1}/${profiles.length}] Skipping ${profile.name} (already processed)`);
            continue;
          }

          console.log(`\n▶️  [${i + 1}/${profiles.length}] ${profile.name}`);

          // Process profile
          const result = await processProfile(profile);

          // Mark as processed
          ENGINE.processed.add(profile.profileUrl);
          ENGINE.totalProcessed++;

          console.log(`✅ [${i + 1}/${profiles.length}] Completed | Total: ${ENGINE.totalProcessed}`);

          // Emit PROFILE_PROCESSED event with detailed logging
          console.log(`\\n📤 Sending PROFILE_PROCESSED message to background...`);

          const statsData = {
            name: profile.name,
            headline: profile.headline,
            profileUrl: profile.profileUrl,
            result: result,
            totalProcessed: ENGINE.totalProcessed,
            iteration: iteration,
            timestamp: Date.now(),
            processed: true,
            attempted: result.action === 'connected' || result.action === 'followed' || result.action === 'skipped',
            successful: result.action === 'connected' || result.action === 'followed',
            skipped: result.action === 'skipped',
            error: !result.success,
            skipReason: result.reason || null,
            actionTaken: result.action
          };

          console.log(`📊 Message Payload:`);
          console.log(`   ├─ Name: "${statsData.name}"`);
          console.log(`   ├─ Headline: "${statsData.headline}"`);
          console.log(`   ├─ Profile URL: ${statsData.profileUrl}`);
          console.log(`   ├─ Action: ${statsData.actionTaken}`);
          console.log(`   ├─ Success: ${statsData.successful}`);
          console.log(`   ├─ Skipped: ${statsData.skipped}`);
          console.log(`   ├─ Total Processed: ${statsData.totalProcessed}`);
          console.log(`   └─ Timestamp: ${new Date(statsData.timestamp).toISOString()}`);

          try {
            chrome.runtime.sendMessage({
              type: 'PROFILE_PROCESSED',
              data: statsData
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.log(`⚠️  Background not available: ${chrome.runtime.lastError.message}`);
                console.log(`⚠️  (This is OK - message was attempted, content script continues)`);
              } else {
                console.log(`✅ PROFILE_PROCESSED message sent successfully`);
                if (response) {
                  console.log(`   └─ Background response:`, response);
                }
              }
            });
          } catch (error) {
            console.log(`⚠️  Error sending message: ${error.message}`);
            console.log(`⚠️  (This is OK - content script continues regardless)`);
          }

          // Check limits
          const profileLimit = ENGINE.settings.profileLimit || 0;
          if (profileLimit > 0 && ENGINE.totalProcessed >= profileLimit) {
            console.log(`🛑 Profile limit reached (${ENGINE.totalProcessed}/${profileLimit})`);
            stopAutomation();
            break;
          }

          // Random delay between profiles
          if (i < profiles.length - 1 && ENGINE.isAutomationActive) {
            const minDelay = ENGINE.settings.minDelay || 2000;
            const maxDelay = ENGINE.settings.maxDelay || 8000;
            const delay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
            console.log(`⏱️  Waiting ${delay}ms before next profile...`);
            await sleep(delay);
          }
        }

        console.log(`\n✅ Iteration #${iteration} complete | Total processed: ${ENGINE.totalProcessed}`);

        // STEP 4: Check for pagination or completion
        console.log('📋 Step 4: Checking for next page...');

        // For now, stop automation after one page
        // TODO: Add pagination support
        console.log('🏁 Page complete - stopping automation');
        stopAutomation();

        // Loop continues but automation is paused

      } catch (error) {
        console.error('❌ Error in automation iteration:', error);
        console.log('⏳ Will retry in 5s...');
        await sleep(5000);
        // Loop continues despite error
      }
    }

    // 🚨 THIS LINE SHOULD NEVER BE REACHED
    console.error('🚨 CRITICAL: Infinite automation loop exited! This should never happen!');
  }

  // ============================================================================
  // AUTOMATION CONTROLS
  // ============================================================================

  function startAutomation(settings = {}) {
    if (ENGINE.isAutomationActive) {
      console.log('⚠️  Automation already running');
      return;
    }

    console.log('🚀 Starting automation with settings:', settings);
    ENGINE.settings = { ...ENGINE.settings, ...settings };
    ENGINE.isAutomationActive = true;

    // Send signal to background
    try {
      chrome.runtime.sendMessage({
        type: 'AUTOMATION_RUNNING',
        data: {
          url: window.location.href,
          timestamp: Date.now(),
          scriptId: ENGINE.scriptId
        }
      });
    } catch (error) {
      // Background might not be available
    }

    // Start the infinite engine if not already running
    if (!ENGINE.automationLoopActive) {
      runInfiniteAutomationEngine().catch(error => {
        console.error('❌ Fatal error in automation engine:', error);
        // Even if engine crashes, heartbeat keeps script alive
      });
    }
  }

  function stopAutomation() {
    console.log('🛑 Stopping automation (loop continues in background)');
    ENGINE.isAutomationActive = false;

    try {
      chrome.runtime.sendMessage({
        type: 'AUTOMATION_STOPPED',
        data: {
          totalProcessed: ENGINE.totalProcessed,
          scriptId: ENGINE.scriptId
        }
      });
    } catch (error) {
      // Background might not be available
    }
  }

  // ============================================================================
  // MESSAGE HANDLER (Always Listening)
  // ============================================================================

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Received message:', message.type);

    switch (message.type) {
      case 'PING':
        console.log('🏓 PING received, responding with PONG');
        sendResponse({
          success: true,
          message: 'PONG',
          scriptId: ENGINE.scriptId,
          uptime: getUptime(),
          heartbeatCount: ENGINE.heartbeatCount
        });
        break;

      case 'AUTOMATION_STARTED':
        console.log('🚀 Received AUTOMATION_STARTED command');
        const settings = message.data || {};
        startAutomation(settings);
        sendResponse({ success: true, scriptId: ENGINE.scriptId });
        break;

      case 'AUTOMATION_STOPPED':
        console.log('🛑 Received AUTOMATION_STOPPED command');
        stopAutomation();
        sendResponse({ success: true, scriptId: ENGINE.scriptId });
        break;

      case 'GET_STATUS':
        sendResponse({
          success: true,
          scriptId: ENGINE.scriptId,
          isActive: ENGINE.isAutomationActive,
          totalProcessed: ENGINE.totalProcessed,
          pageType: detectPageType(),
          uptime: getUptime(),
          heartbeatCount: ENGINE.heartbeatCount,
          url: window.location.href
        });
        break;

      default:
        console.log('❓ Unknown message type:', message.type);
        sendResponse({
          success: false,
          error: 'Unknown message type',
          scriptId: ENGINE.scriptId
        });
    }

    return true; // Keep message channel open
  });

  // ============================================================================
  // IMMEDIATE HANDSHAKE
  // ============================================================================

  function sendReadySignal() {
    console.log('📡 Sending CONTENT_SCRIPT_READY handshake to background...');

    try {
      chrome.runtime.sendMessage({
        type: 'CONTENT_SCRIPT_READY',
        data: {
          scriptId: ENGINE.scriptId,
          version: SCRIPT_VERSION,
          url: window.location.href,
          pageType: detectPageType(),
          timestamp: Date.now(),
          injectionTime: INJECTION_TIME
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('⚠️  Handshake error:', chrome.runtime.lastError.message);
          console.log('💡 Background service worker might be starting up - this is normal');
        } else {
          console.log('✅ Handshake acknowledged by background');
        }
      });
    } catch (error) {
      console.log('⚠️  Could not send handshake:', error.message);
      console.log('💡 Background service worker will receive heartbeats when it\'s ready');
    }
  }

  // ============================================================================
  // INITIALIZATION SEQUENCE
  // ============================================================================

  console.log('🔧 Starting initialization sequence...');

  // 1. Start heartbeat (keeps script alive forever)
  startHeartbeat();

  // 2. Start mutation observer (monitors DOM forever)
  startMutationObserver();

  // 3. Send ready signal to background
  sendReadySignal();

  // 4. Log initialization complete
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ LICON IMMORTAL ENGINE INITIALIZED');
  console.log('💓 Heartbeat: RUNNING (2s interval)');
  console.log('👁️  Mutation Observer: ACTIVE');
  console.log('📨 Message Listener: READY');
  console.log('⚡ Status: WAITING FOR AUTOMATION_STARTED COMMAND');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n💡 This script will NEVER exit. It will run indefinitely.');
  console.log('💡 Active processes keeping this script alive:');
  console.log('   1️⃣  setInterval (heartbeat every 2s)');
  console.log('   2️⃣  MutationObserver (monitoring DOM changes)');
  console.log('   3️⃣  Event listeners (chrome.runtime.onMessage)');
  console.log('   4️⃣  while(true) loop (when automation starts)\n');

})();

// 🔥 END OF IMMORTAL CONTENT SCRIPT
// This script has no natural termination point