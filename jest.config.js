module.exports = {
    testEnvironment: 'node',
    testMatch: [
        '**/tests/**/*.test.js'
    ],
    collectCoverageFrom: [
        'server.js',
        'reportGenerator.js',
        'githubIntegration.js',
        '!node_modules/**',
        '!tests/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testTimeout: 30000,
    verbose: true
};