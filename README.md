# Team and Task Management System

A full-stack web application for managing teams and tasks with role-based access control (RBAC).

## Features

- **User Roles**: Admin, Manager, Employee
- **Authentication**: JWT-based auth with Google Sign-In and Email OTP verification
- **Task Management**: Create, assign, and update tasks
- **Team Management**: Create and manage teams (Admin/Manager only)
- **Role-Based Permissions**: Different access levels based on user role
- **Beautiful UI**: Modern design with MUI and custom styling

## Tech Stack

### Backend
- Node.js + Express
- PostgreSQL
- JWT Authentication
- bcrypt for password hashing
- Google OAuth 2.0
- Nodemailer for OTP emails

### Frontend
- React
- Material-UI (MUI)
- React Router
- Axios

### Testing
- Jest + Supertest (Backend)
- React Testing Library (Frontend)

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- Google OAuth credentials
- Email service credentials (for OTP)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd Assignment
```

2. Install backend dependencies
```bash
cd backend
npm install
```

3. Install frontend dependencies
```bash
cd ../task
npm install
```

4. Set up environment variables

Create `backend/.env` (copy from `backend/env.example`):
```env
PORT=5000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_token_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
FRONTEND_URL=http://localhost:3000
```

Create `task/.env` (copy from `task/.env.example`):
```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

5. Run database migrations
```bash
cd backend
npm run migrate
```

6. Start the application

From root directory:
```bash
npm run dev
```

Or separately:
```bash
# Terminal 1 - Backend
cd backend
npm run server

# Terminal 2 - Frontend
cd task
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/google` - Google Sign-In
- `POST /api/auth/send-otp` - Send OTP to email
- `POST /api/auth/verify-otp` - Verify OTP

### Users
- `GET /api/users` - Get all users (Admin only)
- `POST /api/users` - Create user (Admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user

### Teams
- `GET /api/teams` - Get all teams
- `POST /api/teams` - Create team (Admin/Manager)
- `GET /api/teams/:id` - Get team by ID
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task (Admin/Manager)
- `GET /api/tasks/:id` - Get task by ID
- `PUT /api/tasks/:id` - Update task
- `PATCH /api/tasks/:id/status` - Update task status (Employee)

## Testing

```bash
# Backend tests
npm run test:backend

# Frontend tests
npm run test:frontend

# All tests
npm test
```

## License

ISC
