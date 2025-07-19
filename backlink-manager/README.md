# Backlink Manager

A comprehensive, full-featured backlink management tool that monitors, verifies, and reports on backlinks automatically.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/godly420/samuel)

## Features

### 🔐 **Secure Authentication**
- Token-based login system
- Default admin credentials: admin / 3*jcx3EI@UR9
- Automatic session management and logout
- Session expiration and cleanup
- All API endpoints protected

### 🔍 **Advanced Link Verification**
- Real-time link checking with robust error handling
- Smart anchor text matching (exact and partial)
- 404 detection and redirect handling
- Retry mechanism for failed checks
- DNS error detection and categorization

### 📊 **Comprehensive Reporting**
- Excel reports with multiple sheets (Summary, Details, Errors)
- HTML/PDF reports with visual formatting
- Real-time statistics dashboard
- CSV export functionality
- Automated daily report generation

### 🚀 **GitHub Integration**
- Automatic report uploads to GitHub repositories
- Daily scheduled uploads at 2 AM
- Maintains report history with timestamps
- README generation for report directories

### 🎨 **Modern UI**
- Dark/Light theme support (4 themes available)
- Responsive design
- Real-time status updates
- Bulk operations (delete, check)
- Pagination and filtering

### ⚡ **Performance & Reliability**
- SQLite database for data persistence
- Intelligent retry logic for failed links
- 24-hour automatic link checking
- Error tracking and detailed logging
- Connection timeout handling

## Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd backlink-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm start
   ```

4. **Access the application**
   - Open your browser and go to `http://localhost:3000`

## Usage

### Upload Backlinks
1. Click "Upload CSV" on the dashboard
2. Use the provided template or create your own CSV with columns:
   - `live_link` - The page where your backlink should be found
   - `target_url` - Your website URL that should be linked
   - `target_anchor` - The expected anchor text

### Monitor Links
- Links are automatically checked every 24 hours
- Manual checking available via "Check All Links" button
- Real-time status updates with detailed error information

### Generate Reports
- **Excel Reports**: Detailed spreadsheets with multiple sheets
- **PDF/HTML Reports**: Printable summaries with statistics
- **CSV Export**: Simple data export for external analysis

### GitHub Integration (Optional)
Set environment variables to enable automatic GitHub uploads:
```bash
export GITHUB_TOKEN="your_github_token"
export GITHUB_OWNER="your_username"
export GITHUB_REPO="your_repository"
```

## API Endpoints

### Core Functionality
- `GET /api/stats` - Get summary statistics
- `GET /api/backlinks` - List backlinks (paginated)
- `POST /api/upload` - Upload CSV file
- `POST /api/check-links` - Manually trigger link checking

### Reports
- `GET /api/reports/generate` - Generate new reports
- `GET /api/reports` - List available reports
- `GET /api/reports/excel/:filename` - Download Excel report
- `GET /api/reports/pdf/:filename` - Download PDF report

### GitHub Integration
- `GET /api/github/status` - Check GitHub configuration
- `POST /api/github/upload` - Manual upload to GitHub

## CSV Template

Your CSV file should have these columns:
```csv
live_link,target_url,target_anchor
https://example.com/blog,https://mysite.com,My Website
https://partner.com/resources,https://mysite.com/product,Best Product
```

## Link Checking Algorithm

The system uses advanced URL matching that handles:
- Protocol variations (http/https)
- www subdomain variations
- Trailing slash differences
- Relative URLs
- Domain-only matching

Anchor text matching supports:
- Exact matches
- Partial text inclusion
- Word-based matching
- Case-insensitive comparison

## Error Handling

The system categorizes link issues as:
- **Live**: Page accessible, link found
- **Error**: HTTP errors (404, 500, etc.)
- **Unreachable**: DNS/network failures
- **Pending**: Not yet checked

## Testing

Run the comprehensive test suite:
```bash
# Quick functionality test
node test-runner.js

# Full Jest test suite
npm test

# Test with coverage
npm run test:coverage
```

## Configuration

### Environment Variables
- `GITHUB_TOKEN` - GitHub personal access token
- `GITHUB_OWNER` - GitHub username/organization
- `GITHUB_REPO` - Repository name for uploads
- `GITHUB_BRANCH` - Target branch (default: main)
- `PORT` - Server port (default: 3000)

### Database
- Uses SQLite database (`backlinks.db`)
- Automatic schema migration
- Persistent storage of all link data

## File Structure

```
backlink-manager/
├── server.js              # Main Express server
├── reportGenerator.js     # Excel/PDF report generation
├── githubIntegration.js   # GitHub API integration
├── package.json           # Dependencies and scripts
├── public/                # Frontend files
│   ├── index.html        # Main UI
│   ├── script.js         # Frontend JavaScript
│   └── styles.css        # Styling and themes
├── tests/                 # Test suite
├── reports/              # Generated reports (auto-created)
└── uploads/              # Temporary CSV uploads
```

## Advanced Features

### Retry Logic
- Failed links are retried up to 3 times
- Intelligent backoff for different error types
- Separate tracking of retry counts

### Performance Optimization
- Bulk database operations
- Efficient pagination
- Connection pooling for HTTP requests
- Timeout handling

### Security
- CORS protection
- Input validation
- Secure file handling
- Environment-based configuration

## Troubleshooting

### Common Issues

1. **Report generation fails**
   - Install system dependencies for Puppeteer
   - Falls back to HTML if PDF generation fails

2. **GitHub upload not working**
   - Verify environment variables are set
   - Check token permissions

3. **Link checking slow**
   - Normal for large datasets
   - Check network connectivity
   - Review timeout settings

### Logs
- Server logs all operations
- Check `server.log` for detailed information
- Error tracking in database

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `npm test`
4. Submit a pull request

## License

MIT License - feel free to use and modify for your needs.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the test suite results
3. Check server logs for detailed error information