document.addEventListener('DOMContentLoaded', function () {
    loadTasks(); // Load tasks when the page loads
});

document.getElementById('addTaskBtn').addEventListener('click', function () {
    const taskInput = document.getElementById('taskInput');
    const taskList = document.getElementById('taskList');

    if (taskInput.value.trim() !== '') {
        const taskItem = document.createElement('li');
        taskItem.className = 'list-group-item d-flex justify-content-between align-items-center';

        // Task text
        const taskText = document.createElement('span');
        taskText.textContent = taskInput.value;

        // Complete button
        const completeBtn = document.createElement('button');
        completeBtn.textContent = 'Complete';
        completeBtn.className = 'btn btn-success btn-sm';
        completeBtn.addEventListener('click', function () {
            taskText.style.textDecoration = 'line-through'; // Strike-through text
            completeBtn.disabled = true; // Disable button after marking
            updateTaskInLocalStorage(taskText.textContent, true); // Mark as complete in localStorage
        });

        // Append text and button to the list item
        taskItem.appendChild(taskText);
        taskItem.appendChild(completeBtn);
        taskList.appendChild(taskItem);

        // Save to localStorage
        saveTaskToLocalStorage(taskInput.value);

        // Clear input field
        taskInput.value = '';
    } else {
        alert('Please enter a task!');
    }
});

function saveTaskToLocalStorage(task) {
    let tasks;
    if (localStorage.getItem('tasks') === null) {
        tasks = [];
    } else {
        tasks = JSON.parse(localStorage.getItem('tasks'));
    }

    tasks.push({ text: task, completed: false }); // Store task as an object with completed status
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function loadTasks() {
    const taskList = document.getElementById('taskList');
    let tasks;
    if (localStorage.getItem('tasks') === null) {
        tasks = [];
    } else {
        tasks = JSON.parse(localStorage.getItem('tasks'));
    }

    tasks.forEach(function (task) {
        const taskItem = document.createElement('li');
        taskItem.className = 'list-group-item d-flex justify-content-between align-items-center';

        // Task text
        const taskText = document.createElement('span');
        taskText.textContent = task.text;

        // Complete button
        const completeBtn = document.createElement('button');
        completeBtn.textContent = 'Complete';
        completeBtn.className = 'btn btn-success btn-sm';

        if (task.completed) {
            taskText.style.textDecoration = 'line-through';
            completeBtn.disabled = true;
        }

        completeBtn.addEventListener('click', function () {
            taskText.style.textDecoration = 'line-through';
            completeBtn.disabled = true;
            updateTaskInLocalStorage(task.text, true); // Mark as complete in localStorage
        });

        // Append text and button to the list item
        taskItem.appendChild(taskText);
        taskItem.appendChild(completeBtn);
        taskList.appendChild(taskItem);
    });
}

function updateTaskInLocalStorage(taskText, completed) {
    let tasks = JSON.parse(localStorage.getItem('tasks'));
    tasks.forEach(function (task) {
        if (task.text === taskText) {
            task.completed = completed;
        }
    });
    localStorage.setItem('tasks', JSON.stringify(tasks));
}