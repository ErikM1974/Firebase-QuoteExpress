# Embroidery Pricing Calculator

This application is an Embroidery Pricing Calculator that allows users to calculate prices for embroidered products based on style, color, size, and quantity. It uses the Caspio API to fetch product data.

## Local Development Setup

Follow these steps to set up and run the application locally:

1. Clone the repository to your local machine.

2. Install dependencies:
   ```
   npm install
   ```

3. Copy the `.env.example` file to a new file named `.env`:
   ```
   cp .env.example .env
   ```

4. Open the `.env` file and replace the placeholder values with your actual Caspio API credentials:
   ```
   REACT_APP_CASPIO_API_URL=https://your-caspio-instance.caspio.com/rest/v2
   REACT_APP_CASPIO_ACCESS_TOKEN=your_access_token_here
   ```

5. Start the development server:
   ```
   npm start
   ```

6. Open your browser and navigate to http://localhost:3000 to view the application.

## Deploying to Production (Heroku)

When you're ready to deploy the application to Heroku:

1. Create a new Heroku app if you haven't already.

2. Set the Caspio API credentials as environment variables in Heroku:
   ```
   heroku config:set REACT_APP_CASPIO_API_URL=https://your-caspio-instance.caspio.com/rest/v2
   heroku config:set REACT_APP_CASPIO_ACCESS_TOKEN=your_access_token_here -a your-app-name
   ```
   Replace "your-app-name" with your actual Heroku app name.

3. Deploy your application to Heroku:
   ```
   git push heroku main
   ```

4. Open your application:
   ```
   heroku open
   ```

## Updating the Access Token

If you need to update the access token:

1. For local development, update the REACT_APP_CASPIO_ACCESS_TOKEN in your `.env` file.

2. For the Heroku deployment, use the following command:
   ```
   heroku config:set REACT_APP_CASPIO_ACCESS_TOKEN=your_new_access_token_here -a your-app-name
   ```
   Replace "your_new_access_token_here" with your new access token and "your-app-name" with your Heroku app name.

3. After updating the token on Heroku, restart your dynos:
   ```
   heroku restart -a your-app-name
   ```

Remember to keep your credentials secure and never commit them to version control.

## Troubleshooting

If you encounter authentication issues:

1. Verify that your access token is correct and not expired.
2. Check that the environment variables are set correctly in your local `.env` file or on Heroku.
3. Ensure that your Caspio API URL is correct.
4. If issues persist, try regenerating a new access token from your Caspio account and update it as described in the "Updating the Access Token" section.

## Project Structure

- `src/components/EmbroideryCalculator.js`: Main component for the calculator
- `src/App.js`: Root React component
- `public/index.html`: HTML template for the React app
- `server.js`: Simple Express server for serving the built React app

## Available Scripts

- `npm start`: Starts the development server
- `npm run build`: Builds the app for production
- `npm test`: Runs the test suite
- `npm run eject`: Ejects from create-react-app (use with caution)

## Security Note

Never commit your `.env` file or any file containing real credentials to version control. The `.env` file is listed in `.gitignore` to prevent accidental commits.