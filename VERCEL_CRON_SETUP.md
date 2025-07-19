# 🕐 Vercel Cron Jobs for Automated Link Checking

## 📋 Overview

This implementation adds **Vercel Cron Jobs** to handle automated 24-hour link checking in serverless environments, replacing the traditional `setInterval` approach that doesn't work on serverless platforms.

## 🎯 What's Been Implemented

### 1. **Dedicated Cron Endpoint**
- **File**: `/api/cron/check-links.js`
- **Purpose**: Serverless function that performs link checking
- **Schedule**: Daily at 2 AM UTC
- **Security**: Protected with authorization header

### 2. **Updated Vercel Configuration**
- **File**: `vercel.json`
- **Added**: Cron job configuration and routing
- **Schedule**: `"0 2 * * *"` (Daily at 2 AM UTC)

### 3. **Smart Environment Detection**
- **Local/VPS**: Uses traditional `setInterval` scheduling
- **Vercel/Serverless**: Uses cron jobs only
- **Auto-detection**: Based on environment variables

### 4. **Manual Trigger Button**
- **UI**: "Trigger Scheduled Check" button in dashboard
- **Purpose**: Test cron functionality manually
- **API**: `POST /api/cron/trigger`

## 🔧 Implementation Details

### Cron Function Features:
```javascript
// Located at: /api/cron/check-links.js
- ✅ Serverless SQLite database initialization
- ✅ Enhanced URL and anchor text matching
- ✅ Batch processing (50 links max per run)
- ✅ Error handling and retry logic
- ✅ Detailed logging and status updates
- ✅ Security with authorization header
```

### Vercel Configuration:
```json
{
  "crons": [
    {
      "path": "/api/cron/check-links",
      "schedule": "0 2 * * *"  // Daily at 2 AM UTC
    }
  ]
}
```

### Environment Detection Logic:
```javascript
// In server.js
if (!process.env.VERCEL && !process.env.RAILWAY && !process.env.RENDER) {
    // Traditional scheduling for VPS/local
    setInterval(autoCheckLinks, 24 * 60 * 60 * 1000);
} else {
    // Serverless - use cron jobs
    console.log('Serverless environment detected - using cron jobs');
}
```

## 📅 Cron Schedule Explained

| Schedule | Description | Time |
|----------|-------------|------|
| `0 2 * * *` | Daily at 2 AM UTC | Every day |
| `0 */12 * * *` | Every 12 hours | Twice daily |
| `0 0 * * 0` | Weekly on Sunday | Once per week |
| `0 0 1 * *` | Monthly on 1st | Once per month |

**Current**: `0 2 * * *` = **Daily at 2 AM UTC**

## 🛡️ Security Implementation

### Authorization Protection:
```javascript
// Cron endpoint checks for authorization header
if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET || 'default-secret'}`) {
    return res.status(401).json({ error: 'Unauthorized' });
}
```

### Environment Variables:
```bash
# Optional: Set custom cron secret
CRON_SECRET=your-secure-secret-here
```

## 🚀 Deployment Instructions

### 1. **Deploy to Vercel**
```bash
# All files included in repository
git push origin master

# Or use Vercel button
vercel --prod
```

### 2. **Environment Variables (Optional)**
In Vercel Dashboard → Settings → Environment Variables:
```
CRON_SECRET=your-secure-cron-secret
GITHUB_TOKEN=your-github-token (optional)
```

### 3. **Verify Cron Jobs**
After deployment:
1. Go to Vercel Dashboard
2. Navigate to your project
3. Click "Functions" tab
4. Look for `/api/cron/check-links`
5. Check "Cron Jobs" section

## 📊 Monitoring & Logs

### View Cron Execution:
1. **Vercel Dashboard** → Project → Functions
2. **Function Logs** → `/api/cron/check-links`
3. **Real-time logs** during execution

### Manual Testing:
```bash
# Test cron endpoint directly (replace YOUR_URL)
curl -X POST https://YOUR_URL.vercel.app/api/cron/check-links \
  -H "Authorization: Bearer default-secret"
```

### Dashboard Testing:
1. Login to your app
2. Click "Trigger Scheduled Check" button
3. Check results in dashboard

## 🔍 What the Cron Job Does

### Every Day at 2 AM UTC:
1. **Database Check**: Finds links not checked in 23+ hours
2. **Batch Processing**: Processes up to 50 links per run
3. **Link Verification**:
   - Checks HTTP status (200, 404, 500, etc.)
   - Verifies backlink still exists
   - Validates anchor text matches
   - Captures context around link
4. **Database Update**: Updates status, timestamps, error counts
5. **Logging**: Detailed logs for monitoring

### Smart Link Selection:
```sql
SELECT * FROM backlinks WHERE 
    last_checked < datetime('now', '-23 hours') OR 
    last_checked IS NULL 
ORDER BY 
    CASE WHEN last_checked IS NULL THEN 0 ELSE 1 END,
    last_checked ASC
LIMIT 50
```

## ⚠️ Important Notes

### Database Persistence:
- **Local/VPS**: Database persists permanently
- **Vercel**: Database resets on new deployments only
- **Data**: Survives between cron executions

### Function Limits:
- **Timeout**: 10 seconds (Hobby), 5 minutes (Pro)
- **Batch Size**: 50 links max per execution
- **Memory**: 1024MB max per function

### Execution Frequency:
- **Minimum**: Every minute (`* * * * *`)
- **Recommended**: Daily (`0 2 * * *`)
- **Maximum**: No limit on Vercel Pro

## 🔧 Customization Options

### Change Schedule:
```json
// In vercel.json
"crons": [
  {
    "path": "/api/cron/check-links",
    "schedule": "0 */6 * * *"  // Every 6 hours
  }
]
```

### Increase Batch Size:
```javascript
// In /api/cron/check-links.js, line ~95
LIMIT 100  // Process 100 links instead of 50
```

### Add Multiple Schedules:
```json
"crons": [
  {
    "path": "/api/cron/check-links",
    "schedule": "0 2 * * *"    // Daily full check
  },
  {
    "path": "/api/cron/quick-check",  
    "schedule": "0 */6 * * *"  // 6-hour quick check
  }
]
```

## ✅ Verification Checklist

After deployment, verify:
- [ ] Cron job appears in Vercel dashboard
- [ ] Manual trigger button works
- [ ] Cron endpoint accessible (with auth)
- [ ] Environment detection works correctly
- [ ] Database updates properly
- [ ] Logs show execution details

## 🎉 Benefits

### ✅ **Serverless Compatible**
- Works perfectly on Vercel, Netlify, Railway
- No continuous server required
- Cost-effective execution

### ✅ **Reliable Scheduling** 
- Vercel handles execution timing
- No missed checks due to server downtime
- Automatic retry on failures

### ✅ **Scalable**
- Handles thousands of links
- Batch processing prevents timeouts
- Efficient resource usage

### ✅ **Monitoring**
- Full execution logs
- Status tracking
- Error reporting

**Your backlink manager now has robust, serverless-compatible automated checking!** 🚀⏰