# Railway Deployment Guide - Complete Walkthrough

This guide will walk you through deploying both the **Backend** and **Frontend** of your Agentic App to Railway.

---

## 📋 Prerequisites

Before you start, make sure you have:

1. ✅ A Railway account - Sign up at [railway.app](https://railway.app)
2. ✅ Your MongoDB Atlas database already set up (you have this!)
3. ✅ Your Venice API key (you have this!)
4. ✅ GitHub repository with your code (you have this!)

---

## 🎯 Understanding Your Project Structure

```
Router and Agents/
├── src/                    ← Backend code (Node.js/Express)
├── frontend/               ← Frontend code (React/Vite)
├── prisma/                 ← Database schema
├── package.json            ← Backend dependencies
├── railway.json            ← Backend Railway config
└── frontend/
    ├── src/                ← Frontend React code
    ├── package.json        ← Frontend dependencies
    └── railway.json        ← Frontend Railway config
```

**Important**: You need to deploy TWO separate services:
- **Service 1**: Backend API (the root directory)
- **Service 2**: Frontend Web App (the frontend directory)

---

## 🚀 Step-by-Step Deployment

### PART 1: Deploy the Backend API

#### Step 1: Create a New Railway Project

1. Go to [railway.app](https://railway.app) and log in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Select your repository: **`agenticapp`**
5. Railway will detect your project

#### Step 2: Configure Backend Service

1. Railway will create a service automatically
2. **Rename the service**:
   - Click on the service name (probably shows as "agenticapp")
   - Rename it to **"backend"** or **"api"**

#### Step 3: Set Root Directory (IMPORTANT!)

1. In the backend service, click **"Settings"**
2. Find **"Root Directory"**
3. Leave it **empty** or set to **"."** (because backend is in the root)
4. Save changes

#### Step 4: Add Environment Variables

1. Click on the **"Variables"** tab
2. Add the following variables one by one (click "+ New Variable"):

```
VENICE_API_KEY=lnWNeSg0pA_rQUooNpbfpPDBaj2vJnWol5WqKWrIEF
VENICE_BASE_URL=https://api.venice.ai/api/v1
DATABASE_URL=mongodb+srv://vivgates_db_user:PLA4bKdlDjpl9U1F@agentic-app-cluster.5fyjphh.mongodb.net/agentic_app?retryWrites=true&w=majority&appName=agentic-app-cluster
NODE_ENV=production
LOG_LEVEL=info
JWT_SECRET=GENERATE_A_RANDOM_STRING_HERE_AT_LEAST_32_CHARS
```

**Generate JWT_SECRET**: Use this command to generate a secure random string:
```bash
# On Windows PowerShell:
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# Or use an online generator:
# https://generate-secret.vercel.app/32
```

**IMPORTANT**: Don't set `CORS_ORIGIN` yet - we'll add it after deploying the frontend!

#### Step 5: Deploy Backend

1. Railway should automatically deploy
2. Wait for the deployment to complete (check the "Deployments" tab)
3. Once deployed, click **"Settings"** → **"Networking"** → **"Generate Domain"**
4. **Copy this domain** (e.g., `backend-production-xxxx.up.railway.app`)
5. **SAVE THIS URL** - You'll need it for the frontend!

#### Step 6: Verify Backend is Running

1. Open the backend URL in your browser: `https://your-backend-domain.railway.app/health`
2. You should see a health check response (like `{"status":"ok"}`)

---

### PART 2: Deploy the Frontend

#### Step 1: Add Frontend Service to Your Project

1. In the same Railway project, click **"New"** → **"GitHub Repo"**
2. Select the **same repository**: `agenticapp`
3. Railway will create a second service

#### Step 2: Configure Frontend Service

1. **Rename the service**:
   - Click on the new service name
   - Rename it to **"frontend"** or **"web"**

#### Step 3: Set Root Directory (CRITICAL!)

1. In the frontend service, click **"Settings"**
2. Find **"Root Directory"**
3. Set it to: **`frontend`** (this tells Railway to build only the frontend folder)
4. Save changes

#### Step 4: Set Build & Start Commands

1. Still in **"Settings"**, scroll to **"Build Command"**:
   ```
   npm run build
   ```

2. Set **"Start Command"**:
   ```
   npm run preview -- --host 0.0.0.0 --port $PORT
   ```

3. Save changes

#### Step 5: Add Frontend Environment Variables

1. Click on the **"Variables"** tab (for the frontend service)
2. Add these variables (replace `YOUR_BACKEND_URL` with the URL from Part 1, Step 5):

```
VITE_API_URL=https://YOUR_BACKEND_URL.railway.app
VITE_WS_URL=wss://YOUR_BACKEND_URL.railway.app
VITE_APP_NAME=Agentic App
VITE_APP_VERSION=1.0.0
NODE_ENV=production
```

**Example**:
```
VITE_API_URL=https://backend-production-abc123.up.railway.app
VITE_WS_URL=wss://backend-production-abc123.up.railway.app
```

#### Step 6: Deploy Frontend

1. Railway should automatically redeploy after you add variables
2. Wait for deployment to complete
3. Once deployed, click **"Settings"** → **"Networking"** → **"Generate Domain"**
4. **Copy this domain** (e.g., `frontend-production-xxxx.up.railway.app`)

---

### PART 3: Connect Backend to Frontend (CORS)

Now that you have both URLs, update the backend to allow the frontend:

#### Step 1: Add CORS Variable to Backend

1. Go back to the **backend service**
2. Click **"Variables"** tab
3. Add a new variable:

```
CORS_ORIGIN=https://YOUR_FRONTEND_URL.railway.app
```

**Example**:
```
CORS_ORIGIN=https://frontend-production-xyz789.up.railway.app
```

4. Railway will automatically redeploy the backend

---

## ✅ Verification Checklist

After deployment, verify everything works:

### Backend Checks:
- [ ] Visit `https://your-backend-url.railway.app/health` → Should return `{"status":"ok"}`
- [ ] Check Railway logs for any errors (click "View Logs" in the backend service)
- [ ] Verify all environment variables are set correctly

### Frontend Checks:
- [ ] Visit `https://your-frontend-url.railway.app` → Should load the React app
- [ ] Open browser DevTools (F12) → Console tab → Check for errors
- [ ] Verify the app can connect to the backend API

### Database Check:
- [ ] In Railway backend logs, you should see successful database connection messages
- [ ] No MongoDB connection errors in the logs

---

## 🐛 Troubleshooting Common Issues

### Issue 1: "Application failed to respond"

**Cause**: Backend not starting properly

**Solution**:
1. Check Railway logs (click "View Logs")
2. Verify `PORT` is not hardcoded (should use `process.env.PORT`)
3. Check if `DATABASE_URL` is correct
4. Make sure Prisma client is generated (add `prisma generate` to build command)

### Issue 2: Frontend shows blank page

**Cause**: Build failed or environment variables missing

**Solution**:
1. Check Railway build logs
2. Verify root directory is set to `frontend`
3. Verify `VITE_API_URL` is set correctly (with `https://`)
4. Check browser console for errors (F12)

### Issue 3: CORS errors in browser console

**Cause**: Backend CORS not configured for frontend URL

**Solution**:
1. Add `CORS_ORIGIN` variable to backend
2. Set it to your **exact** frontend URL (including `https://`)
3. Redeploy backend

### Issue 4: WebSocket connection failed

**Cause**: WebSocket URL incorrect or backend not supporting WebSockets

**Solution**:
1. Verify `VITE_WS_URL` starts with `wss://` (not `https://`)
2. Use the same domain as backend API
3. Check Railway logs for WebSocket errors

### Issue 5: Database connection errors

**Cause**: MongoDB Atlas network access or connection string issues

**Solution**:
1. Go to MongoDB Atlas → Network Access
2. Make sure `0.0.0.0/0` is allowed (for Railway access)
3. Verify `DATABASE_URL` is correct (copy from your .env file)
4. Test connection string with MongoDB Compass

---

## 📊 Monitoring Your Apps

### View Logs:
1. Click on a service (backend or frontend)
2. Click **"View Logs"** or **"Deployments"** → Click on a deployment
3. You'll see real-time logs

### Check Metrics:
1. Click on a service
2. Click **"Metrics"** to see:
   - CPU usage
   - Memory usage
   - Request count
   - Response times

---

## 💰 Railway Pricing (Important!)

- **Free Tier**: $5 credit per month (enough for small projects)
- If you exceed, you'll need to add a payment method
- Each service costs about $1-2/month if running 24/7

**To monitor usage**:
1. Go to Railway dashboard
2. Click your profile → **"Usage"**
3. See current month's usage

---

## 🔄 Redeploying After Code Changes

Whenever you push code to GitHub:

1. **Automatic deployment**: Railway will auto-deploy if connected to GitHub
2. **Manual deployment**:
   - Go to service → "Deployments"
   - Click **"Redeploy"**

**Best practice**: Always test locally before pushing to GitHub!

---

## 📝 Your Deployed URLs (Fill these in!)

After deployment, save these for reference:

```
Backend API URL: https://________________________________.railway.app
Frontend URL:    https://________________________________.railway.app

Backend Service Name: ________________
Frontend Service Name: ________________

Railway Project ID: ________________
```

---

## 🎉 Next Steps

After successful deployment:

1. ✅ Test all features in production
2. ✅ Set up custom domains (optional, in Railway Settings → Networking)
3. ✅ Enable GitHub auto-deployments (Settings → Service → Enable)
4. ✅ Set up monitoring/alerts
5. ✅ Add proper error logging (consider Sentry or LogRocket)

---

## 📞 Need Help?

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **MongoDB Atlas Support**: https://support.mongodb.com

---

## 🔐 Security Checklist

Before going live:

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Verify `.env` is in `.gitignore` (sensitive data not in GitHub)
- [ ] Enable HTTPS only (Railway does this by default)
- [ ] Set up proper CORS (only your frontend domain)
- [ ] Use environment-specific MongoDB databases (dev vs production)
- [ ] Review MongoDB Atlas security settings

---

**Last Updated**: December 2024
**Created for**: Agentic App Deployment
