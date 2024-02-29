document.addEventListener('DOMContentLoaded', function () {

    // Function to load the last active section
    loadLastActiveSection();
    // Function to fetch and update timer state
    fetchAndUpdateTimerState();

    // Load tasks from storage
    loadTasks();

    // Load Pomodoro timer state from storage
    loadPomodoroState();

    // References to DOM elements
    const addButton = document.getElementById('add-todo');
    const inputField = document.getElementById('todo-input');
    const todoList = document.getElementById('todo-list');
    const pomodoroFeatures = document.getElementById('pomodoro-features');
    const startButton = document.getElementById('start-pomodoro');
    const durationInput = document.getElementById('pomodoro-duration');
    const progressElement = document.getElementById('pomodoro-progress');
    const timeElement = document.getElementById('pomodoro-time');
    const pomodoroOverlay = document.getElementById('pomodoro-overlay');

    // Set focus on input field and default value for duration input
    inputField.focus();
    durationInput.value = "5";

    // Event listener for adding a todo item
    addButton.addEventListener('click', addTodo);
    inputField.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            addTodo();
        }
    });

    // Event listener for updating UI based on message from background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.command === "updateUI") {
            updateTimerUI(message.remainingTime);
            updateProgressBar(message.progress);
            startButton.textContent = message.isTimerActive ? 'Reset' : 'Start';
            // Make sure togglePomodoroFeatures and other UI update functions are called if necessary
        }
    });

    // Fetch initial state from background and update UI
    chrome.runtime.sendMessage({command: "getState"}, function(response) {
        if (response) {
            updateTimerUI(response.remainingTime);
            updateProgressBar(response.progress);
            startButton.textContent = response.isTimerActive ? 'Reset' : 'Start';
            // Further UI updates based on response
        }
    });

    // Event listeners for selecting Pomodoro and Todo list sections
    document.getElementById('select-pomodoro').addEventListener('click', function (e) {
        e.preventDefault();
        togglePomodoroFeatures(true);
        console.log('Pomodoro section selected');
        saveLastActiveSection('pomodoro')
    });

    document.getElementById('select-todolist').addEventListener('click', function (e) {
        e.preventDefault();
        togglePomodoroFeatures(false);
        console.log('Todolist section selected');
        saveLastActiveSection('todolist')
    });

    // Event listener for starting and resetting Pomodoro timer
    startButton.addEventListener('click', function () {
        if (startButton.textContent === 'Start') {
            // Start timer logic, already working
        } else if (startButton.textContent === 'Reset') {
            // Reset timer logic
            chrome.runtime.sendMessage({command: "reset"});
        }
    });

    // Event listener for starting or resetting Pomodoro timer based on button text
    startButton.addEventListener('click', function () {
        if (startButton.textContent === 'Start') {
            const duration = parseInt(durationInput.value) * 60;
            if (isNaN(duration) || duration <= 0) {
                alert("Please enter a valid number for the duration.");
                return;
            }
            chrome.runtime.sendMessage({command: "start", duration: duration});
            startButton.textContent = 'Reset'; // Change button text to "Reset"
        } else {
            chrome.runtime.sendMessage({command: "reset"});
            startButton.textContent = 'Start'; // Change button text back to "Start"
        }
    });

    // Event listener for toggling pause on Pomodoro timer
    pomodoroOverlay.addEventListener('click', function () {
        chrome.runtime.sendMessage({command: "togglePause"});
    });

    // Function to update dropdown menu based on current section
    function updateDropdownMenu(currentSection) {
        const dropdownContent = document.querySelector('.dropdown-content');
        dropdownContent.innerHTML = ''; // Clear current dropdown content
    
        if (currentSection === 'pomodoro') {
            const todoListOption = document.createElement('a');
            todoListOption.href = "#";
            todoListOption.id = "select-todolist";
            todoListOption.textContent = "To Do List";
            todoListOption.addEventListener('click', function (e) {
                e.preventDefault();
                togglePomodoroFeatures(false);
                console.log('TodoList section selected');
                saveLastActiveSection('todolist');
            });
            dropdownContent.appendChild(todoListOption);
        } else {
            const pomodoroOption = document.createElement('a');
            pomodoroOption.href = "#";
            pomodoroOption.id = "select-pomodoro";
            pomodoroOption.textContent = "Pomodoro";
            pomodoroOption.addEventListener('click', function (e) {
                e.preventDefault();
                togglePomodoroFeatures(true);
                console.log('Pomodoro section selected');
                saveLastActiveSection('pomodoro');
            });
            dropdownContent.appendChild(pomodoroOption);
        }
    }

    // Function to toggle visibility of Pomodoro features and ToDo list
    function togglePomodoroFeatures(show) {
        console.log('Toggling Pomodoro Features:', show);
        pomodoroFeatures.style.display = show ? "block" : "none";
        todoList.style.display = show ? "none" : "block";
        inputField.style.display = show ? "none" : "block";
        addButton.style.display = show ? "none" : "inline-flex";
        document.getElementById('todo-app').classList.toggle('pomodoro-mode', show);
    
        // Save the current section state (Pomodoro or To Do List)
        const section = show ? 'pomodoro' : 'todolist';
        saveLastActiveSection(section);
        
        // Update Dropdown Menu based on the current section
        updateDropdownMenu(section);
    }

    // Function to update timer UI
    function updateTimerUI(remainingTime) {
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        timeElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    // Function to update progress bar
    function updateProgressBar(progress) {
        const circumference = progressElement.r.baseVal.value * 2 * Math.PI;
        const offset = circumference * (1 - progress / 100);
        progressElement.style.strokeDashoffset = offset.toString();
    }

    // Function to periodically update from background
    function updateFromBackground() {
        chrome.runtime.sendMessage({command: "getState"}, function(response) {
            updateTimerUI(response.remainingTime);
            updateProgressBar(response.progress);
            startButton.textContent = response.isTimerActive ? 'Reset' : 'Start';
        });
    }

    setInterval(updateFromBackground, 1000);


    // Function to load tasks from storage
    function loadTasks() {
        chrome.storage.local.get(['tasks'], function (result) {
            const tasks = result.tasks || [];
            tasks.forEach(taskText => {
                addTaskToList(taskText);
            });
        });
    }

    // Function to add a task to the list
    function addTaskToList(taskText) {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<span>${taskText}</span> <button class="delete-todo">&#x2713;</button>`;
        const deleteButton = listItem.querySelector('.delete-todo');
        deleteButton.addEventListener('click', function () {
            this.classList.toggle('checked');
            setTimeout(() => {
                todoList.removeChild(listItem);
                saveTasks();
            }, 500);
        });

        todoList.prepend(listItem);
    }

    // Function to add a todo
    function addTodo() {
        const taskText = inputField.value.trim();
        if (taskText === '') {
            return;
        }

        addTaskToList(taskText);
        inputField.value = '';
        inputField.focus();
        saveTasks();
    }

    // Function to fetch and update timer state
    function fetchAndUpdateTimerState() {
        chrome.storage.local.get(['lastActiveSection'], function(result) {
            const lastActiveSection = result.lastActiveSection;
            
            chrome.runtime.sendMessage({command: "getState"}, function(response) {
                if (response) {
                    // Update timer UI
                    updateTimerUI(response.remainingTime);
                    updateProgressBar(response.progress);
                    
                    // Update the start/pause button text accordingly
                    const startButton = document.getElementById('start-pomodoro');
                    startButton.textContent = response.isTimerActive ? 'Reset' : 'Start';
                    
                    // Toggle the pomodoro features based on the last active section
                    const showPomodoroFeatures = lastActiveSection === 'pomodoro';
                    togglePomodoroFeatures(showPomodoroFeatures);
                }
            });
        });
    }

    // Function to save tasks to storage
    function saveTasks() {
        const tasks = [];
        document.querySelectorAll('#todo-list li span').forEach(taskElement => {
            tasks.push(taskElement.textContent);
        });
        chrome.storage.local.set({ 'tasks': tasks });
    }

    // Function to load Pomodoro state from storage
    function loadPomodoroState() {
        chrome.storage.local.get(['pomodoroState'], function (result) {
            const state = result.pomodoroState;
            if (state) {
                remainingTime = state.remainingTime;
                isTimerActive = state.isTimerActive;
                isTimerPaused = state.isTimerPaused;
                const savedDuration = state.duration || 5; // Use saved duration or default
                durationInput.value = savedDuration; // Update the value displayed in the input field
    
                updateTimerUI(remainingTime); // Update the timer display according to the remaining time
    
                if (isTimerActive) {
                    
                    startButton.textContent = 'Reset';
                    if (!isTimerPaused) {
                       
                        startPomodoroTimer();
                    }
                } else {
                    
                    resetPomodoroUI(); // Make sure UI is reset properly
                }
            }
        });
    }
  
    // Function to save the last active section to storage
    function saveLastActiveSection(section) {
        chrome.storage.local.set({ 'lastActiveSection': section }, function() {
            console.log('Last active section saved:', section);
        });
    }

    // Function to load the last active section from storage
    function loadLastActiveSection() {
        chrome.storage.local.get(['lastActiveSection'], function(result) {
            console.log('SHDOAHOAHD', result.lastActiveSection)
            if (result.lastActiveSection == 'pomodoro') {
                togglePomodoroFeatures(result.lastActiveSection === 'pomodoro');
            } else {
                
                togglePomodoroFeatures(false);
            }
        });
    }
});
