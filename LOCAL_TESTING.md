# 🧪 Local Testing Guide

## Quick Start

```bash
# 1. Clone and setup
git clone https://github.com/godly420/samuel.git
cd samuel/backlink-manager
npm install

# 2. Start server
npm start

# 3. Open browser
# Go to: http://localhost:3000
# Login: admin / 3*jcx3EI@UR9
```

## 🔐 Test Authentication

### Login Flow
1. Visit http://localhost:3000 → redirects to `/login`
2. Enter credentials: `admin` / `3*jcx3EI@UR9`
3. Should redirect to dashboard after successful login
4. Verify logout button appears in top-right corner

### Auth API Testing (curl)
```bash
# Test login endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"3*jcx3EI@UR9"}'

# Expected response:
# {"success":true,"token":"...","expiresAt":...,"message":"Login successful"}

# Test protected endpoint (will fail without token)
curl http://localhost:3000/api/stats

# Expected: 401 Unauthorized

# Test with token (replace TOKEN with actual token from login)
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/stats
```

## 📊 Test Core Features

### 1. CSV Upload/Download
- [ ] Click "Download Template" → should download CSV template
- [ ] Click "Upload CSV" → test file upload with sample data
- [ ] Verify uploaded data appears in table

### 2. Link Checking
- [ ] Click "Check All Links" → should process existing links
- [ ] Verify status updates in real-time
- [ ] Check statistics update

### 3. Reports Generation
- [ ] Click "Generate Reports" → should create Excel/PDF reports
- [ ] Download links should work
- [ ] Files should be accessible

### 4. Bulk Operations
- [ ] Select checkboxes for multiple items
- [ ] Test "Delete Selected" functionality
- [ ] Test cross-page selection dropdown

### 5. Session Management
- [ ] Login and verify session persists on page refresh
- [ ] Test "Remember Me" checkbox (longer session)
- [ ] Click logout → should redirect to login page
- [ ] Try accessing dashboard after logout → should redirect to login

## 🛠️ Debug Common Issues

### Port Already in Use
```bash
# Kill existing processes
pkill -f "node server.js"
# or
sudo lsof -ti:3000 | xargs kill -9
```

### Database Issues
```bash
# Remove existing database to start fresh
rm backlinks.db
# Restart server - new database will be created
```

### Authentication Issues
- Clear browser localStorage: F12 → Application → Local Storage → Clear
- Check server logs for authentication errors
- Verify credentials are exactly: `admin` / `3*jcx3EI@UR9`

### Missing Dependencies
```bash
# Reinstall all dependencies
rm -rf node_modules package-lock.json
npm install
```

## 🔍 Verification Checklist

- [ ] Server starts without errors
- [ ] Login page loads and looks correct
- [ ] Authentication works with provided credentials
- [ ] Dashboard loads after login
- [ ] Logout button appears and works
- [ ] All API endpoints require authentication
- [ ] CSV upload/download functions work
- [ ] Link checking processes correctly
- [ ] Reports generation works
- [ ] Session management works properly

## 📝 Test Data

### Sample CSV Content
```csv
live_link,target_url,target_anchor
https://example.com/blog,https://mysite.com,My Website
https://test.com/resources,https://mysite.com/products,Our Products
https://demo.com/partners,https://mysite.com/services,Services
```

### Environment Variables (Optional)
```bash
# Create .env file for testing GitHub integration
GITHUB_TOKEN=your_github_token
GITHUB_OWNER=your_username
GITHUB_REPO=samuel
```

## 🚨 Security Testing

### Test Protected Routes
All these should return 401 without valid token:
- GET /api/stats
- GET /api/backlinks
- POST /api/upload
- POST /api/check-links
- GET /api/reports/generate

### Test Session Expiration
- Login and note the token expiration time
- Wait for expiration or manually test with expired token
- Should automatically redirect to login

### Test Invalid Credentials
- Try login with wrong username/password
- Should show error message
- Should not create session token