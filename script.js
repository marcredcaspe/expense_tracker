// Expense Tracker Application
class ExpenseTracker {
    constructor() {
        this.currentUser = null;
        this.expenses = [];
        this.categories = [
            { id: 'food', name: 'Food & Dining', icon: 'fas fa-utensils' },
            { id: 'transportation', name: 'Transportation', icon: 'fas fa-car' },
            { id: 'shopping', name: 'Shopping', icon: 'fas fa-shopping-bag' },
            { id: 'entertainment', name: 'Entertainment', icon: 'fas fa-film' },
            { id: 'bills', name: 'Bills & Utilities', icon: 'fas fa-file-invoice' },
            { id: 'healthcare', name: 'Healthcare', icon: 'fas fa-heartbeat' },
            { id: 'education', name: 'Education', icon: 'fas fa-graduation-cap' },
            { id: 'travel', name: 'Travel', icon: 'fas fa-plane' },
            { id: 'other', name: 'Other', icon: 'fas fa-ellipsis-h' }
        ];
        
        this.charts = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserData();
        this.setDefaultDate();
        this.showAuthSection();
    }

    setupEventListeners() {
        // Authentication
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('show-register').addEventListener('click', (e) => this.toggleAuthForms(e));
        document.getElementById('show-login').addEventListener('click', (e) => this.toggleAuthForms(e));
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchSection(e.target.dataset.section));
        });

        // Expense Management
        document.getElementById('add-expense-form').addEventListener('submit', (e) => this.addExpense(e));
        document.getElementById('edit-expense-form').addEventListener('submit', (e) => this.updateExpense(e));

        // Filters and Search
        document.getElementById('search-expenses').addEventListener('input', (e) => this.filterExpenses());
        document.getElementById('category-filter').addEventListener('change', () => this.filterExpenses());
        document.getElementById('date-filter').addEventListener('change', () => this.filterExpenses());
        document.getElementById('dashboard-period').addEventListener('change', () => this.updateDashboard());
        document.getElementById('report-period').addEventListener('change', () => this.updateReports());

        // Modal
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });
        document.getElementById('edit-modal').addEventListener('click', (e) => {
            if (e.target.id === 'edit-modal') this.closeModal();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    }

    // Authentication Methods
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        this.showLoading(true);
        
        try {
            const hashedPassword = await this.hashPassword(password);
            const userData = this.getUserData(username);
            
            if (userData && userData.password === hashedPassword) {
                this.currentUser = { username, ...userData };
                this.expenses = userData.expenses || [];
                this.showAuthSection(false);
                this.showToast('Login successful!', 'success');
                this.updateDashboard();
                this.populateExpensesList();
                this.populateCategoryFilter();
            } else {
                this.showToast('Invalid username or password', 'error');
            }
        } catch (error) {
            this.showToast('Login failed. Please try again.', 'error');
            console.error('Login error:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;

        // Validation
        if (!username || !email || !password || !confirmPassword) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            return;
        }

        if (this.getUserData(username)) {
            this.showToast('Username already exists', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const hashedPassword = await this.hashPassword(password);
            const userData = {
                username,
                email,
                password: hashedPassword,
                expenses: [],
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };

            this.saveUserData(username, userData);
            this.showToast('Account created successfully! Please login.', 'success');
            this.toggleAuthForms({ preventDefault: () => {} });
        } catch (error) {
            this.showToast('Registration failed. Please try again.', 'error');
            console.error('Registration error:', error);
        } finally {
            this.showLoading(false);
        }
    }

    toggleAuthForms(e) {
        e.preventDefault();
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        loginForm.classList.toggle('hidden');
        registerForm.classList.toggle('hidden');
    }

    logout() {
        this.currentUser = null;
        this.expenses = [];
        this.showAuthSection(true);
        this.clearForms();
        this.showToast('Logged out successfully', 'success');
    }

    // Data Management
    getUserData(username) {
        const data = localStorage.getItem(`user_${username}`);
        return data ? JSON.parse(data) : null;
    }

    saveUserData(username, userData) {
        userData.lastLogin = new Date().toISOString();
        localStorage.setItem(`user_${username}`, JSON.stringify(userData));
    }

    loadUserData() {
        // Load any existing user data if needed
    }

    // Expense Management
    addExpense(e) {
        e.preventDefault();
        
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const category = document.getElementById('expense-category').value;
        const date = document.getElementById('expense-date').value;
        const time = document.getElementById('expense-time').value;
        const notes = document.getElementById('expense-notes').value.trim();

        // Validation
        if (!amount || amount <= 0) {
            this.showToast('Please enter a valid amount', 'error');
            return;
        }

        if (!category) {
            this.showToast('Please select a category', 'error');
            return;
        }

        if (!date) {
            this.showToast('Please select a date', 'error');
            return;
        }

        const expense = {
            id: this.generateId(),
            amount: amount,
            category: category,
            date: date,
            time: time || '00:00',
            notes: notes,
            createdAt: new Date().toISOString(),
            hash: this.generateHash(amount, category, date, time, notes)
        };

        this.expenses.push(expense);
        this.saveUserExpenses();
        this.updateDashboard();
        this.populateExpensesList();
        this.clearAddExpenseForm();
        this.showToast('Expense added successfully!', 'success');
    }

    updateExpense(e) {
        e.preventDefault();
        
        const id = document.getElementById('edit-expense-id').value;
        const amount = parseFloat(document.getElementById('edit-expense-amount').value);
        const category = document.getElementById('edit-expense-category').value;
        const date = document.getElementById('edit-expense-date').value;
        const time = document.getElementById('edit-expense-time').value;
        const notes = document.getElementById('edit-expense-notes').value.trim();

        // Validation
        if (!amount || amount <= 0) {
            this.showToast('Please enter a valid amount', 'error');
            return;
        }

        if (!category) {
            this.showToast('Please select a category', 'error');
            return;
        }

        if (!date) {
            this.showToast('Please select a date', 'error');
            return;
        }

        const expenseIndex = this.expenses.findIndex(exp => exp.id === id);
        if (expenseIndex === -1) {
            this.showToast('Expense not found', 'error');
            return;
        }

        // Create audit log entry
        const originalExpense = { ...this.expenses[expenseIndex] };
        
        this.expenses[expenseIndex] = {
            ...this.expenses[expenseIndex],
            amount: amount,
            category: category,
            date: date,
            time: time || '00:00',
            notes: notes,
            updatedAt: new Date().toISOString(),
            hash: this.generateHash(amount, category, date, time, notes),
            auditLog: {
                original: originalExpense,
                modified: new Date().toISOString(),
                reason: 'User edit'
            }
        };

        this.saveUserExpenses();
        this.updateDashboard();
        this.populateExpensesList();
        this.closeModal();
        this.showToast('Expense updated successfully!', 'success');
    }

    deleteExpense(id) {
        if (!confirm('Are you sure you want to delete this expense?')) {
            return;
        }

        const expenseIndex = this.expenses.findIndex(exp => exp.id === id);
        if (expenseIndex === -1) {
            this.showToast('Expense not found', 'error');
            return;
        }

        // Create audit log entry before deletion
        const deletedExpense = { ...this.expenses[expenseIndex] };
        deletedExpense.deletedAt = new Date().toISOString();
        deletedExpense.deletionReason = 'User deletion';
        
        // Store in audit log
        this.saveAuditLog(deletedExpense);

        this.expenses.splice(expenseIndex, 1);
        this.saveUserExpenses();
        this.updateDashboard();
        this.populateExpensesList();
        this.showToast('Expense deleted successfully!', 'success');
    }

    editExpense(id) {
        const expense = this.expenses.find(exp => exp.id === id);
        if (!expense) {
            this.showToast('Expense not found', 'error');
            return;
        }

        document.getElementById('edit-expense-id').value = expense.id;
        document.getElementById('edit-expense-amount').value = expense.amount;
        document.getElementById('edit-expense-category').value = expense.category;
        document.getElementById('edit-expense-date').value = expense.date;
        document.getElementById('edit-expense-time').value = expense.time;
        document.getElementById('edit-expense-notes').value = expense.notes || '';

        this.showModal();
    }

    // Data Validation and Security
    generateHash(amount, category, date, time, notes) {
        const data = `${amount}-${category}-${date}-${time}-${notes}`;
        return btoa(data).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    validateExpenseIntegrity(expense) {
        const expectedHash = this.generateHash(
            expense.amount, 
            expense.category, 
            expense.date, 
            expense.time, 
            expense.notes
        );
        return expense.hash === expectedHash;
    }

    saveAuditLog(expense) {
        const auditLogs = JSON.parse(localStorage.getItem(`audit_${this.currentUser.username}`) || '[]');
        auditLogs.push(expense);
        localStorage.setItem(`audit_${this.currentUser.username}`, JSON.stringify(auditLogs));
    }

    // UI Management
    showAuthSection(show = true) {
        const authSection = document.getElementById('auth-section');
        const appSection = document.getElementById('app-section');
        
        if (show) {
            authSection.classList.remove('hidden');
            appSection.classList.add('hidden');
        } else {
            authSection.classList.add('hidden');
            appSection.classList.remove('hidden');
            document.getElementById('current-user').textContent = this.currentUser.username;
        }
    }

    switchSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionName).classList.add('active');

        // Update content based on section
        switch (sectionName) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'expenses':
                this.populateExpensesList();
                break;
            case 'reports':
                this.updateReports();
                break;
        }
    }

    showModal() {
        document.getElementById('edit-modal').classList.add('show');
    }

    closeModal() {
        document.getElementById('edit-modal').classList.remove('show');
    }

    showLoading(show = true) {
        const loading = document.getElementById('loading');
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const icon = toast.querySelector('.toast-icon');
        const messageEl = toast.querySelector('.toast-message');

        // Set icon based on type
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle'
        };

        icon.className = `toast-icon ${icons[type] || icons.success}`;
        messageEl.textContent = message;

        // Set toast class
        toast.className = `toast ${type}`;
        toast.classList.add('show');

        // Auto hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Data Persistence
    saveUserExpenses() {
        if (this.currentUser) {
            const userData = this.getUserData(this.currentUser.username);
            userData.expenses = this.expenses;
            this.saveUserData(this.currentUser.username, userData);
        }
    }

    // Dashboard Updates
    updateDashboard() {
        const period = document.getElementById('dashboard-period').value;
        const filteredExpenses = this.getFilteredExpenses(period);
        
        this.updateSummaryCards(filteredExpenses);
        this.updateCharts(filteredExpenses);
        this.updateRecentExpenses(filteredExpenses);
    }

    getFilteredExpenses(period) {
        const now = new Date();
        let startDate;

        switch (period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                return this.expenses;
        }

        return this.expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= startDate;
        });
    }

    updateSummaryCards(expenses) {
        const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const totalTransactions = expenses.length;
        const categories = new Set(expenses.map(exp => exp.category));
        const days = this.getDaysInPeriod(document.getElementById('dashboard-period').value);
        const dailyAverage = days > 0 ? totalSpent / days : 0;

        document.getElementById('total-spent').textContent = `₱${totalSpent.toFixed(2)}`;
        document.getElementById('total-transactions').textContent = totalTransactions;
        document.getElementById('total-categories').textContent = categories.size;
        document.getElementById('daily-average').textContent = `₱${dailyAverage.toFixed(2)}`;
    }

    getDaysInPeriod(period) {
        const now = new Date();
        switch (period) {
            case 'today': return 1;
            case 'week': return 7;
            case 'month': return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            case 'year': return 365;
            default: return 1;
        }
    }

    updateCharts(expenses) {
        this.updateCategoryChart(expenses);
        this.updateTrendChart(expenses);
    }

    updateCategoryChart(expenses) {
        const ctx = document.getElementById('category-chart').getContext('2d');
        
        // Destroy existing chart
        if (this.charts.category) {
            this.charts.category.destroy();
        }

        const categoryData = this.getCategoryData(expenses);
        
        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    data: categoryData.amounts,
                    backgroundColor: [
                        '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
                        '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#6b7280'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    updateTrendChart(expenses) {
        const ctx = document.getElementById('trend-chart').getContext('2d');
        
        // Destroy existing chart
        if (this.charts.trend) {
            this.charts.trend.destroy();
        }

        const trendData = this.getTrendData(expenses);
        
        this.charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trendData.labels,
                datasets: [{
                    label: 'Daily Spending',
                    data: trendData.amounts,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#4f46e5',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f3f4f6'
                        }
                    },
                    x: {
                        grid: {
                            color: '#f3f4f6'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    getCategoryData(expenses) {
        const categoryTotals = {};
        
        expenses.forEach(expense => {
            if (!categoryTotals[expense.category]) {
                categoryTotals[expense.category] = 0;
            }
            categoryTotals[expense.category] += expense.amount;
        });

        const labels = [];
        const amounts = [];

        Object.entries(categoryTotals).forEach(([category, amount]) => {
            const categoryInfo = this.categories.find(cat => cat.id === category);
            labels.push(categoryInfo ? categoryInfo.name : category);
            amounts.push(amount);
        });

        return { labels, amounts };
    }

    getTrendData(expenses) {
        const period = document.getElementById('dashboard-period').value;
        const days = this.getDaysInPeriod(period);
        const now = new Date();
        
        const dailyTotals = {};
        
        // Initialize all days with 0
        for (let i = 0; i < days; i++) {
            const date = new Date(now.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            dailyTotals[dateStr] = 0;
        }

        // Add expenses
        expenses.forEach(expense => {
            if (dailyTotals.hasOwnProperty(expense.date)) {
                dailyTotals[expense.date] += expense.amount;
            }
        });

        const labels = Object.keys(dailyTotals).map(date => {
            const d = new Date(date);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        
        const amounts = Object.values(dailyTotals);

        return { labels, amounts };
    }

    updateRecentExpenses(expenses) {
        const recentExpenses = expenses
            .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))
            .slice(0, 5);

        const container = document.getElementById('recent-expenses-list');
        container.innerHTML = '';

        if (recentExpenses.length === 0) {
            container.innerHTML = '<p class="no-data">No recent expenses</p>';
            return;
        }

        recentExpenses.forEach(expense => {
            const expenseEl = this.createExpenseElement(expense);
            container.appendChild(expenseEl);
        });
    }

    // Expense List Management
    populateExpensesList() {
        const container = document.getElementById('expenses-list');
        container.innerHTML = '';

        if (this.expenses.length === 0) {
            container.innerHTML = '<p class="no-data">No expenses found. Add your first expense!</p>';
            return;
        }

        const filteredExpenses = this.getFilteredExpensesForList();
        
        if (filteredExpenses.length === 0) {
            container.innerHTML = '<p class="no-data">No expenses match your filters</p>';
            return;
        }

        const grouped = this.groupExpensesByDate(
            filteredExpenses.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))
        );

        Object.keys(grouped)
            .sort((a, b) => new Date(b) - new Date(a))
            .forEach(dateKey => {
                const header = document.createElement('div');
                header.className = 'expense-date-header';
                const d = new Date(dateKey);
                header.textContent = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                container.appendChild(header);

                grouped[dateKey].forEach(expense => {
                    const expenseEl = this.createExpenseElement(expense, true);
                    container.appendChild(expenseEl);
                });
            });
    }

    getFilteredExpensesForList() {
        let filtered = [...this.expenses];

        // Search filter
        const searchTerm = document.getElementById('search-expenses').value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(expense => 
                expense.notes.toLowerCase().includes(searchTerm) ||
                this.categories.find(cat => cat.id === expense.category)?.name.toLowerCase().includes(searchTerm)
            );
        }

        // Category filter
        const categoryFilter = document.getElementById('category-filter').value;
        if (categoryFilter) {
            filtered = filtered.filter(expense => expense.category === categoryFilter);
        }

        // Date period filter
        const dateFilter = document.getElementById('date-filter').value;
        if (dateFilter && dateFilter !== 'all') {
            const now = new Date();
            let startDate;
            switch (dateFilter) {
                case 'today':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    break;
            }
            filtered = filtered.filter(expense => new Date(expense.date) >= startDate);
        }

        return filtered;
    }

    groupExpensesByDate(expenses) {
        const groups = {};
        expenses.forEach(expense => {
            const key = expense.date; // YYYY-MM-DD
            if (!groups[key]) groups[key] = [];
            groups[key].push(expense);
        });
        return groups;
    }

    filterExpenses() {
        this.populateExpensesList();
    }

    populateCategoryFilter() {
        const select = document.getElementById('category-filter');
        select.innerHTML = '<option value="">All Categories</option>';
        
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    }

    createExpenseElement(expense, showActions = false) {
        const expenseEl = document.createElement('div');
        expenseEl.className = 'expense-item';
        
        const categoryInfo = this.categories.find(cat => cat.id === expense.category);
        const date = new Date(expense.date);
        const formattedDate = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });

        expenseEl.innerHTML = `
            <div class="expense-info">
                <div class="expense-category-icon category-${expense.category}">
                    <i class="${categoryInfo?.icon || 'fas fa-ellipsis-h'}"></i>
                </div>
                <div class="expense-details">
                    <h4>${categoryInfo?.name || expense.category}</h4>
                    <p>${formattedDate} ${expense.time !== '00:00' ? 'at ' + expense.time : ''}</p>
                    ${expense.notes ? `<p class="expense-notes">${expense.notes}</p>` : ''}
                </div>
            </div>
            <div class="expense-amount">₱${expense.amount.toFixed(2)}</div>
            ${showActions ? `
                <div class="expense-actions">
                    <button class="btn-icon btn-edit" onclick="expenseTracker.editExpense('${expense.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="expenseTracker.deleteExpense('${expense.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            ` : ''}
        `;

        return expenseEl;
    }

    // Reports
    updateReports() {
        const period = document.getElementById('report-period').value;
        const filteredExpenses = this.getFilteredExpenses(period);
        
        this.updateReportCharts(filteredExpenses);
        this.updateTopCategories(filteredExpenses);
        this.updateMonthlyComparison(filteredExpenses);
    }

    updateReportCharts(expenses) {
        this.updateReportCategoryChart(expenses);
        this.updateReportTrendChart(expenses);
    }

    updateReportCategoryChart(expenses) {
        const ctx = document.getElementById('report-category-chart').getContext('2d');
        
        if (this.charts.reportCategory) {
            this.charts.reportCategory.destroy();
        }

        const categoryData = this.getCategoryData(expenses);
        
        this.charts.reportCategory = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    data: categoryData.amounts,
                    backgroundColor: [
                        '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
                        '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#6b7280'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    updateReportTrendChart(expenses) {
        const ctx = document.getElementById('report-trend-chart').getContext('2d');
        
        if (this.charts.reportTrend) {
            this.charts.reportTrend.destroy();
        }

        const trendData = this.getTrendData(expenses);
        
        this.charts.reportTrend = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: trendData.labels,
                datasets: [{
                    label: 'Spending',
                    data: trendData.amounts,
                    backgroundColor: 'rgba(79, 70, 229, 0.8)',
                    borderColor: '#4f46e5',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f3f4f6'
                        }
                    },
                    x: {
                        grid: {
                            color: '#f3f4f6'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    updateTopCategories(expenses) {
        const container = document.getElementById('top-categories');
        const categoryData = this.getCategoryData(expenses);
        
        if (categoryData.labels.length === 0) {
            container.innerHTML = '<p class="no-data">No data available</p>';
            return;
        }

        // Sort by amount
        const sortedData = categoryData.labels.map((label, index) => ({
            label,
            amount: categoryData.amounts[index]
        })).sort((a, b) => b.amount - a.amount).slice(0, 5);

        container.innerHTML = sortedData.map(item => `
            <div class="category-item">
                <span class="category-name">${item.label}</span>
                <span class="category-amount">₱${item.amount.toFixed(2)}</span>
            </div>
        `).join('');
    }

    updateMonthlyComparison(expenses) {
        const container = document.getElementById('monthly-comparison');
        
        // Group expenses by month
        const monthlyData = {};
        expenses.forEach(expense => {
            const month = expense.date.substring(0, 7); // YYYY-MM
            if (!monthlyData[month]) {
                monthlyData[month] = 0;
            }
            monthlyData[month] += expense.amount;
        });

        const sortedMonths = Object.entries(monthlyData)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6); // Last 6 months

        if (sortedMonths.length === 0) {
            container.innerHTML = '<p class="no-data">No data available</p>';
            return;
        }

        container.innerHTML = sortedMonths.map(([month, amount]) => {
            const date = new Date(month + '-01');
            const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            return `
                <div class="comparison-item">
                    <span class="comparison-name">${monthName}</span>
                    <span class="comparison-amount">₱${amount.toFixed(2)}</span>
                </div>
            `;
        }).join('');
    }

    // Utility Methods
    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('expense-date').value = today;
    }

    clearAddExpenseForm() {
        document.getElementById('add-expense-form').reset();
        this.setDefaultDate();
    }

    clearForms() {
        document.getElementById('login-form').reset();
        document.getElementById('register-form').reset();
        document.getElementById('add-expense-form').reset();
        this.setDefaultDate();
    }
}

// Initialize the application
const expenseTracker = new ExpenseTracker();

// Add some CSS for no-data states
const style = document.createElement('style');
style.textContent = `
    .no-data {
        text-align: center;
        color: #6b7280;
        font-style: italic;
        padding: 40px 20px;
        background: #f9fafb;
        border-radius: 10px;
        margin: 20px 0;
    }
    
    .expense-notes {
        color: #9ca3af;
        font-size: 0.8rem;
        margin-top: 2px;
    }
`;
document.head.appendChild(style);
