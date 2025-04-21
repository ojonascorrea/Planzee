const taskForm = document.getElementById('task-form');
const taskList = document.getElementById('task-list');
const filterButtons = document.querySelectorAll('.filter-btn');
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
const searchInput = document.getElementById('search-input');
const sortByDateBtn = document.getElementById('sort-by-date-btn');
const periodButtons = document.querySelectorAll('.period-btn');
const categorySelect = document.getElementById('category-select');
let productivityChart;

// Estado da aplicação
let currentFilter = 'all';
let currentPeriod = 'semana';
let currentCategory = 'all';

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadTasks();
    setupEventListeners();
    fillDateTimeInputs();
    updateProgress();
    createChart(generateProductivityData());
    updateCategorySelect();
    
    // Define o botão da semana como ativo por padrão
    document.querySelector('.period-btn[data-period="semana"]').classList.add('active');
    
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
});

// Configuração de Event Listeners
function setupEventListeners() {
    // Formulário de tarefa
    taskForm.addEventListener('submit', handleTaskSubmit);
    
    // Filtros
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => handleFilterClick(btn));
    });
    
    // Período
    periodButtons.forEach(btn => {
        btn.addEventListener('click', () => handlePeriodClick(btn));
    });
    
    // Tema
    themeToggle.addEventListener('click', toggleTheme);
    
    // Busca
    searchInput.addEventListener('input', handleSearch);
    
    // Ordenação
    sortByDateBtn.addEventListener('click', sortTasksByDate);
    
    // Categoria
    categorySelect.addEventListener('change', handleCategoryChange);
    
    // Arrastar e soltar
    taskList.addEventListener('dragover', handleDragOver);
}

// Manipulação de Tarefas
function handleTaskSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('task-title').value;
    const date = document.getElementById('task-date').value;
    const time = document.getElementById('task-time').value;
    const priority = document.getElementById('task-priority').value;
    const category = document.getElementById('task-category').value.trim();
    
    if (!title || !date || !time) return;
    
    addTask(title, date, time, false, priority, category);
    
    taskForm.reset();
    fillDateTimeInputs();
    updateProgress();
    createChart(generateProductivityData());
    updateCategorySelect();
}

function addTask(title, date, time, completed, priority, category = '') {
    const li = document.createElement('li');
    li.setAttribute('draggable', true);
    li.setAttribute('data-category', category || 'outros');
    li.setAttribute('data-date', `${date}T${time}`);
    
    li.innerHTML = `
        <span class="task-info">
            <span class="badge badge-${priority}">${priority.toUpperCase()}</span>
            ${category ? `<span class="category-badge">${category}</span>` : ''}
            <strong class="task-title">${title}</strong> - 
            <small>${formatDate(date)} às ${time}</small>
        </span>
        <div class="actions">
            <input type="checkbox" class="complete-checkbox" ${completed ? 'checked' : ''}>
            <button class="delete-btn">🗑️</button>
        </div>
    `;
    
    setupTaskEventListeners(li);
    taskList.prepend(li);
    saveTasks();
}

function setupTaskEventListeners(li) {
    // Drag and Drop
    li.addEventListener('dragstart', () => li.classList.add('dragging'));
    li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
        saveTasks();
    });
    
    // Edição de título
    const titleElement = li.querySelector('.task-title');
    titleElement.addEventListener('click', () => startEditingTitle(titleElement, li));
    
    // Checkbox
    const checkbox = li.querySelector('.complete-checkbox');
    checkbox.addEventListener('change', () => {
        li.classList.toggle('task-completed', checkbox.checked);
        saveTasks();
        updateProgress();
        createChart(generateProductivityData());
    });
    
    // Botão de deletar
    const deleteBtn = li.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => {
        li.classList.add('fade-out');
        li.addEventListener('animationend', () => {
            li.remove();
            saveTasks();
            updateProgress();
            createChart(generateProductivityData());
        }, { once: true });
    });
}

function startEditingTitle(titleElement, li) {
    const currentTitle = titleElement.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentTitle;
    input.className = 'edit-input';

    titleElement.replaceWith(input);
    input.focus();

    input.addEventListener('blur', () => finishEditing(input, li));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            finishEditing(input, li);
        }
    });
}

function finishEditing(input, li) {
    const newTitle = input.value.trim() || "Sem título";
    const newTitleElement = document.createElement('strong');
    newTitleElement.className = 'task-title';
    newTitleElement.textContent = newTitle;
    newTitleElement.addEventListener('click', () => startEditingTitle(newTitleElement, li));
    input.replaceWith(newTitleElement);
    saveTasks();
}

function handleDragOver(e) {
    e.preventDefault();
    const draggingItem = document.querySelector('.dragging');
    if (!draggingItem) return;
    
    const afterElement = getDragAfterElement(taskList, e.clientY);
    if (afterElement == null) {
        taskList.appendChild(draggingItem);
    } else {
        taskList.insertBefore(draggingItem, afterElement);
    }
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];
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

// Filtros e Busca
function handleFilterClick(btn) {
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    applyFilters();
}

function handlePeriodClick(btn) {
    periodButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPeriod = btn.dataset.period;
    applyFilters();
}

function handleCategoryChange() {
    currentCategory = this.value;
    applyFilters();
}

function handleSearch() {
    const searchText = this.value.toLowerCase();
    applyFilters(searchText);
}

function applyFilters(searchText = '') {
    const tasks = taskList.querySelectorAll('li');
    
    tasks.forEach(task => {
        const title = task.querySelector('.task-title').textContent.toLowerCase();
        const isCompleted = task.querySelector('.complete-checkbox').checked;
        const taskDate = new Date(task.dataset.date);
        const taskCategory = task.getAttribute('data-category');
        
        let shouldShow = true;
        
        // Aplica filtro de status
        if (currentFilter === 'pending' && isCompleted) shouldShow = false;
        if (currentFilter === 'completed' && !isCompleted) shouldShow = false;
        
        // Aplica filtro de período
        if (shouldShow) {
            switch(currentPeriod) {
                case 'dia':
                    shouldShow = isSameDay(taskDate, new Date());
                    break;
                case 'semana':
                    shouldShow = isSameWeek(taskDate, new Date());
                    break;
                case 'mes':
                    shouldShow = isSameMonth(taskDate, new Date());
                    break;
            }
        }
        
        // Aplica filtro de categoria
        if (shouldShow && currentCategory !== 'all' && taskCategory !== currentCategory) {
            shouldShow = false;
        }
        
        // Aplica busca
        if (shouldShow && searchText && !title.includes(searchText)) {
            shouldShow = false;
        }
        
        task.style.display = shouldShow ? 'flex' : 'none';
    });
}

// Tema
function toggleTheme() {
    body.classList.toggle('dark');
    const currentTheme = body.classList.contains('dark') ? 'dark' : '';
    localStorage.setItem('theme', currentTheme);
    updateThemeButton();
}

function updateThemeButton() {
    themeToggle.textContent = body.classList.contains('dark') ? '☀️ Alternar Tema' : '🌙 Alternar Tema';
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark');
    }
    updateThemeButton();
}

// Armazenamento
function saveTasks() {
    const tasks = Array.from(taskList.children).map(li => ({
        title: li.querySelector('.task-title').textContent,
        date: li.dataset.date.split('T')[0],
        time: li.dataset.date.split('T')[1],
        completed: li.querySelector('.complete-checkbox').checked,
        priority: li.querySelector('.badge').classList[1].split('-')[1],
        category: li.getAttribute('data-category')
    }));
    
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function loadTasks() {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    tasks.forEach(task => {
        addTask(
            task.title,
            task.date,
            task.time,
            task.completed,
            task.priority,
            task.category
        );
    });
}

// Utilitários
function fillDateTimeInputs() {
    const now = new Date();
    const dateInput = document.getElementById('task-date');
    const timeInput = document.getElementById('task-time');
    
    dateInput.value = now.toISOString().split('T')[0];
    timeInput.value = now.toTimeString().slice(0, 5);
}

function formatDate(dateString) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
}

function updateProgress() {
    const tasks = taskList.querySelectorAll('li');
    const completed = taskList.querySelectorAll('.complete-checkbox:checked');
    
    const total = tasks.length;
    const done = completed.length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    
    document.getElementById('progress-bar').style.width = `${percent}%`;
    document.getElementById('progress-text').textContent = 
        `${done} de ${total} tarefas concluídas (${percent}%)`;
}

// Gráfico
function createChart(data) {
    const ctx = document.getElementById('productivity-chart').getContext('2d');
    
    if (productivityChart) {
        productivityChart.destroy();
    }
    
    productivityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Tarefas Concluídas',
                data: data.values,
                backgroundColor: '#4CAF50'
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            }
        }
    });
}

function generateProductivityData() {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const today = new Date();
    const labels = [];
    const values = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        
        labels.push(date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
        
        const completedTasks = tasks.filter(task => {
            const taskDate = new Date(task.date);
            return task.completed && isSameDay(taskDate, date);
        }).length;
        
        values.push(completedTasks);
    }
    
    return { labels, values };
}

// Funções auxiliares de data
function isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
}

function isSameWeek(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.abs((date1 - date2) / oneDay);
    return diffDays < 7;
}

function isSameMonth(date1, date2) {
    return date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
}

// Ordenação
function sortTasksByDate() {
    const tasks = Array.from(taskList.children);
    tasks.sort((a, b) => {
        const dateA = new Date(a.dataset.date);
        const dateB = new Date(b.dataset.date);
        return dateA - dateB;
    });
    
    tasks.forEach(task => taskList.appendChild(task));
    saveTasks();
}

// Categorias
function updateCategorySelect() {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const categories = new Set(tasks.map(task => task.category).filter(Boolean));
    
    categorySelect.innerHTML = '<option value="all">Todas as categorias</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        categorySelect.appendChild(option);
    });
}

// Notificações
setInterval(checkTasksForNotifications, 60000);

function checkTasksForNotifications() {
    if (Notification.permission !== "granted") return;
    
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const now = new Date();
    
    tasks.forEach(task => {
        if (!task.completed) {
            const taskDateTime = new Date(`${task.date}T${task.time}`);
            const diffMinutes = (taskDateTime - now) / 60000;
            
            if (diffMinutes >= 0 && diffMinutes <= 5) {
                new Notification("Lembrete de Tarefa 🛎️", {
                    body: `Hora de: ${task.title} (${task.time})`,
                    icon: "icon-192.png"
                });
            }
        }
    });
}


