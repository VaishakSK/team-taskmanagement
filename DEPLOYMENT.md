# Deployment Guide for Render

This guide will help you deploy your Team Task Management System on Render.

## Prerequisites

1. A Render account (free tier available)
2. GitHub repository with your code
3. Google OAuth credentials
4. Email service credentials (for OTP)

## Step 1: Prepare Your Repository

### 1.1 Push your code to GitHub
```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### 1.2 Ensure you have the required files
- `backend/Procfile` (already created)
- `backend/.gitignore` (already created)
- `task/.gitignore` (already updated)
- `README.md` (already exists)

## Step 2: Set Up PostgreSQL Database

1. Go to Render Dashboard
2. Click "New +" → "PostgreSQL"
3. Configure:
   - **Name**: `team-task-db`
   - **Database Name**: `teamtaskdb`
   - **User**: `teamtaskuser`
   - **Region**: Choose nearest to your users
   - **Plan**: Free tier is fine for testing
4. Click "Create Database"
5. Wait for deployment (takes 2-3 minutes)
6. Note down the **External Database URL** from the database dashboard

## Step 3: Deploy Backend API

1. Go to Render Dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `team-task-api`
   - **Region**: Same as your database
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=your_postgresql_external_url
   JWT_SECRET=your_long_random_secret_key_here
   GOOGLE_CLIENT_ID=your_google_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_gmail_app_password
   FRONTEND_URL=https://your-frontend-url.onrender.com
   ```
6. Click "Create Web Service"
7. Wait for deployment (takes 3-5 minutes)

## Step 4: Deploy Frontend

1. Go to Render Dashboard
2. Click "New +" → "Static Site"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `team-task-frontend`
   - **Region**: Same as your backend
   - **Root Directory**: `task`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Addons**: None needed
5. Add Environment Variables:
   ```
   VITE_API_URL=https://team-task-api.onrender.com
   VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
   ```
6. Click "Create Static Site"
7. Wait for deployment (takes 2-3 minutes)

## Step 5: Update CORS and URLs

1. Go back to your backend service (`team-task-api`)
2. Update the `FRONTEND_URL` environment variable:
   ```
   FRONTEND_URL=https://team-task-frontend.onrender.com
   ```
3. Click "Save Changes" and wait for redeployment

## Step 6: Run Database Migrations

1. Go to your backend service dashboard
2. Click "Shell" tab
3. Run these commands:
   ```bash
   cd backend
   npm run migrate
   npm run migrate:assignees
   npm run migrate:logs
   ```
4. Type `exit` to close the shell

## Step 7: Test Your Application

1. Visit your frontend URL: `https://team-task-frontend.onrender.com`
2. Test:
   - User registration and login
   - Google Sign-In
   - Creating teams and tasks
   - Reports functionality
   - All role-based permissions

## Important Notes

### Free Tier Limitations
- Render free tier spins down after 15 minutes of inactivity
- Cold starts can take 30-60 seconds
- Database connections are limited

### Environment Variables Security
- Never commit `.env` files to Git
- Use strong, random secrets
- Rotate secrets periodically

### Google OAuth Setup
1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - `https://team-task-frontend.onrender.com`
   - `http://localhost:5173` (for local testing)

### Email Service (Gmail)
1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password in `EMAIL_PASS`

### Troubleshooting

#### CORS Errors
- Ensure `FRONTEND_URL` matches your frontend URL exactly
- Check that both services are in the same region

#### Database Connection
- Verify the external database URL is correct
- Ensure migrations have been run
- Check database logs in Render dashboard

#### Build Failures
- Check build logs in Render dashboard
- Ensure all dependencies are in package.json
- Verify environment variables are set correctly

## Next Steps

1. Set up custom domains (optional)
2. Configure monitoring and alerts
3. Set up automated backups
4. Add SSL certificates (automatically provided by Render)
5. Consider scaling to paid tiers for production use

## Support

If you encounter issues:
1. Check Render service logs
2. Review environment variables
3. Verify database connectivity
4. Check CORS configuration
5. Test locally with production environment variables
