const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class ReportGenerator {
    constructor(db) {
        this.db = db;
    }

    // Get all backlinks with detailed information
    async getBacklinksData() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT 
                    id,
                    live_link,
                    target_url,
                    target_anchor,
                    status,
                    link_found,
                    link_context,
                    http_status,
                    last_checked,
                    created_at,
                    retry_count,
                    last_error,
                    anchor_match_type
                FROM backlinks 
                ORDER BY created_at DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Get summary statistics
    async getStats() {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'live' THEN 1 ELSE 0 END) as live_count,
                    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
                    SUM(CASE WHEN status = 'unreachable' THEN 1 ELSE 0 END) as unreachable_count,
                    SUM(CASE WHEN link_found = 1 THEN 1 ELSE 0 END) as links_found,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                    SUM(CASE WHEN http_status = 404 THEN 1 ELSE 0 END) as not_found_404,
                    SUM(CASE WHEN http_status >= 300 AND http_status < 400 THEN 1 ELSE 0 END) as redirects,
                    SUM(CASE WHEN anchor_match_type = 'exact' THEN 1 ELSE 0 END) as exact_matches,
                    SUM(CASE WHEN anchor_match_type = 'partial' THEN 1 ELSE 0 END) as partial_matches
                FROM backlinks
            `, (err, stats) => {
                if (err) reject(err);
                else resolve(stats);
            });
        });
    }

    // Generate Excel report
    async generateExcelReport(filename = 'backlinks_report.xlsx') {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Backlink Manager';
        workbook.lastModifiedBy = 'Backlink Manager';
        workbook.created = new Date();
        workbook.modified = new Date();

        // Summary sheet
        const summarySheet = workbook.addWorksheet('Summary', {
            properties: { tabColor: { argb: 'FF00FF00' } }
        });

        const stats = await this.getStats();
        
        summarySheet.columns = [
            { header: 'Metric', key: 'metric', width: 30 },
            { header: 'Value', key: 'value', width: 15 },
            { header: 'Percentage', key: 'percentage', width: 15 }
        ];

        // Add summary data
        const summaryData = [
            { metric: 'Total Backlinks', value: stats.total, percentage: '100%' },
            { metric: 'Live Links', value: stats.live_count, percentage: `${((stats.live_count / stats.total) * 100).toFixed(2)}%` },
            { metric: 'Error Links', value: stats.error_count, percentage: `${((stats.error_count / stats.total) * 100).toFixed(2)}%` },
            { metric: 'Unreachable Links', value: stats.unreachable_count, percentage: `${((stats.unreachable_count / stats.total) * 100).toFixed(2)}%` },
            { metric: 'Links Found', value: stats.links_found, percentage: `${((stats.links_found / stats.total) * 100).toFixed(2)}%` },
            { metric: 'Pending Links', value: stats.pending_count, percentage: `${((stats.pending_count / stats.total) * 100).toFixed(2)}%` },
            { metric: '404 Errors', value: stats.not_found_404, percentage: `${((stats.not_found_404 / stats.total) * 100).toFixed(2)}%` },
            { metric: 'Redirects', value: stats.redirects, percentage: `${((stats.redirects / stats.total) * 100).toFixed(2)}%` },
            { metric: 'Exact Anchor Matches', value: stats.exact_matches, percentage: `${((stats.exact_matches / stats.total) * 100).toFixed(2)}%` },
            { metric: 'Partial Anchor Matches', value: stats.partial_matches, percentage: `${((stats.partial_matches / stats.total) * 100).toFixed(2)}%` }
        ];

        summaryData.forEach(row => {
            summarySheet.addRow(row);
        });

        // Style the summary sheet
        summarySheet.getRow(1).font = { bold: true };
        summarySheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };

        // Detailed backlinks sheet
        const detailSheet = workbook.addWorksheet('Detailed Backlinks', {
            properties: { tabColor: { argb: 'FF0000FF' } }
        });

        detailSheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Live Link', key: 'live_link', width: 50 },
            { header: 'Target URL', key: 'target_url', width: 50 },
            { header: 'Target Anchor', key: 'target_anchor', width: 30 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Link Found', key: 'link_found', width: 12 },
            { header: 'HTTP Status', key: 'http_status', width: 12 },
            { header: 'Anchor Match', key: 'anchor_match_type', width: 15 },
            { header: 'Link Context', key: 'link_context', width: 50 },
            { header: 'Last Error', key: 'last_error', width: 30 },
            { header: 'Retry Count', key: 'retry_count', width: 12 },
            { header: 'Last Checked', key: 'last_checked', width: 20 },
            { header: 'Created At', key: 'created_at', width: 20 }
        ];

        const backlinks = await this.getBacklinksData();
        
        backlinks.forEach(link => {
            const row = detailSheet.addRow({
                ...link,
                link_found: link.link_found ? 'Yes' : 'No'
            });

            // Color coding based on status
            if (link.status === 'error' || link.status === 'unreachable') {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFF0000' }
                };
            } else if (link.status === 'live' && link.link_found) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF00FF00' }
                };
            } else if (link.status === 'live' && !link.link_found) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFFF00' }
                };
            }
        });

        // Style the detail sheet header
        detailSheet.getRow(1).font = { bold: true };
        detailSheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };

        // Add filters
        detailSheet.autoFilter = {
            from: 'A1',
            to: 'M1'
        };

        // Error report sheet
        const errorSheet = workbook.addWorksheet('Errors & Issues', {
            properties: { tabColor: { argb: 'FFFF0000' } }
        });

        errorSheet.columns = [
            { header: 'Live Link', key: 'live_link', width: 50 },
            { header: 'Target URL', key: 'target_url', width: 50 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'HTTP Status', key: 'http_status', width: 12 },
            { header: 'Error Description', key: 'last_error', width: 50 },
            { header: 'Retry Count', key: 'retry_count', width: 12 },
            { header: 'Last Checked', key: 'last_checked', width: 20 }
        ];

        const errorLinks = backlinks.filter(link => 
            link.status === 'error' || link.status === 'unreachable' || link.http_status === 404
        );

        errorLinks.forEach(link => {
            errorSheet.addRow(link);
        });

        errorSheet.getRow(1).font = { bold: true };
        errorSheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF0000' }
        };

        // Save the file
        const reportsDir = path.join(__dirname, 'reports');
        await fs.mkdir(reportsDir, { recursive: true });
        const filepath = path.join(reportsDir, filename);
        await workbook.xlsx.writeFile(filepath);
        
        return filepath;
    }

    // Generate PDF report
    async generatePDFReport(filename = 'backlinks_report.pdf') {
        const stats = await this.getStats();
        const backlinks = await this.getBacklinksData();
        
        // Create HTML content for PDF
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Backlinks Report</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    color: #333;
                }
                h1, h2 {
                    color: #2c3e50;
                }
                .summary {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 30px;
                }
                .stat-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 15px;
                    margin-top: 20px;
                }
                .stat-box {
                    background: white;
                    padding: 15px;
                    border-radius: 5px;
                    border: 1px solid #ddd;
                }
                .stat-value {
                    font-size: 24px;
                    font-weight: bold;
                    color: #3498db;
                }
                .stat-label {
                    color: #7f8c8d;
                    font-size: 14px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                    font-size: 12px;
                }
                th, td {
                    padding: 8px;
                    text-align: left;
                    border-bottom: 1px solid #ddd;
                }
                th {
                    background-color: #3498db;
                    color: white;
                }
                tr:nth-child(even) {
                    background-color: #f2f2f2;
                }
                .status-live { color: green; }
                .status-error { color: red; }
                .status-unreachable { color: orange; }
                .link-found { color: green; font-weight: bold; }
                .link-not-found { color: red; font-weight: bold; }
                .page-break { page-break-after: always; }
                .timestamp {
                    text-align: right;
                    color: #7f8c8d;
                    font-size: 12px;
                    margin-bottom: 20px;
                }
            </style>
        </head>
        <body>
            <h1>Backlinks Report</h1>
            <div class="timestamp">Generated on: ${new Date().toLocaleString()}</div>
            
            <div class="summary">
                <h2>Summary Statistics</h2>
                <div class="stat-grid">
                    <div class="stat-box">
                        <div class="stat-value">${stats.total}</div>
                        <div class="stat-label">Total Backlinks</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${stats.links_found}</div>
                        <div class="stat-label">Links Found (${((stats.links_found / stats.total) * 100).toFixed(1)}%)</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${stats.live_count}</div>
                        <div class="stat-label">Live Pages</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${stats.error_count}</div>
                        <div class="stat-label">Errors</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${stats.not_found_404}</div>
                        <div class="stat-label">404 Errors</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${stats.exact_matches}</div>
                        <div class="stat-label">Exact Anchor Matches</div>
                    </div>
                </div>
            </div>
            
            <div class="page-break"></div>
            
            <h2>Detailed Backlinks Report</h2>
            <table>
                <thead>
                    <tr>
                        <th>Live Link</th>
                        <th>Target URL</th>
                        <th>Anchor</th>
                        <th>Status</th>
                        <th>Link Found</th>
                        <th>HTTP</th>
                        <th>Last Checked</th>
                    </tr>
                </thead>
                <tbody>
                    ${backlinks.map(link => `
                        <tr>
                            <td>${link.live_link.substring(0, 50)}${link.live_link.length > 50 ? '...' : ''}</td>
                            <td>${link.target_url.substring(0, 50)}${link.target_url.length > 50 ? '...' : ''}</td>
                            <td>${link.target_anchor}</td>
                            <td class="status-${link.status}">${link.status}</td>
                            <td class="${link.link_found ? 'link-found' : 'link-not-found'}">${link.link_found ? 'Yes' : 'No'}</td>
                            <td>${link.http_status || '-'}</td>
                            <td>${link.last_checked ? new Date(link.last_checked).toLocaleDateString() : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
        `;

        // Try to generate PDF using Puppeteer
        try {
            const browser = await puppeteer.launch({ 
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            await page.setContent(html);
            
            const reportsDir = path.join(__dirname, 'reports');
            await fs.mkdir(reportsDir, { recursive: true });
            const filepath = path.join(reportsDir, filename);
            
            await page.pdf({
                path: filepath,
                format: 'A4',
                margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
            });
            
            await browser.close();
            
            return filepath;
        } catch (error) {
            console.error('Puppeteer failed, saving as HTML instead:', error.message);
            
            // Fall back to saving HTML file
            const reportsDir = path.join(__dirname, 'reports');
            await fs.mkdir(reportsDir, { recursive: true });
            const htmlFilename = filename.replace('.pdf', '.html');
            const filepath = path.join(reportsDir, htmlFilename);
            
            await fs.writeFile(filepath, html, 'utf8');
            
            return filepath;
        }
    }

    // Generate both reports
    async generateAllReports() {
        const timestamp = new Date().toISOString().split('T')[0];
        const excelPath = await this.generateExcelReport(`backlinks_report_${timestamp}.xlsx`);
        const pdfPath = await this.generatePDFReport(`backlinks_report_${timestamp}.pdf`);
        
        // Return appropriate filename based on what was actually created
        const actualPdfFile = pdfPath.endsWith('.html') 
            ? path.basename(pdfPath)
            : path.basename(pdfPath);
            
        return { 
            excelPath, 
            pdfPath,
            excel: path.basename(excelPath),
            pdf: actualPdfFile
        };
    }
}

module.exports = ReportGenerator;