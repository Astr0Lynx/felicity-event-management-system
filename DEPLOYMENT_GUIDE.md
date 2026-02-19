# Felicity Event Management System - Deployment Guide

## Prerequisites
- MongoDB Atlas account with database cluster
- GitHub account (for code hosting)
- Vercel account (for frontend) or Netlify
- Render/Railway account (for backend)

## Step 1: Prepare Your Repository

1. Push your code to GitHub (if not already done)
2. Make sure `.env` files are in `.gitignore` (they should be)

## Step 2: MongoDB Atlas Setup

✅ Already configured at: mongodb+srv://guntesh6:***@cluster0.y50o4yi.mongodb.net/

Your database is already on MongoDB Atlas, so this step is complete.

## Step 3: Deploy Backend to Render

1. Go to https://render.com and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: felicity-backend (or your choice)
   - **Region**: Choose closest to you
   - **Branch**: main (or your branch)
   - **Root Directory**: backend
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

5. Add Environment Variables:
   ```
   MONGO_URL=mongodb+srv://guntesh6:Chidori@cluster0.y50o4yi.mongodb.net/?appName=Cluster0
   PORT=5000
   ADMIN_EMAIL=admin@felicity.iiit.ac.in
   ADMIN_PASSWORD=Password1234@felicityadmin
   JWT_SECRET=MySecretKeyForJWT@23456789
   ```

6. Click "Create Web Service"
7. Wait for deployment (takes 2-3 minutes)
8. Copy your backend URL (e.g., https://felicity-backend.onrender.com)

### Alternative: Deploy to Railway

1. Go to https://railway.app and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Click on the deployment → Settings
5. Set Root Directory: `backend`
6. Add environment variables (same as above)
7. Copy your backend URL

## Step 4: Seed Admin Account (One-time)

After backend is deployed, run the seed script ONCE:

**Option 1: Using Render Dashboard**
- Go to your service → Shell tab
- Run: `npm run seed`

**Option 2: Using Railway Dashboard**
- Click on deployment → Settings
- Add one-time command: `npm run seed`

## Step 5: Deploy Frontend to Vercel

1. Go to https://vercel.com and sign up/login
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: frontend
   - **Build Command**: `npm run build`
   - **Output Directory**: dist

5. Add Environment Variable:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com/api
   ```
   (Replace with your actual backend URL from Step 3)

6. Click "Deploy"
7. Wait for deployment (takes 1-2 minutes)
8. Copy your frontend URL (e.g., https://felicity-events.vercel.app)

### Alternative: Deploy to Netlify

1. Go to https://netlify.com and sign up/login
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select your repository
4. Configure:
   - **Base directory**: frontend
   - **Build command**: `npm run build`
   - **Publish directory**: frontend/dist

5. Add Environment Variable in Site settings:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com/api
   ```

6. Deploy and copy your URL

## Step 6: Test Your Deployment

1. Visit your frontend URL
2. Test login with admin credentials:
   - Email: admin@felicity.iiit.ac.in
   - Password: Password1234@felicityadmin

3. Test organizer/participant registration and features

## Step 7: Update deployment.txt

Create `deployment.txt` in the root directory with:
```
Frontend URL: https://your-frontend.vercel.app
Backend API URL: https://your-backend.onrender.com/api
Database: MongoDB Atlas (Cluster0)
```

## Important Notes

### CORS Configuration
The backend is already configured to accept requests from any origin. For production, you may want to restrict this in `backend/src/server.js`:

```javascript
app.use(cors({
  origin: 'https://your-frontend.vercel.app'
}));
```

### Free Tier Limitations

**Render Free Tier:**
- Spins down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- 750 hours/month free

**Vercel Free Tier:**
- 100 GB bandwidth/month
- Automatic SSL
- Always on

**MongoDB Atlas Free Tier:**
- 512 MB storage
- Shared cluster
- Good for development/testing

### Troubleshooting

**Backend not responding:**
- Check Render/Railway logs for errors
- Verify environment variables are set correctly
- Ensure MongoDB connection string is correct

**Frontend can't connect to backend:**
- Verify VITE_API_URL is set correctly in Vercel/Netlify
- Check browser console for CORS errors
- Ensure backend URL ends with `/api`

**Database connection errors:**
- Verify MongoDB Atlas IP whitelist (should allow 0.0.0.0/0 for cloud deployments)
- Check connection string format
- Ensure database user has read/write permissions

## Security Recommendations for Production

1. Change default admin password after first login
2. Use strong JWT_SECRET (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
3. Enable MongoDB Atlas IP whitelisting if possible
4. Set up proper CORS origins
5. Enable rate limiting on backend
6. Use HTTPS only (automatically handled by Vercel/Render)

## Cost Estimate

Using the free tiers:
- **MongoDB Atlas**: Free (M0 cluster)
- **Render**: Free (with spin-down)
- **Vercel**: Free (with usage limits)
- **Total**: $0/month

For production with better performance:
- **MongoDB Atlas**: M2 ($9/month)
- **Render**: Starter ($7/month, no spin-down)
- **Vercel**: Free (sufficient for most projects)
- **Total**: ~$16/month
