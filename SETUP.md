# Setup Guide

## Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database (Neon PostgreSQL provided)
- Google OAuth credentials
- Email service credentials (Gmail recommended)

## Step 1: Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in the `backend` directory (copy from `env.example` and update with your values):
```env
PORT=5000
DATABASE_URL=postgresql://neondb_owner:npg_jmSenaBlYg91@ep-jolly-mountain-a4irjhz4-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_this_in_production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

4. Run database migration:
```bash
npm run migrate
```

5. Start the backend server:
```bash
npm run server
```

## Step 2: Frontend Setup

1. Navigate to task directory:
```bash
cd task
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in the `task` directory (copy from `.env.example`):
```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

4. Start the frontend development server:
```bash
npm run dev
```

## Step 3: Google OAuth Setup

**For detailed Google OAuth setup instructions, see [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)**

Quick setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google+ API or Google Identity Services
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure the consent screen
6. **IMPORTANT**: Add authorized JavaScript origins:
   - `http://localhost:5173` (Vite default port)
   - `http://localhost:3000` (optional, for CRA)
7. Add authorized redirect URIs:
   - `http://localhost:5173`
   - `http://localhost:3000` (optional)
8. Copy the **Client ID** (not Client Secret) to your `.env` files

## Step 4: Email Setup (for OTP)

1. For Gmail:
   - Go to your Google Account settings
   - Enable 2-Step Verification
   - Generate an App Password
   - Use this app password in `EMAIL_PASS` in backend `.env`

2. For other email providers, update `EMAIL_HOST` and `EMAIL_PORT` accordingly

## Step 5: Running the Application

From the root directory, you can run both servers simultaneously:
```bash
npm run dev
```

Or run them separately in different terminals:
- Backend: `cd backend && npm run server`
- Frontend: `cd task && npm run dev`

## Default Credentials

After running the migration, you can login with:
- Email: `admin@example.com`
- Password: `admin123`

## Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Troubleshooting

1. **Database Connection Issues**: Make sure your DATABASE_URL is correct and the database is accessible
2. **Google Sign-In not working**: Verify your Google Client ID is correct in both backend and frontend `.env` files
3. **OTP emails not sending**: Check your email credentials and make sure you're using an app password for Gmail
4. **CORS errors**: 
   - Ensure FRONTEND_URL in backend `.env` matches your frontend URL (default: `http://localhost:5173`)
   - Restart the backend server after changing CORS settings
5. **Google OAuth "origin_mismatch" error**: 
   - Make sure `http://localhost:5173` is added to Authorized JavaScript origins in Google Cloud Console
   - See [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) for detailed instructions
