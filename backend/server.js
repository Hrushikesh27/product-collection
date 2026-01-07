// backend/server.js
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

async function scrapeProduct(url) {
  console.log('Attempting to scrape:', url);
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Referer': url.includes('amazon') ? 'https://www.amazon.com/' : 'https://www.flipkart.com/',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      },
      timeout: 15000
    });

    const $ = cheerio.load(data);

    let title, price, image;

    // Detect website and use appropriate selectors
    if (url.includes('amazon')) {
      // Amazon selectors
      title = $('#productTitle').text().trim();
      price = $('.a-section .a-price .a-price-whole').first().text().trim();
      image = $('#landingImage').attr('src') || $('#imgBlkFront').attr('src');
    } else if (url.includes('flipkart')) {
      // Flipkart selectors
      title = $('.CEn5rD .LMizgS').text().trim();
      price = $('.QiMO5r .bnqy13').first().text().trim();
      image = $('.IgiqRJ .UCc1lI').attr('src');
    } else {
      return {
        success: false,
        error: 'Unsupported website. Please provide Amazon or Flipkart URL.'
      };
    }

    console.log('Scraped data:', { title: !!title, price: !!price, image: !!image });

    if (!title && !price && !image) {
      return {
        success: false,
        error: 'Could not extract product data. The page structure might have changed or the URL is invalid.'
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
    console.error('Scraping error:', error.message);
    return {
      success: false,
      error: error.message.includes('timeout') 
        ? 'Request timeout. The website might be blocking the request.' 
        : `Failed to fetch product: ${error.message}`
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
  res.json({ status: 'OK', message: 'Server is running' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Flipkart Scraper API',
    endpoints: {
      health: 'GET /health',
      scrape: 'POST /api/scrape'
    }
  });
});

app.listen(PORT, () => {
  console.log('=================================');
  console.log(`✅ Backend server running`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔍 Test: http://localhost:${PORT}/health`);
  console.log('=================================');
});