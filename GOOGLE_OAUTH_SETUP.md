# Google OAuth 2.0 Setup Guide

This guide will help you set up Google Sign-In for the Team and Task Management System.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "Team Task Management")
5. Click "Create"

## Step 2: Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google+ API" or "Google Identity Services"
3. Click on it and click "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen first:
   - Choose "External" (unless you have a Google Workspace)
   - Fill in the required information:
     - App name: "Team Task Management"
     - User support email: Your email
     - Developer contact information: Your email
   - Click "Save and Continue"
   - Add scopes (if needed): `email`, `profile`, `openid`
   - Click "Save and Continue"
   - Add test users (your email) if in testing mode
   - Click "Save and Continue"
   - Review and click "Back to Dashboard"

4. Now create the OAuth client ID:
   - Application type: **Web application**
   - Name: "Team Task Management Web Client"
   - **Authorized JavaScript origins**: 
     - `http://localhost:5173` (for Vite development)
     - `http://localhost:3000` (if you also use CRA)
     - Add your production URL when deploying
   - **Authorized redirect URIs**: 
     - `http://localhost:5173` (for Vite development)
     - `http://localhost:3000` (if you also use CRA)
     - Add your production URL when deploying
   - Click "Create"

5. **IMPORTANT**: Copy the **Client ID** (not the Client Secret)
   - It will look like: `123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com`

## Step 4: Configure Environment Variables

### Backend Configuration

1. In the `backend` folder, create a `.env` file (copy from `env.example` if it doesn't exist)
2. Add your Google Client ID:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   ```
   **Note**: For Google Sign-In with ID tokens, you typically only need the Client ID, not the Client Secret.

### Frontend Configuration

1. In the `task` folder, create a `.env` file
2. Add your Google Client ID:
   ```
   VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   VITE_API_URL=http://localhost:5000
   ```

## Step 5: Restart Your Servers

After updating the environment variables:

1. **Backend**: Restart the backend server
   ```bash
   cd backend
   npm run server
   ```

2. **Frontend**: Restart the frontend dev server
   ```bash
   cd task
   npm run dev
   ```

## Troubleshooting

### Error: "origin_mismatch"

This means `http://localhost:5173` is not in your Authorized JavaScript origins.

**Solution**:
1. Go to Google Cloud Console > APIs & Services > Credentials
2. Click on your OAuth 2.0 Client ID
3. Under "Authorized JavaScript origins", add:
   - `http://localhost:5173`
   - `http://localhost:3000` (if needed)
4. Click "Save"
5. Wait a few minutes for changes to propagate
6. Try again

### Error: "redirect_uri_mismatch"

This means the redirect URI is not authorized.

**Solution**:
1. Go to Google Cloud Console > APIs & Services > Credentials
2. Click on your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", add:
   - `http://localhost:5173`
   - `http://localhost:3000` (if needed)
4. Click "Save"

### Error: "Access blocked: This app's request is invalid"

This usually means:
- The OAuth consent screen is not properly configured
- The app is in testing mode and your email is not added as a test user

**Solution**:
1. Go to OAuth consent screen
2. Add your email as a test user (if in testing mode)
3. Make sure all required fields are filled

### Still Having Issues?

1. **Clear browser cache** and try again
2. **Check browser console** for detailed error messages
3. **Verify environment variables** are loaded correctly:
   - Backend: Check `process.env.GOOGLE_CLIENT_ID` in server logs
   - Frontend: Check `import.meta.env.VITE_GOOGLE_CLIENT_ID` in browser console
4. **Wait a few minutes** after making changes in Google Cloud Console (changes can take time to propagate)

## Production Deployment

When deploying to production:

1. Update the OAuth consent screen to "Published" (after review if needed)
2. Add your production URLs to:
   - Authorized JavaScript origins: `https://yourdomain.com`
   - Authorized redirect URIs: `https://yourdomain.com`
3. Update environment variables with production URLs

## Security Notes

- **Never commit** `.env` files to version control
- Use different OAuth credentials for development and production
- Keep your Client ID secure (though it's less sensitive than Client Secret)
- Regularly review and rotate credentials
