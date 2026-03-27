# Project Document Review Application

This application is built with React, Vite, and Firebase. It allows users to review documents, vote (Agree/Disagree), and provide comments.

## Deployment to GitHub Pages

To ensure the application works correctly on GitHub Pages:

1.  **Vite Configuration**: `vite.config.ts` has `base: './'` to ensure relative paths for assets.
2.  **Firebase Configuration**: The `firebase-applet-config.json` is included in the build.
3.  **Nojekyll**: A `.nojekyll` file is included in the `public/` directory to bypass Jekyll processing.

### Manual Deployment to GitHub Pages

To ensure the application works correctly on GitHub Pages:

1.  **Vite Configuration**: `vite.config.ts` has `base: './'` to ensure relative paths for assets.
2.  **Firebase Configuration**: The `firebase-applet-config.json` is included in the build.
3.  **Nojekyll**: A `.nojekyll` file is included in the `public/` directory to bypass Jekyll processing.

To deploy manually:
1.  Run `npm run build`.
2.  Push the contents of the `dist` folder to your `gh-pages` branch.
3.  In your GitHub repository **Settings > Pages**, set the source to the `gh-pages` branch and the `/ (root)` folder.

## Local Development

1.  `npm install`
2.  `npm run dev`
3.  Open `http://localhost:3000`
