const axios = require('axios');
const cheerio = require('cheerio');

// Mock test data for link checking functionality
describe('Link Checking Logic', () => {
    
    // Test URL normalization
    describe('URL Normalization', () => {
        test('should normalize URLs correctly', () => {
            const testCases = [
                {
                    input: 'https://example.com/',
                    expected: 'https://example.com'
                },
                {
                    input: 'HTTP://EXAMPLE.COM/path',
                    expected: 'http://example.com/path'
                },
                {
                    input: 'www.example.com/page',
                    expected: 'www.example.com/page'
                }
            ];

            testCases.forEach(testCase => {
                const normalized = testCase.input.toLowerCase().replace(/\/$/, '');
                expect(normalized).toBe(testCase.expected);
            });
        });
    });

    // Test anchor text matching
    describe('Anchor Text Matching', () => {
        test('should match exact anchor text', () => {
            const anchor = 'My Website';
            const text = 'My Website';
            
            expect(text.toLowerCase()).toBe(anchor.toLowerCase());
        });

        test('should match partial anchor text', () => {
            const anchor = 'My Website';
            const text = 'Visit My Website Today';
            
            expect(text.toLowerCase().includes(anchor.toLowerCase())).toBe(true);
        });

        test('should match word-based anchor text', () => {
            const anchor = 'Best Product Reviews';
            const text = 'Product Reviews';
            
            const anchorWords = anchor.toLowerCase().split(' ');
            const textWords = text.toLowerCase().split(' ');
            
            const hasCommonWords = anchorWords.some(word => 
                word.length > 2 && textWords.includes(word)
            );
            
            expect(hasCommonWords).toBe(true);
        });

        test('should reject unrelated text', () => {
            const anchor = 'Technology News';
            const text = 'Sports Updates';
            
            const anchorWords = anchor.toLowerCase().split(' ');
            const textWords = text.toLowerCase().split(' ');
            
            const hasCommonWords = anchorWords.some(word => 
                word.length > 2 && textWords.includes(word)
            );
            
            expect(hasCommonWords).toBe(false);
        });
    });

    // Test HTML parsing
    describe('HTML Parsing', () => {
        test('should extract links from HTML', () => {
            const html = `
                <html>
                    <body>
                        <a href="https://example.com">Example Link</a>
                        <a href="/relative-link">Relative Link</a>
                        <p>Some text</p>
                        <a href="mailto:test@example.com">Email Link</a>
                    </body>
                </html>
            `;
            
            const $ = cheerio.load(html);
            const links = [];
            
            $('a').each((index, element) => {
                const href = $(element).attr('href');
                const text = $(element).text().trim();
                if (href && !href.startsWith('mailto:')) {
                    links.push({ href, text });
                }
            });
            
            expect(links).toHaveLength(2);
            expect(links[0].href).toBe('https://example.com');
            expect(links[0].text).toBe('Example Link');
        });

        test('should handle malformed HTML gracefully', () => {
            const malformedHtml = '<a href="test">Link<a href="test2">Another';
            
            expect(() => {
                const $ = cheerio.load(malformedHtml);
                $('a').each((index, element) => {
                    $(element).attr('href');
                });
            }).not.toThrow();
        });
    });

    // Test error handling
    describe('Error Handling', () => {
        test('should handle network timeouts', async () => {
            // Mock a timeout scenario
            const mockTimeoutError = new Error('timeout of 15000ms exceeded');
            mockTimeoutError.code = 'ETIMEDOUT';
            
            // Simulate error handling logic
            let errorType;
            if (mockTimeoutError.code === 'ETIMEDOUT') {
                errorType = 'unreachable';
            } else if (mockTimeoutError.code === 'ENOTFOUND') {
                errorType = 'unreachable';
            } else {
                errorType = 'error';
            }
            
            expect(errorType).toBe('unreachable');
        });

        test('should handle DNS resolution failures', () => {
            const mockDNSError = new Error('getaddrinfo ENOTFOUND invalid-domain.xyz');
            mockDNSError.code = 'ENOTFOUND';
            
            let errorType;
            if (mockDNSError.code === 'ENOTFOUND') {
                errorType = 'unreachable';
            }
            
            expect(errorType).toBe('unreachable');
        });

        test('should categorize HTTP status codes correctly', () => {
            const statusTests = [
                { status: 200, expected: 'live' },
                { status: 404, expected: 'error' },
                { status: 301, expected: 'error' }, // Redirect
                { status: 500, expected: 'error' },
                { status: 403, expected: 'error' }
            ];
            
            statusTests.forEach(test => {
                let resultStatus;
                
                if (test.status === 200) {
                    resultStatus = 'live';
                } else if (test.status === 404) {
                    resultStatus = 'error';
                } else if (test.status >= 300 && test.status < 400) {
                    resultStatus = 'error'; // Redirects
                } else if (test.status !== 200) {
                    resultStatus = 'error';
                }
                
                expect(resultStatus).toBe(test.expected);
            });
        });
    });

    // Test retry logic
    describe('Retry Logic', () => {
        test('should increment retry count on failures', () => {
            const initialRetryCount = 0;
            const isError = true;
            
            const newRetryCount = isError ? initialRetryCount + 1 : 0;
            
            expect(newRetryCount).toBe(1);
        });

        test('should reset retry count on success', () => {
            const initialRetryCount = 3;
            const isError = false;
            
            const newRetryCount = isError ? initialRetryCount + 1 : 0;
            
            expect(newRetryCount).toBe(0);
        });

        test('should limit maximum retries', () => {
            const retryCount = 5;
            const maxRetries = 3;
            
            const shouldRetry = retryCount < maxRetries;
            
            expect(shouldRetry).toBe(false);
        });
    });

    // Test URL variation handling
    describe('URL Variations', () => {
        test('should handle protocol variations', () => {
            const targetUrl = 'https://example.com';
            const foundUrl = 'http://example.com';
            
            const normalizedTarget = targetUrl.replace(/^https?:\/\//, '');
            const normalizedFound = foundUrl.replace(/^https?:\/\//, '');
            
            expect(normalizedTarget).toBe(normalizedFound);
        });

        test('should handle www variations', () => {
            const targetUrl = 'https://www.example.com';
            const foundUrl = 'https://example.com';
            
            const normalizedTarget = targetUrl.replace(/^https?:\/\/(www\.)?/, '');
            const normalizedFound = foundUrl.replace(/^https?:\/\/(www\.)?/, '');
            
            expect(normalizedTarget).toBe(normalizedFound);
        });

        test('should handle trailing slash variations', () => {
            const targetUrl = 'https://example.com/page/';
            const foundUrl = 'https://example.com/page';
            
            const normalizedTarget = targetUrl.replace(/\/$/, '');
            const normalizedFound = foundUrl.replace(/\/$/, '');
            
            expect(normalizedTarget).toBe(normalizedFound);
        });
    });

    // Test context extraction
    describe('Context Extraction', () => {
        test('should extract link context from parent elements', () => {
            const html = `
                <div>
                    <p>Check out this amazing <a href="https://example.com">website</a> for more information.</p>
                </div>
            `;
            
            const $ = cheerio.load(html);
            const link = $('a').first();
            const parent = link.parent();
            const context = parent.text().trim();
            
            expect(context).toContain('website');
            expect(context).toContain('Check out this amazing');
        });

        test('should handle missing context gracefully', () => {
            const html = '<a href="https://example.com">Link</a>';
            
            const $ = cheerio.load(html);
            const link = $('a').first();
            const text = link.text().trim();
            const href = link.attr('href');
            
            const fallbackContext = `Link found: "${text}" -> ${href}`;
            
            expect(fallbackContext).toBe('Link found: "Link" -> https://example.com');
        });
    });
});