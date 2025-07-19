// Simple, robust backlink manager script
let currentPage = 1;
let filters = { status: '', link_found: '' };
let selectedRows = new Set();
let statusChart, successChart;

// Theme management
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

function updateThemeIcon(theme) {
    const icons = { 'dark': 'fa-moon', 'light': 'fa-sun', 'midnight': 'fa-star', 'ocean': 'fa-water' };
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) themeIcon.className = `fas ${icons[theme] || 'fa-moon'}`;
}

// Initialize theme
updateThemeIcon(savedTheme);

// Theme toggle functionality
document.addEventListener('DOMContentLoaded', function() {
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
});

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
    if (deleteButton) deleteButton.disabled = selectedCount === 0;
    
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
    if (selectedRows.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedRows.size} selected backlinks?`)) return;
    
    try {
        const response = await fetch('/api/backlinks/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: Array.from(selectedRows) })
        });
        
        const result = await response.json();
        
        if (result.success) {
            selectedRows.clear();
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
    
    // File upload
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('csvFile');
    const fileLabel = document.querySelector('.file-label span');
    
    if (fileInput && fileLabel) {
        fileInput.addEventListener('change', (e) => {
            const fileName = e.target.files[0]?.name || 'Choose CSV file or drag & drop';
            fileLabel.textContent = fileName;
        });
    }
    
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const messageDiv = document.getElementById('uploadMessage');
            const formData = new FormData();
            formData.append('csvFile', fileInput.files[0]);
            
            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    messageDiv.className = 'message success';
                    messageDiv.textContent = result.message;
                    fileInput.value = '';
                    fileLabel.textContent = 'Choose CSV file or drag & drop';
                    
                    // Reset everything
                    filters = { status: '', link_found: '' };
                    document.getElementById('statusFilter').value = '';
                    document.getElementById('linkFoundFilter').value = '';
                    currentPage = 1;
                    selectedRows.clear();
                    updateSelectionUI();
                    loadBacklinks(1);
                    loadStats();
                } else {
                    messageDiv.className = 'message error';
                    messageDiv.textContent = result.error || 'Upload failed';
                }
            } catch (error) {
                messageDiv.className = 'message error';
                messageDiv.textContent = 'Error uploading file';
            }
        });
    }
    
    // Action buttons
    const checkLinksBtn = document.getElementById('checkLinks');
    if (checkLinksBtn) {
        checkLinksBtn.addEventListener('click', async () => {
            const originalText = checkLinksBtn.innerHTML;
            checkLinksBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
            checkLinksBtn.disabled = true;
            
            try {
                const response = await fetch('/api/check-links', { method: 'POST' });
                const result = await response.json();
                
                if (result.success) {
                    alert(`Checked ${result.processed} links successfully!`);
                    loadBacklinks(currentPage);
                    loadStats();
                }
            } catch (error) {
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
    
    // Select all checkbox
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.row-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
                const id = parseInt(checkbox.dataset.id);
                if (e.target.checked) {
                    selectedRows.add(id);
                } else {
                    selectedRows.delete(id);
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