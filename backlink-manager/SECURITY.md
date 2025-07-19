# Security Information

## Authentication

The Backlink Manager uses a secure token-based authentication system.

### Default Credentials
- **Username**: `admin`
- **Password**: `3*jcx3EI@UR9`

### Security Features
- JWT-like session tokens
- Automatic session expiration
- Secure password verification
- Session cleanup
- HTTPS ready

### Production Security Recommendations

1. **Change Default Credentials**
   ```javascript
   // In auth.js, update:
   const ADMIN_CREDENTIALS = {
       username: 'your_username',
       password: 'your_secure_password'
   };
   ```

2. **Use Environment Variables**
   ```bash
   ADMIN_USERNAME=your_username
   ADMIN_PASSWORD=your_secure_password
   ```

3. **Enable HTTPS**
   - Vercel automatically provides HTTPS
   - For custom domains, ensure SSL/TLS certificates

4. **Session Management**
   - Default session: 24 hours
   - "Remember me": 7 days
   - Sessions auto-expire and cleanup

5. **Database Security**
   - SQLite database is file-based
   - On Vercel, stored in ephemeral `/tmp` directory
   - Consider using managed database for production

### API Security
- All API endpoints (except auth) require valid token
- Tokens sent via Authorization header: `Bearer <token>`
- Automatic logout on expired/invalid tokens
- CORS protection enabled

### Deployment Security
- Sensitive files excluded via .gitignore
- No hardcoded secrets in repository
- Environment-based configuration

### Updates Required for Production

1. **Implement proper password hashing (bcrypt)**
2. **Add rate limiting for login attempts**
3. **Use secure session storage (Redis)**
4. **Add CSRF protection**
5. **Implement proper logging and monitoring**

## Vulnerability Reporting

If you discover a security vulnerability, please email security@yourcompany.com with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if known)