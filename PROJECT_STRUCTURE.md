# Project Structure

```
Assignment/
├── backend/
│   ├── config/
│   │   └── database.js          # PostgreSQL connection pool
│   ├── middleware/
│   │   └── auth.js              # JWT authentication & authorization middleware
│   ├── routes/
│   │   ├── auth.js              # Authentication routes (login, Google, OTP)
│   │   ├── users.js             # User management routes
│   │   ├── teams.js             # Team management routes
│   │   ├── tasks.js             # Task management routes
│   │   └── reports.js           # Reports routes (Admin/Manager only)
│   ├── scripts/
│   │   └── migrate.js           # Database migration script
│   ├── tests/
│   │   ├── auth.test.js         # Authentication tests
│   │   └── tasks.test.js        # Task management tests
│   ├── utils/
│   │   ├── jwt.js               # JWT token utilities
│   │   └── email.js             # Email/OTP utilities
│   ├── .env                     # Environment variables (create from env.example)
│   ├── env.example              # Environment variables template
│   ├── jest.config.js           # Jest configuration
│   ├── package.json             # Backend dependencies
│   └── server.js                # Express server entry point
│
├── frontend/
│   ├── public/
│   │   ├── index.html           # HTML template
│   │   └── manifest.json        # PWA manifest
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.js        # Main layout with sidebar
│   │   │   └── PrivateRoute.js  # Protected route component
│   │   ├── contexts/
│   │   │   └── AuthContext.js   # Authentication context
│   │   ├── pages/
│   │   │   ├── Login.js         # Login page (Email, Google, OTP)
│   │   │   ├── Dashboard.js     # Dashboard with statistics
│   │   │   ├── Tasks.js         # Task list page
│   │   │   ├── TaskForm.js     # Create/Edit task form
│   │   │   ├── Teams.js         # Team list page
│   │   │   ├── TeamForm.js     # Create/Edit team form
│   │   │   ├── Reports.js      # Reports page (Admin/Manager)
│   │   │   └── Users.js         # User management (Admin only)
│   │   ├── App.js               # Main App component with routing
│   │   ├── index.js             # React entry point
│   │   └── index.css            # Global styles
│   ├── .env                     # Frontend environment variables
│   ├── package.json             # Frontend dependencies
│   └── README.md                # Frontend README (if needed)
│
├── .gitignore                   # Git ignore rules
├── package.json                 # Root package.json for scripts
├── README.md                    # Main project README
├── SETUP.md                     # Detailed setup instructions
└── PROJECT_STRUCTURE.md         # This file

```

## Key Features

### Backend
- **Authentication**: JWT-based with refresh tokens
- **Google OAuth**: Integrated Google Sign-In
- **Email OTP**: OTP verification via email
- **Role-Based Access Control**: Admin, Manager, Employee roles
- **RESTful APIs**: Clean REST API design
- **Input Validation**: Express-validator for request validation
- **Error Handling**: Comprehensive error handling middleware

### Frontend
- **Material-UI**: Modern, responsive UI components
- **Protected Routes**: Role-based route protection
- **Beautiful Design**: Gradient backgrounds, bold colors, light themes
- **Three Login Methods**: Email/Password, Google Sign-In, Email OTP
- **Responsive**: Works on desktop and mobile devices

### Database Schema
- **users**: User accounts with roles
- **teams**: Team information
- **team_members**: Many-to-many relationship
- **tasks**: Task management with status tracking

## Role Permissions

| Action | Admin | Manager | Employee |
|--------|-------|---------|----------|
| Create Users | ✅ | ❌ | ❌ |
| Create Teams | ✅ | ✅ | ❌ |
| Create Tasks | ✅ | ✅ | ❌ |
| Assign Tasks | ✅ | ✅ | ❌ |
| Update Task Status | ❌ | ❌ | ✅ |
| View Reports | ✅ | ✅ | ❌ |
