const { Octokit } = require('@octokit/rest');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const ReportGenerator = require('./reportGenerator');

class GitHubIntegration {
    constructor(db, config = {}) {
        this.db = db;
        this.config = {
            token: process.env.GITHUB_TOKEN || config.token,
            owner: process.env.GITHUB_OWNER || config.owner,
            repo: process.env.GITHUB_REPO || config.repo,
            branch: process.env.GITHUB_BRANCH || config.branch || 'main',
            reportsPath: config.reportsPath || 'backlink-reports'
        };
        
        if (this.config.token && this.config.owner && this.config.repo) {
            this.octokit = new Octokit({
                auth: this.config.token
            });
            this.enabled = true;
        } else {
            this.enabled = false;
            console.log('GitHub integration not configured. Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables.');
        }
        
        this.reportGenerator = new ReportGenerator(db);
    }

    async uploadFile(filePath, githubPath, message) {
        if (!this.enabled) {
            throw new Error('GitHub integration not configured');
        }

        try {
            // Read file content
            const content = await fs.readFile(filePath);
            const contentBase64 = content.toString('base64');

            // Check if file exists
            let sha;
            try {
                const { data: existingFile } = await this.octokit.repos.getContent({
                    owner: this.config.owner,
                    repo: this.config.repo,
                    path: githubPath,
                    ref: this.config.branch
                });
                sha = existingFile.sha;
            } catch (error) {
                // File doesn't exist, which is fine
            }

            // Create or update file
            const response = await this.octokit.repos.createOrUpdateFileContents({
                owner: this.config.owner,
                repo: this.config.repo,
                path: githubPath,
                message: message,
                content: contentBase64,
                branch: this.config.branch,
                sha: sha
            });

            return response.data;
        } catch (error) {
            console.error('Error uploading file to GitHub:', error.message);
            throw error;
        }
    }

    async uploadReports() {
        if (!this.enabled) {
            console.log('GitHub integration not configured, skipping upload');
            return null;
        }

        console.log('Generating reports for GitHub upload...');
        
        try {
            // Generate reports
            const { excelPath, pdfPath } = await this.reportGenerator.generateAllReports();
            const timestamp = new Date().toISOString().split('T')[0];
            
            // Upload Excel report
            const excelFilename = path.basename(excelPath);
            const excelGithubPath = `${this.config.reportsPath}/${excelFilename}`;
            await this.uploadFile(excelPath, excelGithubPath, `Update backlinks report - ${timestamp}`);
            console.log(`Uploaded Excel report to GitHub: ${excelGithubPath}`);
            
            // Upload PDF/HTML report if it exists
            if (pdfPath) {
                const pdfFilename = path.basename(pdfPath);
                const pdfGithubPath = `${this.config.reportsPath}/${pdfFilename}`;
                await this.uploadFile(pdfPath, pdfGithubPath, `Update backlinks report - ${timestamp}`);
                console.log(`Uploaded PDF/HTML report to GitHub: ${pdfGithubPath}`);
            }
            
            // Create or update README in reports directory
            const readmeContent = `# Backlink Reports

This directory contains automated backlink reports generated daily.

## Latest Report
- Date: ${timestamp}
- Excel: [${excelFilename}](./${excelFilename})
- PDF/HTML: [${path.basename(pdfPath)}](./${path.basename(pdfPath)})

## Report Contents
- Summary statistics
- Detailed backlink status
- Error reports and issues
- Link verification results

Reports are automatically generated and uploaded every 24 hours.
`;
            
            const readmePath = path.join(path.dirname(excelPath), 'README.md');
            await fs.writeFile(readmePath, readmeContent);
            await this.uploadFile(readmePath, `${this.config.reportsPath}/README.md`, `Update README - ${timestamp}`);
            
            return {
                excel: excelGithubPath,
                pdf: pdfGithubPath,
                success: true
            };
        } catch (error) {
            console.error('Error uploading reports to GitHub:', error);
            throw error;
        }
    }

    // Schedule automatic uploads
    scheduleUploads(cronExpression = '0 2 * * *') { // Default: 2 AM daily
        if (!this.enabled) {
            console.log('GitHub integration not configured, skipping scheduled uploads');
            return;
        }

        console.log(`Scheduling GitHub uploads with cron expression: ${cronExpression}`);
        
        cron.schedule(cronExpression, async () => {
            console.log('Starting scheduled GitHub report upload...');
            try {
                await this.uploadReports();
                console.log('Scheduled GitHub upload completed successfully');
            } catch (error) {
                console.error('Scheduled GitHub upload failed:', error);
            }
        });
    }

    // Manual upload endpoint handler
    async handleManualUpload() {
        if (!this.enabled) {
            return {
                success: false,
                error: 'GitHub integration not configured. Please set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables.'
            };
        }

        try {
            const result = await this.uploadReports();
            return {
                success: true,
                message: 'Reports uploaded to GitHub successfully',
                files: result
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get configuration status
    getStatus() {
        return {
            enabled: this.enabled,
            configured: {
                token: !!this.config.token,
                owner: !!this.config.owner,
                repo: !!this.config.repo
            },
            settings: this.enabled ? {
                owner: this.config.owner,
                repo: this.config.repo,
                branch: this.config.branch,
                reportsPath: this.config.reportsPath
            } : null
        };
    }
}

module.exports = GitHubIntegration;