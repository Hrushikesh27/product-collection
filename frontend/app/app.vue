<template>
  <div class="container">
    <div class="app-wrapper">
      <h1 class="title">Product Scraper</h1>
      <p class="subtitle">Paste a product URL to extract details</p>

      <div class="input-section">
        <input
          v-model="productUrl"
          type="text"
          placeholder="Paste Amazon or Flipkart product URL..."
          class="url-input"
          @keyup.enter="scrapeProduct"
        />
        <button 
          @click="scrapeProduct" 
          :disabled="loading || !productUrl"
          class="scrape-button"
        >
          {{ loading ? 'Scraping...' : 'Get Product Details' }}
        </button>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div v-if="product" class="product-card">
        <h2>Product Details</h2>
        
        <div class="product-content">
          <div v-if="product.image" class="product-image">
            <img :src="product.image" :alt="product.title" />
          </div>
          
          <div class="product-info">
            <div class="info-item">
              <span class="label">Title:</span>
              <p class="value">{{ product.title }}</p>
            </div>
            
            <div class="info-item">
              <span class="label">Price:</span>
              <p class="value price">{{ product.price }}</p>
            </div>
            
            <div class="info-item">
              <span class="label">Source URL:</span>
              <a :href="product.url" target="_blank" class="url-link">
                View on Flipkart →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const productUrl = ref('');
const product = ref(null);
const loading = ref(false);
const error = ref('');

const scrapeProduct = async () => {
  if (!productUrl.value) {
    error.value = 'Please enter a URL';
    return;
  }

  loading.value = true;
  error.value = '';
  product.value = null;

  try {
    const response = await fetch('http://localhost:3001/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: productUrl.value
      })
    });

    const data = await response.json();

    if (data.success) {
      product.value = data.data;
    } else {
      error.value = data.error || 'Failed to scrape product';
    }
  } catch (err) {
    console.error('Full error:', err);
    error.value = `Connection error: ${err.message}. Make sure the backend is running on http://localhost:3001`;
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
}

.app-wrapper {
  max-width: 900px;
  margin: 0 auto;
}

.title {
  color: white;
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 10px;
  font-weight: 700;
}

.subtitle {
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  margin-bottom: 40px;
  font-size: 1.1rem;
}

.input-section {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.url-input {
  flex: 1;
  padding: 15px 20px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.url-input:focus {
  outline: 3px solid rgba(255, 255, 255, 0.5);
}

.scrape-button {
  padding: 15px 30px;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.scrape-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.scrape-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background: #ff6b6b;
  color: white;
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 20px;
  text-align: center;
  font-size: 14px;
}

.product-card {
  background: white;
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.product-card h2 {
  color: #333;
  margin-bottom: 25px;
  font-size: 1.8rem;
}

.product-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 30px;
}

.product-image img {
  width: 100%;
  height: auto;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.label {
  font-weight: 600;
  color: #667eea;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.value {
  color: #333;
  font-size: 1.1rem;
  margin: 0;
}

.price {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2ecc71;
}

.url-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s ease;
}

.url-link:hover {
  color: #764ba2;
}

@media (max-width: 768px) {
  .input-section {
    flex-direction: column;
  }
  
  .product-content {
    grid-template-columns: 1fr;
  }
  
  .title {
    font-size: 2rem;
  }
}
</style>