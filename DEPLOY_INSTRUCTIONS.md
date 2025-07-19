# 🚀 Deployment Instructions

## 📍 Repository Location
**GitHub**: https://github.com/godly420/samuel

## 🔐 Login Credentials
- **Username**: `admin`
- **Password**: `3*jcx3EI@UR9`

---

## 🌟 **Option 1: One-Click Vercel Deploy (Recommended)**

### Step 1: Click Deploy Button
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/godly420/samuel)

### Step 2: Configure Project
1. **Connect GitHub**: Authorize Vercel to access your GitHub account
2. **Import Repository**: Select `godly420/samuel`
3. **Project Settings**:
   - **Project Name**: `backlink-manager` (or your preferred name)
   - **Root Directory**: `backlink-manager` (IMPORTANT!)
   - **Build Command**: `npm run build`
   - **Output Directory**: Leave default
   - **Install Command**: `npm install`

### Step 3: Environment Variables (Optional)
Add these if you want GitHub integration:
```
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_OWNER=godly420
GITHUB_REPO=samuel
NODE_ENV=production
```

### Step 4: Deploy
1. Click **"Deploy"**
2. Wait for deployment to complete (2-3 minutes)
3. Get your live URL: `https://your-project-name.vercel.app`

---

## ⚙️ **Option 2: Manual Vercel Deploy**

### Step 1: Fork Repository (Optional)
If you want to make changes:
1. Go to https://github.com/godly420/samuel
2. Click "Fork" to create your own copy
3. Use your forked repository URL in steps below

### Step 2: Vercel Dashboard Deploy
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"New Project"**
3. Click **"Import Git Repository"**
4. Search for `godly420/samuel` or paste the URL
5. Click **"Import"**

### Step 3: Configure Project
```
Project Name: backlink-manager
Root Directory: backlink-manager
Build Command: npm run build
Output Directory: (leave empty)
Install Command: npm install
Node.js Version: 18.x
```

### Step 4: Environment Variables
In Vercel dashboard → Settings → Environment Variables:
```
Name: NODE_ENV
Value: production

Name: GITHUB_TOKEN (optional)
Value: your_github_token

Name: GITHUB_OWNER (optional)
Value: your_github_username

Name: GITHUB_REPO (optional)
Value: repository_name
```

### Step 5: Deploy
1. Click **"Deploy"**
2. Monitor build logs
3. Get deployment URL

---

## 🛠️ **Option 3: Vercel CLI Deploy**

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login and Setup
```bash
# Login to Vercel
vercel login

# Clone repository
git clone https://github.com/godly420/samuel.git
cd samuel/backlink-manager
```

### Step 3: Deploy
```bash
# Deploy to Vercel
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name: backlink-manager
# - Directory: ./backlink-manager
```

### Step 4: Configure Production
```bash
# Set environment variables
vercel env add NODE_ENV production
vercel env add GITHUB_TOKEN your_token  # optional

# Deploy to production
vercel --prod
```

---

## 🔧 **Option 4: Other Platforms**

### Netlify
1. Connect GitHub repository
2. Set build directory: `backlink-manager`
3. Build command: `npm run build`
4. Publish directory: `backlink-manager`

### Railway
1. Connect GitHub repository
2. Select `backlink-manager` directory
3. Set start command: `npm start`
4. Add environment variables

### Heroku
```bash
# Install Heroku CLI and login
heroku login

# Create new app
heroku create your-app-name

# Set buildpack for subfolder
heroku buildpacks:set https://github.com/timanovsky/subdir-heroku-buildpack
heroku config:set PROJECT_PATH=backlink-manager

# Add Node.js buildpack
heroku buildpacks:add heroku/nodejs

# Deploy
git push heroku master
```

---

## ✅ **Post-Deployment Verification**

### Step 1: Access Your App
1. Visit your deployment URL
2. You should be redirected to `/login`
3. Login with: `admin` / `3*jcx3EI@UR9`

### Step 2: Test Core Features
- [ ] Login works correctly
- [ ] Dashboard loads after login
- [ ] CSV template download works
- [ ] CSV upload functionality
- [ ] Link checking processes
- [ ] Report generation works
- [ ] Logout functionality
- [ ] Session management

### Step 3: Test Authentication
- [ ] Try accessing dashboard without login → should redirect to login
- [ ] Logout and try accessing API endpoints → should get 401 errors
- [ ] Login persists on page refresh
- [ ] Auto-logout on session expiration

---

## 🚨 **Troubleshooting**

### Build Errors
- **Root Directory**: Ensure set to `backlink-manager`
- **Node Version**: Use Node.js 18.x or higher
- **Dependencies**: Check package.json is in correct directory

### Runtime Errors
- **Database**: Vercel uses ephemeral storage - data resets on each deployment
- **File Uploads**: Use `/tmp` directory for temporary files
- **Environment Variables**: Verify they're set correctly

### Authentication Issues
- **Credentials**: Ensure using exact credentials: `admin` / `3*jcx3EI@UR9`
- **Browser Storage**: Clear localStorage if having session issues
- **HTTPS**: Ensure using HTTPS for production (Vercel provides automatically)

### Performance Issues
- **Cold Starts**: First request may be slow (Vercel serverless)
- **Database**: Consider upgrading to persistent database for production
- **File Storage**: Use Vercel Blob or AWS S3 for persistent file storage

---

## 📞 **Support**

### Getting Help
1. **Check Logs**: Vercel Dashboard → Functions → View logs
2. **Local Testing**: Test locally first with instructions above
3. **Environment**: Verify all environment variables
4. **Documentation**: Review DEPLOYMENT.md and SECURITY.md

### Common Solutions
- **502 Errors**: Check build logs for errors
- **404 Errors**: Verify root directory setting
- **Auth Issues**: Clear browser storage and try again
- **Build Failures**: Check Node.js version and dependencies

---

## 🎉 **Success!**

After successful deployment:
1. **Bookmark your app URL**
2. **Save login credentials securely**
3. **Test all functionality**
4. **Consider changing default password** (edit `auth.js`)
5. **Set up GitHub integration** (optional)

Your secure backlink manager is now live and ready to use! 🔗🛡️