let timerInterval;
let remainingTime = 5 * 60;
let totalDuration = 5 * 60;
let isTimerActive = false;
let isTimerPaused = false;

// Function to start the timer
function startTimer(duration) {
    if (!isTimerActive || isTimerPaused) {
        if (!isTimerActive) {
            remainingTime = duration;
            totalDuration = duration;
            isTimerPaused = false;
        }

        isTimerActive = true;

        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (isTimerPaused) return;
            if (remainingTime > 0) {
                remainingTime--;
            } else {
                clearInterval(timerInterval);
                isTimerActive = false;
                showTimerDoneNotification(); // Call the notification function here
            }
        }, 1000);
    }
}
function showTimerDoneNotification() {
    chrome.notifications.create('', {
        type: 'basic',
        iconUrl: 'icon.png', // Ensure this icon exists in your extension directory
        title: 'Pomodoro Timer',
        message: 'Time’s up! Take a short break.',
        priority: 2
    });
}


// Function to toggle pause on the timer
function togglePause() {
    if (!isTimerActive) return;
    isTimerPaused = !isTimerPaused;
}

// Event listener for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === "reset") {
        clearInterval(timerInterval);
        remainingTime = totalDuration;
        isTimerActive = false;
        isTimerPaused = false;
        chrome.runtime.sendMessage({
            command: "updateUI",
            remainingTime: remainingTime,
            isTimerActive: isTimerActive,
            isTimerPaused: isTimerPaused,
            progress: 0
        });
    }
});


// Event listener for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.command) {
        case "start":
            const duration = request.duration || 5 * 60;
            startTimer(duration);
            sendResponse({status: "Timer started"});
            break;
        case "togglePause":
            togglePause();
            sendResponse({status: "Timer " + (isTimerPaused ? "paused" : "resumed")});
            break;
        case "getState":
            const progress = ((totalDuration - remainingTime) / totalDuration) * 100;
            sendResponse({
                remainingTime: remainingTime,
                isTimerActive: isTimerActive,
                isTimerPaused: isTimerPaused,
                progress: progress
            });
            break;
    }
    return true;
});
