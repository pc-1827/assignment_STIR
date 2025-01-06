# STIR_Assignment

## Description
This project is an assignment that demonstrates how to use Selenium WebDriver to log in to Twitter, scrape trending topics, and store the results in a MongoDB database hosted on MongoDB Atlas. The project utilizes ProxyMesh to ensure that each request is made from a new IP address, enhancing anonymity and avoiding rate limits.

Note:- When the application navigates to Twitter's Login Page, sometimes it leads to a page which says Something went wrong and has a Refresh button, you need to press that Refresh button yourself. While logging in Twitter may also ask for your email ID, you can add email in .env file if you want to automate email submission if prompted.

You can change the number of trends scraped from the code(Scrape.js Line:- 140).

### Steps

1. Clone the repository:
```
git clone https://github.com/pc-1827/assignment_STIR
cd assignment_STIR
```

2. Install dependencies:
```
npm install
```
3. Set up credentials:
- Create a .env file in the root directory.
- Copy the contents of .env.example to .env.
- Fill in the required environment variables in the .env file:

4. Start the server:
```
npm start
```

5. Navigate to the application:
- Open your web browser and go to http://localhost:3000.
- Click the "Click here to run the script." button to start the scraping process.


### Why I used a Proxy Auth Extension
ProxyMesh uses username and password-based authentication. Chrome does not natively support proxy servers requiring authentication, so my application creates an extension to add authentication. This extension is deleted at the end of the script.
