const taskForm = document.getElementById('task-form');
const taskList = document.getElementById('task-list');
const filterButtons = document.querySelectorAll('.filter-btn');
const themeToggle = document.getElementById('theme-toggle');

// Carrega tarefas e tema ao iniciar
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    loadTheme();
});

taskForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const title = document.getElementById('task-title').value;
    const date = document.getElementById('task-date').value;
    const time = document.getElementById('task-time').value;

    addTask(title, date, time, false);

    taskForm.reset();
    saveTasks();
});

function addTask(title, date, time, completed) {
    const li = document.createElement('li');

    li.innerHTML = `
        <span>
            <strong>${title}</strong> - 
            <small>${formatDate(date)} às ${time}</small>
        </span>
        <div class="actions">
            <input type="checkbox" class="complete-checkbox" ${completed ? 'checked' : ''}>
            <button class="delete-btn">🗑️</button>
        </div>
    `;

    const checkbox = li.querySelector('.complete-checkbox');
    const deleteBtn = li.querySelector('.delete-btn');

    checkbox.addEventListener('change', function() {
        li.classList.toggle('task-completed', this.checked);
        saveTasks();
    });

    deleteBtn.addEventListener('click', function() {
        li.remove();
        saveTasks();
    });

    if (completed) {
        li.classList.add('task-completed');
    }

    taskList.appendChild(li);
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
        tasks.push({ title, date, time, completed });
    });

    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function loadTasks() {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    tasks.forEach(task => {
        addTask(task.title, task.date, task.time, task.completed);
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
