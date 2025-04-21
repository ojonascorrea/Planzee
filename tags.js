// Elementos do DOM
const tagsContainer = document.getElementById('tagsList');
const statsContainer = document.querySelector('.tags-stats');
const filteredTasksList = document.getElementById('tag-tasks');
const tagSearch = document.getElementById('tagSearch');
const themeToggle = document.getElementById('themeToggle');

// Pega o parâmetro da URL
const urlParams = new URLSearchParams(window.location.search);
const tag = urlParams.get('tag');

// Seleciona o container onde as tarefas vão aparecer
const tagTasksContainer = document.getElementById('tag-tasks');
const tagTitle = document.getElementById('tag-title');

if (tag && tagTasksContainer && tagTitle) {
    // Atualiza o título da página
    tagTitle.innerText = `Tarefas com a tag @${tag}`;

    // Carrega as tarefas do localStorage
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    // Filtra as tarefas que contém a tag
    const filteredTasks = tasks.filter(task => {
        const taskTags = extractEtiquetas(task.title);
        return taskTags.includes(tag);
    });

    // Gera o HTML das tarefas filtradas
    if (filteredTasks.length === 0) {
        tagTasksContainer.innerHTML = `<p class="empty-message">Nenhuma tarefa encontrada para a tag @${tag}</p>`;
    } else {
        tagTasksContainer.innerHTML = filteredTasks.map(task => `
            <li class="task-item">
                <div class="task-content">
                    <strong class="task-title">${task.title}</strong>
                    <div class="task-meta">
                        <span class="badge badge-${task.priority}">${task.priority}</span>
                        <small class="task-date">${formatDate(task.date)} ${task.time}</small>
                    </div>
                </div>
            </li>
        `).join('');
    }
}

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
    const regex = /@(\w+)/g;
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
    // Inicializa o tema
    loadTheme();
    
    // Adiciona evento de clique no botão de tema
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }

    // Inicializa o gerenciador de etiquetas
    const tagManager = new TagManager();
    tagManager.init();

    // Renderiza as etiquetas
    renderTags();
    showStats();
});

// Evento de busca de etiquetas
if (tagSearch) {
    tagSearch.addEventListener('input', (e) => {
        renderTags(e.target.value);
    });
}

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
        const totalTags = document.getElementById('totalTags');
        const usedTags = document.getElementById('usedTags');

        if (totalTags) {
            // Conta o número total de etiquetas únicas
            const allTags = new Set();
            this.tasks.forEach(task => {
                const tags = extractEtiquetas(task.title);
                tags.forEach(tag => allTags.add(tag));
            });
            totalTags.textContent = allTags.size;
        }

        if (usedTags) {
            // Conta quantas tarefas têm pelo menos uma etiqueta
            const tasksWithTags = this.tasks.filter(task => 
                extractEtiquetas(task.title).length > 0
            ).length;
            usedTags.textContent = tasksWithTags;
        }
    }

    renderTags() {
        const tagsContainer = document.getElementById('tagsList');
        if (!tagsContainer) return;

        tagsContainer.innerHTML = '';
        const searchTerm = document.getElementById('tagSearch')?.value.toLowerCase() || '';

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
        const filteredTasksList = document.getElementById('tag-tasks');
        if (!filteredTasksList) return;

        filteredTasksList.innerHTML = '';

        if (!this.selectedTag) {
            filteredTasksList.innerHTML = '<p class="empty-message">Selecione uma etiqueta para ver as tarefas</p>';
            return;
        }

        const filteredTasks = this.tasks.filter(task => 
            extractEtiquetas(task.title).includes(this.selectedTag)
        );

        if (filteredTasks.length === 0) {
            filteredTasksList.innerHTML = '<p class="empty-message">Nenhuma tarefa encontrada com esta etiqueta</p>';
            return;
        }

        filteredTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task-item';
            taskElement.innerHTML = `
                <div class="task-content">
                    <h5 class="task-title">${task.title}</h5>
                    <div class="task-meta">
                        <span class="badge badge-${task.priority}">${task.priority}</span>
                        <small class="task-date">${formatDate(task.date)} ${task.time}</small>
                    </div>
                </div>
            `;
            filteredTasksList.appendChild(taskElement);
        });
    }

    setupEventListeners() {
        const tagSearch = document.getElementById('tagSearch');
        if (tagSearch) {
            tagSearch.addEventListener('input', () => {
                const searchTerm = tagSearch.value.toLowerCase();
                this.renderTags();
            });
        }

        const tagsContainer = document.getElementById('tagsList');
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