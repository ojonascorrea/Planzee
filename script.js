const taskForm = document.getElementById('task-form');
const taskList = document.getElementById('task-list');
const filterButtons = document.querySelectorAll('.filter-btn');
const themeToggle = document.getElementById('theme-toggle');

// Carrega tarefas e tema ao iniciar
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    loadTheme();
    fillDateTimeInputs(); // 🆕 Chama para preencher a data/hora automaticamente
});

function fillDateTimeInputs() {
    const now = new Date();

    const dateInput = document.getElementById('task-date');
    const timeInput = document.getElementById('task-time');

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // mês começa em 0
    const day = String(now.getDate()).padStart(2, '0');

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    dateInput.value = `${year}-${month}-${day}`;
    timeInput.value = `${hours}:${minutes}`;
}

taskForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const title = document.getElementById('task-title').value;
    const date = document.getElementById('task-date').value;
    const time = document.getElementById('task-time').value;
    const priority = document.getElementById('task-priority').value;

    addTask(title, date, time, false, priority);
    updateProgress();

    taskForm.reset();
    fillDateTimeInputs(); //Chama para preencher a data/hora automaticamente
    saveTasks();
});

function addTask(title, date, time, completed, priority) {
    const li = document.createElement('li');
    li.setAttribute('draggable', true);
    li.addEventListener('dragstart', function (e) {
        li.classList.add('dragging');
    });
    
    li.addEventListener('dragend', function (e) {
        li.classList.remove('dragging');
        saveTasks(); // Salva nova ordem após mover
    });

    li.innerHTML = `
        <span class="task-info">
            <span class="badge badge-${priority}">${priority.toUpperCase()}</span>
            <strong class="task-title">${title}</strong> - 
            <small>${formatDate(date)} às ${time}</small>
        </span>
        <div class="actions">
            <input type="checkbox" class="complete-checkbox" ${completed ? 'checked' : ''}>
            <button class="delete-btn">🗑️</button>
        </div>
    `;

    const titleElement = li.querySelector('.task-title');
    const checkbox = li.querySelector('.complete-checkbox');
    const deleteBtn = li.querySelector('.delete-btn');

    // 🖊️ Clicar para editar o título
    titleElement.addEventListener('click', function () {
        const currentTitle = this.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentTitle;
        input.className = 'edit-input';

        this.replaceWith(input);
        input.focus();

        input.addEventListener('blur', function () {
            finishEditing(input, li);
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                finishEditing(input, li);
            }
        });
    });

    checkbox.addEventListener('change', function() {
        li.classList.toggle('task-completed', this.checked);
        saveTasks();
        updateProgress();
    });

    deleteBtn.addEventListener('click', function() {
        li.classList.add('fade-out');
    
        li.addEventListener('animationend', function() {
            li.remove();
            updateProgress();
            saveTasks();
        
        }, { once: true });
    });    

    if (completed) {
        li.classList.add('task-completed');
    }

    taskList.prepend(li);
}

// Função para arrastar e soltar
taskList.addEventListener('dragover', function (e) {
    e.preventDefault();
    const draggingItem = document.querySelector('.dragging');
    const afterElement = getDragAfterElement(taskList, e.clientY);

    if (afterElement == null) {
        taskList.appendChild(draggingItem);
    } else {
        taskList.insertBefore(draggingItem, afterElement);
    }
});

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


// Função para finalizar edição
function finishEditing(input, li) {
    const newTitle = input.value.trim() || "Sem título";

    const newTitleElement = document.createElement('strong');
    newTitleElement.className = 'task-title';
    newTitleElement.textContent = newTitle;

    newTitleElement.addEventListener('click', function () {
        const currentTitle = this.textContent;
        const inputAgain = document.createElement('input');
        inputAgain.type = 'text';
        inputAgain.value = currentTitle;
        inputAgain.className = 'edit-input';

        this.replaceWith(inputAgain);
        inputAgain.focus();

        inputAgain.addEventListener('blur', function () {
            finishEditing(inputAgain, li);
        });

        inputAgain.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                finishEditing(inputAgain, li);
            }
        });
    });

    input.replaceWith(newTitleElement);
    saveTasks();
}

function saveTasks() {
    const tasks = [];
    const lis = taskList.querySelectorAll('li');
    
    lis.forEach(li => {
        const title = li.querySelector('strong').textContent;
        const dateTimeText = li.querySelector('small').textContent;
        const [dateText, timeText] = dateTimeText.split(' às ');
        const dateParts = dateText.split('/');
        const date = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
        const time = timeText;
        const completed = li.querySelector('.complete-checkbox').checked;
        const priority = li.querySelector('.badge').textContent.toLowerCase();
        tasks.push({ title, date, time, completed, priority });
    });

    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function loadTasks() {
    const storedTasks = localStorage.getItem('tasks');
    if (!storedTasks) return;

    const tasks = JSON.parse(storedTasks);

    tasks.forEach(task => {
        addTask(task.title, task.date, task.time, task.completed, task.priority);
        updateProgress();
    });
}

function formatDate(dateString) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
}

// Filtros
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelector('.filter-btn.active').classList.remove('active');
        btn.classList.add('active');

        const filter = btn.getAttribute('data-filter');
        applyFilter(filter);
    });
});

function applyFilter(filter) {
    const lis = taskList.querySelectorAll('li');

    lis.forEach(li => {
        switch(filter) {
            case 'all':
                li.style.display = 'flex';
                break;
            case 'pending':
                li.style.display = li.querySelector('.complete-checkbox').checked ? 'none' : 'flex';
                break;
            case 'completed':
                li.style.display = li.querySelector('.complete-checkbox').checked ? 'flex' : 'none';
                break;
        }
    });
}

// Tema
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    saveTheme();
    updateThemeIcon();
});

function saveTheme() {
    const theme = document.body.classList.contains('dark') ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
}

function loadTheme() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
        document.body.classList.add('dark');
    }
    updateThemeIcon();
}

function updateThemeIcon() {
    if (document.body.classList.contains('dark')) {
        themeToggle.textContent = '☀️ Alternar Tema';
    } else {
        themeToggle.textContent = '🌙 Alternar Tema';
    }
}

const searchInput = document.getElementById('search-input');

searchInput.addEventListener('input', function() {
    const searchText = this.value.toLowerCase();
    const tasks = taskList.querySelectorAll('li');

    tasks.forEach(task => {
        const title = task.querySelector('.task-title').textContent.toLowerCase();
        if (title.includes(searchText)) {
            task.style.display = 'flex';
        } else {
            task.style.display = 'none';
        }
    });
});

// Atualiza a barra de progresso
function updateProgress() {
    const tasks = taskList.querySelectorAll('li');
    const completed = taskList.querySelectorAll('.complete-checkbox:checked');

    const total = tasks.length;
    const done = completed.length;

    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${done} de ${total} tarefas concluídas (${percent}%)`;
}
