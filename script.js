const taskForm = document.getElementById('task-form');
const taskList = document.getElementById('task-list');
const filterButtons = document.querySelectorAll('.filter-btn');
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
const searchInput = document.getElementById('search-input');
const sortByDateBtn = document.getElementById('sort-by-date-btn');
const periodButtons = document.querySelectorAll('.period-btn');
const categorySelect = document.getElementById('category-select');
const tagSelect = document.getElementById('tag-select');
const editModal = document.getElementById('edit-modal');
const editModalForm = document.getElementById('edit-modal-form');
const modalClose = document.querySelector('.modal-close');
let productivityChart;
let currentEditingTask = null;

// Estado da aplicação
let currentFilter = 'all';
let currentPeriod = 'semana';
let currentCategory = 'all';
let currentTag = 'all';

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadTasks();
    setupEventListeners();
    setupModalListeners();
    fillDateTimeInputs();
    updateProgress();
    createChart(generateProductivityData());
    updateCategorySelect();
    updateTagSelect();
    
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
    
    // Etiquetas
    tagSelect.addEventListener('change', handleTagChange);
    
    // Arrastar e soltar
    taskList.addEventListener('dragover', handleDragOver);
}

function setupTaskEventListeners(li) {
    // Drag and Drop
    li.addEventListener('dragstart', () => li.classList.add('dragging'));
    li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
        saveTasks();
    });
    
    // Botão de edição
    const editBtn = li.querySelector('.edit-btn');
    editBtn.addEventListener('click', () => {
        currentEditingTask = li;
        const currentTitle = li.querySelector('.task-title').textContent;
        const currentDate = li.dataset.date.split('T')[0];
        const currentTime = li.dataset.date.split('T')[1];
        const currentPriority = li.querySelector('.badge').classList[1].split('-')[1];
        const currentCategory = li.getAttribute('data-category');

        // Preenche o modal com os dados atuais
        document.getElementById('edit-title-modal').value = currentTitle;
        document.getElementById('edit-date-modal').value = currentDate;
        document.getElementById('edit-time-modal').value = currentTime;
        document.getElementById('edit-priority-modal').value = currentPriority;
        document.getElementById('edit-category-modal').value = currentCategory === 'outros' ? '' : currentCategory;

        // Adiciona classe para animar a tarefa
        li.classList.add('editing');

        // Mostra o modal com animação
        editModal.style.display = 'flex';
        setTimeout(() => {
            editModal.classList.add('show');
        }, 10);
    });
    
    // Checkbox
    const checkbox = li.querySelector('.complete-checkbox');
    checkbox.addEventListener('change', () => {
        li.classList.toggle('task-completed', checkbox.checked);
        saveTasks();
        updateProgress();
        createChart(generateProductivityData());
        applyFilters();
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
            updateCategorySelect();
            applyFilters();
        }, { once: true });
    });
}

// Configuração dos event listeners do modal
function setupModalListeners() {
    modalClose.addEventListener('click', closeModal);
    
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            closeModal();
        }
    });

    editModalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentEditingTask) return;

        const newTitle = document.getElementById('edit-title-modal').value;
        const newDate = document.getElementById('edit-date-modal').value;
        const newTime = document.getElementById('edit-time-modal').value;
        const newPriority = document.getElementById('edit-priority-modal').value;
        const newCategory = document.getElementById('edit-category-modal').value.trim();

        // Atualiza os dados da tarefa
        currentEditingTask.dataset.date = `${newDate}T${newTime}`;
        currentEditingTask.setAttribute('data-category', newCategory || 'outros');

        // Atualiza o HTML da tarefa
        const newTaskInfo = document.createElement('div');
        newTaskInfo.className = 'task-info';
        newTaskInfo.innerHTML = createTaskHTML(newTitle, newDate, newTime, 
            currentEditingTask.querySelector('.complete-checkbox').checked, 
            newPriority, newCategory);

        currentEditingTask.querySelector('.task-info').replaceWith(newTaskInfo);

        // Verifica se a tarefa está atrasada
        const taskDateTime = new Date(`${newDate}T${newTime}`);
        const now = new Date();
        if (taskDateTime < now && !currentEditingTask.querySelector('.complete-checkbox').checked) {
            currentEditingTask.classList.add('overdue');
        } else {
            currentEditingTask.classList.remove('overdue');
        }

        // Remove a classe de edição e adiciona animação de retorno
        currentEditingTask.classList.remove('editing');
        currentEditingTask.style.animation = 'taskSlideIn 0.3s forwards';

        // Reaplica os event listeners
        setupTaskEventListeners(currentEditingTask);

        // Atualiza tudo
        saveTasks();
        updateProgress();
        createChart(generateProductivityData());
        updateCategorySelect();
        applyFilters();

        // Fecha o modal
        closeModal();
    });
}

function closeModal() {
    editModal.classList.remove('show');
    setTimeout(() => {
        editModal.style.display = 'none';
        if (currentEditingTask) {
            currentEditingTask.classList.remove('editing');
            currentEditingTask.style.animation = 'taskSlideIn 0.3s forwards';
            currentEditingTask = null;
        }
    }, 300);
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
    updateTagSelect();
}

function extractEtiquetas(title) {
    const regex = /@(\w+)/g;
    const matches = title.match(regex);
    return matches ? matches.map(match => match.substring(1)) : [];
}

function addTask(title, date, time, completed, priority, category = '') {
    // Processa as etiquetas
    const etiquetas = extractEtiquetas(title);
    let cleanTitle = title;

    // Se quiser remover as @etiquetas do título que aparece
    if (etiquetas.length > 0) {
        cleanTitle = cleanTitle.replace(new RegExp(`@(${etiquetas.join('|')})`, 'g'), '').trim();
    }

    const li = document.createElement('li');
    li.className = 'task-item';
    li.setAttribute('draggable', true);
    li.setAttribute('data-category', category || 'outros');
    li.setAttribute('data-date', `${date}T${time}`);
    
    // Verifica se a tarefa está atrasada
    const taskDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    
    if (taskDateTime < now && !completed) {
        li.classList.add('overdue');
    }
    
    // Usa cleanTitle ao invés de title
    li.innerHTML = createTaskHTML(cleanTitle, date, time, completed, priority, category, etiquetas);
    
    setupTaskEventListeners(li);
    taskList.prepend(li);
    saveTasks();
    updateTagSelect();
}

// Função auxiliar para criar o HTML da tarefa
function createTaskHTML(title, date, time, completed, priority, category, etiquetas = []) {
    // Extrai e remove as etiquetas do título
    let cleanTitle = title;
    etiquetas.forEach(tag => {
        cleanTitle = cleanTitle.replace(`@${tag}`, '').trim();
    });

    // Cria as badges das etiquetas
    const etiquetasBadges = etiquetas.map(tag => 
        `<span class="tag-badge" data-tag="${tag}">@${tag}</span>`
    ).join('');

    return `
        <div class="task-info">
            <div class="task-header">
                <div class="task-badges">
                    <span class="badge badge-${priority}">${priority.toUpperCase()}</span>
                    ${category ? `<span class="category-badge">${category}</span>` : ''}
                    ${etiquetasBadges}
                </div>
                <div class="task-actions">
                    <input type="checkbox" class="complete-checkbox" ${completed ? 'checked' : ''}>
                    <button class="edit-btn" title="Editar">✏️</button>
                    <button class="delete-btn" title="Excluir">🗑️</button>
                </div>
            </div>
            <div class="task-content">
                <strong class="task-title">${cleanTitle}</strong>
                <div class="datetime-container">
                    <span class="task-date">${formatDate(date)}</span>
                    <span class="task-time">${time}</span>
                </div>
            </div>
        </div>
    `;
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

function handleTagChange() {
    currentTag = this.value;
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
        const taskTags = Array.from(task.querySelectorAll('.tag-badge')).map(tag => 
            tag.getAttribute('data-tag')
        );
        
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
        
        // Aplica filtro de etiqueta
        if (shouldShow && currentTag !== 'all' && !taskTags.includes(currentTag)) {
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
    const tasks = Array.from(taskList.children).map(li => {
        const title = li.querySelector('.task-title').textContent;
        const tags = Array.from(li.querySelectorAll('.tag-badge')).map(tag => tag.textContent);
        const fullTitle = title + ' ' + tags.join(' ');
        
        return {
            title: fullTitle.trim(),
            date: li.dataset.date.split('T')[0],
            time: li.dataset.date.split('T')[1],
            completed: li.querySelector('.complete-checkbox').checked,
            priority: li.querySelector('.badge').classList[1].split('-')[1],
            category: li.getAttribute('data-category')
        };
    });
    
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

// Etiquetas
function updateTagSelect() {
    const tasks = Array.from(taskList.querySelectorAll('li'));
    const tags = new Set();
    
    tasks.forEach(task => {
        const etiquetas = Array.from(task.querySelectorAll('.tag-badge')).map(tag => 
            tag.textContent.replace('@', '').trim()
        );
        etiquetas.forEach(tag => tags.add(tag));
    });
    
    tagSelect.innerHTML = '<option value="all">Todas as etiquetas</option>';
    Array.from(tags).sort().forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = '@' + tag;
        tagSelect.appendChild(option);
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





