# Backlink Manager - Vercel Deployment Guide

## 🚀 Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/godly420/samuel)

## 📋 Prerequisites

1. **GitHub Account** with this repository
2. **Vercel Account** (free tier available)
3. **Admin Credentials** for secure access
4. **Environment Variables** (optional but recommended)

## 🔐 Authentication

**Default Login Credentials:**
- **Username**: `admin`
- **Password**: `3*jcx3EI@UR9`

⚠️ **Important**: Change these credentials in production by modifying `auth.js`

## 🔧 Environment Variables

For full functionality, set these environment variables in Vercel:

```bash
# Authentication (Optional - for custom credentials)
ADMIN_USERNAME=your_custom_username
ADMIN_PASSWORD=your_secure_password

# GitHub Integration (Optional)
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repository_name

# Database (Vercel will use ephemeral storage by default)
NODE_ENV=production
```

## 📝 Deployment Steps

### Option 1: One-Click Deploy
1. Click the "Deploy with Vercel" button above
2. Connect your GitHub account
3. Import this repository
4. Configure environment variables (optional)
5. Deploy!

### Option 2: Manual Deploy
1. Fork this repository to your GitHub account
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your forked repository
5. Set root directory to `backlink-manager`
6. Add environment variables
7. Deploy

## ⚠️ Important Notes

### Database Limitations
- **Vercel uses ephemeral storage** - data will be reset on each deployment
- For persistent data, consider:
  - **Vercel Postgres** (recommended)
  - **PlanetScale** (MySQL)
  - **Supabase** (PostgreSQL)
  - **MongoDB Atlas**

### File Storage
- **Reports and uploads** are temporary on Vercel
- Use **Vercel Blob** or **AWS S3** for persistent file storage

### Background Tasks
- **Cron jobs** may not work as expected on serverless
- Consider using **Vercel Cron** or **external scheduling services**

## 🛠️ Local Development

```bash
cd backlink-manager
npm install
npm start
# Visit http://localhost:3000
```

## 📚 Features

- ✅ **Secure Authentication** - Login required for all access
- ✅ CSV upload/download with template
- ✅ Real-time link verification 
- ✅ Cross-page selection and bulk operations
- ✅ Automated reporting (Excel/PDF)
- ✅ GitHub integration
- ✅ Dark theme responsive UI
- ✅ Comprehensive error handling
- ✅ Session management with auto-logout
- ✅ Logout functionality

## 🔗 Live Demo

After deployment, your app will be available at:
`https://your-project-name.vercel.app`

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify environment variables
3. Ensure all dependencies are in package.json
4. Check Node.js version compatibility (>=18.0.0)