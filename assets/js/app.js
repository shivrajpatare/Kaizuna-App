/**
 * LinkSnap - Application Logic
 * Architecture: Model-View-Controller (Simplified)
 */

/* --- Constants & Config --- */
const STORAGE_KEY = 'linksnap_handles_v1';
const ICONS = {
    github: 'ph-github-logo',
    linkedin: 'ph-linkedin-logo',
    twitter: 'ph-x-logo',
    portfolio: 'ph-globe',
    email: 'ph-envelope',
    discord: 'ph-discord-logo',
    leetcode: 'ph-code',
    custom: 'ph-link'
};

/* --- State Management (Model) --- */
const Store = {
    get() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Storage error:', e);
            return [];
        }
    },

    set(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Storage save error:', e);
            alert('Failed to save data. LocalStorage might be full.');
        }
    },

    add(handle) {
        const current = this.get();
        // Add to beginning of list
        const updated = [handle, ...current];
        this.set(updated);
        return updated;
    },

    remove(id) {
        const current = this.get();
        const updated = current.filter(item => item.id !== id);
        this.set(updated);
        return updated;
    }
};

/* --- Security & Utils --- */
const Utils = {
    // Prevent XSS by escaping characters
    escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    copyToClipboard(text) {
        if (!navigator.clipboard) {
            // Fallback for older browsers
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                return Promise.resolve();
            } catch (err) {
                return Promise.reject(err);
            } finally {
                document.body.removeChild(textArea);
            }
        }
        return navigator.clipboard.writeText(text);
    }
};

/* --- DOM Elements --- */
const Elements = {
    grid: document.getElementById('card-grid'),
    emptyState: document.getElementById('empty-state'),
    addBtn: document.getElementById('add-btn'),
    modalOverlay: document.getElementById('modal-overlay'),
    closeModalBtn: document.getElementById('close-modal'),
    form: document.getElementById('handle-form'),
    platformSelect: document.getElementById('platform-select'),
    platformInput: document.getElementById('platform-name'),
    handleInput: document.getElementById('handle-value'),
    toastContainer: document.getElementById('toast-container')
};

/* --- Controller & View --- */
const App = {
    init() {
        this.render();
        this.bindEvents();

        // Init Theme
        if (localStorage.getItem('theme') === 'light') {
            this.toggleTheme(false); // false = don't toggle, just set
        }
    },

    bindEvents() {
        // Modal toggles
        Elements.addBtn.addEventListener('click', () => this.toggleModal(true));
        Elements.closeModalBtn.addEventListener('click', () => this.toggleModal(false));
        Elements.modalOverlay.addEventListener('click', (e) => {
            if (e.target === Elements.modalOverlay) this.toggleModal(false);
        });

        // Form Submit
        Elements.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Theme Toggle
        const themeBtn = document.getElementById('theme-toggle');
        themeBtn.addEventListener('click', () => this.toggleTheme(true));

        // Platform Select Change (Auto-fill name)
        Elements.platformSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val !== 'custom') {
                // Capitalize first letter
                Elements.platformInput.value = val.charAt(0).toUpperCase() + val.slice(1);
            } else {
                Elements.platformInput.value = '';
            }
        });

        // Event Delegation for Grid (Copy & Delete)
        Elements.grid.addEventListener('click', (e) => this.handleGridClick(e));
    },

    toggleModal(show) {
        if (show) {
            Elements.modalOverlay.classList.remove('hidden');
            Elements.modalOverlay.setAttribute('aria-hidden', 'false');
            Elements.platformInput.focus();
        } else {
            Elements.modalOverlay.classList.add('hidden');
            Elements.modalOverlay.setAttribute('aria-hidden', 'true');
            Elements.form.reset();
        }
    },

    toggleTheme(toggle = true) {
        const icon = document.querySelector('#theme-toggle i');

        if (toggle) {
            document.body.classList.toggle('light-mode');
        } else {
            // Just force set based on storage, which we checked before calling
            document.body.classList.add('light-mode');
        }

        const isLight = document.body.classList.contains('light-mode');

        if (isLight) {
            icon.classList.replace('ph-moon', 'ph-sun');
            localStorage.setItem('theme', 'light');
        } else {
            icon.classList.replace('ph-sun', 'ph-moon');
            localStorage.setItem('theme', 'dark');
        }
    },

    handleSubmit(e) {
        e.preventDefault();

        const type = Elements.platformSelect.value;
        const name = Elements.platformInput.value.trim();
        const value = Elements.handleInput.value.trim();

        if (!name || !value) return;

        // Store RAW data
        const newHandle = {
            id: Utils.generateId(),
            type,
            name: name,
            value: value,
            createdAt: Date.now()
        };

        Store.add(newHandle);
        this.render();
        this.toggleModal(false);
        this.showToast('Handle saved successfully!');
    },

    handleGridClick(e) {
        // Check for delete button
        const deleteBtn = e.target.closest('[data-action="delete"]');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            // Stop propagation to avoid triggering copy
            e.stopPropagation();
            this.handleDelete(id);
            return;
        }

        // Check for card click (Copy)
        const card = e.target.closest('.handle-card');
        if (card) {
            const id = card.dataset.id;
            const item = Store.get().find(x => x.id === id);
            if (item) {
                this.handleCopy(item.value);
            }
        }
    },

    handleDelete(id) {
        if (confirm('Delete this handle?')) {
            Store.remove(id);
            this.render();
            this.showToast('Handle deleted.');
        }
    },

    async handleCopy(text) {
        try {
            await Utils.copyToClipboard(text);
            this.showToast('Copied to clipboard! 📋');
        } catch (err) {
            this.showToast('Failed to copy', true);
            console.error(err);
        }
    },

    render() {
        const handles = Store.get();

        if (handles.length === 0) {
            Elements.grid.innerHTML = '';
            Elements.emptyState.classList.remove('hidden');
            return;
        }

        Elements.emptyState.classList.add('hidden');

        Elements.grid.innerHTML = handles.map(handle => {
            const iconClass = ICONS[handle.type] || ICONS.custom;
            const safeName = Utils.escapeHTML(handle.name);
            const safeValue = Utils.escapeHTML(handle.value);

            return `
                <div class="handle-card" data-id="${handle.id}">
                    <button class="delete-btn" data-action="delete" data-id="${handle.id}" aria-label="Delete">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                    <div class="card-content">
                        <div class="card-icon">
                            <i class="ph-bold ${iconClass}"></i>
                        </div>
                        <div class="card-details">
                            <span class="platform-label">${safeName}</span>
                            <span class="handle-text">${safeValue}</span>
                        </div>
                    </div>
                    <i class="ph-bold ph-check copy-indicator"></i>
                </div>
             `;
        }).join('');
    },

    showToast(msg, isError = false) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        if (isError) toast.style.background = '#ef4444';

        Elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translate(-50%, 20px)';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
};

// Start
App.init();

// Expose for debugging
window.App = App;
