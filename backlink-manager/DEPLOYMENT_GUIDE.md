# 🚀 Vercel Deployment Guide

## 📋 Quick Fix for 404 Error

The 404 error occurs because of incorrect root directory settings. Follow these steps:

### Option 1: Deploy from backlink-manager folder (Recommended)

1. **Navigate to the backlink-manager folder**:
   ```bash
   cd backlink-manager
   ```

2. **Deploy from this folder**:
   ```bash
   vercel --prod
   ```

### Option 2: Set Root Directory in Vercel Dashboard

1. Go to your Vercel project dashboard
2. Click on **Settings**
3. Scroll to **Root Directory**
4. Set it to: `backlink-manager`
5. Click **Save**
6. Redeploy the project

### Option 3: Deploy via Git (Recommended for Production)

1. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Fix Vercel deployment configuration"
   git push origin master
   ```

2. **In Vercel Dashboard**:
   - Go to your project settings
   - Set **Root Directory** to: `backlink-manager`
   - Trigger a new deployment

## 🔧 What Was Fixed

### 1. Updated vercel.json
- ✅ Removed `backlink-manager/` prefixes from paths
- ✅ Updated routes to point to correct files
- ✅ Moved vercel.json to the correct location

### 2. Correct File Structure
```
backlink-manager/
├── vercel.json          ← Now in correct location
├── server.js            ← Main server file
├── api/
│   └── cron/
│       └── check-links.js
├── public/
│   ├── index.html
│   └── login.html
└── other files...
```

## 🌐 Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

```bash
# Optional: Secure your cron endpoint
CRON_SECRET=your-secure-secret-here

# Optional: GitHub integration
GITHUB_TOKEN=your-github-token
GITHUB_OWNER=your-username
GITHUB_REPO=your-repo-name
```

## ✅ Verification Steps

After deployment:

1. **Check the main app**: `https://your-app.vercel.app`
2. **Verify login page**: `https://your-app.vercel.app/login`
3. **Test authentication**: Login with `admin` / `3*jcx3EI@UR9`
4. **Check cron function**: Go to Vercel Dashboard → Functions → `/api/cron/check-links`

## 🕐 Cron Jobs

Your app includes automatic link checking:
- **Schedule**: Daily at 2 AM UTC
- **Endpoint**: `/api/cron/check-links`
- **Batch size**: 50 links per execution
- **Security**: Protected with Bearer token

## 🛠️ Troubleshooting

### Still getting 404?
1. Check Vercel build logs for errors
2. Verify all files are in `backlink-manager/` directory
3. Ensure `vercel.json` is in the root of your project
4. Check that Root Directory is set correctly in Vercel settings

### Function timeout?
- Vercel Hobby plan: 10-second limit
- Vercel Pro plan: 5-minute limit
- The app processes 50 links max per execution to prevent timeouts

### Database issues?
- Database resets on new deployments (expected behavior)
- Data persists between function executions
- Upload your CSV again after deployment

## 🎯 Next Steps

1. Deploy using one of the methods above
2. Test all functionality
3. Upload your backlink CSV
4. Verify automated checking works
5. Set up GitHub integration (optional)

**Your backlink manager should now work perfectly on Vercel!** 🎉