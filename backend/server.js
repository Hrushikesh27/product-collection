// backend/server.js - OPTIMIZED VERSION
const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// OPTIMIZATION 1: Reuse browser instance
let browserInstance = null;

async function getBrowser() {
  if (!browserInstance || !browserInstance.isConnected()) {
    console.log('Launching new browser instance...');
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled' // Avoid detection
      ]
    });
  }
  return browserInstance;
}

// Scraping function using Playwright - OPTIMIZED
async function scrapeProduct(url) {
  console.log('\n🔍 Starting scrape:', url);
  const startTime = Date.now();
  
  let context;
  let page;
  
  try {
    // OPTIMIZATION 2: Reuse browser, create new context
    const t1 = Date.now();
    const browser = await getBrowser();
    console.log(`⏱️  Browser ready: ${Date.now() - t1}ms`);
    
    const t2 = Date.now();
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      // OPTIMIZATION 3: Disable unnecessary features
      javaScriptEnabled: true,
      bypassCSP: true
    });

    page = await context.newPage();
    console.log(`⏱️  Context + Page created: ${Date.now() - t2}ms`);

    // OPTIMIZATION 4: Block unnecessary resources
    const t3 = Date.now();
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['stylesheet', 'font', 'media'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });
    console.log(`⏱️  Route blocking setup: ${Date.now() - t3}ms`);

    // OPTIMIZATION 5: Use networkidle instead of waiting fixed time
    const t4 = Date.now();
    console.log('📄 Loading page...');
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', // Faster than 'load' or 'networkidle'
      timeout: 15000 
    });
    console.log(`⏱️  Page loaded: ${Date.now() - t4}ms`);

    let title, price, image;

    // Detect website and extract data
    const t5 = Date.now();
    if (url.includes('amazon')) {
      console.log('🛒 Detected Amazon');
      
      // OPTIMIZATION 6: Wait only for critical element
      await page.waitForSelector('#productTitle, .a-price', { timeout: 5000 }).catch(() => {});
      
      title = await page.$eval('#productTitle', el => el.textContent.trim()).catch(() => null);
      price = await page.$eval('.a-section .a-price .a-price-whole', el => el.textContent.trim()).catch(() => null);
      image = await page.$eval('#landingImage', el => el.src).catch(() => page.$eval('#imgBlkFront', el => el.src).catch(() => null));

    } else if (url.includes('flipkart')) {
      console.log('🛍️  Detected Flipkart');
      
      // OPTIMIZATION 7: Smart waiting - wait for any key element
      await page.waitForSelector('._1psv1ze2i .css-175oi2r', { timeout: 5000 }).catch(() => {});
      
      title = await page.$eval('.v1zwn21k.v1zwn26._1psv1zeb9._1psv1ze0', el => el.textContent.trim()).catch(() => null);
      price = await page.$eval('.v1zwn21k.v1zwn20._1psv1zeb9._1psv1ze0', el => el.textContent.trim()).catch(() => null);
      image = await page.$eval('.OfydJ4 picture img', el => el.src).catch(() => null);

    } else {
      await context.close();
      return {
        success: false,
        error: 'Unsupported website. Please provide Amazon or Flipkart URL.'
      };
    }
    console.log(`⏱️  Data extraction: ${Date.now() - t5}ms`);

    // Close only the context, not the browser
    const t6 = Date.now();
    await context.close();
    console.log(`⏱️  Context close: ${Date.now() - t6}ms`);

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ TOTAL TIME: ${elapsedTime}s\n`);

    console.log('Scraped data:', { 
      title: title ? 'Found' : 'Not found', 
      price: price ? 'Found' : 'Not found', 
      image: image ? 'Found' : 'Not found' 
    });

    if (!title && !price && !image) {
      return {
        success: false,
        error: 'Could not extract product data. The page structure might have changed.'
      };
    }

    return {
      success: true,
      data: {
        title: title || 'Title not found',
        price: price || 'Price not available',
        image: image || null,
        url: url
      }
    };

  } catch (error) {
    if (context) {
      await context.close().catch(() => {});
    }
    console.error('Scraping error:', error.message);
    return {
      success: false,
      error: error.message.includes('timeout') 
        ? 'Page load timeout. The website might be slow or blocking requests.' 
        : `Failed to scrape: ${error.message}`
    };
  }
}

// API endpoint
app.post('/api/scrape', async (req, res) => {
  console.log('Received scrape request:', req.body);
  
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL is required'
    });
  }

  // Validate Amazon or Flipkart URL
  if (!url.includes('flipkart.com') && !url.includes('amazon.com') && !url.includes('amazon.in')) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid Amazon or Flipkart product URL'
    });
  }

  const result = await scrapeProduct(url);
  
  if (result.success) {
    console.log('✅ Scraping successful');
    res.json(result);
  } else {
    console.log('❌ Scraping failed:', result.error);
    res.status(500).json(result);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running with Playwright (Optimized)',
    browserActive: browserInstance ? browserInstance.isConnected() : false
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Product Scraper API (Playwright - Optimized)',
    endpoints: {
      health: 'GET /health',
      scrape: 'POST /api/scrape'
    },
    supported: ['Amazon', 'Flipkart']
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  if (browserInstance) {
    await browserInstance.close();
  }
  process.exit(0);
});

app.listen(PORT, () => {
  console.log('=================================');
  console.log(`✅ Backend server running (Playwright Optimized)`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔍 Test: http://localhost:${PORT}/health`);
  console.log('⚡ Optimizations: Browser reuse, resource blocking, smart waiting');
  console.log('=================================');
});