// Elementos do DOM
const tagsContainer = document.getElementById('tagsContainer');
const statsContainer = document.querySelector('.stats-container');
const filteredTasksList = document.getElementById('filteredTasksList');
const tagSearch = document.getElementById('tagSearch');
const themeToggle = document.getElementById('themeToggle');

// Gerenciamento do tema
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

function setTheme(theme) {
    document.body.classList.toggle('dark-theme', theme === 'dark');
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('theme', theme);
}

// Função para carregar o tema
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 
                      (prefersDarkScheme.matches ? 'dark' : 'light');
    setTheme(savedTheme);
}

// Função para extrair etiquetas
function extractEtiquetas(texto) {
    const regex = /#(\w+)/g;
    const matches = texto.match(regex);
    return matches ? matches.map(match => match.substring(1)) : [];
}

// Função para obter todas as etiquetas e suas contagens
function getAllTags() {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const tagCount = new Map();
    
    tasks.forEach(task => {
        const tags = extractEtiquetas(task.title);
        tags.forEach(tag => {
            tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
        });
    });
    
    return tagCount;
}

// Função para renderizar as etiquetas
function renderTags(filter = '') {
    const tagCount = getAllTags();
    tagsContainer.innerHTML = '';
    
    Array.from(tagCount.entries())
        .filter(([tag]) => tag.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => b[1] - a[1])
        .forEach(([tag, count]) => {
            const tagElement = document.createElement('div');
            tagElement.className = 'tag-item';
            tagElement.innerHTML = `
                <span class="tag-name">@${tag}</span>
                <span class="tag-count">${count}</span>
            `;
            tagElement.addEventListener('click', () => showTasksWithTag(tag));
            tagsContainer.appendChild(tagElement);
        });
}

// Função para mostrar estatísticas
function showStats() {
    const tagCount = getAllTags();
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const totalTasks = tasks.length;
    const tasksWithTags = tasks.filter(task => extractEtiquetas(task.title).length > 0).length;
    
    statsContainer.innerHTML = `
        <div class="stat-card">
            <h4>Total de Etiquetas</h4>
            <div class="stat-value">${tagCount.size}</div>
        </div>
        <div class="stat-card">
            <h4>Tarefas com Etiquetas</h4>
            <div class="stat-value">${tasksWithTags}</div>
        </div>
        <div class="stat-card">
            <h4>% Tarefas com Etiquetas</h4>
            <div class="stat-value">${totalTasks ? Math.round((tasksWithTags / totalTasks) * 100) : 0}%</div>
        </div>
    `;
}

// Função para mostrar tarefas com uma etiqueta específica
function showTasksWithTag(tag) {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const filteredTasks = tasks.filter(task => {
        const taskTags = extractEtiquetas(task.title);
        return taskTags.includes(tag);
    });
    
    filteredTasksList.innerHTML = '';
    
    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-item';
        li.innerHTML = `
            <div class="task-info">
                <div class="task-content">
                    <strong class="task-title">${task.title}</strong>
                    <div class="datetime-container">
                        <span class="task-date">${formatDate(task.date)}</span>
                        <span class="task-time">${task.time}</span>
                    </div>
                </div>
            </div>
        `;
        filteredTasksList.appendChild(li);
    });
}

// Função auxiliar para formatar data
function formatDate(dateString) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const tagManager = new TagManager();
    tagManager.init();

    // Inicializa o tema
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    // Adiciona evento de clique no botão de tema
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }

    renderTags();
    showStats();
});

tagSearch.addEventListener('input', (e) => {
    renderTags(e.target.value);
});

// Gerenciamento de etiquetas
class TagManager {
    constructor() {
        this.tags = [];
        this.tasks = [];
        this.selectedTag = null;
        this.init();
    }

    init() {
        this.loadTags();
        this.loadTasks();
        this.updateStats();
        this.renderTags();
        this.setupEventListeners();
    }

    loadTags() {
        const savedTags = localStorage.getItem('tags');
        if (savedTags) {
            this.tags = JSON.parse(savedTags);
        }
    }

    loadTasks() {
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
            this.tasks = JSON.parse(savedTasks).map(task => ({
                ...task,
                tags: extractEtiquetas(task.title)
            }));
        }
    }

    updateStats() {
        const totalTags = document.getElementById('total-tags');
        const totalTasks = document.getElementById('total-tasks');
        const mostUsedTag = document.getElementById('most-used-tag');

        if (totalTags) {
            totalTags.textContent = this.tasks.length;
        }

        if (totalTasks) {
            totalTasks.textContent = this.tasks.length;
        }

        if (mostUsedTag) {
            let maxCount = 0;
            let mostUsed = 'Nenhuma';
            
            this.tasks.forEach(task => {
                const tags = extractEtiquetas(task.title);
                tags.forEach(tag => {
                    const count = this.getTagCount(tag);
                    if (count > maxCount) {
                        maxCount = count;
                        mostUsed = tag;
                    }
                });
            });

            mostUsedTag.textContent = mostUsed;
        }
    }

    renderTags() {
        const tagsContainer = document.getElementById('tags-container');
        if (!tagsContainer) return;

        tagsContainer.innerHTML = '';
        const searchTerm = document.getElementById('tag-search')?.value.toLowerCase() || '';

        this.tasks.forEach(task => {
            const tags = extractEtiquetas(task.title);
            tags.forEach(tag => {
                if (tag.toLowerCase().includes(searchTerm)) {
                    const tagElement = document.createElement('div');
                    tagElement.className = `tag ${this.selectedTag === tag ? 'selected' : ''}`;
                    tagElement.innerHTML = `
                        <span class="tag-name">${tag}</span>
                        <span class="tag-count">${this.getTagCount(tag)}</span>
                        <button class="delete-tag" data-tag="${tag}">×</button>
                    `;
                    tagElement.style.backgroundColor = this.getTagColor(tag);
                    tagsContainer.appendChild(tagElement);
                }
            });
        });
    }

    selectTag(tag) {
        this.selectedTag = tag;
        this.renderTags();
        this.renderFilteredTasks();
    }

    deleteTag(tag) {
        if (confirm(`Tem certeza que deseja excluir a etiqueta "${tag}"?`)) {
            // Remove a etiqueta de todas as tarefas
            this.tasks = this.tasks.map(task => {
                const tags = extractEtiquetas(task.title);
                const newTags = tags.filter(t => t !== tag);
                const newTitle = task.title.replace(new RegExp(`@${tag}\\b`, 'g'), '').trim();
                return {
                    ...task,
                    title: newTitle
                };
            });

            // Atualiza o localStorage
            localStorage.setItem('tasks', JSON.stringify(this.tasks));

            // Atualiza a interface
            if (this.selectedTag === tag) {
                this.selectedTag = null;
            }
            this.updateStats();
            this.renderTags();
            this.renderFilteredTasks();
        }
    }

    renderFilteredTasks() {
        const filteredTasksList = document.getElementById('filteredTasksList');
        if (!filteredTasksList) return;

        filteredTasksList.innerHTML = '';

        if (!this.selectedTag) {
            filteredTasksList.innerHTML = '<p class="text-muted">Selecione uma etiqueta para ver as tarefas</p>';
            return;
        }

        const filteredTasks = this.tasks.filter(task => 
            task.tags.includes(this.selectedTag)
        );

        if (filteredTasks.length === 0) {
            filteredTasksList.innerHTML = '<p class="text-muted">Nenhuma tarefa encontrada com esta etiqueta</p>';
            return;
        }

        filteredTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task-item';
            taskElement.innerHTML = `
                <div class="task-content">
                    <h5>${task.title}</h5>
                    <p class="text-muted">${task.description || 'Sem descrição'}</p>
                    <div class="task-meta">
                        <span class="badge bg-${task.priority}">${task.priority}</span>
                        <small>${new Date(task.date).toLocaleDateString()}</small>
                    </div>
                </div>
            `;
            filteredTasksList.appendChild(taskElement);
        });
    }

    setupEventListeners() {
        const tagSearch = document.getElementById('tag-search');
        if (tagSearch) {
            tagSearch.addEventListener('input', () => {
                const searchTerm = tagSearch.value.toLowerCase();
                this.renderTags();
            });
        }

        const tagsContainer = document.getElementById('tags-container');
        if (tagsContainer) {
            tagsContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-tag')) {
                    const tagName = e.target.dataset.tag;
                    this.deleteTag(tagName);
                } else if (e.target.closest('.tag')) {
                    const tagName = e.target.closest('.tag').querySelector('.tag-name').textContent;
                    this.selectTag(tagName);
                }
            });
        }
    }

    getTagCount(tagName) {
        return this.tasks.filter(task => task.tags.includes(tagName)).length;
    }

    getTagColor(tagName) {
        const tag = this.tags.find(t => t.name === tagName);
        return tag ? tag.color : '#000000';
    }
} 