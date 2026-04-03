// Background service worker for Fake Website Detector Extension

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Fake Website Detector Extension installed');
  
  // Set default settings
  chrome.storage.local.set({
    autoScan: false,
    notifications: true,
    scanHistory: []
  });
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeUrl') {
    analyzeUrlInBackground(request.url)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep message channel open for async response
  }
});

// Background URL analysis (simplified version)
async function analyzeUrlInBackground(url) {
  try {
    const domain = new URL(url).hostname;
    let score = 100;
    const issues = [];

    // Basic checks
    if (!url.startsWith('https://')) {
      issues.push('No HTTPS');
      score -= 15;
    }

    // Check for suspicious patterns
    if (domain.includes('free') || domain.includes('click') || domain.includes('win')) {
      issues.push('Suspicious keywords in domain');
      score -= 10;
    }

    // Check for IP addresses
    const ipPattern = /^\d+\.\d+\.\d+\.\d+$/;
    if (ipPattern.test(domain)) {
      issues.push('IP address instead of domain');
      score -= 20;
    }

    // Check for suspicious TLDs
    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq'];
    if (suspiciousTLDs.some(tld => domain.endsWith(tld))) {
      issues.push('Suspicious TLD');
      score -= 15;
    }

    // Determine verdict
    let verdict;
    if (score >= 80) {
      verdict = "Safe";
    } else if (score >= 60) {
      verdict = "Suspicious";
    } else {
      verdict = "Dangerous";
    }

    return {
      url: url,
      score: Math.max(0, score),
      verdict: verdict,
      issues: issues
    };
  } catch (error) {
    throw new Error('Analysis failed: ' + error.message);
  }
}

// Optional: Auto-scan functionality
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    chrome.storage.local.get(['autoScan'], (result) => {
      if (result.autoScan) {
        // Auto-scan the URL
        analyzeUrlInBackground(tab.url).then(analysis => {
          if (analysis.score < 60) {
            // Show notification for dangerous sites
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icons/icon48.png',
              title: '⚠️ Suspicious Website Detected',
              message: `The website ${new URL(tab.url).hostname} may be unsafe. Score: ${analysis.score}/100`
            });
          }
        });
      }
    });
  }
}); 