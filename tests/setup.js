// Jest setup file
const path = require('path');

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001'; // Use different port for testing

// Global test timeout
jest.setTimeout(30000);

// Console log suppression for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
    // Suppress console.log during tests unless explicitly needed
    console.log = jest.fn();
    console.error = jest.fn();
});

afterAll(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
});

// Global test helpers
global.testHelpers = {
    // Helper to create test backlink data
    createTestBacklink: (overrides = {}) => ({
        id: 1,
        live_link: 'https://example.com/test',
        target_url: 'https://mysite.com',
        target_anchor: 'My Site',
        status: 'pending',
        link_found: 0,
        link_context: null,
        http_status: null,
        last_checked: null,
        created_at: new Date().toISOString(),
        retry_count: 0,
        last_error: null,
        anchor_match_type: null,
        ...overrides
    }),

    // Helper to create test statistics
    createTestStats: (overrides = {}) => ({
        total: 100,
        live_count: 80,
        error_count: 15,
        unreachable_count: 5,
        links_found: 75,
        pending_count: 0,
        not_found_404: 10,
        redirects: 3,
        exact_matches: 50,
        partial_matches: 25,
        ...overrides
    }),

    // Helper to create mock responses
    createMockResponse: (data, status = 200) => ({
        status,
        data,
        headers: { 'content-type': 'application/json' }
    }),

    // Helper to wait for async operations
    waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};