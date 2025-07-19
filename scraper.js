const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());
const PORT = 3000;

// Cache variables
let cachedData = [];
let lastFetchTime = null;

async function scrapeBookClosures() {
  try {
    const { data } = await axios.get('https://www.ksestocks.com/BookClosures');
    const $ = cheerio.load(data);
    const closures = [];

    // Find the "With Payouts" section
    const payoutSection = $('h2:contains("With Payouts")').first();
    const table = payoutSection.next('table');

    table.find('tr').each((i, row) => {
      if (i === 0) return; // Skip header row

      const cols = $(row).find('td');
      if (cols.length >= 7) {
        closures.push({
          symbol: $(cols[0]).text().trim(),
          company: $(cols[1]).text().trim(),
          faceValue: $(cols[2]).text().trim(),
          lastClose: $(cols[3]).text().trim(),
          bgFrom: $(cols[4]).text().trim(),
          bgTo: $(cols[5]).text().trim(),
          payout: $(cols[6]).text().trim()
        });
      }
    });

    return closures;
  } catch (error) {
    console.error('Scraping error:', error);
    return [];
  }
}

// API endpoint to get data
app.get('/api/book-closures', async (req, res) => {
  // Refresh data if cache is empty or older than 1 hour
  if (!cachedData.length || (lastFetchTime && (Date.now() - lastFetchTime) > 3600000)) {
    cachedData = await scrapeBookClosures();
    lastFetchTime = Date.now();
  }
  
  res.json({
    success: true,
    lastUpdated: lastFetchTime,
    data: cachedData
  });
});

app.listen(PORT, () => {
  console.log(`Scraper API running on http://localhost:${PORT}`);
  // Initial scrape
  scrapeBookClosures().then(data => {
    cachedData = data;
    lastFetchTime = Date.now();
  });
});
