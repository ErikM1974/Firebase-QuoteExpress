# Embroidery Pricing Calculator

This application is an Embroidery Pricing Calculator that allows users to calculate prices for embroidered products based on style, color, size, and quantity.

## Local Development Setup

Follow these steps to set up and run the application locally:

1. Clone the repository to your local machine.

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development environment:
   ```
   npm run dev
   ```

   This command will concurrently start:
   - The React application (client) on http://localhost:3000
   - The Express server on http://localhost:5001
   - The mock API server on http://localhost:3002

4. Open your browser and navigate to http://localhost:3000 to view the application.

## Testing the Application

To test the application:

1. Enter a style number (e.g., "ST5000") in the STYLE# field.
2. Select a color from the dropdown menu.
3. Enter quantities for different sizes.
4. The application will automatically calculate prices based on the total quantity across all orders.
5. You can add multiple lines for different styles or colors.

## Troubleshooting

If you encounter any issues:

1. Make sure all required dependencies are installed.
2. Check that all three servers (React app, Express server, and mock API server) are running without errors.
3. Verify that the mock API server is correctly serving product data at http://localhost:3002/api/products.

### Addressing Vulnerabilities

After installation, you may see warnings about vulnerabilities. To address these:

1. Run `npm audit` to see detailed information about the vulnerabilities.
2. Run `npm audit fix` to automatically fix issues that don't require major changes.
3. For remaining issues, you may need to update specific packages manually or wait for upstream dependencies to be updated.

Note: Some vulnerabilities may be in development dependencies and not affect the production build.

## Deploying to Production

When you're ready to deploy the application to production:

1. Update the API endpoint in `src/components/EmbroideryCalculator.js` to point to your production Caspio API.
2. Build the React application:
   ```
   npm run build
   ```
3. Deploy the built application and the server.js file to your hosting platform (e.g., Heroku).

Remember to set up any necessary environment variables on your hosting platform.

## Project Structure

- `src/components/EmbroideryCalculator.js`: Main component for the calculator
- `server.js`: Express server for serving the React app
- `mock-api-server.js`: Mock API server for local development
- `public/index.html`: HTML template for the React app

## Available Scripts

- `npm run dev`: Starts the development environment
- `npm run server`: Starts the Express server
- `npm run client`: Starts the React development server
- `npm run mock-api`: Starts the mock API server
- `npm run build`: Builds the React app for production

## .npmrc Configuration

The included .npmrc file contains settings to suppress some warnings and allow the installation to proceed with potential peer dependency issues. You can modify these settings if you want to see more detailed output during npm operations.