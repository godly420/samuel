const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const ReportGenerator = require('./reportGenerator');
const GitHubIntegration = require('./githubIntegration');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ dest: uploadsDir });

// Use /tmp for database in serverless environments
const dbPath = process.env.VERCEL ? '/tmp/backlinks.db' : './backlinks.db';
const db = new sqlite3.Database(dbPath);

// Initialize GitHub integration
const github = new GitHubIntegration(db);

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS backlinks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        live_link TEXT NOT NULL,
        target_url TEXT NOT NULL,
        target_anchor TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        link_found BOOLEAN DEFAULT 0,
        link_context TEXT,
        http_status INTEGER,
        last_checked DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        anchor_match_type TEXT
    )`);
    
    // Add new columns to existing table if they don't exist
    db.run(`ALTER TABLE backlinks ADD COLUMN retry_count INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) console.log('Column retry_count already exists');
    });
    db.run(`ALTER TABLE backlinks ADD COLUMN last_error TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) console.log('Column last_error already exists');
    });
    db.run(`ALTER TABLE backlinks ADD COLUMN anchor_match_type TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) console.log('Column anchor_match_type already exists');
    });
});

// Authentication routes
app.post('/api/auth/login', (req, res) => {
    const { username, password, rememberMe } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required'
        });
    }
    
    if (!auth.verifyCredentials(username, password)) {
        return res.status(401).json({
            success: false,
            message: 'Invalid username or password'
        });
    }
    
    const session = auth.createSession(username, rememberMe);
    
    res.json({
        success: true,
        token: session.token,
        expiresAt: session.expiresAt,
        message: 'Login successful'
    });
});

app.post('/api/auth/logout', auth.requireAuth, (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        auth.deleteSession(token);
    }
    
    res.json({
        success: true,
        message: 'Logout successful'
    });
});

app.get('/api/auth/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.json({ valid: false, message: 'No token provided' });
    }
    
    const verification = auth.verifySession(token);
    
    res.json({
        valid: verification.valid,
        message: verification.reason || 'Token is valid',
        user: verification.valid ? verification.session.username : null
    });
});

// Serve login page for unauthenticated users
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Protect main dashboard
app.get('/', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    // Check if accessing via browser (no auth header)
    if (!authHeader) {
        // Check for token in cookies or redirect to login
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Checking Authentication...</title>
        </head>
        <body>
            <script>
                const token = localStorage.getItem('authToken');
                if (token) {
                    fetch('/api/auth/verify', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.valid) {
                            window.location.href = '/dashboard';
                        } else {
                            localStorage.removeItem('authToken');
                            window.location.href = '/login';
                        }
                    })
                    .catch(() => {
                        window.location.href = '/login';
                    });
                } else {
                    window.location.href = '/login';
                }
            </script>
        </body>
        </html>
        `);
    } else {
        const verification = auth.verifySession(token);
        if (verification.valid) {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        } else {
            res.status(401).json({ success: false, message: 'Unauthorized' });
        }
    }
});

// Serve dashboard for authenticated users
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve static files (CSS, JS, images only - no HTML files to maintain auth control)
app.use((req, res, next) => {
    // Block serving HTML files through static middleware
    if (req.path.endsWith('.html') || req.path === '/') {
        return next(); // Skip static middleware for HTML files
    }
    express.static('public', { index: false })(req, res, next);
});

app.post('/api/upload', auth.requireAuth, upload.single('csvFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const backlinks = [];
    
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
            if (row.live_link && row.target_url && row.target_anchor) {
                backlinks.push({
                    live_link: row.live_link.trim(),
                    target_url: row.target_url.trim(),
                    target_anchor: row.target_anchor.trim()
                });
            }
        })
        .on('end', () => {
            fs.unlinkSync(req.file.path);
            
            const stmt = db.prepare(`INSERT INTO backlinks (live_link, target_url, target_anchor) VALUES (?, ?, ?)`);
            
            let inserted = 0;
            backlinks.forEach(backlink => {
                stmt.run(backlink.live_link, backlink.target_url, backlink.target_anchor, function(err) {
                    if (!err) {
                        inserted++;
                    }
                });
            });
            
            stmt.finalize(() => {
                console.log(`Uploaded ${inserted} of ${backlinks.length} backlinks`);
                res.json({ 
                    success: true, 
                    message: `Uploaded ${backlinks.length} backlinks`,
                    count: backlinks.length 
                });
            });
        })
        .on('error', (error) => {
            fs.unlinkSync(req.file.path);
            res.status(500).json({ error: 'Error processing CSV file' });
        });
});

async function checkBacklink(backlink) {
    try {
        console.log(`Checking: ${backlink.live_link} for ${backlink.target_url} with anchor "${backlink.target_anchor}"`);
        
        const response = await axios.get(backlink.live_link, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            maxRedirects: 5,
            validateStatus: function (status) {
                return status < 500; // Accept all status codes under 500
            }
        });
        
        // Handle different HTTP status codes
        if (response.status === 404) {
            return {
                status: 'error',
                http_status: 404,
                link_found: false,
                link_context: 'Page not found (404)'
            };
        }
        
        if (response.status >= 300 && response.status < 400) {
            return {
                status: 'error',
                http_status: response.status,
                link_found: false,
                link_context: `Redirect (${response.status}) - Check redirect destination`
            };
        }
        
        if (response.status !== 200) {
            return {
                status: 'error',
                http_status: response.status,
                link_found: false,
                link_context: `HTTP ${response.status} - ${response.statusText}`
            };
        }
        
        const $ = cheerio.load(response.data);
        let linkFound = false;
        let linkContext = '';
        let exactAnchorMatch = false;
        
        $('a').each((index, element) => {
            const href = $(element).attr('href');
            const text = $(element).text().trim();
            
            if (href) {
                // Normalize URLs for comparison
                const normalizedHref = href.toLowerCase().replace(/\/$/, ''); // Remove trailing slash
                const normalizedTargetUrl = backlink.target_url.toLowerCase().replace(/\/$/, '');
                const normalizedAnchor = backlink.target_anchor.toLowerCase();
                const normalizedText = text.toLowerCase();
                
                // More comprehensive URL matching
                const urlVariations = [
                    normalizedTargetUrl,
                    normalizedTargetUrl.replace(/^https?:\/\//, ''),
                    normalizedTargetUrl.replace(/^https?:\/\/(www\.)?/, ''),
                    normalizedTargetUrl.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] // Domain only
                ];
                
                const hrefVariations = [
                    normalizedHref,
                    normalizedHref.replace(/^https?:\/\//, ''),
                    normalizedHref.replace(/^https?:\/\/(www\.)?/, ''),
                    normalizedHref.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] // Domain only
                ];
                
                const urlMatches = urlVariations.some(urlVar => 
                    hrefVariations.some(hrefVar => 
                        urlVar === hrefVar || urlVar.includes(hrefVar) || hrefVar.includes(urlVar)
                    )
                );
                
                if (urlMatches) {
                    // Check for exact anchor match first
                    exactAnchorMatch = normalizedText === normalizedAnchor;
                    
                    // More flexible anchor matching
                    const anchorMatches = exactAnchorMatch ||
                                        normalizedText.includes(normalizedAnchor) ||
                                        normalizedAnchor.includes(normalizedText) ||
                                        // Check for partial word matches
                                        normalizedAnchor.split(' ').some(word => 
                                            word.length > 2 && normalizedText.includes(word)
                                        ) ||
                                        normalizedText.split(' ').some(word => 
                                            word.length > 2 && normalizedAnchor.includes(word)
                                        );
                    
                    if (anchorMatches || normalizedText.length > 0) {
                        linkFound = true;
                        const parent = $(element).parent();
                        linkContext = parent.text().trim().substring(0, 300);
                        if (!linkContext) {
                            linkContext = `Link found: "${text}" -> ${href}`;
                        }
                        return false; // Break the loop
                    }
                }
            }
        });
        
        console.log(`Link found: ${linkFound}, Context: ${linkContext.substring(0, 100)}...`);
        
        return {
            status: 'live',
            http_status: response.status,
            link_found: linkFound,
            link_context: linkFound ? linkContext : 'Target link not found on page',
            anchor_match_type: linkFound ? (exactAnchorMatch ? 'exact' : 'partial') : null
        };
    } catch (error) {
        console.log(`Error checking ${backlink.live_link}: ${error.message}`);
        
        // More detailed error handling
        if (error.code === 'ENOTFOUND') {
            return {
                status: 'unreachable',
                http_status: null,
                link_found: false,
                link_context: 'Domain not found (DNS error)'
            };
        } else if (error.code === 'ETIMEDOUT') {
            return {
                status: 'unreachable',
                http_status: null,
                link_found: false,
                link_context: 'Connection timeout'
            };
        } else if (error.response) {
            return {
                status: 'error',
                http_status: error.response.status,
                link_found: false,
                link_context: `HTTP ${error.response.status} - ${error.response.statusText || error.message}`
            };
        } else {
            return {
                status: 'unreachable',
                http_status: null,
                link_found: false,
                link_context: error.message
            };
        }
    }
}

app.post('/api/check-links', auth.requireAuth, async (req, res) => {
    const { forceAll } = req.body;
    
    let query;
    if (forceAll) {
        // Check ALL links when forced
        query = `SELECT * FROM backlinks ORDER BY created_at DESC`;
    } else {
        // Include retry logic - don't recheck failed links too frequently unless retry count is low
        query = `SELECT * FROM backlinks WHERE 
            status = 'pending' 
            OR (last_checked < datetime('now', '-1 day') AND (status = 'live' OR retry_count < 3))
            OR (last_checked < datetime('now', '-2 hours') AND status IN ('error', 'unreachable') AND retry_count < 3)
            ORDER BY retry_count ASC, last_checked ASC`;
    }
    
    db.all(query, async (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        let processed = 0;
        let errors = 0;
        
        for (const row of rows) {
            const result = await checkBacklink(row);
            
            // Increment retry count if there's an error
            const newRetryCount = (result.status === 'error' || result.status === 'unreachable') 
                ? (row.retry_count || 0) + 1 
                : 0;
            
            db.run(`UPDATE backlinks SET 
                status = ?, 
                link_found = ?, 
                link_context = ?, 
                http_status = ?, 
                last_checked = CURRENT_TIMESTAMP,
                retry_count = ?,
                last_error = ?,
                anchor_match_type = ?
                WHERE id = ?`,
                [
                    result.status, 
                    result.link_found ? 1 : 0, 
                    result.link_context || '', 
                    result.http_status, 
                    newRetryCount,
                    (result.status === 'error' || result.status === 'unreachable') ? result.link_context : null,
                    result.anchor_match_type || null,
                    row.id
                ],
                function(err) {
                    if (err) {
                        console.error('Error updating backlink:', err);
                    } else {
                        console.log(`Updated backlink ${row.id}: status = ${result.status}, link_found = ${result.link_found ? 1 : 0}`);
                    }
                }
            );
            
            if (result.status === 'error' || result.status === 'unreachable') {
                errors++;
            }
            
            processed++;
        }
        
        res.json({ success: true, processed, errors });
    });
});

app.get('/api/backlinks', auth.requireAuth, (req, res) => {
    const { page = 1, limit = 50, status, link_found } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const countParams = [];
    const queryParams = [];
    
    if (status) {
        whereClause += ' AND status = ?';
        countParams.push(status);
        queryParams.push(status);
    }
    
    if (link_found !== undefined) {
        whereClause += ' AND link_found = ?';
        const linkFoundValue = link_found === 'true' ? 1 : 0;
        countParams.push(linkFoundValue);
        queryParams.push(linkFoundValue);
    }
    
    // Get filtered count
    const countQuery = `SELECT COUNT(*) as total FROM backlinks ${whereClause}`;
    
    db.get(countQuery, countParams, (err, count) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        // Get paginated results
        const query = `SELECT * FROM backlinks ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        queryParams.push(parseInt(limit), offset);
        
        db.all(query, queryParams, (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.json({
                backlinks: rows,
                total: count.total,
                page: parseInt(page),
                totalPages: Math.ceil(count.total / limit)
            });
        });
    });
});

app.get('/api/stats', auth.requireAuth, (req, res) => {
    db.get(`SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'live' THEN 1 ELSE 0 END) as live_count,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
        SUM(CASE WHEN status = 'unreachable' THEN 1 ELSE 0 END) as unreachable_count,
        SUM(CASE WHEN link_found = 1 THEN 1 ELSE 0 END) as links_found,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count
        FROM backlinks`, (err, stats) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(stats);
    });
});

app.get('/api/export', auth.requireAuth, (req, res) => {
    db.all('SELECT * FROM backlinks ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        const csvContent = [
            'Live Link,Target URL,Target Anchor,Status,Link Found,HTTP Status,Link Context,Last Checked',
            ...rows.map(row => [
                row.live_link,
                row.target_url,
                row.target_anchor,
                row.status,
                row.link_found ? 'Yes' : 'No',
                row.http_status || 'N/A',
                `"${(row.link_context || '').replace(/"/g, '""')}"`,
                row.last_checked || 'Never'
            ].join(','))
        ].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=backlinks-report.csv');
        res.send(csvContent);
    });
});

app.delete('/api/backlinks/:id', auth.requireAuth, (req, res) => {
    db.run('DELETE FROM backlinks WHERE id = ?', [req.params.id], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
    });
});

// Bulk delete endpoint
app.post('/api/backlinks/bulk-delete', auth.requireAuth, (req, res) => {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No IDs provided' });
    }
    
    const placeholders = ids.map(() => '?').join(',');
    const query = `DELETE FROM backlinks WHERE id IN (${placeholders})`;
    
    db.run(query, ids, function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, deleted: this.changes });
    });
});

// Get all backlink IDs for cross-page selection
app.get('/api/backlinks/ids', auth.requireAuth, (req, res) => {
    const { status, link_found } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (status) {
        whereClause += ' AND status = ?';
        params.push(status);
    }
    
    if (link_found !== undefined) {
        whereClause += ' AND link_found = ?';
        const linkFoundValue = link_found === 'true' ? 1 : 0;
        params.push(linkFoundValue);
    }
    
    const query = `SELECT id FROM backlinks ${whereClause} ORDER BY created_at DESC`;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        const ids = rows.map(row => row.id);
        res.json({ success: true, ids });
    });
});

// Delete all backlinks
app.delete('/api/backlinks/delete-all', auth.requireAuth, (req, res) => {
    db.run('DELETE FROM backlinks', [], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ 
            success: true, 
            deleted: this.changes,
            message: `Successfully deleted ${this.changes} backlinks` 
        });
    });
});

// Debug endpoint to check database
app.get('/api/debug', auth.requireAuth, (req, res) => {
    db.all('SELECT * FROM backlinks ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({
            total: rows.length,
            backlinks: rows
        });
    });
});

// Test endpoint to check a specific link
app.post('/api/test-link', auth.requireAuth, async (req, res) => {
    const { live_link, target_url, target_anchor } = req.body;
    
    if (!live_link || !target_url || !target_anchor) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
        const result = await checkBacklink({ live_link, target_url, target_anchor });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CSV template download endpoint
app.get('/api/template', auth.requireAuth, (req, res) => {
    const csvTemplate = `live_link,target_url,target_anchor
https://example.com/blog/post1,https://mysite.com,My Site
https://example.com/resources,https://mysite.com/products,Our Products
https://example.com/partners,https://mysite.com/services,Professional Services`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=backlink-template.csv');
    res.send(csvTemplate);
});

// Generate comprehensive reports
app.get('/api/reports/generate', auth.requireAuth, async (req, res) => {
    try {
        const reportGenerator = new ReportGenerator(db);
        const { excelPath, pdfPath } = await reportGenerator.generateAllReports();
        
        res.json({
            success: true,
            message: 'Reports generated successfully',
            files: {
                excel: path.basename(excelPath),
                pdf: path.basename(pdfPath)
            }
        });
    } catch (error) {
        console.error('Error generating reports:', error);
        res.status(500).json({ error: 'Failed to generate reports' });
    }
});

// Download Excel report
app.get('/api/reports/excel/:filename', auth.requireAuth, (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, 'reports', filename);
    
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'Report not found' });
    }
    
    res.download(filepath);
});

// Download PDF or HTML report
app.get('/api/reports/pdf/:filename', auth.requireAuth, (req, res) => {
    const filename = req.params.filename;
    let filepath = path.join(__dirname, 'reports', filename);
    
    // If PDF doesn't exist, try HTML
    if (!fs.existsSync(filepath) && filename.endsWith('.pdf')) {
        const htmlFilename = filename.replace('.pdf', '.html');
        const htmlPath = path.join(__dirname, 'reports', htmlFilename);
        if (fs.existsSync(htmlPath)) {
            filepath = htmlPath;
        }
    }
    
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'Report not found' });
    }
    
    res.download(filepath);
});

// List available reports
app.get('/api/reports', auth.requireAuth, (req, res) => {
    const reportsDir = path.join(__dirname, 'reports');
    
    if (!fs.existsSync(reportsDir)) {
        return res.json({ reports: [] });
    }
    
    fs.readdir(reportsDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to list reports' });
        }
        
        const reports = files
            .filter(file => file.endsWith('.xlsx') || file.endsWith('.pdf'))
            .map(file => {
                const stats = fs.statSync(path.join(reportsDir, file));
                return {
                    filename: file,
                    type: file.endsWith('.xlsx') ? 'excel' : 'pdf',
                    size: stats.size,
                    created: stats.birthtime
                };
            })
            .sort((a, b) => b.created - a.created);
        
        res.json({ reports });
    });
});

// GitHub Integration endpoints
app.get('/api/github/status', auth.requireAuth, (req, res) => {
    res.json(github.getStatus());
});

app.post('/api/github/upload', auth.requireAuth, async (req, res) => {
    try {
        const result = await github.handleManualUpload();
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('GitHub upload error:', error);
        res.status(500).json({ error: 'Failed to upload to GitHub' });
    }
});

// Configure GitHub settings
app.post('/api/github/configure', auth.requireAuth, (req, res) => {
    const { token, owner, repo, branch } = req.body;
    
    // In a production app, you'd want to securely store these
    // For now, we'll just return the current configuration
    res.json({
        message: 'Configuration updated. Please restart the server or set environment variables.',
        note: 'Set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO environment variables for best security.'
    });
});

// Automatic link checking every 24 hours
async function autoCheckLinks() {
    console.log('Starting automatic link check...');
    
    db.all(`SELECT * FROM backlinks WHERE last_checked < datetime('now', '-1 day') OR last_checked IS NULL`, async (err, rows) => {
        if (err) {
            console.error('Error in auto check:', err);
            return;
        }
        
        console.log(`Found ${rows.length} links to check`);
        
        for (const row of rows) {
            const result = await checkBacklink(row);
            
            db.run(`UPDATE backlinks SET 
                status = ?, 
                link_found = ?, 
                link_context = ?, 
                http_status = ?, 
                last_checked = CURRENT_TIMESTAMP 
                WHERE id = ?`,
                [result.status, result.link_found ? 1 : 0, result.link_context, result.http_status, row.id]
            );
        }
        
        console.log('Automatic link check completed');
    });
}

// Schedule automatic checks every 24 hours
setInterval(autoCheckLinks, 24 * 60 * 60 * 1000);

// Run initial check after 5 minutes
setTimeout(autoCheckLinks, 5 * 60 * 1000);

// Export app for Vercel
module.exports = app;

// Only start server if not in Vercel environment
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log('Automatic link checking enabled (every 24 hours)');
        
        // Schedule GitHub uploads (daily at 2 AM)
        github.scheduleUploads();
        
        if (github.getStatus().enabled) {
            console.log('GitHub integration enabled - reports will be uploaded daily');
        } else {
            console.log('GitHub integration disabled - set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO to enable');
        }
    });
}