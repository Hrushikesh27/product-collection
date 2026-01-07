// backend/server.js
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

// Scraping function using Playwright
async function scrapeProduct(url) {
  console.log('Attempting to scrape:', url);
  
  let browser;
  try {
    // Launch browser in headless mode
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US'
    });

    const page = await context.newPage();

    // Navigate to the URL
    console.log('Loading page...');
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    // Wait for content to load
    await page.waitForTimeout(3000);

    let title, price, image;

    // Detect website and extract data
    if (url.includes('amazon')) {
      console.log('Detected Amazon');
      
      // Wait for product title
        await page.waitForSelector('#productTitle', { timeout: 10000 }).catch(() => {});
        
        title = await page.$eval('#productTitle', el => el.textContent.trim()).catch(() => null);
        
        price = await page.$eval('.a-section .a-price .a-price-whole', el => el.textContent.trim())
            .catch(() => null);
        
        image = await page.$eval('#landingImage', el => el.src)
            .catch(() => page.$eval('#imgBlkFront', el => el.src).catch(() => null));

    } else if (url.includes('flipkart')) {
      console.log('Detected Flipkart');
      
      // Wait a bit more for Flipkart's dynamic content
        await page.waitForTimeout(2000);
        
        title = await page.$eval('.CEn5rD .LMizgS', el => el.textContent.trim())
            .catch(() => null);
        
        price = await page.$eval('.QiMO5r .bnqy13', el => el.textContent.trim())
            .catch(() => null);
        
        image = await page.$eval('.QSCKDh .RXQuYa img', el => el.src)
            .catch(() => null);

    } else {
      await browser.close();
      return {
        success: false,
        error: 'Unsupported website. Please provide Amazon or Flipkart URL.'
      };
    }

    await browser.close();

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
    if (browser) {
      await browser.close();
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
  res.json({ status: 'OK', message: 'Server is running with Playwright' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Product Scraper API (Playwright)',
    endpoints: {
      health: 'GET /health',
      scrape: 'POST /api/scrape'
    },
    supported: ['Amazon', 'Flipkart']
  });
});

app.listen(PORT, () => {
  console.log('=================================');
  console.log(`✅ Backend server running (Playwright)`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔍 Test: http://localhost:${PORT}/health`);
  console.log('=================================');
});