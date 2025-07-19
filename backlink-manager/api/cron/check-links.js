const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

// Database setup for serverless
const dbPath = process.env.VERCEL ? '/tmp/backlinks.db' : path.join(process.cwd(), 'backlinks.db');

// Initialize database
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        
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
            )`, (err) => {
                if (err) reject(err);
                else resolve(db);
            });
        });
    });
}

// Enhanced URL matching function
function urlsMatch(targetUrl, foundUrl) {
    if (!targetUrl || !foundUrl) return false;
    
    // Normalize URLs for comparison
    const normalizeUrl = (url) => {
        try {
            const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
            return urlObj.hostname.replace(/^www\./, '') + urlObj.pathname.replace(/\/$/, '');
        } catch {
            return url.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
        }
    };
    
    const normalizedTarget = normalizeUrl(targetUrl);
    const normalizedFound = normalizeUrl(foundUrl);
    
    // Exact match
    if (normalizedTarget === normalizedFound) return true;
    
    // Domain-only match for homepage links
    const targetDomain = normalizedTarget.split('/')[0];
    const foundDomain = normalizedFound.split('/')[0];
    
    return targetDomain === foundDomain && (
        normalizedTarget.endsWith('/') || 
        normalizedFound.endsWith('/') || 
        normalizedTarget.split('/').length === 1 ||
        normalizedFound.split('/').length === 1
    );
}

// Enhanced anchor text matching
function anchorMatches(targetAnchor, foundAnchor) {
    if (!targetAnchor || !foundAnchor) return false;
    
    const normalize = (text) => text.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedTarget = normalize(targetAnchor);
    const normalizedFound = normalize(foundAnchor);
    
    // Exact match
    if (normalizedTarget === normalizedFound) return { match: true, type: 'exact' };
    
    // Partial match (target contained in found)
    if (normalizedFound.includes(normalizedTarget)) return { match: true, type: 'partial' };
    
    // Word-based match (all words from target found in found text)
    const targetWords = normalizedTarget.split(' ').filter(w => w.length > 2);
    const foundWords = normalizedFound.split(' ');
    const matchedWords = targetWords.filter(word => foundWords.includes(word));
    
    if (matchedWords.length === targetWords.length && targetWords.length > 0) {
        return { match: true, type: 'word-based' };
    }
    
    return { match: false, type: 'none' };
}

// Link checking function
async function checkBacklink(backlink) {
    const result = {
        status: 'pending',
        link_found: false,
        link_context: '',
        http_status: null,
        error: null,
        anchor_match_type: 'none'
    };
    
    try {
        console.log(`Checking: ${backlink.live_link} for ${backlink.target_url} with anchor "${backlink.target_anchor}"`);
        
        const response = await axios.get(backlink.live_link, {
            timeout: 30000,
            maxRedirects: 5,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        result.http_status = response.status;
        
        if (response.status === 200) {
            const $ = cheerio.load(response.data);
            let linkFound = false;
            let bestContext = '';
            let bestMatchType = 'none';
            
            // Check all links on the page
            $('a[href]').each((i, element) => {
                const href = $(element).attr('href');
                const linkText = $(element).text().trim();
                
                if (!href) return;
                
                // Resolve relative URLs
                let fullUrl;
                try {
                    fullUrl = new URL(href, backlink.live_link).href;
                } catch {
                    fullUrl = href;
                }
                
                // Check if this link points to our target URL
                if (urlsMatch(backlink.target_url, fullUrl)) {
                    const anchorMatch = anchorMatches(backlink.target_anchor, linkText);
                    
                    if (anchorMatch.match) {
                        linkFound = true;
                        bestMatchType = anchorMatch.type;
                        
                        // Get context around the link
                        const parent = $(element).parent();
                        const context = parent.text().trim();
                        if (context.length > bestContext.length) {
                            bestContext = context.substring(0, 200);
                        }
                        
                        console.log(`Link found: ${anchorMatch.match}, Context: ${bestContext.substring(0, 100)}...`);
                    }
                }
            });
            
            result.status = 'live';
            result.link_found = linkFound;
            result.link_context = bestContext;
            result.anchor_match_type = bestMatchType;
            
        } else {
            result.status = 'error';
            result.error = `HTTP ${response.status}`;
        }
        
    } catch (error) {
        console.error(`Error checking ${backlink.live_link}:`, error.message);
        
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            result.status = 'unreachable';
            result.error = error.code;
        } else if (error.response) {
            result.status = 'error';
            result.http_status = error.response.status;
            result.error = `HTTP ${error.response.status}`;
        } else {
            result.status = 'error';
            result.error = error.message.substring(0, 100);
        }
    }
    
    return result;
}

// Main cron handler
export default async function handler(req, res) {
    // Verify this is a cron request (security measure)
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET || 'default-secret'}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('Starting automatic link check via cron...');
    
    try {
        const db = await initializeDatabase();
        
        // Get links that need checking (older than 23 hours to account for timing variations)
        const query = `SELECT * FROM backlinks WHERE 
            last_checked < datetime('now', '-23 hours') OR 
            last_checked IS NULL 
            ORDER BY 
                CASE WHEN last_checked IS NULL THEN 0 ELSE 1 END,
                last_checked ASC
            LIMIT 50`; // Limit to prevent timeout
        
        const rows = await new Promise((resolve, reject) => {
            db.all(query, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`Found ${rows.length} links to check`);
        
        let processed = 0;
        let errors = 0;
        
        // Process links in batches to prevent timeout
        for (const row of rows) {
            try {
                const result = await checkBacklink(row);
                
                // Update database
                await new Promise((resolve, reject) => {
                    db.run(`UPDATE backlinks SET 
                        status = ?, 
                        link_found = ?, 
                        link_context = ?, 
                        http_status = ?, 
                        last_checked = CURRENT_TIMESTAMP,
                        retry_count = CASE WHEN ? = 'error' THEN retry_count + 1 ELSE 0 END,
                        last_error = ?,
                        anchor_match_type = ?
                        WHERE id = ?`,
                        [
                            result.status, 
                            result.link_found ? 1 : 0, 
                            result.link_context, 
                            result.http_status,
                            result.status,
                            result.error,
                            result.anchor_match_type,
                            row.id
                        ], 
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
                
                processed++;
                console.log(`Updated backlink ${row.id}: status = ${result.status}, link_found = ${result.link_found}`);
                
            } catch (error) {
                console.error(`Error processing backlink ${row.id}:`, error);
                errors++;
            }
        }
        
        db.close();
        
        console.log(`Automatic link check completed. Processed: ${processed}, Errors: ${errors}`);
        
        res.status(200).json({
            success: true,
            message: 'Link check completed',
            processed: processed,
            errors: errors,
            total_found: rows.length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Cron job error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}