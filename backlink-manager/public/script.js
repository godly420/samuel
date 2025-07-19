// Simple, robust backlink manager script
let currentPage = 1;
let filters = { status: '', link_found: '' };
let selectedRows = new Set();
let allSelectedRows = new Set(); // Track selections across all pages
let totalBacklinks = 0; // Track total count for all pages selection
let statusChart, successChart;

// Theme management
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// Show report download modal
function showReportModal(files) {
    // Remove existing modal if any
    const existingModal = document.getElementById('reportModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'reportModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="background: #1f1f1f; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%; border: 1px solid #2a2a2a;">
            <h2 style="margin-top: 0; color: #818cf8;">Reports Generated Successfully!</h2>
            <p style="color: #a0a0a0; margin-bottom: 20px;">Your reports are ready for download:</p>
            <div style="display: flex; gap: 15px; flex-direction: column;">
                <a href="/api/reports/excel/${files.excel}" download 
                   style="display: flex; align-items: center; gap: 10px; padding: 15px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; transition: all 0.3s;">
                    <i class="fas fa-file-excel" style="font-size: 24px;"></i>
                    <div>
                        <div style="font-weight: bold;">Excel Report</div>
                        <div style="font-size: 0.9em; opacity: 0.8;">Detailed spreadsheet with multiple sheets</div>
                    </div>
                </a>
                <a href="/api/reports/pdf/${files.pdf}" download 
                   style="display: flex; align-items: center; gap: 10px; padding: 15px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; transition: all 0.3s;">
                    <i class="fas fa-file-pdf" style="font-size: 24px;"></i>
                    <div>
                        <div style="font-weight: bold;">PDF Report</div>
                        <div style="font-size: 0.9em; opacity: 0.8;">Printable summary report</div>
                    </div>
                </a>
            </div>
            <button onclick="document.getElementById('reportModal').remove()" 
                    style="margin-top: 20px; padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
                Close
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Show GitHub upload success modal
function showGitHubSuccessModal(data) {
    // Remove existing modal if any
    const existingModal = document.getElementById('githubModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'githubModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="background: #1f1f1f; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%; border: 1px solid #2a2a2a;">
            <h2 style="margin-top: 0; color: #10b981;">
                <i class="fab fa-github" style="margin-right: 10px;"></i>
                Reports Uploaded to GitHub!
            </h2>
            <p style="color: #a0a0a0; margin-bottom: 20px;">Your backlink reports have been successfully uploaded to your GitHub repository.</p>
            <div style="background: #0f1419; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #10b981;">
                <div style="color: #10b981; font-weight: bold; margin-bottom: 10px;">Files uploaded:</div>
                <div style="color: #a0a0a0; font-family: monospace; font-size: 0.9em;">
                    ${data.files ? data.files.excel || 'Excel report' : 'Excel report'}<br>
                    ${data.files ? data.files.pdf || 'PDF/HTML report' : 'PDF/HTML report'}<br>
                    README.md
                </div>
            </div>
            <div style="color: #6b7280; font-size: 0.9em; margin: 15px 0;">
                <i class="fas fa-info-circle"></i> 
                Reports are automatically uploaded daily at 2 AM
            </div>
            <button onclick="document.getElementById('githubModal').remove()" 
                    style="margin-top: 20px; padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
                Close
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function updateThemeIcon(theme) {
    const icons = { 'dark': 'fa-moon', 'light': 'fa-sun', 'midnight': 'fa-star', 'ocean': 'fa-water' };
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) themeIcon.className = `fas ${icons[theme] || 'fa-moon'}`;
}

// Initialize theme
updateThemeIcon(savedTheme);

// Theme toggle functionality will be added to main DOMContentLoaded

// Load statistics
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        // Update stat cards
        document.getElementById('totalLinks').textContent = stats.total || 0;
        document.getElementById('liveLinks').textContent = stats.live_count || 0;
        document.getElementById('linksFound').textContent = stats.links_found || 0;
        document.getElementById('errorLinks').textContent = stats.error_count || 0;
        document.getElementById('pendingLinks').textContent = stats.pending_count || 0;
        
        // Update charts
        updateCharts(stats);
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Update charts
function updateCharts(stats) {
    if (!stats || typeof Chart === 'undefined') return;
    
    const theme = document.documentElement.getAttribute('data-theme');
    const style = getComputedStyle(document.documentElement);
    const textColor = style.getPropertyValue('--text-primary').trim();
    const successColor = style.getPropertyValue('--success').trim();
    const errorColor = style.getPropertyValue('--error').trim();
    const warningColor = style.getPropertyValue('--warning').trim();
    const accentColor = style.getPropertyValue('--accent').trim();
    
    // Status Distribution Chart
    const statusCtx = document.getElementById('statusChart');
    if (statusCtx) {
        if (statusChart) statusChart.destroy();
        
        statusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Live', 'Error', 'Unreachable', 'Pending'],
                datasets: [{
                    data: [
                        stats.live_count || 0,
                        stats.error_count || 0,
                        stats.unreachable_count || 0,
                        stats.pending_count || 0
                    ],
                    backgroundColor: [successColor, errorColor, warningColor, '#6b7280'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: textColor, padding: 20, usePointStyle: true }
                    }
                }
            }
        });
    }
    
    // Success Rate Chart
    const successCtx = document.getElementById('successChart');
    if (successCtx) {
        if (successChart) successChart.destroy();
        
        const totalChecked = (stats.live_count || 0) + (stats.error_count || 0) + (stats.unreachable_count || 0);
        const successRate = totalChecked > 0 ? ((stats.links_found || 0) / totalChecked * 100) : 0;
        const liveRate = totalChecked > 0 ? ((stats.live_count || 0) / totalChecked * 100) : 0;
        
        successChart = new Chart(successCtx, {
            type: 'bar',
            data: {
                labels: ['Links Found Rate', 'Live Links Rate'],
                datasets: [{
                    label: 'Success Rate (%)',
                    data: [successRate.toFixed(1), liveRate.toFixed(1)],
                    backgroundColor: [successColor, accentColor],
                    borderWidth: 0,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: textColor,
                            callback: function(value) { return value + '%'; }
                        }
                    },
                    x: { ticks: { color: textColor } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
}

// Load backlinks with pagination
async function loadBacklinks(page = 1) {
    try {
        const params = new URLSearchParams({
            page: page,
            limit: 50,
            ...filters
        });
        
        console.log(`Loading page ${page} with filters:`, filters);
        
        const response = await fetch(`/api/backlinks?${params}`);
        const data = await response.json();
        
        console.log(`Response: ${data.backlinks.length} items, total: ${data.total}, pages: ${data.totalPages}`);
        
        displayBacklinks(data.backlinks);
        displayPagination(data.page, data.totalPages);
        currentPage = page;
        
        selectedRows.clear();
        updateSelectionUI();
    } catch (error) {
        console.error('Error loading backlinks:', error);
    }
}

// Display backlinks in table
function displayBacklinks(backlinks) {
    const tbody = document.getElementById('backlinksBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    backlinks.forEach(backlink => {
        const row = document.createElement('tr');
        
        // Handle boolean values properly
        const linkFound = (backlink.link_found === 1 || backlink.link_found === true || backlink.link_found === "1");
        
        row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" data-id="${backlink.id}"></td>
            <td><a href="${escapeHtml(backlink.live_link)}" target="_blank">${truncateUrl(backlink.live_link)}</a></td>
            <td><a href="${escapeHtml(backlink.target_url)}" target="_blank">${truncateUrl(backlink.target_url)}</a></td>
            <td>${escapeHtml(backlink.target_anchor)}</td>
            <td><span class="status-badge status-${backlink.status}">${backlink.status}</span></td>
            <td><span class="link-found-${linkFound ? 'yes' : 'no'}">${linkFound ? 'Yes' : 'No'}</span></td>
            <td>${backlink.http_status || 'N/A'}</td>
            <td class="context" title="${escapeHtml(backlink.link_context || '')}">${truncateText(backlink.link_context, 50) || 'N/A'}</td>
            <td>${formatDate(backlink.last_checked)}</td>
            <td>${formatDate(backlink.created_at)}</td>
            <td><button class="delete-btn" onclick="deleteBacklink(${backlink.id})"><i class="fas fa-trash"></i></button></td>
        `;
        tbody.appendChild(row);
    });
    
    // Add checkbox event listeners
    document.querySelectorAll('.row-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const id = parseInt(e.target.dataset.id);
            if (e.target.checked) {
                selectedRows.add(id);
            } else {
                selectedRows.delete(id);
            }
            updateSelectionUI();
        });
    });
}

// Helper functions
function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function truncateUrl(url) {
    return url && url.length > 40 ? url.substring(0, 40) + '...' : url || '';
}

function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function formatDate(dateString) {
    if (!dateString) return 'Never';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } catch (error) {
        return 'Invalid Date';
    }
}

// Display pagination
function displayPagination(currentPage, totalPages) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    pagination.innerHTML = '';
    console.log(`Displaying pagination: page ${currentPage} of ${totalPages}`);
    
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => loadBacklinks(currentPage - 1);
    pagination.appendChild(prevBtn);
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'active' : '';
        pageBtn.onclick = () => loadBacklinks(i);
        pagination.appendChild(pageBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => loadBacklinks(currentPage + 1);
    pagination.appendChild(nextBtn);
}

// Selection management
function updateSelectionUI() {
    const selectedCount = selectedRows.size;
    const countElement = document.getElementById('selectedCount');
    const deleteButton = document.getElementById('deleteSelected');
    const selectAllCheckbox = document.getElementById('selectAll');
    
    if (countElement) countElement.textContent = `${selectedCount} selected`;
    if (deleteButton) {
        const totalSelectedCount = allSelectedRows.size;
        deleteButton.disabled = totalSelectedCount === 0;
        if (totalSelectedCount > selectedCount) {
            deleteButton.innerHTML = `<i class="fas fa-trash"></i> Delete Selected (${totalSelectedCount})`;
        } else {
            deleteButton.innerHTML = `<i class="fas fa-trash"></i> Delete Selected`;
        }
    }
    
    if (selectAllCheckbox) {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        if (selectedCount === 0) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = false;
        } else if (selectedCount === checkboxes.length) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = true;
        } else {
            selectAllCheckbox.indeterminate = true;
        }
    }
}

// Delete functions
async function deleteBacklink(id) {
    if (!confirm('Are you sure you want to delete this backlink?')) return;
    
    try {
        await fetch(`/api/backlinks/${id}`, { method: 'DELETE' });
        loadBacklinks(currentPage);
        loadStats();
        selectedRows.delete(id);
        updateSelectionUI();
    } catch (error) {
        console.error('Error deleting backlink:', error);
    }
}

async function bulkDelete() {
    // Use allSelectedRows if it has items, otherwise fall back to selectedRows
    const rowsToDelete = allSelectedRows.size > 0 ? allSelectedRows : selectedRows;
    
    if (rowsToDelete.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${rowsToDelete.size} selected backlinks?`)) return;
    
    try {
        const response = await fetch('/api/backlinks/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: Array.from(rowsToDelete) })
        });
        
        const result = await response.json();
        
        if (result.success) {
            selectedRows.clear();
            allSelectedRows.clear();
            updateSelectionUI();
            loadBacklinks(currentPage);
            loadStats();
            alert(`Successfully deleted ${result.deleted} backlinks`);
        } else {
            alert('Error deleting backlinks');
        }
    } catch (error) {
        console.error('Error bulk deleting:', error);
        alert('Error deleting backlinks');
    }
}

// Initialize when DOM is loaded  
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing backlink manager...');
    
    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    const themeDropdown = document.getElementById('themeDropdown');

    if (themeToggle && themeDropdown) {
        themeToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            themeDropdown.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            themeDropdown.classList.remove('show');
        });

        themeDropdown.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const theme = e.currentTarget.getAttribute('data-theme');
                document.documentElement.setAttribute('data-theme', theme);
                localStorage.setItem('theme', theme);
                updateThemeIcon(theme);
                themeDropdown.classList.remove('show');
                if (statusChart) loadStats(); // Refresh charts
            });
        });
    }
    
    // Action buttons
    const checkLinksBtn = document.getElementById('checkLinks');
    if (checkLinksBtn) {
        checkLinksBtn.addEventListener('click', async () => {
            const originalText = checkLinksBtn.innerHTML;
            checkLinksBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking All Links...';
            checkLinksBtn.disabled = true;
            
            try {
                const response = await fetch('/api/check-links', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ forceAll: true })
                });
                const result = await response.json();
                
                if (result.success) {
                    alert(`Checked ${result.processed} links successfully! ${result.errors || 0} errors found.`);
                    loadBacklinks(currentPage);
                    loadStats();
                } else {
                    alert('Error checking links: ' + (result.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error checking links:', error);
                alert('Error checking links');
            } finally {
                checkLinksBtn.innerHTML = originalText;
                checkLinksBtn.disabled = false;
            }
        });
    }
    
    const exportBtn = document.getElementById('exportReport');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            window.location.href = '/api/export';
        });
    }
    
    const generateReportsBtn = document.getElementById('generateReports');
    if (generateReportsBtn) {
        generateReportsBtn.addEventListener('click', async () => {
            generateReportsBtn.disabled = true;
            generateReportsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Reports...';
            
            try {
                const response = await fetch('/api/reports/generate');
                const data = await response.json();
                
                if (data.success) {
                    showReportModal(data.files);
                } else {
                    alert('Failed to generate reports');
                }
            } catch (error) {
                console.error('Error generating reports:', error);
                alert('Error generating reports');
            } finally {
                generateReportsBtn.disabled = false;
                generateReportsBtn.innerHTML = '<i class="fas fa-file-alt"></i> Generate Reports';
            }
        });
    }
    
    const uploadGitHubBtn = document.getElementById('uploadGitHub');
    if (uploadGitHubBtn) {
        uploadGitHubBtn.addEventListener('click', async () => {
            uploadGitHubBtn.disabled = true;
            uploadGitHubBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading to GitHub...';
            
            try {
                const response = await fetch('/api/github/upload', { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    showGitHubSuccessModal(data);
                } else {
                    alert(data.error || 'Failed to upload to GitHub');
                }
            } catch (error) {
                console.error('Error uploading to GitHub:', error);
                alert('Error uploading to GitHub');
            } finally {
                uploadGitHubBtn.disabled = false;
                uploadGitHubBtn.innerHTML = '<i class="fab fa-github"></i> Upload to GitHub';
            }
        });
    }
    
    const refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadBacklinks(currentPage);
            loadStats();
        });
    }
    
    const deleteSelectedBtn = document.getElementById('deleteSelected');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', bulkDelete);
    }
    
    // CSV Upload functionality
    const uploadCSVBtn = document.getElementById('uploadCSV');
    const csvFileInput = document.getElementById('csvFileInput');
    
    console.log('Upload CSV button:', uploadCSVBtn);
    console.log('CSV file input:', csvFileInput);
    
    if (uploadCSVBtn && csvFileInput) {
        console.log('Both upload elements found, adding event listeners');
        uploadCSVBtn.addEventListener('click', (e) => {
            console.log('Upload CSV button clicked');
            csvFileInput.click();
        });
        
        csvFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (!file.name.toLowerCase().endsWith('.csv')) {
                alert('Please select a CSV file');
                return;
            }
            
            const formData = new FormData();
            formData.append('csvFile', file);
            
            uploadCSVBtn.disabled = true;
            uploadCSVBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
            
            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert(`Successfully uploaded ${data.imported} backlinks!`);
                    loadBacklinks(1);
                    loadStats();
                } else {
                    alert(data.error || 'Failed to upload CSV');
                }
            } catch (error) {
                console.error('Error uploading CSV:', error);
                alert('Error uploading CSV file');
            } finally {
                uploadCSVBtn.disabled = false;
                uploadCSVBtn.innerHTML = '<i class="fas fa-upload"></i> Upload CSV';
                csvFileInput.value = ''; // Clear the input
            }
        });
    }
    
    // Download template
    const downloadTemplateBtn = document.getElementById('downloadTemplate');
    if (downloadTemplateBtn) {
        console.log('Download template button found, adding event listener');
        downloadTemplateBtn.addEventListener('click', (e) => {
            console.log('Download template button clicked');
            e.preventDefault();
            window.location.href = '/api/template';
        });
    } else {
        console.log('Download template button NOT found');
    }
    
    // Delete All functionality
    const deleteAllBtn = document.getElementById('deleteAll');
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to delete ALL backlinks? This action cannot be undone.')) {
                return;
            }
            
            deleteAllBtn.disabled = true;
            deleteAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
            
            try {
                const response = await fetch('/api/backlinks/delete-all', {
                    method: 'DELETE'
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert(`Successfully deleted ${data.deleted} backlinks`);
                    selectedRows.clear();
                    allSelectedRows.clear();
                    loadBacklinks(1);
                    loadStats();
                } else {
                    alert('Failed to delete backlinks');
                }
            } catch (error) {
                console.error('Error deleting all backlinks:', error);
                alert('Error deleting backlinks');
            } finally {
                deleteAllBtn.disabled = false;
                deleteAllBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete All';
            }
        });
    }
    
    // Enhanced selection functionality
    const selectAllDropdown = document.querySelector('.dropdown-content');
    const dropdownBtn = document.querySelector('.dropdown-btn');
    
    if (dropdownBtn && selectAllDropdown) {
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectAllDropdown.style.display = selectAllDropdown.style.display === 'block' ? 'none' : 'block';
        });
        
        document.addEventListener('click', () => {
            selectAllDropdown.style.display = 'none';
        });
        
        // Select All Pages
        document.getElementById('selectAllPages').addEventListener('click', async () => {
            try {
                const response = await fetch('/api/backlinks/ids');
                const data = await response.json();
                
                if (data.success) {
                    allSelectedRows.clear();
                    data.ids.forEach(id => allSelectedRows.add(id));
                    
                    // Update current page checkboxes
                    const checkboxes = document.querySelectorAll('.row-checkbox');
                    checkboxes.forEach(checkbox => {
                        const id = parseInt(checkbox.dataset.id);
                        checkbox.checked = allSelectedRows.has(id);
                        if (checkbox.checked) {
                            selectedRows.add(id);
                        }
                    });
                    
                    updateSelectionUI();
                    alert(`Selected all ${data.ids.length} backlinks across all pages`);
                }
            } catch (error) {
                console.error('Error selecting all pages:', error);
                alert('Error selecting all pages');
            }
            selectAllDropdown.style.display = 'none';
        });
        
        // Select Current Page
        document.getElementById('selectCurrentPage').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.row-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
                const id = parseInt(checkbox.dataset.id);
                selectedRows.add(id);
                allSelectedRows.add(id);
            });
            updateSelectionUI();
            selectAllDropdown.style.display = 'none';
        });
        
        // Select None
        document.getElementById('selectNone').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.row-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
                const id = parseInt(checkbox.dataset.id);
                selectedRows.delete(id);
                allSelectedRows.delete(id);
            });
            document.getElementById('selectAll').checked = false;
            updateSelectionUI();
            selectAllDropdown.style.display = 'none';
        });
    }
    
    // Update the original select all checkbox to work with current page only
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.row-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
                const id = parseInt(checkbox.dataset.id);
                if (e.target.checked) {
                    selectedRows.add(id);
                    allSelectedRows.add(id);
                } else {
                    selectedRows.delete(id);
                    allSelectedRows.delete(id);
                }
            });
            updateSelectionUI();
        });
    }
    
    // Filters
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            filters.status = e.target.value;
            selectedRows.clear();
            updateSelectionUI();
            loadBacklinks(1);
        });
    }
    
    const linkFoundFilter = document.getElementById('linkFoundFilter');
    if (linkFoundFilter) {
        linkFoundFilter.addEventListener('change', (e) => {
            filters.link_found = e.target.value;
            selectedRows.clear();
            updateSelectionUI();
            loadBacklinks(1);
        });
    }
    
    // Initial load
    console.log('Loading initial data...');
    loadStats();
    loadBacklinks(1);
});

// Make deleteBacklink function global for onclick handlers
window.deleteBacklink = deleteBacklink;