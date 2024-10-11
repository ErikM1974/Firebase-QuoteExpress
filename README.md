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
   - Copy `.env.example` to `.env.development` and `.env.production`
   - Fill in the required environment variables for both files
4. Set up Firebase:
   - Create two Firebase projects: one for development and one for production
   - Add your Firebase configurations to `.env.development` and `.env.production`
   - Set up Firestore database and adjust security rules in `firestore.rules` for both projects

## Environment Setup

The project supports separate development and production environments. Here's how to set up and use each environment:

### Development Environment (QuoteExpress-Dev-New)

1. Firebase Console Setup:
   - Go to the Firebase Console (https://console.firebase.google.com/)
   - Create a new project named "QuoteExpress-Dev-New"
   - Enable necessary services (Firestore, Hosting, etc.)

2. Local Setup:
   - Update `.env.development` with the Firebase configuration for QuoteExpress-Dev-New
   - Ensure `REACT_APP_ENVIRONMENT=development` is set in `.env.development`

3. Running Locally:
   - Use `npm start` to run the development server

4. Deployment:
   - Use `npm run deploy:dev` to deploy to the development environment

5. Accessing the Deployed App:
   - Visit https://quoteexpress-dev-new.web.app

### Production Environment (EmbroideryCalculator)

1. Firebase Console Setup:
   - Use your existing "EmbroideryCalculator" Firebase project

2. Local Setup:
   - Update `.env.production` with the Firebase configuration for EmbroideryCalculator
   - Ensure `REACT_APP_ENVIRONMENT=production` is set in `.env.production`

3. Building for Production:
   - Use `npm run build` to create a production build

4. Deployment:
   - Use `npm run deploy:prod` to deploy to the production environment

5. Accessing the Deployed App:
   - Visit your production URL (e.g., https://embroidery-calculator.web.app)

## Development Workflow

1. Make changes in your local development environment
2. Test changes locally using `npm start`
3. Deploy to the development environment using `npm run deploy:dev`
4. Test thoroughly on the deployed development site
5. When ready for production, deploy using `npm run deploy:prod`

## Available Scripts

- `npm start`: Runs the app in development mode
- `npm test`: Launches the test runner
- `npm run build`: Builds the app for production
- `npm run deploy:dev`: Deploys to the development environment
- `npm run deploy:prod`: Deploys to the production environment

## Environment Variables

Ensure these variables are set in your `.env.development` and `.env.production` files:

```
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
REACT_APP_FIREBASE_MEASUREMENT_ID=
REACT_APP_ENVIRONMENT=
```

## Contributing

Contributions are welcome. Please fork the repository and create a pull request with your changes.

## License

[MIT License](LICENSE)
