// Debug script to test new LinkedIn selectors
// Run this in browser console on LinkedIn search results page

console.log('🔍 DEBUGGING LinkedIn Selectors...');

// Test 1: Check for people-search-result containers
const peopleResults = document.querySelectorAll('[data-view-name="people-search-result"]');
console.log(`Found ${peopleResults.length} people-search-result containers`);

if (peopleResults.length > 0) {
  const firstResult = peopleResults[0];
  console.log('First result element:', firstResult);
  
  // Test name extraction
  const nameElement = firstResult.querySelector('a[data-view-name="search-result-lockup-title"]');
  console.log('Name element:', nameElement);
  console.log('Name text:', nameElement?.textContent?.trim());
  
  // Test profile link
  const profileLink = firstResult.querySelector('a[href*="/in/"]');
  console.log('Profile link:', profileLink?.href);
  
  // Test headline
  const headlineElement = firstResult.querySelector('p._2919cedb.ff97483a._05592fe4');
  console.log('Headline element:', headlineElement);
  console.log('Headline text:', headlineElement?.textContent?.trim());
  
  // Test connect button
  const connectBtn = firstResult.querySelector('a[aria-label*="Invite"][aria-label*="connect"]');
  console.log('Connect button:', connectBtn);
  console.log('Connect button aria-label:', connectBtn?.getAttribute('aria-label'));
  
  // Alternative connect button
  const connectBtn2 = firstResult.querySelector('[data-view-name="edge-creation-connect-action"] a');
  console.log('Alternative connect button:', connectBtn2);
}

// Test 2: Check main search container
const searchContainer = document.querySelector('[role="main"][data-sdui-screen*="SearchResultsPeople"]');
console.log('Search container found:', !!searchContainer);

// Test 3: List all potential connect buttons
const allConnectButtons = document.querySelectorAll('a[aria-label*="connect"], button[aria-label*="connect"]');
console.log(`Found ${allConnectButtons.length} potential connect buttons`);
allConnectButtons.forEach((btn, i) => {
  console.log(`Connect button ${i + 1}:`, btn.getAttribute('aria-label'), btn.textContent.trim());
});

console.log('🔍 Debug complete!');