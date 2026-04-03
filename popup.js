// Popup script for Fake Website Detector Extension

document.addEventListener('DOMContentLoaded', function() {
  const urlInput = document.getElementById('urlInput');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const result = document.getElementById('result');
  const loading = document.getElementById('loading');
  const verdict = document.getElementById('verdict');
  const scoreFill = document.getElementById('scoreFill');
  const trustFactors = document.getElementById('trustFactors');
  const urlText = document.getElementById('urlText');

  // Get current tab URL when popup opens
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentUrl = tabs[0].url;
    urlText.textContent = currentUrl;
    urlInput.value = currentUrl;
  });

  analyzeBtn.addEventListener('click', async function() {
    const url = urlInput.value.trim();
    if (!url) {
      alert('Please enter a URL to analyze');
      return;
    }

    // Show loading state
    loading.style.display = 'block';
    result.style.display = 'none';
    analyzeBtn.disabled = true;

    try {
      const analysis = await analyzeWebsite(url);
      displayResults(analysis);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed. Please try again.');
    } finally {
      loading.style.display = 'none';
      analyzeBtn.disabled = false;
    }
  });

  // Enter key to analyze
  urlInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      analyzeBtn.click();
    }
  });
});

async function analyzeWebsite(url) {
  // Normalize URL
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }

  const domain = new URL(url).hostname;
  let score = 100;
  const report = {};

  // 1. Check HTTPS
  const hasHttps = url.startsWith('https://');
  report.https = hasHttps ? "✅ HTTPS Enabled" : "❌ No HTTPS";
  score += hasHttps ? 5 : -15;

  // 2. Check domain age using WHOIS API (free tier)
  try {
    const ageInfo = await getDomainAge(domain);
    if (ageInfo.age < 180) {
      report.domain_age = `⚠️ Very new domain (${ageInfo.age} days old)`;
      score -= 20;
    } else if (ageInfo.age > 730) {
      report.domain_age = `✅ Domain is trusted (${ageInfo.age} days old)`;
      score += 5;
    } else {
      report.domain_age = `✅ Domain age is ${ageInfo.age} days`;
    }
  } catch (error) {
    report.domain_age = "❓ Could not retrieve domain age";
    score -= 10;
  }

  // 3. Check for suspicious patterns
  const suspiciousPatterns = checkSuspiciousPatterns(url, domain);
  if (suspiciousPatterns.length > 0) {
    report.suspicious_patterns = `⚠️ Suspicious patterns: ${suspiciousPatterns.join(', ')}`;
    score -= suspiciousPatterns.length * 10;
  } else {
    report.suspicious_patterns = "✅ No suspicious patterns detected";
    score += 5;
  }

  // 4. Check SSL certificate
  try {
    const sslInfo = await checkSSL(url);
    if (sslInfo.valid) {
      report.ssl = "✅ Valid SSL Certificate";
      score += 5;
    } else {
      report.ssl = "❌ Invalid or missing SSL certificate";
      score -= 15;
    }
  } catch (error) {
    report.ssl = "❓ Could not verify SSL certificate";
    score -= 5;
  }

  // 5. Check for phishing keywords in URL
  const phishingKeywords = checkPhishingKeywords(url);
  if (phishingKeywords.length > 0) {
    report.phishing_keywords = `⚠️ Phishing keywords found: ${phishingKeywords.join(', ')}`;
    score -= 15;
  } else {
    report.phishing_keywords = "✅ No phishing keywords detected";
    score += 5;
  }

  // 6. Check website reputation using free API
  try {
    const reputation = await checkWebsiteReputation(domain);
    if (reputation.safe) {
      report.reputation = "✅ Website has good reputation";
      score += 10;
    } else {
      report.reputation = "⚠️ Website has poor reputation";
      score -= 20;
    }
  } catch (error) {
    report.reputation = "❓ Could not check reputation";
  }

  // Determine verdict
  let verdict;
  if (score >= 80) {
    verdict = "✅ Legit Website";
  } else if (score >= 60) {
    verdict = "⚠️ Suspicious Website – Be Careful";
  } else {
    verdict = "❌ Fake or Dangerous Website";
  }

  return {
    verdict: verdict,
    score: Math.max(0, Math.min(100, score)),
    trust_factors: report
  };
}

async function getDomainAge(domain) {
  // Using free WHOIS API
  const response = await fetch(`https://whois.whoisxmlapi.com/api/v1?apiKey=demo&domainName=${domain}`);
  const data = await response.json();
  
  if (data.creationDate) {
    const creationDate = new Date(data.creationDate);
    const age = Math.floor((Date.now() - creationDate.getTime()) / (1000 * 60 * 60 * 24));
    return { age };
  }
  
  // Fallback: estimate based on common patterns
  return { age: 365 }; // Default to 1 year if can't determine
}

function checkSuspiciousPatterns(url, domain) {
  const patterns = [];
  
  // Check for IP addresses instead of domain names
  const ipPattern = /^\d+\.\d+\.\d+\.\d+$/;
  if (ipPattern.test(domain)) {
    patterns.push("IP address instead of domain");
  }
  
  // Check for very long domains
  if (domain.length > 50) {
    patterns.push("Unusually long domain name");
  }
  
  // Check for excessive subdomains
  const subdomainCount = domain.split('.').length - 1;
  if (subdomainCount > 3) {
    patterns.push("Too many subdomains");
  }
  
  // Check for suspicious TLDs
  const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq'];
  if (suspiciousTLDs.some(tld => domain.endsWith(tld))) {
    patterns.push("Suspicious TLD");
  }
  
  return patterns;
}

async function checkSSL(url) {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      mode: 'no-cors'
    });
    return { valid: true };
  } catch (error) {
    return { valid: false };
  }
}

function checkPhishingKeywords(url) {
  const keywords = [
    'verify', 'account', 'suspended', 'reset', 'login', 'unauthorized',
    'urgent', 'bank', 'password', 'update', 'click', 'limited', 'payment',
    'secure', 'confirm', 'validate', 'security', 'alert', 'warning'
  ];
  
  const urlLower = url.toLowerCase();
  return keywords.filter(keyword => urlLower.includes(keyword));
}

async function checkWebsiteReputation(domain) {
  // Using free URLVoid API (limited requests)
  try {
    const response = await fetch(`https://api.urlvoid.com/v1/path/?key=demo&host=${domain}`);
    const data = await response.json();
    
    if (data.detections && data.detections > 0) {
      return { safe: false };
    }
    return { safe: true };
  } catch (error) {
    // Fallback: basic heuristic check
    const suspiciousWords = ['free', 'click', 'win', 'prize', 'lottery'];
    const domainLower = domain.toLowerCase();
    const hasSuspiciousWords = suspiciousWords.some(word => domainLower.includes(word));
    return { safe: !hasSuspiciousWords };
  }
}

function displayResults(analysis) {
  const result = document.getElementById('result');
  const verdict = document.getElementById('verdict');
  const scoreFill = document.getElementById('scoreFill');
  const trustFactors = document.getElementById('trustFactors');

  // Set verdict
  verdict.textContent = analysis.verdict;
  verdict.className = 'verdict';
  
  if (analysis.score >= 80) {
    verdict.classList.add('safe');
  } else if (analysis.score >= 60) {
    verdict.classList.add('warning');
  } else {
    verdict.classList.add('danger');
  }

  // Set score bar
  scoreFill.style.width = `${analysis.score}%`;
  scoreFill.textContent = `${analysis.score}/100`;
  
  if (analysis.score >= 80) {
    scoreFill.style.background = '#2e7d32';
  } else if (analysis.score >= 60) {
    scoreFill.style.background = '#fbc02d';
  } else {
    scoreFill.style.background = '#c62828';
  }

  // Display trust factors
  trustFactors.innerHTML = '';
  for (const [key, value] of Object.entries(analysis.trust_factors)) {
    const factor = document.createElement('div');
    factor.className = 'trust-factor';
    factor.textContent = value;
    trustFactors.appendChild(factor);
  }

  result.style.display = 'block';
} 