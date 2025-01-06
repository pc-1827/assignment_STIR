// server.js
import express from 'express';
import scrapeTrends from './scrape.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware to parse JSON
app.use(express.json());

// Serve the HTML page
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Twitter Trends Scraper</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          button { padding: 10px 20px; font-size: 16px; }
          #result { margin-top: 20px; }
        </style>
      </head>
      <body>
        <button onclick="runScrape()">Click here to run the script.</button>
        <div id="result"></div>
        <script>
          async function runScrape() {
            const button = document.querySelector('button');
            const resultDiv = document.getElementById('result');
            button.disabled = true;
            resultDiv.innerHTML = 'Running script, please wait...';
            try {
              const response = await fetch('/run');
              const data = await response.json();
              if (data.error) {
                resultDiv.innerHTML = '<p style="color: red;">Error: ' + data.error + '</p><button onclick="location.reload()">Run again</button>';
                return;
              }
              const trendsList = data.trends.map(trend => '<li>' + trend + '</li>').join('');
              const endTime = new Date(data.endTime).toLocaleString();
              resultDiv.innerHTML = \`
                <p>These are the most happening topics as on \${endTime}:</p>
                <ul>
                  \${trendsList}
                </ul>
                <p>The IP address used for this query was \${data.proxyUsed}.</p>
                <button onclick="location.reload()">Run again</button>
              \`;
            } catch (error) {
              resultDiv.innerHTML = '<p style="color: red;">Error: ' + error.message + '</p><button onclick="location.reload()">Run again</button>';
            } finally {
              button.disabled = false;
            }
          }
        </script>
      </body>
    </html>
  `);
});

// Endpoint to run the scraper
app.get('/run', async (req, res) => {
  try {
    console.log('Received /run request');
    const record = await scrapeTrends();
    res.json(record);
  } catch (error) {
    console.error('Error in /run endpoint:', error);
    res.status(500).json({ error: 'Failed to run the script.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
