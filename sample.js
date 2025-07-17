// DOM Elements
const taskInput = document.getElementById("task-input");
const categoryInput = document.getElementById("category-input");
const taskListContainer = document.getElementById("task-list-container");
const repeatCheckbox = document.getElementById("repeat-checkbox");
const repeatOptions = document.getElementById("repeat-options");
const dayButtons = document.querySelectorAll(".day-btn");
const timeInput = document.getElementById("time-input");
const setReminderCheckbox = document.getElementById("set-reminder");
const themeToggle = document.getElementById("theme-toggle");
const alertContainer = document.getElementById("alert-container");

// Selected days array
let selectedDays = [];
let editMode = false;
let currentEditId = null;

// Alarm sound
const alarmSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');

// Initialize app
function init() {
  loadTheme();
  loadTasks();
  setupEventListeners();
  startReminderChecker();
}

// Set up event listeners
function setupEventListeners() {
  // Repeat checkbox toggle
  repeatCheckbox.addEventListener("change", () => {
    repeatOptions.style.display = repeatCheckbox.checked ? "flex" : "none";
    if (!repeatCheckbox.checked) {
      clearDaySelection();
      setReminderCheckbox.checked = false;
      timeInput.value = "";
      timeInput.style.display = "none";
    }
  });

  // Reminder checkbox toggle
  setReminderCheckbox.addEventListener("change", () => {
    timeInput.style.display = setReminderCheckbox.checked ? "block" : "none";
  });

  // Day selection buttons
  dayButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const day = btn.dataset.day;
      btn.classList.toggle("selected");
      
      if (btn.classList.contains("selected")) {
        if (!selectedDays.includes(day)) {
          selectedDays.push(day);
        }
      } else {
        selectedDays = selectedDays.filter(d => d !== day);
      }
    });
  });

  // Theme toggle
  themeToggle.addEventListener("click", toggleTheme);
}

// Add new task
function addTask() {
  const text = taskInput.value.trim();
  const category = categoryInput.value.trim() || "General";
  const isRecurring = repeatCheckbox.checked;
  const reminder = setReminderCheckbox.checked;
  const time = reminder ? timeInput.value : "";

  if (text === "") return;

  if (editMode && currentEditId) {
    updateTask(currentEditId, text, category, isRecurring, selectedDays, time, reminder);
    showAlert("Task updated successfully!", "success");
    editMode = false;
    currentEditId = null;
  } else {
    createTask(text, category, false, isRecurring, selectedDays, time, reminder);
    showAlert("Task added successfully!", "success");
  }

  saveTasks();

  // Reset form
  taskInput.value = "";
  categoryInput.value = "";
  repeatCheckbox.checked = false;
  repeatOptions.style.display = "none";
  setReminderCheckbox.checked = false;
  clearDaySelection();
  timeInput.value = "";
  timeInput.style.display = "none";
}

// Create task element
function createTask(text, category, completed, recurring = false, days = [], time = "", reminder = false, id = Date.now().toString()) {
  // Create category section if it doesn't exist
  let categoryDiv = document.getElementById(`category-${category}`);
  if (!categoryDiv) {
    categoryDiv = document.createElement("div");
    categoryDiv.className = "category-section";
    categoryDiv.id = `category-${category}`;

    const title = document.createElement("div");
    title.className = "category-title";
    title.textContent = category;
    title.addEventListener("click", () => {
      const ul = categoryDiv.querySelector("ul");
      ul.classList.toggle("show");
      title.classList.toggle("expanded");
    });

    const ul = document.createElement("ul");
    ul.dataset.category = category;
    ul.classList.add("show");

    categoryDiv.appendChild(title);
    categoryDiv.appendChild(ul);
    taskListContainer.appendChild(categoryDiv);
  }

  const ul = categoryDiv.querySelector("ul");

  // Create task item
  const li = document.createElement("li");
  li.dataset.id = id;
  if (completed) li.classList.add("completed");

  // Task row (content + actions)
  const taskRow = document.createElement("div");
  taskRow.className = "task-row";

  // Task content (checkbox + text)
  const taskContent = document.createElement("div");
  taskContent.className = "task-content";

  // Checkbox
  const checkboxContainer = document.createElement("label");
  checkboxContainer.className = "checkbox-container";
  checkboxContainer.innerHTML = `
    <input type="checkbox" ${completed ? 'checked' : ''}>
    <span class="checkmark"></span>
  `;
  checkboxContainer.querySelector("input").addEventListener("change", function() {
    li.classList.toggle("completed");
    const taskText = taskContent.querySelector(".task-text");
    taskText.classList.toggle("completed");
    saveTasks();
  });

  // Task text
  const taskText = document.createElement("span");
  taskText.className = "task-text" + (completed ? " completed" : "");
  taskText.textContent = text;
  taskText.addEventListener("click", () => {
    li.classList.toggle("completed");
    taskText.classList.toggle("completed");
    checkboxContainer.querySelector("input").checked = !checkboxContainer.querySelector("input").checked;
    saveTasks();
  });

  // Task actions (edit + delete)
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "task-actions";

  const editBtn = document.createElement("button");
  editBtn.className = "edit-btn";
  editBtn.innerHTML = '<i class="fas fa-edit"></i>';
  editBtn.onclick = (e) => {
    e.stopPropagation();
    enterEditMode(li, text, category, recurring, days, time, reminder);
  };

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    li.remove();
    cleanUpCategory(category);
    saveTasks();
    showAlert("Task deleted!", "warning");
  };

  // Task metadata
  const meta = document.createElement("div");
  meta.className = "task-meta";
  
  if (recurring) {
    meta.innerHTML = `
      <i class="fas fa-sync-alt"></i>
      Repeats on: ${days.join(", ")}
      ${reminder && time ? `<i class="fas fa-bell"></i> ${formatTime(time)}` : ''}
    `;
  }

  // Assemble elements
  taskContent.appendChild(checkboxContainer);
  taskContent.appendChild(taskText);
  
  actionsDiv.appendChild(editBtn);
  actionsDiv.appendChild(deleteBtn);
  
  taskRow.appendChild(taskContent);
  taskRow.appendChild(actionsDiv);
  
  li.appendChild(taskRow);
  if (recurring) li.appendChild(meta);
  ul.appendChild(li);

  // Show the category if it was hidden
  ul.classList.add("show");
  categoryDiv.querySelector(".category-title").classList.add("expanded");

  return id;
}

// Enter edit mode
function enterEditMode(li, text, category, recurring, days, time, reminder) {
  editMode = true;
  currentEditId = li.dataset.id;
  
  // Update form fields
  taskInput.value = text;
  categoryInput.value = category;
  repeatCheckbox.checked = recurring;
  repeatOptions.style.display = recurring ? "flex" : "none";
  setReminderCheckbox.checked = reminder;
  timeInput.style.display = reminder ? "block" : "none";
  timeInput.value = time || "";
  
  // Update day selection
  clearDaySelection();
  if (recurring && days.length > 0) {
    days.forEach(day => {
      const dayBtn = document.querySelector(`.day-btn[data-day="${day}"]`);
      if (dayBtn) {
        dayBtn.classList.add("selected");
        selectedDays.push(day);
      }
    });
  }
  
  // Focus on task input
  taskInput.focus();
  showAlert("Editing task...", "info");
}

// Update existing task
function updateTask(id, newText, newCategory, recurring, days, time, reminder) {
  const li = document.querySelector(`li[data-id="${id}"]`);
  if (!li) return;
  
  const oldCategory = li.closest("ul").dataset.category;
  
  // Remove from old category if category changed
  if (oldCategory !== newCategory) {
    li.remove();
    cleanUpCategory(oldCategory);
  }
  
  // Recreate task (simplest way to handle category change)
  createTask(newText, newCategory, li.classList.contains("completed"), recurring, days, time, reminder, id);
}

// Clear day selection
function clearDaySelection() {
  selectedDays = [];
  dayButtons.forEach(btn => btn.classList.remove("selected"));
}

// Clean up empty categories
function cleanUpCategory(category) {
  const ul = document.querySelector(`ul[data-category="${category}"]`);
  if (ul && ul.children.length === 0) {
    const categoryDiv = document.getElementById(`category-${category}`);
    if (categoryDiv) categoryDiv.remove();
  }
  
  // Show empty state if no tasks
  if (taskListContainer.children.length === 0) {
    showEmptyState();
  }
}

// Show empty state
function showEmptyState() {
  const emptyDiv = document.createElement("div");
  emptyDiv.className = "empty-state";
  emptyDiv.innerHTML = `
    <i class="fas fa-clipboard-list"></i>
    <p>No tasks yet. Add one above!</p>
  `;
  taskListContainer.appendChild(emptyDiv);
}

// Save tasks to localStorage
function saveTasks() {
  const tasks = [];
  document.querySelectorAll("ul[data-category]").forEach((ul) => {
    const category = ul.dataset.category;
    ul.querySelectorAll("li").forEach((li) => {
      const meta = li.querySelector(".task-meta");
      let recurring = false, days = [], time = "", reminder = false;
      
      if (meta) {
        recurring = true;
        const daysText = meta.textContent.match(/Repeats on: (.*?)(?:\s|$)/);
        const timeText = meta.textContent.match(/\d{1,2}:\d{2}\s*(?:AM|PM)?/);
        
        if (daysText) days = daysText[1].split(", ");
        if (timeText) {
          time = timeText[0];
          reminder = true;
        }
      }
      
      tasks.push({
        id: li.dataset.id,
        text: li.querySelector(".task-text").textContent,
        category,
        completed: li.classList.contains("completed"),
        recurring,
        days,
        time,
        reminder,
      });
    });
  });
  
  localStorage.setItem("tasks", JSON.stringify(tasks));
  
  // Update empty state
  if (tasks.length === 0 && !document.querySelector(".empty-state")) {
    showEmptyState();
  } else if (tasks.length > 0 && document.querySelector(".empty-state")) {
    document.querySelector(".empty-state").remove();
  }
}

// Load tasks from localStorage
function loadTasks() {
  const savedTasks = JSON.parse(localStorage.getItem("tasks")) || [];
  
  if (savedTasks.length === 0) {
    showEmptyState();
    return;
  }
  
  savedTasks.forEach(({ id, text, category, completed, recurring, days, time, reminder }) => {
    createTask(text, category, completed, recurring, days, time, reminder, id);
  });
}

// Show alert message
function showAlert(message, type) {
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
    ${message}
  `;
  
  alertContainer.appendChild(alert);
  
  // Remove after animation
  setTimeout(() => {
    alert.remove();
  }, 3000);
}

// Format time for display
function formatTime(timeString) {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const minute = parseInt(minutes);
  
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

// Check for reminders
function checkReminders() {
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const now = new Date();
  const currentTime = formatTime(`${now.getHours()}:${now.getMinutes()}`);
  
  tasks.forEach(task => {
    if (task.reminder && task.time && !task.notifiedToday) {
      const taskTime = formatTime(task.time);
      
      if (taskTime === currentTime) {
        // Play sound
        alarmSound.play();
        
        // Show alert
        showAlert(`Reminder: ${task.text} (${task.category})`, "info");
        
        // Show notification if permission granted
        if (Notification.permission === "granted") {
          new Notification(`Reminder: ${task.text}`, {
            body: `Time for your task in ${task.category} category!`,
            icon: 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png'
          });
        }
        
        // Mark as notified
        task.notifiedToday = true;
        saveTasks();
      }
    }
  });
}

// Start reminder checker
function startReminderChecker() {
  // Check every minute
  setInterval(checkReminders, 60000);
  
  // Request notification permission
  if ('Notification' in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}

// Theme functions
function loadTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const icon = themeToggle.querySelector("i");
  icon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
}

// Initialize the app
init();