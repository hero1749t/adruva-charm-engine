const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface AnalysisResult {
  overallScore: number;
  categories: {
    name: string;
    score: number;
    maxScore: number;
    issues: string[];
    suggestions: string[];
  }[];
}

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^\[::1\]$/i,
];

function isAllowedUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { ok: false, error: "Only http and https URLs are allowed" };
    }

    if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname))) {
      return { ok: false, error: "Private or local network URLs are not allowed" };
    }

    return { ok: true, url: parsed.toString() };
  } catch {
    return { ok: false, error: "Invalid URL format" };
  }
}

function analyzeHtml(html: string, url: string, headers: Headers, loadTimeMs: number): AnalysisResult {
  const lower = html.toLowerCase();

  // === 1. Mobile Optimization (0-20) ===
  const mobileIssues: string[] = [];
  const mobileSuggestions: string[] = [];
  let mobileScore = 20;

  const hasViewport = lower.includes('name="viewport"') || lower.includes("name='viewport'");
  if (!hasViewport) {
    mobileScore -= 8;
    mobileIssues.push("No viewport meta tag found");
    mobileSuggestions.push("Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> to your HTML head");
  }

  const hasMediaQueries = lower.includes('@media') || lower.includes('responsive') || lower.includes('col-md') || lower.includes('col-lg');
  if (!hasMediaQueries) {
    mobileScore -= 4;
    mobileIssues.push("No responsive CSS/framework detected");
    mobileSuggestions.push("Use CSS media queries or a responsive framework like Bootstrap/Tailwind");
  }

  const hasTouchIcons = lower.includes('apple-touch-icon') || lower.includes('apple-mobile-web-app');
  if (!hasTouchIcons) {
    mobileScore -= 4;
    mobileIssues.push("No mobile app icons configured");
    mobileSuggestions.push("Add apple-touch-icon for better mobile bookmark experience");
  }

  const hasSmallTapTargets = (html.match(/<a[^>]*style="[^"]*font-size:\s*[0-9]{1}px/gi) || []).length > 0;
  if (hasSmallTapTargets) {
    mobileScore -= 4;
    mobileIssues.push("Some links may have small tap targets");
    mobileSuggestions.push("Ensure buttons and links are at least 44x44px for easy tapping");
  }

  // === 2. Page Speed (0-20) ===
  const speedIssues: string[] = [];
  const speedSuggestions: string[] = [];
  let speedScore = 20;

  if (loadTimeMs > 3000) {
    speedScore -= 6;
    speedIssues.push(`Page took ${(loadTimeMs / 1000).toFixed(1)}s to respond (should be under 3s)`);
    speedSuggestions.push("Optimize server response time, use caching, or switch to a faster host");
  } else if (loadTimeMs > 1500) {
    speedScore -= 3;
    speedIssues.push(`Page response time is ${(loadTimeMs / 1000).toFixed(1)}s (could be faster)`);
    speedSuggestions.push("Consider optimizing server configuration for faster responses");
  }

  const imgCount = (html.match(/<img/gi) || []).length;
  const lazyImgCount = (html.match(/loading=["']lazy["']/gi) || []).length;
  if (imgCount > 3 && lazyImgCount < imgCount / 2) {
    speedScore -= 4;
    speedIssues.push(`Only ${lazyImgCount} of ${imgCount} images use lazy loading`);
    speedSuggestions.push("Add loading=\"lazy\" to images below the fold");
  }

  const htmlSize = new Blob([html]).size;
  if (htmlSize > 500000) {
    speedScore -= 4;
    speedIssues.push(`HTML is ${(htmlSize / 1024).toFixed(0)}KB (very large)`);
    speedSuggestions.push("Minify HTML, remove unused code, and split into smaller pages");
  } else if (htmlSize > 200000) {
    speedScore -= 2;
    speedIssues.push(`HTML is ${(htmlSize / 1024).toFixed(0)}KB (could be smaller)`);
    speedSuggestions.push("Consider minifying your HTML and removing inline styles");
  }

  const hasMinifiedCss = lower.includes('.min.css') || lower.includes('.min.js');
  if (!hasMinifiedCss) {
    speedScore -= 3;
    speedIssues.push("No minified CSS/JS files detected");
    speedSuggestions.push("Use minified versions of CSS and JavaScript files");
  }

  const scriptCount = (html.match(/<script/gi) || []).length;
  if (scriptCount > 10) {
    speedScore -= 3;
    speedIssues.push(`${scriptCount} script tags found — may slow down page`);
    speedSuggestions.push("Bundle scripts together and defer non-critical ones");
  }

  // === 3. SEO (0-20) ===
  const seoIssues: string[] = [];
  const seoSuggestions: string[] = [];
  let seoScore = 20;

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (!titleMatch || !titleMatch[1]?.trim()) {
    seoScore -= 5;
    seoIssues.push("Missing page title");
    seoSuggestions.push("Add a descriptive <title> with your restaurant name and location");
  } else if (titleMatch[1].length > 60) {
    seoScore -= 2;
    seoIssues.push("Title tag is too long (over 60 characters)");
    seoSuggestions.push("Keep title under 60 characters for best display in search results");
  }

  const hasMetaDesc = lower.includes('name="description"') || lower.includes("name='description'");
  if (!hasMetaDesc) {
    seoScore -= 5;
    seoIssues.push("Missing meta description");
    seoSuggestions.push("Add a meta description with restaurant type, cuisine, and location");
  }

  const h1Count = (html.match(/<h1/gi) || []).length;
  if (h1Count === 0) {
    seoScore -= 3;
    seoIssues.push("No H1 heading found");
    seoSuggestions.push("Add one H1 tag with your restaurant name");
  } else if (h1Count > 1) {
    seoScore -= 1;
    seoIssues.push(`Multiple H1 tags found (${h1Count})`);
    seoSuggestions.push("Use only one H1 tag per page");
  }

  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const imgWithoutAlt = imgTags.filter(tag => !tag.includes('alt=') || tag.includes('alt=""')).length;
  if (imgWithoutAlt > 0) {
    seoScore -= 3;
    seoIssues.push(`${imgWithoutAlt} images missing alt text`);
    seoSuggestions.push("Add descriptive alt text to all images for SEO and accessibility");
  }

  const hasCanonical = lower.includes('rel="canonical"') || lower.includes("rel='canonical'");
  if (!hasCanonical) {
    seoScore -= 2;
    seoIssues.push("No canonical URL set");
    seoSuggestions.push("Add a canonical link tag to avoid duplicate content issues");
  }

  const hasOgTags = lower.includes('og:title') || lower.includes('og:description');
  if (!hasOgTags) {
    seoScore -= 2;
    seoIssues.push("Missing Open Graph meta tags");
    seoSuggestions.push("Add og:title, og:description, og:image for better social media sharing");
  }

  // === 4. Online Menu Availability (0-20) ===
  const menuIssues: string[] = [];
  const menuSuggestions: string[] = [];
  let menuScore = 20;

  const menuKeywords = ['menu', 'food menu', 'our dishes', 'our menu', 'order online', 'order now', 'dishes', 'cuisine', 'thali', 'biryani', 'pizza', 'burger'];
  const hasMenuContent = menuKeywords.some(kw => lower.includes(kw));
  if (!hasMenuContent) {
    menuScore -= 10;
    menuIssues.push("No online menu or food items found on the page");
    menuSuggestions.push("Add a digital menu with item names, descriptions, and prices");
  }

  const hasPrices = /₹\s*\d+|rs\.?\s*\d+|inr\s*\d+|\d+\s*rupee/i.test(html) || /\$\s*\d+/.test(html);
  if (!hasPrices && hasMenuContent) {
    menuScore -= 5;
    menuIssues.push("Menu items found but no prices displayed");
    menuSuggestions.push("Show prices on your menu to help customers decide before visiting");
  }

  const hasOnlineOrdering = lower.includes('order online') || lower.includes('order now') || lower.includes('add to cart') || lower.includes('zomato') || lower.includes('swiggy');
  if (!hasOnlineOrdering) {
    menuScore -= 5;
    menuIssues.push("No online ordering option found");
    menuSuggestions.push("Add online ordering or WhatsApp ordering to increase revenue");
  }

  const hasMenuImages = hasMenuContent && imgCount > 2;
  if (!hasMenuImages) {
    menuScore -= 3;
    menuIssues.push("Few food images on the page");
    menuSuggestions.push("Add high-quality food photos to attract more customers");
  }

  const hasMenuSchema = lower.includes('"menu"') && lower.includes('schema.org');
  if (!hasMenuSchema) {
    menuScore -= 2;
    menuIssues.push("No Menu structured data (Schema.org)");
    menuSuggestions.push("Add Schema.org Menu markup so Google can show your menu in search results");
  }

  // === 5. Google Visibility (0-20) ===
  const googleIssues: string[] = [];
  const googleSuggestions: string[] = [];
  let googleScore = 20;

  const hasStructuredData = lower.includes('application/ld+json') || lower.includes('schema.org');
  if (!hasStructuredData) {
    googleScore -= 6;
    googleIssues.push("No Schema.org structured data found");
    googleSuggestions.push("Add LocalBusiness JSON-LD with name, address, phone, hours, and cuisine type");
  }

  const hasAddress = lower.includes('address') || lower.includes('location') || lower.includes('map') || lower.includes('directions');
  if (!hasAddress) {
    googleScore -= 4;
    googleIssues.push("No address or location information found");
    googleSuggestions.push("Add your full address and embed a Google Map for local search visibility");
  }

  const hasPhone = /(\+91|tel:|phone|call)/i.test(html);
  if (!hasPhone) {
    googleScore -= 3;
    googleIssues.push("No phone number found on the page");
    googleSuggestions.push("Add a clickable phone number for Google's local knowledge panel");
  }

  const hasHours = lower.includes('hours') || lower.includes('timing') || lower.includes('open') || lower.includes('am') || lower.includes('pm');
  if (!hasHours) {
    googleScore -= 3;
    googleIssues.push("No business hours/timings found");
    googleSuggestions.push("Display your restaurant's opening and closing hours");
  }

  const hasHttps = url.startsWith('https://');
  if (!hasHttps) {
    googleScore -= 4;
    googleIssues.push("Website is not using HTTPS");
    googleSuggestions.push("Switch to HTTPS — Google ranks secure sites higher");
  }

  // Clamp scores
  mobileScore = Math.max(0, mobileScore);
  speedScore = Math.max(0, speedScore);
  seoScore = Math.max(0, seoScore);
  menuScore = Math.max(0, menuScore);
  googleScore = Math.max(0, googleScore);

  const overallScore = mobileScore + speedScore + seoScore + menuScore + googleScore;

  return {
    overallScore,
    categories: [
      { name: "Mobile Optimization", score: mobileScore, maxScore: 20, issues: mobileIssues, suggestions: mobileSuggestions },
      { name: "Page Speed", score: speedScore, maxScore: 20, issues: speedIssues, suggestions: speedSuggestions },
      { name: "SEO", score: seoScore, maxScore: 20, issues: seoIssues, suggestions: seoSuggestions },
      { name: "Online Menu", score: menuScore, maxScore: 20, issues: menuIssues, suggestions: menuSuggestions },
      { name: "Google Visibility", score: googleScore, maxScore: 20, issues: googleIssues, suggestions: googleSuggestions },
    ],
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const validation = isAllowedUrl(formattedUrl);
    if (!validation.ok) {
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    formattedUrl = validation.url;

    console.log('Analyzing URL:', formattedUrl);

    const startTime = Date.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let response: Response;
    try {
      response = await fetch(formattedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      const msg = fetchErr instanceof Error ? fetchErr.message : 'Failed to fetch';
      return new Response(
        JSON.stringify({ success: false, error: `Could not reach ${formattedUrl}: ${msg}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    clearTimeout(timeout);
    const loadTimeMs = Date.now() - startTime;
    const html = await response.text();

    const result = analyzeHtml(html, formattedUrl, response.headers, loadTimeMs);

    console.log('Analysis complete. Score:', result.overallScore);

    return new Response(
      JSON.stringify({ success: true, ...result, url: formattedUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error analyzing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
