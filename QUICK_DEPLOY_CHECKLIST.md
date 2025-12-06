# Quick Railway Deployment Checklist ✅

## Before You Start
- [ ] Railway account created
- [ ] MongoDB Atlas database ready
- [ ] Venice API key ready
- [ ] Code pushed to GitHub

---

## Backend Deployment

### 1. Create Service
- [ ] New Project → Deploy from GitHub
- [ ] Select `agenticapp` repository
- [ ] Rename service to "backend"

### 2. Configuration
- [ ] Root Directory: Leave empty (or ".")
- [ ] Generate Domain
- [ ] Copy backend URL: `_________________________________`

### 3. Environment Variables
```bash
VENICE_API_KEY=lnWNeSg0pA_rQUooNpbfpPDBaj2vJnWol5WqKWrIEF
VENICE_BASE_URL=https://api.venice.ai/api/v1
DATABASE_URL=mongodb+srv://vivgates_db_user:PLA4bKdlDjpl9U1F@agentic-app-cluster.5fyjphh.mongodb.net/agentic_app?retryWrites=true&w=majority&appName=agentic-app-cluster
NODE_ENV=production
LOG_LEVEL=info
JWT_SECRET=[GENERATE 32 CHAR RANDOM STRING]
```

### 4. Verify
- [ ] Visit: `https://your-backend-url/health`
- [ ] Check logs for errors

---

## Frontend Deployment

### 1. Create Service
- [ ] Same project → New → GitHub Repo
- [ ] Select `agenticapp` again
- [ ] Rename service to "frontend"

### 2. Configuration (IMPORTANT!)
- [ ] Root Directory: `frontend`
- [ ] Build Command: `npm run build`
- [ ] Start Command: `npm run preview -- --host 0.0.0.0 --port $PORT`
- [ ] Generate Domain
- [ ] Copy frontend URL: `_________________________________`

### 3. Environment Variables
```bash
VITE_API_URL=https://[YOUR-BACKEND-URL].railway.app
VITE_WS_URL=wss://[YOUR-BACKEND-URL].railway.app
VITE_APP_NAME=Agentic App
VITE_APP_VERSION=1.0.0
NODE_ENV=production
```

### 4. Verify
- [ ] Visit frontend URL
- [ ] Check browser console (F12) for errors

---

## Connect Backend ↔ Frontend

### Update Backend CORS
- [ ] Go to backend service
- [ ] Add variable: `CORS_ORIGIN=https://[YOUR-FRONTEND-URL].railway.app`
- [ ] Wait for redeploy

---

## Final Checks

- [ ] Backend health check working
- [ ] Frontend loads without errors
- [ ] Can make API calls from frontend
- [ ] No CORS errors in browser console
- [ ] WebSocket connection working (if applicable)
- [ ] Database queries working

---

## Your Deployment Info

**Backend URL**: _______________________________________________
**Frontend URL**: _______________________________________________
**Deployed Date**: _______________________________________________

---

## Common Issues

**Blank frontend page?**
→ Check root directory is set to `frontend`

**CORS errors?**
→ Add CORS_ORIGIN to backend variables

**Database errors?**
→ Check MongoDB Atlas allows 0.0.0.0/0

**Build fails?**
→ Check Railway logs for specific error

---

**Full Guide**: See `RAILWAY_DEPLOYMENT_GUIDE.md` for detailed instructions
