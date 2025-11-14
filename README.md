<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 우리가족 행복 앨범 (Our Family Happiness Album)

This application allows users to upload photos and videos from their devices and automatically organizes them by year and month for easy viewing. It uses Firebase for backend services including Firestore for database and Firebase Storage for file storage.

## Setup and Run Locally

**Prerequisites:**
- Node.js
- A Google Firebase account

### 1. Firebase Project Setup
This application requires a Firebase project to function. Please follow the detailed step-by-step instructions located at the top of the `firebase.ts` file in this project. The guide will walk you through:
- Creating a Firebase project.
- Registering your web app and getting your `firebaseConfig`.
- Setting up Firestore Database and its security rules.
- Setting up Firebase Storage and its security rules.
- Configuring CORS for the download feature.

**This is a critical step. The app will not work without a correctly configured Firebase project.**

### 2. Local Development
Once your Firebase project is set up and you have updated the `firebase.ts` file with your project's configuration:

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Run the application:**
    ```bash
    npm run dev
    ```
The app should now be running locally, connected to your Firebase project.