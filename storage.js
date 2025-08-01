/**
 * Storage Manager for Daily Priority Tracker
 * Handles all localStorage operations with data validation and backup
 */

class StorageManager {
    constructor() {
        this.storageKey = 'dailyPriorityTracker';
        this.backupKey = 'dailyPriorityTracker_backup';
        this.settingsKey = 'dailyPriorityTracker_settings';
        this.version = '1.0.0';
        
        // Initialize storage if needed
        this.initializeStorage();
    }

    /**
     * Initialize storage with default structure
     */
    initializeStorage() {
        try {
            const existingData = localStorage.getItem(this.storageKey);
            if (!existingData) {
                const initialData = {
                    version: this.version,
                    createdAt: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    tasks: [],
                    nextId: 1
                };
                localStorage.setItem(this.storageKey, JSON.stringify(initialData));
            } else {
                // Validate and migrate if needed
                this.validateAndMigrate(JSON.parse(existingData));
            }
        } catch (error) {
            console.error('Failed to initialize storage:', error);
            this.handleStorageError(error);
        }
    }

    /**
     * Validate existing data and migrate if necessary
     */
    validateAndMigrate(data) {
        try {
            // Ensure all required fields exist
            if (!data.version) data.version = this.version;
            if (!data.createdAt) data.createdAt = new Date().toISOString();
            if (!data.lastModified) data.lastModified = new Date().toISOString();
            if (!Array.isArray(data.tasks)) data.tasks = [];
            if (!data.nextId) data.nextId = Math.max(...data.tasks.map(t => t.id), 0) + 1;

            // Validate each task
            data.tasks = data.tasks.map(task => this.validateTask(task)).filter(Boolean);

            // Update lastModified and save
            data.lastModified = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    }

    /**
     * Validate a single task object
     */
    validateTask(task) {
        try {
            if (!task || typeof task !== 'object') return null;

            const validatedTask = {
                id: task.id || Date.now(),
                name: String(task.name || '').trim(),
                why: String(task.why || '').trim(),
                eta: task.eta || null, // ISO datetime string
                timeRequired: Math.max(5, parseInt(task.timeRequired) || 60), // minutes
                priority: Math.min(100, Math.max(1, parseInt(task.priority) || 50)),
                eisenhowerMatrix: task.eisenhowerMatrix || 'Q2',
                completed: Boolean(task.completed),
                createdAt: task.createdAt || new Date().toISOString(),
                updatedAt: task.updatedAt || new Date().toISOString(),
                completedAt: task.completedAt || null,
                comments: Array.isArray(task.comments) ? task.comments : (task.comments ? [task.comments] : []),
                date: task.date || new Date().toISOString().split('T')[0] // YYYY-MM-DD format
            };

            // Calculate derived properties
            validatedTask.overdue = this.isTaskOverdue(validatedTask);
            validatedTask.urgent = this.isTaskUrgent(validatedTask);
            validatedTask.important = this.isTaskImportant(validatedTask);
            validatedTask.smartScore = this.calculateSmartScore(validatedTask);

            return validatedTask;
        } catch (error) {
            console.error('Task validation failed:', error);
            return null;
        }
    }

    /**
     * Check if task is overdue
     */
    isTaskOverdue(task) {
        if (!task.eta || task.completed) return false;
        return new Date(task.eta) < new Date();
    }

    /**
     * Determine if task is urgent based on Eisenhower Matrix
     */
    isTaskUrgent(task) {
        return task.eisenhowerMatrix === 'Q1' || task.eisenhowerMatrix === 'Q3';
    }

    /**
     * Determine if task is important based on Eisenhower Matrix
     */
    isTaskImportant(task) {
        return task.eisenhowerMatrix === 'Q1' || task.eisenhowerMatrix === 'Q2';
    }

    /**
     * Calculate Smart Score for task ranking
     */
    calculateSmartScore(task) {
        let score = 0;

        // 1. Priority Score (40% weight)
        const priorityScore = (task.priority / 100) * 40;
        score += priorityScore;

        // 2. Urgency Score based on ETA (30% weight)
        let urgencyScore = 5; // Default for far future tasks
        if (task.eta) {
            const now = new Date();
            const etaDate = new Date(task.eta);
            const daysUntilETA = (etaDate - now) / (24 * 60 * 60 * 1000);

            if (daysUntilETA < 0) {
                urgencyScore = 30; // Overdue - maximum urgency
            } else if (daysUntilETA <= 1) {
                urgencyScore = 25; // Due today/tomorrow
            } else if (daysUntilETA <= 7) {
                urgencyScore = 20; // Due this week
            } else if (daysUntilETA <= 30) {
                urgencyScore = 10; // Due this month
            }
        }
        score += urgencyScore;

        // 3. Eisenhower Matrix Score (20% weight)
        const eisenhowerScores = {
            'Q1': 20, // Urgent + Important
            'Q2': 15, // Important, Not Urgent
            'Q3': 10, // Urgent, Not Important
            'Q4': 5   // Neither
        };
        score += eisenhowerScores[task.eisenhowerMatrix] || 15;

        // 4. Effort Score - Quick wins get slight boost (10% weight)
        let effortScore = 2; // Default for long tasks
        if (task.timeRequired <= 30) {
            effortScore = 10; // Quick win bonus
        } else if (task.timeRequired <= 120) {
            effortScore = 8; // Moderate effort
        } else if (task.timeRequired <= 480) {
            effortScore = 5; // Long task
        }
        score += effortScore;

        return Math.round(score * 10) / 10; // Round to 1 decimal place
    }

    /**
     * Get all data from storage
     */
    getAllData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) {
                this.initializeStorage();
                return this.getAllData();
            }
            return JSON.parse(data);
        } catch (error) {
            console.error('Failed to get data:', error);
            return this.handleStorageError(error);
        }
    }

    /**
     * Save all data to storage with backup
     */
    saveAllData(data) {
        try {
            // Create backup of current data
            const currentData = localStorage.getItem(this.storageKey);
            if (currentData) {
                localStorage.setItem(this.backupKey, currentData);
            }

            // Update timestamp and save
            data.lastModified = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            
            return true;
        } catch (error) {
            console.error('Failed to save data:', error);
            this.handleStorageError(error);
            return false;
        }
    }

    /**
     * Get all tasks
     */
    getAllTasks() {
        const data = this.getAllData();
        return data.tasks || [];
    }

    /**
     * Get tasks for a specific date
     */
    getTasksForDate(date = null) {
        const targetDate = date || new Date().toISOString().split('T')[0];
        const allTasks = this.getAllTasks();
        return allTasks.filter(task => task.date === targetDate);
    }

    /**
     * Get today's tasks
     */
    getTodaysTasks() {
        return this.getTasksForDate();
    }

    /**
     * Add a new task
     */
    addTask(taskData) {
        try {
            const data = this.getAllData();
            const newTask = this.validateTask({
                ...taskData,
                id: data.nextId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                completed: false,
                date: new Date().toISOString().split('T')[0]
            });

            if (!newTask || !newTask.name || !newTask.why) {
                throw new Error('Task name and why are required');
            }

            data.tasks.push(newTask);
            data.nextId++;

            if (this.saveAllData(data)) {
                return newTask;
            }
            throw new Error('Failed to save task');
        } catch (error) {
            console.error('Failed to add task:', error);
            throw error;
        }
    }

    /**
     * Update an existing task
     */
    updateTask(taskId, updates) {
        try {
            const data = this.getAllData();
            const taskIndex = data.tasks.findIndex(task => task.id === taskId);
            
            if (taskIndex === -1) {
                throw new Error('Task not found');
            }

            const currentTask = data.tasks[taskIndex];
            const updatedTask = this.validateTask({
                ...currentTask,
                ...updates,
                id: taskId, // Preserve original ID
                updatedAt: new Date().toISOString(),
                completedAt: updates.completed && !currentTask.completed ? new Date().toISOString() : currentTask.completedAt
            });

            if (!updatedTask) {
                throw new Error('Invalid task data');
            }

            data.tasks[taskIndex] = updatedTask;

            if (this.saveAllData(data)) {
                return updatedTask;
            }
            throw new Error('Failed to save task update');
        } catch (error) {
            console.error('Failed to update task:', error);
            throw error;
        }
    }

    /**
     * Delete a task
     */
    deleteTask(taskId) {
        try {
            const data = this.getAllData();
            const initialLength = data.tasks.length;
            data.tasks = data.tasks.filter(task => task.id !== taskId);
            
            if (data.tasks.length === initialLength) {
                throw new Error('Task not found');
            }

            if (this.saveAllData(data)) {
                return true;
            }
            throw new Error('Failed to save after deletion');
        } catch (error) {
            console.error('Failed to delete task:', error);
            throw error;
        }
    }

    /**
     * Add comment to a task
     */
    addComment(taskId, comment) {
        try {
            const data = this.getAllData();
            const task = data.tasks.find(task => task.id === taskId);
            
            if (!task) {
                throw new Error('Task not found');
            }

            const commentObj = {
                id: Date.now(),
                text: String(comment).trim(),
                timestamp: new Date().toISOString()
            };

            if (!commentObj.text) {
                throw new Error('Comment cannot be empty');
            }

            if (!Array.isArray(task.comments)) {
                task.comments = [];
            }

            task.comments.push(commentObj);
            task.updatedAt = new Date().toISOString();

            if (this.saveAllData(data)) {
                return commentObj;
            }
            throw new Error('Failed to save comment');
        } catch (error) {
            console.error('Failed to add comment:', error);
            throw error;
        }
    }

    /**
     * Reorder tasks by priority
     */
    reorderTasks(taskIds) {
        try {
            const data = this.getAllData();
            const taskMap = new Map(data.tasks.map(task => [task.id, task]));
            const reorderedTasks = [];
            const untouchedTasks = [];

            // Separate tasks being reordered from others
            data.tasks.forEach(task => {
                if (taskIds.includes(task.id)) {
                    // Will be added in new order
                } else {
                    untouchedTasks.push(task);
                }
            });

            // Add tasks in new order with updated priority
            taskIds.forEach((taskId, index) => {
                const task = taskMap.get(taskId);
                if (task) {
                    reorderedTasks.push({
                        ...task,
                        priority: index + 1,
                        updatedAt: new Date().toISOString()
                    });
                }
            });

            // Combine reordered tasks with untouched ones
            data.tasks = [...reorderedTasks, ...untouchedTasks];

            if (this.saveAllData(data)) {
                return true;
            }
            throw new Error('Failed to save reordered tasks');
        } catch (error) {
            console.error('Failed to reorder tasks:', error);
            throw error;
        }
    }

    /**
     * Get task statistics
     */
    getTaskStats(date = null) {
        const tasks = date ? this.getTasksForDate(date) : this.getAllTasks();
        
        return {
            total: tasks.length,
            completed: tasks.filter(task => task.completed).length,
            pending: tasks.filter(task => !task.completed).length,
            overdue: tasks.filter(task => task.overdue && !task.completed).length,
            byEisenhower: {
                Q1: tasks.filter(task => task.eisenhowerMatrix === 'Q1').length,
                Q2: tasks.filter(task => task.eisenhowerMatrix === 'Q2').length,
                Q3: tasks.filter(task => task.eisenhowerMatrix === 'Q3').length,
                Q4: tasks.filter(task => task.eisenhowerMatrix === 'Q4').length
            },
            totalTime: tasks.reduce((sum, task) => sum + (task.timeRequired || 0), 0),
            completedTime: tasks.filter(task => task.completed).reduce((sum, task) => sum + (task.timeRequired || 0), 0),
            avgSmartScore: tasks.length > 0 ? tasks.reduce((sum, task) => sum + task.smartScore, 0) / tasks.length : 0
        };
    }

    /**
     * Search tasks
     */
    searchTasks(query, dateRange = null) {
        try {
            const allTasks = this.getAllTasks();
            const searchTerm = String(query).toLowerCase().trim();
            
            if (!searchTerm) return [];

            let filteredTasks = allTasks;

            // Filter by date range if provided
            if (dateRange && dateRange.start && dateRange.end) {
                filteredTasks = filteredTasks.filter(task => 
                    task.date >= dateRange.start && task.date <= dateRange.end
                );
            }

            // Search in task fields
            return filteredTasks.filter(task => 
                task.name.toLowerCase().includes(searchTerm) ||
                task.why.toLowerCase().includes(searchTerm) ||
                (Array.isArray(task.comments) && task.comments.some(comment => 
                    typeof comment === 'string' ? comment.toLowerCase().includes(searchTerm) :
                    comment.text && comment.text.toLowerCase().includes(searchTerm)
                ))
            );
        } catch (error) {
            console.error('Search failed:', error);
            return [];
        }
    }

    /**
     * Export all data
     */
    exportData() {
        try {
            const data = this.getAllData();
            const exportData = {
                ...data,
                exportedAt: new Date().toISOString(),
                exportVersion: this.version
            };
            
            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error('Export failed:', error);
            throw error;
        }
    }

    /**
     * Import data
     */
    importData(jsonData) {
        try {
            const importedData = JSON.parse(jsonData);
            
            // Validate imported data
            if (!importedData.tasks || !Array.isArray(importedData.tasks)) {
                throw new Error('Invalid data format');
            }

            // Backup current data
            const currentData = this.getAllData();
            localStorage.setItem(this.backupKey, JSON.stringify(currentData));

            // Process imported tasks
            const processedTasks = importedData.tasks
                .map(task => this.validateTask(task))
                .filter(Boolean);

            const newData = {
                version: this.version,
                createdAt: importedData.createdAt || new Date().toISOString(),
                lastModified: new Date().toISOString(),
                tasks: processedTasks,
                nextId: Math.max(...processedTasks.map(t => t.id), 0) + 1
            };

            if (this.saveAllData(newData)) {
                return {
                    success: true,
                    imported: processedTasks.length,
                    message: `Successfully imported ${processedTasks.length} tasks`
                };
            }
            throw new Error('Failed to save imported data');
        } catch (error) {
            console.error('Import failed:', error);
            throw error;
        }
    }

    /**
     * Get app settings
     */
    getSettings() {
        try {
            const settings = localStorage.getItem(this.settingsKey);
            return settings ? JSON.parse(settings) : {
                theme: 'auto',
                autoTheme: true,
                notifications: true,
                soundEffects: false
            };
        } catch (error) {
            console.error('Failed to get settings:', error);
            return {
                theme: 'auto',
                autoTheme: true,
                notifications: true,
                soundEffects: false
            };
        }
    }

    /**
     * Save app settings
     */
    saveSettings(settings) {
        try {
            localStorage.setItem(this.settingsKey, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }

    /**
     * Clear all data (with confirmation)
     */
    clearAllData() {
        try {
            // Create final backup
            const currentData = this.getAllData();
            localStorage.setItem(this.backupKey, JSON.stringify(currentData));
            
            // Clear main data
            localStorage.removeItem(this.storageKey);
            
            // Reinitialize
            this.initializeStorage();
            return true;
        } catch (error) {
            console.error('Failed to clear data:', error);
            return false;
        }
    }

    /**
     * Restore from backup
     */
    restoreFromBackup() {
        try {
            const backupData = localStorage.getItem(this.backupKey);
            if (!backupData) {
                throw new Error('No backup found');
            }

            const data = JSON.parse(backupData);
            this.validateAndMigrate(data);
            
            return {
                success: true,
                message: 'Data restored successfully from backup'
            };
        } catch (error) {
            console.error('Restore failed:', error);
            throw error;
        }
    }

    /**
     * Handle storage errors
     */
    handleStorageError(error) {
        console.error('Storage error:', error);
        
        // Try to restore from backup
        try {
            const backup = localStorage.getItem(this.backupKey);
            if (backup) {
                const backupData = JSON.parse(backup);
                return backupData;
            }
        } catch (backupError) {
            console.error('Backup restoration failed:', backupError);
        }

        // Return minimal data structure
        return {
            version: this.version,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            tasks: [],
            nextId: 1
        };
    }

    /**
     * Get storage usage info
     */
    getStorageInfo() {
        try {
            const data = JSON.stringify(this.getAllData());
            const settings = JSON.stringify(this.getSettings());
            const backup = localStorage.getItem(this.backupKey) || '{}';
            
            return {
                mainDataSize: new Blob([data]).size,
                settingsSize: new Blob([settings]).size,
                backupSize: new Blob([backup]).size,
                totalSize: new Blob([data + settings + backup]).size,
                tasksCount: this.getAllTasks().length,
                availableSpace: this.getAvailableStorage()
            };
        } catch (error) {
            console.error('Failed to get storage info:', error);
            return null;
        }
    }

    /**
     * Estimate available localStorage space
     */
    getAvailableStorage() {
        try {
            const testKey = 'storage-test';
            let testData = '';
            let size = 0;
            
            // Build test string incrementally
            while (true) {
                try {
                    testData += 'x'.repeat(1024); // Add 1KB at a time
                    localStorage.setItem(testKey, testData);
                    size += 1024;
                } catch (e) {
                    localStorage.removeItem(testKey);
                    break;
                }
            }
            
            return size;
        } catch (error) {
            return -1; // Unable to determine
        }
    }
}

// Create global instance
window.storageManager = new StorageManager();
