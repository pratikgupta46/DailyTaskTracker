/**
 * Daily Priority Tracker - Main Application Logic
 * Handles UI interactions, task management, and mobile-first features
 */

class DailyPriorityApp {
    constructor() {
        this.currentEditingTask = null;
        this.currentView = 'all';
        this.draggedTask = null;
        this.touchStartY = 0;
        this.touchStartX = 0;
        
        // Initialize app when DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    /**
     * Initialize the application
     */
    init() {
        try {
            console.log('Initializing Daily Priority Tracker...');
            
            // Wait for storage manager to be ready
            if (!window.storageManager) {
                setTimeout(() => this.init(), 100);
                return;
            }

            this.setupEventListeners();
            this.setupTheme();
            this.updateDisplay();
            this.updateDateTime();
            
            // Update date/time every minute
            setInterval(() => this.updateDateTime(), 60000);
            
            console.log('App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize app. Please refresh the page.');
        }
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Add task button
        document.getElementById('add-task-btn')?.addEventListener('click', () => this.openTaskModal());

        // Theme toggle
        document.getElementById('theme-toggle')?.addEventListener('click', () => this.toggleTheme());

        // Settings button
        document.getElementById('settings-btn')?.addEventListener('click', () => this.openSettingsModal());

        // Modal controls
        document.getElementById('close-modal')?.addEventListener('click', () => this.closeTaskModal());
        document.getElementById('close-settings')?.addEventListener('click', () => this.closeSettingsModal());
        document.getElementById('cancel-btn')?.addEventListener('click', () => this.closeTaskModal());
        document.getElementById('modal-overlay')?.addEventListener('click', () => this.closeAllModals());

        // Task form
        document.getElementById('task-form')?.addEventListener('submit', (e) => this.handleTaskSubmit(e));

        // View buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });

        // Settings controls
        document.getElementById('export-data')?.addEventListener('click', () => this.exportData());
        document.getElementById('import-data')?.addEventListener('click', () => this.importData());
        document.getElementById('import-file')?.addEventListener('change', (e) => this.handleFileImport(e));
        document.getElementById('auto-theme')?.addEventListener('change', (e) => this.updateAutoTheme(e.target.checked));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Touch events for mobile swipe gestures
        this.setupTouchEvents();

        // Prevent default drag behavior on images and links
        document.addEventListener('dragstart', (e) => {
            if (e.target.tagName === 'IMG' || e.target.tagName === 'A') {
                e.preventDefault();
            }
        });
    }

    /**
     * Set up touch events for mobile interactions
     */
    setupTouchEvents() {
        const tasksList = document.getElementById('tasks-list');
        if (!tasksList) return;

        tasksList.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        tasksList.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        tasksList.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
    }

    /**
     * Handle touch start for swipe gestures
     */
    handleTouchStart(e) {
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
    }

    /**
     * Handle touch move for swipe gestures
     */
    handleTouchMove(e) {
        if (!this.touchStartX || !this.touchStartY) return;

        const touch = e.touches[0];
        const diffX = this.touchStartX - touch.clientX;
        const diffY = this.touchStartY - touch.clientY;

        // Prevent scrolling if horizontal swipe is detected
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
            e.preventDefault();
        }
    }

    /**
     * Handle touch end for swipe actions
     */
    handleTouchEnd(e) {
        if (!this.touchStartX || !this.touchStartY) return;

        const touch = e.changedTouches[0];
        const diffX = this.touchStartX - touch.clientX;
        const diffY = this.touchStartY - touch.clientY;

        // Reset touch coordinates
        this.touchStartX = 0;
        this.touchStartY = 0;

        // Check if it's a horizontal swipe
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            const taskCard = e.target.closest('.task-card');
            if (taskCard) {
                const taskId = parseInt(taskCard.dataset.taskId);
                
                if (diffX > 0) {
                    // Swipe left - mark as complete/incomplete
                    this.toggleTaskCompletion(taskId);
                } else {
                    // Swipe right - edit task
                    this.editTask(taskId);
                }
            }
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Escape key - close modals
        if (e.key === 'Escape') {
            this.closeAllModals();
        }

        // Ctrl/Cmd + N - new task
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.openTaskModal();
        }

        // Ctrl/Cmd + E - export data
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            this.exportData();
        }
    }

    /**
     * Update date and time display
     */
    updateDateTime() {
        const dateElement = document.getElementById('current-date');
        if (dateElement) {
            const now = new Date();
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            dateElement.textContent = now.toLocaleDateString('en-US', options);
        }
    }

    /**
     * Set up theme system
     */
    setupTheme() {
        const settings = window.storageManager.getSettings();
        
        if (settings.autoTheme) {
            this.setAutoTheme();
        } else {
            this.setTheme(settings.theme);
        }

        // Update theme toggle icon
        this.updateThemeIcon();
        
        // Update auto-theme checkbox
        const autoThemeCheckbox = document.getElementById('auto-theme');
        if (autoThemeCheckbox) {
            autoThemeCheckbox.checked = settings.autoTheme;
        }
    }

    /**
     * Set theme based on time of day
     */
    setAutoTheme() {
        const hour = new Date().getHours();
        const isDark = hour < 7 || hour >= 19; // Dark theme from 7pm to 7am
        this.setTheme(isDark ? 'dark' : 'light');
    }

    /**
     * Set specific theme
     */
    setTheme(theme) {
        const body = document.body;
        
        if (theme === 'dark') {
            body.classList.add('dark-theme');
        } else {
            body.classList.remove('dark-theme');
        }

        // Update theme icon
        this.updateThemeIcon();

        // Save theme preference if not auto
        const settings = window.storageManager.getSettings();
        if (!settings.autoTheme) {
            settings.theme = theme;
            window.storageManager.saveSettings(settings);
        }
    }

    /**
     * Toggle between light and dark theme
     */
    toggleTheme() {
        const isDark = document.body.classList.contains('dark-theme');
        const newTheme = isDark ? 'light' : 'dark';
        
        // Disable auto theme when manually toggling
        const settings = window.storageManager.getSettings();
        settings.autoTheme = false;
        settings.theme = newTheme;
        window.storageManager.saveSettings(settings);
        
        // Update auto-theme checkbox
        const autoThemeCheckbox = document.getElementById('auto-theme');
        if (autoThemeCheckbox) {
            autoThemeCheckbox.checked = false;
        }
        
        this.setTheme(newTheme);
    }

    /**
     * Update theme toggle icon
     */
    updateThemeIcon() {
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            const isDark = document.body.classList.contains('dark-theme');
            themeIcon.textContent = isDark ? '☀️' : '🌙';
        }
    }

    /**
     * Update auto theme setting
     */
    updateAutoTheme(enabled) {
        const settings = window.storageManager.getSettings();
        settings.autoTheme = enabled;
        window.storageManager.saveSettings(settings);
        
        if (enabled) {
            this.setAutoTheme();
        }
    }

    /**
     * Open task modal for adding new task
     */
    openTaskModal(taskId = null) {
        const modal = document.getElementById('task-modal');
        const overlay = document.getElementById('modal-overlay');
        const form = document.getElementById('task-form');
        const title = document.getElementById('modal-title');
        
        if (!modal || !overlay || !form) return;

        this.currentEditingTask = taskId;
        
        if (taskId) {
            // Edit mode
            title.textContent = 'Edit Task';
            this.populateTaskForm(taskId);
        } else {
            // Add mode
            title.textContent = 'Add New Task';
            form.reset();
            // Set default values
            document.getElementById('task-priority').value = '50';
            document.getElementById('eisenhower-matrix').value = 'Q2';
        }

        modal.classList.add('active');
        overlay.classList.add('active');
        
        // Focus on first input
        setTimeout(() => {
            const firstInput = form.querySelector('input, textarea');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    /**
     * Populate task form with existing task data
     */
    populateTaskForm(taskId) {
        try {
            const tasks = window.storageManager.getAllTasks();
            const task = tasks.find(t => t.id === taskId);
            
            if (!task) {
                throw new Error('Task not found');
            }

            document.getElementById('task-name').value = task.name;
            document.getElementById('task-why').value = task.why;
            
            // Format ETA for datetime-local input
            if (task.eta) {
                const etaDate = new Date(task.eta);
                const formattedETA = etaDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
                document.getElementById('task-eta').value = formattedETA;
            }
            
            document.getElementById('task-time-required').value = task.timeRequired || '';
            document.getElementById('task-priority').value = task.priority;
            document.getElementById('eisenhower-matrix').value = task.eisenhowerMatrix || 'Q2';
            
            // Handle comments - show most recent or all combined
            const comments = Array.isArray(task.comments) ? 
                task.comments.map(c => typeof c === 'string' ? c : c.text).join('\n') :
                task.comments || '';
            document.getElementById('task-comments').value = comments;
        } catch (error) {
            console.error('Failed to populate form:', error);
            this.showError('Failed to load task data');
        }
    }

    /**
     * Close task modal
     */
    closeTaskModal() {
        const modal = document.getElementById('task-modal');
        const overlay = document.getElementById('modal-overlay');
        
        if (modal) modal.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        
        this.currentEditingTask = null;
        
        // Reset form
        const form = document.getElementById('task-form');
        if (form) form.reset();
    }

    /**
     * Open settings modal
     */
    openSettingsModal() {
        const modal = document.getElementById('settings-modal');
        const overlay = document.getElementById('modal-overlay');
        
        if (modal && overlay) {
            modal.classList.add('active');
            overlay.classList.add('active');
        }
    }

    /**
     * Close settings modal
     */
    closeSettingsModal() {
        const modal = document.getElementById('settings-modal');
        const overlay = document.getElementById('modal-overlay');
        
        if (modal) modal.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        this.closeTaskModal();
        this.closeSettingsModal();
    }

    /**
     * Handle task form submission
     */
    handleTaskSubmit(e) {
        e.preventDefault();
        
        try {
            const taskData = {
                name: document.getElementById('task-name').value.trim(),
                why: document.getElementById('task-why').value.trim(),
                eta: document.getElementById('task-eta').value || null,
                timeRequired: parseInt(document.getElementById('task-time-required').value) || 60,
                priority: parseInt(document.getElementById('task-priority').value) || 50,
                eisenhowerMatrix: document.getElementById('eisenhower-matrix').value || 'Q2',
                comments: document.getElementById('task-comments').value.trim()
            };

            // Validate required fields
            if (!taskData.name || !taskData.why) {
                throw new Error('Task name and purpose are required');
            }

            if (this.currentEditingTask) {
                // Update existing task
                window.storageManager.updateTask(this.currentEditingTask, taskData);
                this.showSuccess('Task updated successfully');
            } else {
                // Add new task
                window.storageManager.addTask(taskData);
                this.showSuccess('Task added successfully');
            }

            this.closeTaskModal();
            this.updateDisplay();
            
        } catch (error) {
            console.error('Failed to save task:', error);
            this.showError(error.message || 'Failed to save task');
        }
    }

    /**
     * Switch between different views (all, pending, completed)
     */
    switchView(view) {
        this.currentView = view;
        
        // Update active button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        this.renderTasks();
    }

    /**
     * Update the entire display
     */
    updateDisplay() {
        this.updateStats();
        this.renderTasks();
    }

    /**
     * Update statistics display
     */
    updateStats() {
        try {
            const stats = window.storageManager.getTaskStats();
            
            document.getElementById('total-tasks').textContent = stats.total;
            document.getElementById('completed-tasks').textContent = stats.completed;
            document.getElementById('pending-tasks').textContent = stats.pending;
        } catch (error) {
            console.error('Failed to update stats:', error);
        }
    }

    /**
     * Render tasks list
     */
    renderTasks() {
        try {
            const tasksList = document.getElementById('tasks-list');
            const emptyState = document.getElementById('empty-state');
            
            if (!tasksList || !emptyState) return;

            let tasks = window.storageManager.getAllTasks();
            
            // Filter tasks based on current view
            switch (this.currentView) {
                case 'pending':
                    tasks = tasks.filter(task => !task.completed);
                    break;
                case 'completed':
                    tasks = tasks.filter(task => task.completed);
                    break;
                // 'all' shows everything
            }

            // Sort tasks by Smart Score
            tasks.sort((a, b) => {
                if (a.completed !== b.completed) {
                    return a.completed ? 1 : -1; // Non-completed first
                }
                return b.smartScore - a.smartScore; // Higher score first
            });

            // Show/hide empty state
            if (tasks.length === 0) {
                tasksList.innerHTML = '';
                emptyState.classList.remove('hidden');
            } else {
                emptyState.classList.add('hidden');
                tasksList.innerHTML = tasks.map(task => this.createTaskHTML(task)).join('');
                
                // Add event listeners to task cards
                this.attachTaskEventListeners();
            }
        } catch (error) {
            console.error('Failed to render tasks:', error);
            this.showError('Failed to load tasks');
        }
    }

    /**
     * Create HTML for a single task
     */
    createTaskHTML(task) {
        const completedClass = task.completed ? 'completed' : '';
        const priorityClass = `priority-${task.priority > 66 ? 1 : task.priority > 33 ? 2 : 3}`;
        const overdueClass = task.overdue ? 'overdue' : '';

        // Format creation time
        const createdTime = new Date(task.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // Format ETA
        let etaDisplay = '';
        if (task.eta) {
            const etaDate = new Date(task.eta);
            etaDisplay = `${etaDate.toLocaleDateString()} ${etaDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }
        
        // Handle comments
        let commentsHTML = '';
        if (task.comments && (Array.isArray(task.comments) ? task.comments.length > 0 : task.comments.trim())) {
            const commentText = Array.isArray(task.comments) ? 
                task.comments.map(c => typeof c === 'string' ? c : c.text).join(' • ') :
                task.comments;
            commentsHTML = `<div class="task-comments">${this.escapeHtml(commentText)}</div>`;
        }

        return `
            <div class="task-card ${completedClass} ${priorityClass} ${overdueClass}" data-task-id="${task.id}" draggable="true">
                <div class="task-header">
                    <h3 class="task-title">${task.overdue ? '🚨' : ''} ${this.escapeHtml(task.name)}</h3>
                    <div class="task-actions">
                        <button class="task-action-btn" onclick="app.toggleTaskCompletion(${task.id})" title="${task.completed ? 'Mark as pending' : 'Mark as completed'}">
                            ${task.completed ? '↶' : '✓'}
                        </button>
                        <button class="task-action-btn" onclick="app.editTask(${task.id})" title="Edit task">
                            ✏️
                        </button>
                        <button class="task-action-btn" onclick="app.deleteTask(${task.id})" title="Delete task">
                            🗑️
                        </button>
                    </div>
                </div>
                
                <div class="task-meta">
                    <div class="task-meta-item">
                        <span class="priority-indicator">P: ${task.priority}</span>
                    </div>
                    <div class="task-meta-item">
                        <span class="eisenhower-indicator">${task.eisenhowerMatrix}</span>
                    </div>
                    <div class="task-meta-item">
                        <span class="smart-score">Score: ${task.smartScore}</span>
                    </div>
                    ${etaDisplay ? `<div class="task-meta-item">⏱️ ${etaDisplay}</div>` : ''}
                    <div class="task-meta-item">📅 ${createdTime}</div>
                </div>
                
                <div class="task-why">"${this.escapeHtml(task.why)}"</div>
                
                ${commentsHTML}
            </div>
        `;
    }

    /**
     * Attach event listeners to task cards
     */
    attachTaskEventListeners() {
        const taskCards = document.querySelectorAll('.task-card');
        
        taskCards.forEach(card => {
            // Drag and drop for reordering
            card.addEventListener('dragstart', (e) => this.handleDragStart(e));
            card.addEventListener('dragover', (e) => this.handleDragOver(e));
            card.addEventListener('drop', (e) => this.handleDrop(e));
            card.addEventListener('dragend', (e) => this.handleDragEnd(e));
        });
    }

    /**
     * Handle drag start for task reordering
     */
    handleDragStart(e) {
        this.draggedTask = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
    }

    /**
     * Handle drag over for task reordering
     */
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const afterElement = this.getDragAfterElement(e.currentTarget.parentNode, e.clientY);
        const draggedElement = document.querySelector('.dragging');
        
        if (afterElement == null) {
            e.currentTarget.parentNode.appendChild(draggedElement);
        } else {
            e.currentTarget.parentNode.insertBefore(draggedElement, afterElement);
        }
    }

    /**
     * Handle drop for task reordering
     */
    handleDrop(e) {
        e.preventDefault();
        this.updateTaskOrder();
    }

    /**
     * Handle drag end
     */
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        this.draggedTask = null;
    }

    /**
     * Get element after which to insert dragged item
     */
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    /**
     * Update task order after drag and drop
     */
    updateTaskOrder() {
        try {
            const taskCards = document.querySelectorAll('.task-card');
            const taskIds = Array.from(taskCards).map(card => parseInt(card.dataset.taskId));
            
            window.storageManager.reorderTasks(taskIds);
            this.showSuccess('Tasks reordered successfully');
        } catch (error) {
            console.error('Failed to reorder tasks:', error);
            this.showError('Failed to reorder tasks');
            this.renderTasks(); // Restore original order
        }
    }

    /**
     * Toggle task completion status
     */
    toggleTaskCompletion(taskId) {
        try {
            const tasks = window.storageManager.getTodaysTasks();
            const task = tasks.find(t => t.id === taskId);
            
            if (!task) {
                throw new Error('Task not found');
            }

            window.storageManager.updateTask(taskId, {
                completed: !task.completed
            });

            this.updateDisplay();
            
            const message = task.completed ? 'Task marked as pending' : 'Task completed! 🎉';
            this.showSuccess(message);
        } catch (error) {
            console.error('Failed to toggle task completion:', error);
            this.showError('Failed to update task');
        }
    }

    /**
     * Edit an existing task
     */
    editTask(taskId) {
        this.openTaskModal(taskId);
    }

    /**
     * Delete a task with confirmation
     */
    deleteTask(taskId) {
        try {
            const tasks = window.storageManager.getTodaysTasks();
            const task = tasks.find(t => t.id === taskId);
            
            if (!task) {
                throw new Error('Task not found');
            }

            if (confirm(`Are you sure you want to delete "${task.name}"?`)) {
                window.storageManager.deleteTask(taskId);
                this.updateDisplay();
                this.showSuccess('Task deleted successfully');
            }
        } catch (error) {
            console.error('Failed to delete task:', error);
            this.showError('Failed to delete task');
        }
    }

    /**
     * Export data to JSON file
     */
    exportData() {
        try {
            const data = window.storageManager.exportData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            a.href = url;
            a.download = `daily-priority-tracker-${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            this.showSuccess('Data exported successfully');
        } catch (error) {
            console.error('Failed to export data:', error);
            this.showError('Failed to export data');
        }
    }

    /**
     * Import data from file
     */
    importData() {
        const fileInput = document.getElementById('import-file');
        if (fileInput) {
            fileInput.click();
        }
    }

    /**
     * Handle file import
     */
    handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const result = window.storageManager.importData(event.target.result);
                this.updateDisplay();
                this.showSuccess(result.message);
            } catch (error) {
                console.error('Failed to import data:', error);
                this.showError('Failed to import data: ' + error.message);
            }
        };

        reader.onerror = () => {
            this.showError('Failed to read file');
        };

        reader.readAsText(file);
        
        // Reset file input
        e.target.value = '';
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * Show error message
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: '10000',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '90vw',
            textAlign: 'center'
        });

        document.body.appendChild(notification);

        // Animate in
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(-20px)';
        
        requestAnimationFrame(() => {
            notification.style.transition = 'all 0.3s ease';
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(-50%) translateY(0)';
        });

        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app
window.app = new DailyPriorityApp();
