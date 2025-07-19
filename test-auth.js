#!/usr/bin/env node

const axios = require('axios');
const chalk = require('chalk');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const USERNAME = 'admin';
const PASSWORD = '3*jcx3EI@UR9';

console.log(chalk.blue('🔐 Testing Backlink Manager Authentication\n'));

async function testAuth() {
    try {
        console.log(chalk.yellow('1. Testing login endpoint...'));
        
        // Test login
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            username: USERNAME,
            password: PASSWORD
        });
        
        if (loginResponse.data.success) {
            console.log(chalk.green('✅ Login successful'));
            console.log(`   Token: ${loginResponse.data.token.substring(0, 20)}...`);
            
            const token = loginResponse.data.token;
            
            // Test protected endpoint
            console.log(chalk.yellow('\n2. Testing protected endpoint...'));
            
            const statsResponse = await axios.get(`${BASE_URL}/api/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log(chalk.green('✅ Protected endpoint accessible'));
            console.log(`   Stats: ${JSON.stringify(statsResponse.data)}`);
            
            // Test logout
            console.log(chalk.yellow('\n3. Testing logout...'));
            
            await axios.post(`${BASE_URL}/api/auth/logout`, {}, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log(chalk.green('✅ Logout successful'));
            
            // Test token verification after logout
            console.log(chalk.yellow('\n4. Testing token after logout...'));
            
            try {
                await axios.get(`${BASE_URL}/api/stats`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                console.log(chalk.red('❌ Token should be invalid after logout'));
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    console.log(chalk.green('✅ Token properly invalidated after logout'));
                } else {
                    throw error;
                }
            }
            
        } else {
            console.log(chalk.red('❌ Login failed'));
        }
        
    } catch (error) {
        console.log(chalk.red('❌ Test failed:'), error.message);
        if (error.response) {
            console.log(chalk.red('   Status:'), error.response.status);
            console.log(chalk.red('   Data:'), error.response.data);
        }
    }
}

async function testUnauthorizedAccess() {
    console.log(chalk.yellow('\n5. Testing unauthorized access...'));
    
    try {
        await axios.get(`${BASE_URL}/api/stats`);
        console.log(chalk.red('❌ Should not be able to access without token'));
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log(chalk.green('✅ Unauthorized access properly blocked'));
        } else {
            console.log(chalk.red('❌ Unexpected error:'), error.message);
        }
    }
}

async function runTests() {
    console.log(chalk.blue(`Testing server at: ${BASE_URL}\n`));
    
    // Wait a moment for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testAuth();
    await testUnauthorizedAccess();
    
    console.log(chalk.blue('\n🎉 Authentication testing complete!\n'));
}

// Check if server is running
async function checkServer() {
    try {
        await axios.get(`${BASE_URL}/login`);
        return true;
    } catch (error) {
        return false;
    }
}

async function main() {
    const serverRunning = await checkServer();
    
    if (!serverRunning) {
        console.log(chalk.red('❌ Server not running. Please start server first:'));
        console.log(chalk.white('   npm start\n'));
        process.exit(1);
    }
    
    await runTests();
}

if (require.main === module) {
    main();
}

module.exports = { testAuth, testUnauthorizedAccess };