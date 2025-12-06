# Deployment Guide: Agentic App on Railway with MongoDB Atlas

This guide provides step-by-step instructions for deploying the Agentic App to Railway.app using MongoDB Atlas as the database.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [MongoDB Atlas Setup](#mongodb-atlas-setup)
3. [Local Development Setup](#local-development-setup)
4. [Railway Deployment](#railway-deployment)
5. [Environment Variables](#environment-variables)
6. [Production Deployment Checklist](#production-deployment-checklist)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Accounts
- [GitHub](https://github.com) account with your project repository
- [Railway](https://railway.app) account
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account

### Required Tools
- Node.js 18+ installed locally
- Git installed and configured
- MongoDB Compass (optional, for database management)

### System Requirements
- Backend: Node.js 18+, 512MB RAM minimum
- Frontend: Modern web browser
- Database: MongoDB Atlas M0 tier (free) or higher

## MongoDB Atlas Setup

### 1. Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Verify your email address

### 2. Create a New Cluster
1. Click "Build a Database"
2. Select "M0 Sandbox" (free tier)
3. Choose a cloud provider and region (closest to your users)
4. Give your cluster a name (e.g., `agentic-app-cluster`)
5. Click "Create Cluster"

### 3. Configure Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Select "Allow Access from Anywhere" (0.0.0.0/0) for Railway deployment
4. Click "Confirm"

### 4. Create Database User
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Enter username (e.g., `agentic-app-user`)
4. Set a strong password (save it securely!)
5. Give the user "Read and write to any database" permissions
6. Click "Add User"

### 5. Get Connection String
1. Go to "Database" in the left sidebar
2. Click "Connect" for your cluster
3. Select "Drivers"
4. Copy the connection string
5. Replace `<password>` with your database user password
6. Replace `<database>` with `agentic_app`

Your connection string should look like:
```
mongodb+srv://agentic-app-user:YOUR_PASSWORD@agentic-app-cluster.xxxxx.mongodb.net/agentic_app?retryWrites=true&w=majority
```

## Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/agentic-app.git
cd agentic-app
```

### 2. Install Backend Dependencies
```bash
npm install
```

### 3. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 4. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Venice API Configuration
VENICE_API_KEY=your_venice_api_key_here
VENICE_BASE_URL=https://api.venice.ai/api/v1

# MongoDB Configuration (use your Atlas connection string)
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/agentic_app?retryWrites=true&w=majority

# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here

# Logging
LOG_LEVEL=info
```

### 5. Generate Prisma Client
```bash
npx prisma generate
```

### 6. Start Development Servers

Backend:
```bash
npm run dev
```

Frontend (in a new terminal):
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

## Railway Deployment

### 1. Prepare Your Repository
Ensure your code is pushed to GitHub:
```bash
git add .
git commit -m "Add Railway and MongoDB configuration"
git push origin main
```

### 2. Deploy Backend Service

#### Create Railway Project
1. Log in to [Railway](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Click "Deploy Now"

#### Configure Backend Service
1. Once deployed, click on your project
2. Click "Add Service" → "New Service"
3. Select "GitHub Repo"
4. Choose the same repository
5. Set the root path to `/` (for backend)
6. Click "Deploy"

#### Set Environment Variables for Backend
1. Go to your backend service settings
2. Click "Variables" tab
3. Add the following variables:
```
VENICE_API_KEY=your_venice_api_key
VENICE_BASE_URL=https://api.venice.ai/api/v1
DATABASE_URL=your_mongodb_connection_string
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.railway.app
JWT_SECRET=your_generated_jwt_secret
LOG_LEVEL=info
```

### 3. Deploy Frontend Service

#### Add Frontend Service
1. In your Railway project, click "Add Service"
2. Select "GitHub Repo"
3. Choose the same repository
4. Set the root path to `/frontend`
5. Click "Deploy"

#### Set Environment Variables for Frontend
1. Go to your frontend service settings
2. Click "Variables" tab
3. Add the following variables:
```
VITE_API_URL=https://your-backend-domain.railway.app
VITE_WS_URL=wss://your-backend-domain.railway.app
VITE_APP_NAME=Agentic App
VITE_APP_VERSION=1.0.0
```

### 4. Configure Custom Domains (Optional)

1. Go to "Settings" in your Railway project
2. Click "Custom Domains"
3. Add your domain (e.g., `api.yourapp.com` for backend)
4. Configure DNS records as instructed
5. Repeat for frontend (e.g., `www.yourapp.com`)

### 5. Enable Automatic Deployments

1. Go to project settings
2. Click "Connected Services"
3. Enable "Auto-deploy on push" for both services
4. Choose the branch to deploy (usually `main` or `master`)

## Environment Variables

### Backend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VENICE_API_KEY` | Venice API authentication key | `lnWNeSg0pA_rQUooNpbfpPDBaj2vJnWol5WqKWrIEF` |
| `VENICE_BASE_URL` | Venice API endpoint | `https://api.venice.ai/api/v1` |
| `DATABASE_URL` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `3001` |
| `CORS_ORIGIN` | Allowed frontend origin | `https://app.yourdomain.com` |
| `JWT_SECRET` | JWT signing secret | `random-string-here` |
| `LOG_LEVEL` | Logging verbosity | `info` |

### Frontend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://api.yourapp.com` |
| `VITE_WS_URL` | WebSocket URL | `wss://api.yourapp.com` |
| `VITE_APP_NAME` | Application name | `Agentic App` |
| `VITE_APP_VERSION` | Application version | `1.0.0` |

## Production Deployment Checklist

### Pre-Deployment
- [ ] All code committed to GitHub
- [ ] MongoDB Atlas cluster created and configured
- [ ] Database user created with strong password
- [ ] Network access configured for Railway
- [ ] Environment variables tested locally
- [ ] Prisma client generated with MongoDB schema

### Backend Deployment
- [ ] Railway project created
- [ ] Backend service deployed from GitHub
- [ ] All environment variables configured
- [ ] Health check endpoint responding
- [ ] Database connection verified
- [ ] CORS configured for frontend domain

### Frontend Deployment
- [ ] Frontend service deployed from GitHub
- [ ] Environment variables configured
- [ ] API URL pointing to backend
- [ ] Static assets serving correctly
- [ ] Routing working for all pages

### Post-Deployment
- [ ] Full application testing
- [ ] Error monitoring configured
- [ ] Log collection working
- [ ] Custom domains configured (if needed)
- [ ] SSL certificates active
- [ ] Automatic deployments enabled

## Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Failed
**Symptoms**: Backend service fails to start, logs show connection errors

**Solutions**:
- Verify MongoDB connection string format
- Check database user credentials
- Ensure IP access list includes Railway's IPs (use 0.0.0.0/0)
- Confirm database name matches in connection string

#### 2. CORS Errors
**Symptoms**: Frontend cannot connect to backend API

**Solutions**:
- Check `CORS_ORIGIN` environment variable
- Ensure frontend URL is correctly configured
- Verify backend is running and accessible

#### 3. Build Failures
**Symptoms**: Deployment fails during build phase

**Solutions**:
- Check package.json scripts
- Verify all dependencies are in package-lock.json
- Ensure Node.js version compatibility
- Review build logs for specific errors

#### 4. Frontend Not Loading
**Symptoms**: Blank page or 404 errors

**Solutions**:
- Check Vite build configuration
- Verify nginx.conf is correct
- Ensure static files are being served
- Check browser console for errors

#### 5. WebSocket Connection Issues
**Symptoms**: Real-time features not working

**Solutions**:
- Verify `VITE_WS_URL` is correct
- Check if WebSocket protocol is supported
- Ensure backend Socket.io is configured
- Check firewall/proxy settings

### Debugging Tips

#### View Railway Logs
1. Go to your Railway service
2. Click "Logs" tab
3. View real-time logs
4. Use filters to find specific errors

#### Check Health Status
```bash
curl https://your-backend-domain.railway.app/health
```

#### Test Database Connection
1. Use MongoDB Compass to connect
2. Verify you can see the database
3. Check if collections are created

#### Monitor Performance
- Use Railway's metrics dashboard
- Monitor response times
- Check error rates
- Review resource utilization

### Getting Help

- [Railway Documentation](https://docs.railway.app/)
- [MongoDB Atlas Documentation](https://docs.mongodb.com/atlas/)
- [Project Repository Issues](https://github.com/your-username/agentic-app/issues)

### Rollback Procedures

If deployment fails:
1. Go to Railway service settings
2. Click "Deployments"
3. Find the last successful deployment
4. Click "Redeploy"

For database issues:
1. MongoDB Atlas backups are automatic
2. Restore from snapshot if needed
3. Contact MongoDB support for critical issues

## Security Considerations

1. **Environment Variables**: Never commit secrets to Git
2. **Database Security**: Use strong, unique passwords
3. **API Keys**: Rotate keys regularly
4. **HTTPS**: Always use HTTPS in production
5. **CORS**: Restrict to specific domains
6. **Rate Limiting**: Implement API rate limiting
7. **Monitoring**: Set up alerts for suspicious activity

## Performance Optimization

1. **Database Indexes**: Ensure proper indexes on queries
2. **Caching**: Implement Redis if needed
3. **CDN**: Use CDN for static assets
4. **Compression**: Enable gzip compression
5. **Lazy Loading**: Implement code splitting
6. **Bundle Size**: Optimize frontend bundle size

## Maintenance

1. **Regular Updates**: Keep dependencies updated
2. **Database Backups**: MongoDB Atlas handles automatically
3. **Log Rotation**: Configure log retention
4. **Security Patches**: Apply promptly
5. **Performance Reviews**: Monthly performance checks