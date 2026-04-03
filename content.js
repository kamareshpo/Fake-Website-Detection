// Content script for Fake Website Detector Extension

// Inject warning banner for suspicious websites
function injectWarningBanner(analysis) {
  // Remove existing banner if any
  const existingBanner = document.getElementById('fake-website-detector-banner');
  if (existingBanner) {
    existingBanner.remove();
  }

  if (analysis.score < 60) {
    const banner = document.createElement('div');
    banner.id = 'fake-website-detector-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(90deg, #ff4444, #cc0000);
      color: white;
      padding: 10px 20px;
      text-align: center;
      font-family: Arial, sans-serif;
      font-weight: bold;
      z-index: 999999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      animation: slideDown 0.5s ease-out;
    `;

    const message = analysis.score < 40 ? 
      '⚠️ WARNING: This website appears to be FAKE or DANGEROUS!' :
      '⚠️ WARNING: This website appears to be SUSPICIOUS!';

    banner.innerHTML = `
      <span>${message}</span>
      <span style="margin-left: 20px; font-size: 0.9em;">
        Trust Score: ${analysis.score}/100
      </span>
      <button onclick="this.parentElement.remove()" 
              style="margin-left: 20px; background: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
        ✕
      </button>
    `;

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from { transform: translateY(-100%); }
        to { transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);

    document.body.insertBefore(banner, document.body.firstChild);
  }
}

// Add hover tooltips to links
function addLinkTooltips() {
  const links = document.querySelectorAll('a[href]');
  
  links.forEach(link => {
    link.addEventListener('mouseenter', async (e) => {
      const url = link.href;
      if (url && !url.startsWith('javascript:') && !url.startsWith('#')) {
        try {
          // Quick analysis for tooltip
          const analysis = await quickAnalyzeUrl(url);
          if (analysis.score < 70) {
            showTooltip(e, analysis);
          }
        } catch (error) {
          // Ignore errors for tooltips
        }
      }
    });
  });
}

// Quick URL analysis for tooltips
async function quickAnalyzeUrl(url) {
  const domain = new URL(url).hostname;
  let score = 100;

  // Basic checks
  if (!url.startsWith('https://')) {
    score -= 15;
  }

  // Check for suspicious patterns
  if (domain.includes('free') || domain.includes('click') || domain.includes('win')) {
    score -= 10;
  }

  // Check for IP addresses
  const ipPattern = /^\d+\.\d+\.\d+\.\d+$/;
  if (ipPattern.test(domain)) {
    score -= 20;
  }

  // Check for suspicious TLDs
  const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq'];
  if (suspiciousTLDs.some(tld => domain.endsWith(tld))) {
    score -= 15;
  }

  return {
    url: url,
    score: Math.max(0, score),
    domain: domain
  };
}

// Show tooltip for suspicious links
function showTooltip(event, analysis) {
  // Remove existing tooltip
  const existingTooltip = document.getElementById('fake-website-detector-tooltip');
  if (existingTooltip) {
    existingTooltip.remove();
  }

  const tooltip = document.createElement('div');
  tooltip.id = 'fake-website-detector-tooltip';
  tooltip.style.cssText = `
    position: fixed;
    background: #333;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-family: Arial, sans-serif;
    font-size: 12px;
    z-index: 999999;
    pointer-events: none;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    max-width: 250px;
    word-wrap: break-word;
  `;

  const message = analysis.score < 40 ? 
    '⚠️ DANGEROUS LINK' : 
    '⚠️ SUSPICIOUS LINK';

  tooltip.innerHTML = `
    <div style="font-weight: bold; color: #ff6b6b;">${message}</div>
    <div>Domain: ${analysis.domain}</div>
    <div>Trust Score: ${analysis.score}/100</div>
  `;

  // Position tooltip near mouse
  tooltip.style.left = (event.pageX + 10) + 'px';
  tooltip.style.top = (event.pageY - 10) + 'px';

  document.body.appendChild(tooltip);

  // Remove tooltip when mouse leaves
  event.target.addEventListener('mouseleave', () => {
    if (tooltip.parentNode) {
      tooltip.remove();
    }
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'injectWarning') {
    injectWarningBanner(request.analysis);
    sendResponse({ success: true });
  }
});

// Initialize content script
document.addEventListener('DOMContentLoaded', () => {
  // Add link tooltips after page loads
  setTimeout(addLinkTooltips, 1000);
});

// Also run on dynamic content
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      // Re-add tooltips for new links
      setTimeout(addLinkTooltips, 100);
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
}); 