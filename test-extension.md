# LICON Extension Testing Guide

## Quick Test Steps

1. **Load Extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extension folder

2. **Test on LinkedIn**
   - Go to a LinkedIn company people page (e.g., `https://www.linkedin.com/company/google/people/`)
   - Or go to LinkedIn search results (`https://www.linkedin.com/search/results/people/`)

3. **Open Side Panel**
   - Click the LICON extension icon in the toolbar
   - The side panel should open showing the automation interface

4. **Start Automation**
   - Click "Start" button
   - Check browser console (F12) for logs starting with "🔥 LICON:"
   - The automation should begin processing profiles

## Expected Behavior

- Extension should detect profiles on the page
- Connect buttons should be found and clicked
- Connection modals should be handled automatically
- Stats should update in the side panel
- Console should show detailed logging

## Troubleshooting

If automation doesn't work:
1. Check browser console for errors
2. Verify you're on a supported LinkedIn page
3. Make sure profiles are visible on the page
4. Try refreshing the page and restarting automation

## Key Fixes Made

1. **Fixed manifest.json** - Added proper content_scripts injection
2. **Updated DOM selectors** - Using correct LinkedIn class names
3. **Improved profile detection** - Better filtering for actual profile cards
4. **Enhanced connect button logic** - Multiple strategies to find buttons
5. **Better modal handling** - Proper detection of connection modals
6. **Removed programmatic injection** - Using manifest-based injection instead