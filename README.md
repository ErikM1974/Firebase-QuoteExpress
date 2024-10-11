# Firebase-QuoteExpress

Firebase-QuoteExpress is an embroidery pricing calculator web application built with React and Firebase. It provides features for calculating embroidery prices, generating PDFs, and managing orders.

## Features

- Embroidery pricing calculation
- PDF generation for orders
- Firebase integration for backend services
- Express.js server for additional backend functionality

## Project Structure

- `src/`: Contains React components and main application code
  - `components/`: Individual React components
  - `App.js`: Main React component
  - `index.js`: Entry point of the React application
  - `firebase.js`: Firebase configuration and initialization
- `public/`: Public assets and index.html
- `functions/`: Firebase Cloud Functions
- `scripts/`: Utility scripts for data management and deployment
- `server.js`: Express.js server file
- `config/`: Configuration files, including Firebase service account key
- Various configuration files: `.babelrc`, `postcss.config.js`, `tailwind.config.js`, etc.

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in the required environment variables
4. Set up Firebase:
   - Create a Firebase project
   - Add your Firebase configuration to `src/firebase.js`
   - Set up Firestore database and adjust security rules in `firestore.rules`
5. Run the application:
   - For development: `npm start`
   - For production build: `npm run build`

## Environment Setup

The project now supports separate development and production environments. Follow these steps to set up and switch between environments:

1. Development Environment:
   a. Create a new Firebase project for development:
      - Go to the Firebase Console (https://console.firebase.google.com/)
      - Click on "Add project" and follow the prompts to create a new project
      - Name the project "QuoteExpress-Dev"
      - Enable Google Analytics if desired (recommended)
      - Click "Create project"

   b. Set up Firebase in your new development project:
      - In the Firebase Console, click on your newly created "QuoteExpress-Dev" project
      - Click on the web icon (</>) to add a web app to your project
      - Register your app with the nickname "quoteexpress-dev-web"
      - Copy the Firebase configuration object provided

   c. Update `.env.development` with your development Firebase configuration:
      - Copy `.env` to `.env.development` if you haven't already
      - Update `.env.development` with the configuration you just copied:
        ```
        REACT_APP_DEV_FIREBASE_API_KEY=YOUR_DEV_API_KEY
        REACT_APP_DEV_FIREBASE_AUTH_DOMAIN=quoteexpress-dev.firebaseapp.com
        REACT_APP_DEV_FIREBASE_PROJECT_ID=quoteexpress-dev
        REACT_APP_DEV_FIREBASE_STORAGE_BUCKET=quoteexpress-dev.appspot.com
        REACT_APP_DEV_FIREBASE_MESSAGING_SENDER_ID=YOUR_DEV_SENDER_ID
        REACT_APP_DEV_FIREBASE_APP_ID=YOUR_DEV_APP_ID
        REACT_APP_DEV_FIREBASE_MEASUREMENT_ID=YOUR_DEV_MEASUREMENT_ID
        ```

   d. Set up Firestore in your development project:
      - In the Firebase Console, go to "Firestore Database"
      - Click "Create database"
      - Start in production mode (or test mode if you prefer)
      - Choose a location for your database
      - Set up your security rules as needed (you can copy from your production project if applicable)

2. Production Environment:
   - Ensure your `.env` file contains the production Firebase configuration

3. Switching Between Environments:
   - For development: `NODE_ENV=development npm start`
   - For production: `NODE_ENV=production npm start`

4. Building for Production:
   - Run `npm run build` to create a production build

The `src/firebase.js` file has been updated to use the appropriate configuration based on the `NODE_ENV` environment variable.

## Deployment

The project is set up for deployment to Firebase. Use the following command to deploy:

```
npm run deploy
```

Note: Make sure you're using the correct Firebase project when deploying. You may need to use `firebase use [PROJECT_ID]` to switch between your development (QuoteExpress-Dev) and production projects.

## Contributing

Contributions are welcome. Please fork the repository and create a pull request with your changes.

## License

[MIT License](LICENSE)
