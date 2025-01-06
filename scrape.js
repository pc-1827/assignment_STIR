// scrape.js
import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
import { createProxyAuthExtension } from './createProxyAuthExtension.js';

dotenv.config();

async function scrapeTrends() {
  console.log('Starting scrapeTrends function');

  // Retrieve environment variables
  const twitterUsername = process.env.TWITTER_USERNAME;
  const twitterPassword = process.env.TWITTER_PASSWORD;
  const twitterEmail = process.env.TWITTER_EMAIL || '';
  const proxyHost = process.env.PROXY_HOST || 'us-ca.proxymesh.com'; // Default ProxyMesh host
  const proxyPort = process.env.PROXY_PORT || '31280'; // Default ProxyMesh port
  const proxyUsername = process.env.PROXY_USERNAME;
  const proxyPassword = process.env.PROXY_PASSWORD;

  if (!twitterUsername || !twitterPassword || !proxyUsername || !proxyPassword) {
    console.error('Missing required environment variables in .env');
    return { error: 'Configuration missing' };
  }

  const proxyServer = `http://${proxyHost}:${proxyPort}`;

  let driver;
  try {
    const extensionPath = await createProxyAuthExtension(proxyUsername, proxyPassword, proxyHost, proxyPort);
    console.log(`Proxy authentication extension created at ${extensionPath}`);

    const chromeOptions = new chrome.Options();

    // Uncomment the next line to run Chrome in headful mode for debugging
    // chromeOptions.addArguments('--headless=new');

    chromeOptions.addArguments('--disable-gpu');
    chromeOptions.addArguments('--no-sandbox');
    chromeOptions.addArguments('--disable-dev-shm-usage');
    chromeOptions.addArguments('--window-size=1920,1080');
    chromeOptions.addArguments('--disable-blink-features=AutomationControlled');
    chromeOptions.addArguments('--ignore-certificate-errors');
    chromeOptions.addArguments('--allow-insecure-localhost');
    chromeOptions.addArguments(`--proxy-server=${proxyServer}`);

    // Add the proxy authentication extension
    chromeOptions.addExtensions([extensionPath]);

    console.log('Initializing Selenium WebDriver with Chrome and proxy extension');
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions)
      .build();

    console.log('Navigating to Twitter login page');
    await driver.get('https://twitter.com/login');

    // Wait until the title contains 'Log in' (up to 20 seconds)
    await driver.wait(until.titleContains('Log in'), 20000);
    console.log('Page title indicates login page loaded');

    // Step 1: Enter Username
    const usernameXPath = '//input[@autocomplete="username"]';
    console.log('Waiting for username input using XPath:', usernameXPath);
    await driver.wait(until.elementLocated(By.xpath(usernameXPath)), 20000);
    const usernameField = await driver.findElement(By.xpath(usernameXPath));
    await usernameField.sendKeys(twitterUsername);
    console.log('Entered username');

    // Step 2: Click "Next" Button
    const nextButtonXPath = '//button[@role="button" and .//span[text()="Next"]]';
    console.log('Waiting for Next button using XPath:', nextButtonXPath);
    await driver.wait(until.elementLocated(By.xpath(nextButtonXPath)), 20000);
    const nextButton = await driver.findElement(By.xpath(nextButtonXPath));

    // Wait until the Next button is visible and enabled
    await driver.wait(until.elementIsVisible(nextButton), 10000);
    await driver.wait(until.elementIsEnabled(nextButton), 10000);

    await nextButton.click();
    console.log('Clicked Next button');

    // Step 2.1: After clicking Next, handle possible email prompt
    try {
      const emailInputXPath = '//input[@type="text" and @data-testid="ocfEnterTextTextInput"]';
      await driver.wait(until.elementLocated(By.xpath(emailInputXPath)), 5000);
      if (twitterEmail) {
        const emailField = await driver.findElement(By.xpath(emailInputXPath));
        await emailField.sendKeys(twitterEmail);
        const emailNextBtnXPath = '//button[@role="button" and .//span[text()="Next"]]';
        const emailNextBtn = await driver.findElement(By.xpath(emailNextBtnXPath));
        await driver.wait(until.elementIsVisible(emailNextBtn), 5000);
        await emailNextBtn.click();
      }
    } catch (err) {
      console.log('No email prompt detected or email not provided, proceeding...');
    }

    // Step 3: Enter Password
    const passwordXPath = '//input[@name="password"]';
    console.log('Waiting for password input using XPath:', passwordXPath);
    await driver.wait(until.elementLocated(By.xpath(passwordXPath)), 20000);
    const passwordField = await driver.findElement(By.xpath(passwordXPath));
    await passwordField.sendKeys(twitterPassword);
    console.log('Entered password');

    // Step 4: Click "Log in" Button
    const loginButtonXPath = '//button[@role="button" and .//span[text()="Log in"]]';
    console.log('Waiting for Log in button using XPath:', loginButtonXPath);
    await driver.wait(until.elementLocated(By.xpath(loginButtonXPath)), 20000);
    const loginButton = await driver.findElement(By.xpath(loginButtonXPath));

    // Wait until the Log in button is visible and enabled
    await driver.wait(until.elementIsVisible(loginButton), 10000);
    await driver.wait(until.elementIsEnabled(loginButton), 10000);

    await loginButton.click();
    console.log('Clicked Log in button');

    // Step 5: Wait for Home Page to Load
    console.log('Waiting for home page to load');
    await driver.wait(until.urlContains('/home'), 20000);
    console.log('Twitter home page loaded');

    // Step 6: Wait for Trends Section to Load
    console.log('Waiting for trend elements to load');
    const trendsSelector = 'div[data-testid="trend"]';
    await driver.wait(until.elementLocated(By.css(trendsSelector)), 20000);
    console.log('Trend elements are present');

    // Step 7: Fetch Trending Topics
    console.log('Fetching trending topics');
    const trendElements = await driver.findElements(By.css(trendsSelector));

    const maxTrends = 4; // As per your requirement
    const topTrends = [];

    for (let i = 0; i < trendElements.length && i < maxTrends; i++) {
      const trendText = await trendElements[i].getText();
      const lines = trendText.split('\n').filter((line) => line.trim() !== '');
      const mainText = lines[1] || lines[0];
      topTrends.push(mainText);
      console.log(`Trend ${i + 1}: ${mainText}`);
    }

    // Step 8: Fetch IP Used via ProxyMesh
    let proxyUsed = 'Unknown';
    try {
      console.log('Fetching IP used via ProxyMesh');
      const proxyAuthURL = `http://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`;
      const agent = new HttpsProxyAgent(proxyAuthURL);
      const ipResponse = await fetch('https://api.ipify.org?format=json', {
      agent: agent
    });
      const ipData = await ipResponse.json();
      proxyUsed = ipData.ip;
      console.log(`Proxy IP used: ${proxyUsed}`);
    } catch (err) {
      console.error('Failed to fetch IP from ProxyMesh:', err);
    }

    // Step 9: Insert Record into MongoDB
    console.log('Connecting to MongoDB with URI:', process.env.MONGODB_URI);
    const client = new MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('twitter_trends');
    const collection = db.collection('trends');

    const record = {
      uniqueId: Date.now(),
      trends: topTrends,
      endTime: new Date(),
      proxyUsed,
    };

    console.log('Inserting record into MongoDB:', record);
    await collection.insertOne(record);
    console.log('Record inserted successfully');

    await client.close();
    console.log('MongoDB connection closed');

    // Clean up: Remove the temporary proxy authentication extension
    try {
      fs.unlinkSync(extensionPath);
      console.log('Temporary proxy authentication extension removed');
    } catch (unlinkError) {
      console.error('Failed to remove temporary extension:', unlinkError);
    }

    return record;
  } catch (error) {
    console.error('Error during scraping:', error);
    return { error: error.message };
  } finally {
    if (driver) {
      await driver.quit();
      console.log('Selenium WebDriver closed');
    }
  }
}

export default scrapeTrends;
