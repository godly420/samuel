const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');

describe('Report Generation', () => {
    const testReportsDir = path.join(__dirname, 'test-reports');
    
    beforeAll(async () => {
        // Create test reports directory
        try {
            await fs.mkdir(testReportsDir, { recursive: true });
        } catch (error) {
            // Directory might already exist
        }
    });
    
    afterAll(async () => {
        // Clean up test files
        try {
            const files = await fs.readdir(testReportsDir);
            await Promise.all(files.map(file => 
                fs.unlink(path.join(testReportsDir, file))
            ));
            await fs.rmdir(testReportsDir);
        } catch (error) {
            // Directory might not exist or already be empty
        }
    });

    describe('Excel Report Generation', () => {
        test('should create valid Excel file', async () => {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Test Sheet');
            
            worksheet.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'URL', key: 'url', width: 50 },
                { header: 'Status', key: 'status', width: 15 }
            ];
            
            worksheet.addRow({ id: 1, url: 'https://example.com', status: 'live' });
            worksheet.addRow({ id: 2, url: 'https://test.com', status: 'error' });
            
            const testFilePath = path.join(testReportsDir, 'test-report.xlsx');
            await workbook.xlsx.writeFile(testFilePath);
            
            // Verify file was created
            const stats = await fs.stat(testFilePath);
            expect(stats.isFile()).toBe(true);
            expect(stats.size).toBeGreaterThan(0);
        });

        test('should handle empty data gracefully', async () => {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Empty Sheet');
            
            worksheet.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'URL', key: 'url', width: 50 }
            ];
            
            const testFilePath = path.join(testReportsDir, 'empty-report.xlsx');
            await workbook.xlsx.writeFile(testFilePath);
            
            const stats = await fs.stat(testFilePath);
            expect(stats.isFile()).toBe(true);
        });

        test('should validate Excel file structure', async () => {
            const workbook = new ExcelJS.Workbook();
            const summarySheet = workbook.addWorksheet('Summary');
            const detailSheet = workbook.addWorksheet('Details');
            
            // Set up summary sheet
            summarySheet.columns = [
                { header: 'Metric', key: 'metric', width: 30 },
                { header: 'Value', key: 'value', width: 15 }
            ];
            
            summarySheet.addRow({ metric: 'Total Links', value: 100 });
            summarySheet.addRow({ metric: 'Live Links', value: 85 });
            
            // Set up detail sheet
            detailSheet.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Live Link', key: 'live_link', width: 50 },
                { header: 'Status', key: 'status', width: 15 }
            ];
            
            detailSheet.addRow({ id: 1, live_link: 'https://example.com', status: 'live' });
            
            const testFilePath = path.join(testReportsDir, 'structured-report.xlsx');
            await workbook.xlsx.writeFile(testFilePath);
            
            // Read and validate the file
            const readWorkbook = new ExcelJS.Workbook();
            await readWorkbook.xlsx.readFile(testFilePath);
            
            expect(readWorkbook.worksheets).toHaveLength(2);
            expect(readWorkbook.getWorksheet('Summary')).toBeDefined();
            expect(readWorkbook.getWorksheet('Details')).toBeDefined();
        });
    });

    describe('HTML Report Generation', () => {
        test('should create valid HTML structure', () => {
            const testData = {
                stats: {
                    total: 100,
                    live_count: 85,
                    error_count: 10,
                    links_found: 80
                },
                backlinks: [
                    {
                        id: 1,
                        live_link: 'https://example.com',
                        target_url: 'https://mysite.com',
                        status: 'live',
                        link_found: true
                    }
                ]
            };
            
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Backlinks Report</title>
                </head>
                <body>
                    <h1>Backlinks Report</h1>
                    <div>Total: ${testData.stats.total}</div>
                    <table>
                        <tr><th>URL</th><th>Status</th></tr>
                        ${testData.backlinks.map(link => 
                            `<tr><td>${link.live_link}</td><td>${link.status}</td></tr>`
                        ).join('')}
                    </table>
                </body>
                </html>
            `;
            
            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toContain('<title>Backlinks Report</title>');
            expect(html).toContain('Total: 100');
            expect(html).toContain('https://example.com');
        });

        test('should handle special characters in HTML', () => {
            const testData = {
                link: 'https://example.com/page?param=value&other=test',
                anchor: 'Test & Validation "Quotes"'
            };
            
            // Simple HTML escaping
            const escapeHtml = (text) => {
                return text
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            };
            
            const escapedLink = escapeHtml(testData.link);
            const escapedAnchor = escapeHtml(testData.anchor);
            
            expect(escapedAnchor).toContain('&amp;');
            expect(escapedAnchor).toContain('&quot;');
        });
    });

    describe('Report Statistics', () => {
        test('should calculate percentages correctly', () => {
            const stats = {
                total: 100,
                live_count: 85,
                error_count: 10,
                unreachable_count: 5
            };
            
            const livePercentage = ((stats.live_count / stats.total) * 100).toFixed(2);
            const errorPercentage = ((stats.error_count / stats.total) * 100).toFixed(2);
            
            expect(livePercentage).toBe('85.00');
            expect(errorPercentage).toBe('10.00');
        });

        test('should handle zero division', () => {
            const stats = {
                total: 0,
                live_count: 0
            };
            
            const percentage = stats.total > 0 ? ((stats.live_count / stats.total) * 100).toFixed(2) : '0.00';
            
            expect(percentage).toBe('0.00');
        });
    });

    describe('File Operations', () => {
        test('should create directory if it does not exist', async () => {
            const newDir = path.join(testReportsDir, 'new-directory');
            
            await fs.mkdir(newDir, { recursive: true });
            
            const stats = await fs.stat(newDir);
            expect(stats.isDirectory()).toBe(true);
            
            // Clean up
            await fs.rmdir(newDir);
        });

        test('should handle file write errors gracefully', async () => {
            const invalidPath = '/invalid/path/file.txt';
            
            try {
                await fs.writeFile(invalidPath, 'test content');
                expect(true).toBe(false); // Should not reach here
            } catch (error) {
                expect(error).toBeDefined();
                expect(error.code).toBe('ENOENT');
            }
        });

        test('should validate file extensions', () => {
            const testFiles = [
                'report.xlsx',
                'report.pdf',
                'report.html',
                'report.csv',
                'invalid.txt'
            ];
            
            const validExtensions = ['.xlsx', '.pdf', '.html', '.csv'];
            
            testFiles.forEach(filename => {
                const ext = path.extname(filename);
                const isValid = validExtensions.includes(ext);
                
                if (filename === 'invalid.txt') {
                    expect(isValid).toBe(false);
                } else {
                    expect(isValid).toBe(true);
                }
            });
        });
    });

    describe('Data Formatting', () => {
        test('should format dates consistently', () => {
            const testDate = new Date('2024-01-15T10:30:00Z');
            
            const formattedDate = testDate.toISOString().split('T')[0];
            const localeDate = testDate.toLocaleDateString();
            
            expect(formattedDate).toBe('2024-01-15');
            expect(localeDate).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
        });

        test('should truncate long URLs properly', () => {
            const longUrl = 'https://example.com/very/long/path/with/many/segments/and/parameters?param1=value1&param2=value2&param3=value3';
            const maxLength = 50;
            
            const truncated = longUrl.length > maxLength 
                ? longUrl.substring(0, maxLength) + '...'
                : longUrl;
            
            expect(truncated.length).toBeLessThanOrEqual(maxLength + 3);
            expect(truncated).toContain('...');
        });

        test('should format file sizes correctly', () => {
            const fileSizes = [
                { bytes: 1024, expected: '1.00 KB' },
                { bytes: 1048576, expected: '1.00 MB' },
                { bytes: 1073741824, expected: '1.00 GB' },
                { bytes: 512, expected: '512 B' }
            ];
            
            const formatFileSize = (bytes) => {
                if (bytes === 0) return '0 B';
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                const value = (bytes / Math.pow(k, i)).toFixed(2);
                return value + ' ' + sizes[i];
            };
            
            fileSizes.forEach(test => {
                const formatted = formatFileSize(test.bytes);
                expect(formatted).toBe(test.expected);
            });
        });
    });
});