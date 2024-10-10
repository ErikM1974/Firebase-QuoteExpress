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

## Deployment

The project is set up for deployment to Firebase. Use the following command to deploy:

```
npm run deploy
```

## Contributing

Contributions are welcome. Please fork the repository and create a pull request with your changes.

## License

[MIT License](LICENSE)
