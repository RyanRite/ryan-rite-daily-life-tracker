
"use strict";

/* ==========================================
   RYANWRITE DAILY LIFE TRACKER
   Core JavaScript
   ========================================== */

const STORAGE_KEY = "ryanwrite_daily_tracker_v1";

const LIFE_AREAS = [
    "Learning & Career",
    "Health & Fitness",
    "Discipline & Routine",
    "Money & Business",
    "Personal Relationships",
    "Faith & Spirituality",
    "Creativity & Hobbies"
];


const LEGACY_DEFAULT_HABIT_IDS = new Set([
    "h1", "h2", "h3", "h4", "h5", "h6",
    "h7", "h8", "h9", "h10", "h11", "h12"
]);


const $ = (selector) => document.querySelector(selector);

function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function makeId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyDay() {
    return {
        completed: {},
        createdAt: Date.now()
    };
}


function defaultData() {
    return {
        habits: [],
        days: {},
        goals: [],
        transactions: [],
        settings: {
            streakGoal: 7,
            currency: "UGX",
            developerName: "RYAN"
        }
    };
}




function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return defaultData();
        }

        const parsed = JSON.parse(saved);

        if (
            !parsed ||
            !Array.isArray(parsed.habits) ||
            typeof parsed.days !== "object" ||
            parsed.days === null
        ) {
            return defaultData();
        }

        const base = defaultData();

        const cleanedHabits = parsed.habits.filter(habit =>
            habit &&
            typeof habit === "object" &&
            !LEGACY_DEFAULT_HABIT_IDS.has(String(habit.id))
        );

        return {
            ...base,
            ...parsed,
            habits: cleanedHabits,
            settings: {
                ...base.settings,
                ...(parsed.settings || {})
            },
            goals: Array.isArray(parsed.goals)
                ? parsed.goals
                : [],
            transactions: Array.isArray(parsed.transactions)
                ? parsed.transactions
                : []
        };
    } catch (error) {
        console.error("Could not load saved tracker data:", error);
        return defaultData();
    }
}

        const base = defaultData();

        return {
            ...base,
            ...parsed,

            // Remove the old built-in habits.
            // Keep habits created by users.
            habits: parsed.habits.filter(habit =>
                habit &&
                typeof habit === "object" &&
                !LEGACY_DEFAULT_HABIT_IDS.has(habit.id)
            ),

            settings: {
                ...base.settings,
                ...(parsed.settings || {})
            },

            goals: Array.isArray(parsed.goals)
                ? parsed.goals
                : [],

            transactions: Array.isArray(parsed.transactions)
                ? parsed.transactions
                : []
        };
    } catch (error) {
        console.error(
            "Could not load saved tracker data:",
            error
        );

        return defaultData();
    }
}

let appData = loadData();
let selectedDate = localDateKey();
let activePage = "dashboard";

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
        return true;
    } catch (error) {
        console.error("Could not save tracker data:", error);
        alert("Your browser could not save the data. Check your browser storage settings.");
        return false;
    }
}

function getDay(dateKey = selectedDate) {
    if (!appData.days[dateKey]) {
        appData.days[dateKey] = emptyDay();
    }

    return appData.days[dateKey];
}

function isCompleted(habitId, dateKey = selectedDate) {
    return Boolean(getDay(dateKey).completed[habitId]);
}

function getCompletion(dateKey = selectedDate) {
    const habits = appData.habits;

    if (habits.length === 0) {
        return 0;
    }

    const completed = habits.filter(habit => isCompleted(habit.id, dateKey)).length;

    return Math.round((completed / habits.length) * 100);
}

function getCompletedCount(dateKey = selectedDate) {
    return appData.habits.filter(habit => isCompleted(habit.id, dateKey)).length;
}

function formatMoney(amount) {
    const currency = appData.settings.currency || "UGX";

    return `${currency} ${Number(amount || 0).toLocaleString("en-UG", {
        maximumFractionDigits: 2
    })}`;
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

/* DATE */

function renderDate() {
    const dateElement = $("#current-date");

    if (dateElement) {
        dateElement.textContent = new Date().toLocaleDateString("en-UG", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }
}

/* STREAKS */

function calculateStreak() {
    let streak = 0;
    const cursor = new Date(`${selectedDate}T12:00:00`);

    while (true) {
        const key = localDateKey(cursor);

        if (getCompletion(key) === 100) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}

/* DASHBOARD */

function renderDashboard() {
    const completion = getCompletion();
    const completedCount = getCompletedCount();
    const total = appData.habits.length;

    $("#completion-value").textContent = `${completion}%`;
    $("#completion-bar").style.width = `${completion}%`;
    $("#completion-caption").textContent =
        completion === 100
            ? "Excellent! All habits completed."
            : completion > 0
                ? "You're making progress. Keep going!"
                : "Your next achievement starts here.";

    $("#tasks-value").textContent = `${completedCount} / ${total}`;
    $("#streak-value").textContent = `${calculateStreak()} days`;

    const income = appData.transactions
        .filter(item => item.type === "income")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const expenses = appData.transactions
        .filter(item => item.type === "expense")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const savings = income - expenses;
    $("#savings-value").textContent = formatMoney(savings);

    renderDashboardHabits();
    renderLifeBalance();
}

function renderDashboardHabits() {
    const container = $("#dashboard-habits");
    const summaryCount = $("#habit-count");
    const percentage = $("#habit-percentage");
    const progress = $("#habit-progress-bar");

    if (!container) return;

    const habits = appData.habits.slice(0, 5);
    const completed = getCompletedCount();
    const percent = getCompletion();

    summaryCount.textContent = `${appData.habits.length} habit${appData.habits.length === 1 ? "" : "s"}`;
    percentage.textContent = `${percent}%`;
    progress.style.width = `${percent}%`;

    if (habits.length === 0) {
        container.innerHTML = '<p class="empty-message">No habits yet. Add your first habit in Daily Habits.</p>';
        return;
    }

    container.innerHTML = habits.map(habit => {
        const checked = isCompleted(habit.id);
        const name = escapeHTML(habit.name);

        return `
            <label class="habit-row ${checked ? "completed" : ""}">
                <input
                    type="checkbox"
                    data-complete-habit="${escapeHTML(habit.id)}"
                    ${checked ? "checked" : ""}
                    aria-label="Mark ${name} complete"
                >
                <span class="habit-name">${name}</span>
                <span class="habit-category">${checked ? "Done" : "To do"}</span>
            </label>
        `;
    }).join("");
}

function renderLifeBalance() {
    const container = $("#life-balance-list");
    if (!container) return;

    container.innerHTML = LIFE_AREAS.map(area => {
        const areaHabits = appData.habits.filter(habit => habit.category === area);
        const completed = areaHabits.filter(habit => isCompleted(habit.id)).length;
        const percent = areaHabits.length
            ? Math.round((completed / areaHabits.length) * 100)
            : 0;

        return `
            <div class="life-balance-item">
                <span class="life-label">${escapeHTML(area)}</span>
                <span class="life-value">${percent}%</span>
                <div class="progress-track">
                    <div class="progress-fill" style="width: ${percent}%"></div>
                </div>
            </div>
        `;
    }).join("");
}

/* HABITS PAGE */

function renderHabitsPage() {
    const container = $("#extra-page");

    container.innerHTML = `
        <div class="panel-heading">
            <div>
                <p class="eyebrow">BUILD YOUR ROUTINE</p>
                <h2>Daily Habits</h2>
            </div>
            <span class="stat-icon">✓</span>
        </div>

        <p class="muted-text">
            Check off completed habits. Your progress is saved automatically.
        </p>

        <form id="add-habit-form" class="tracker-form">
            <label for="new-habit-name">New habit</label>
            <input id="new-habit-name" name="habit" maxlength="100"
                placeholder="e.g. Practise Python for 30 minutes" required>

            <label for="new-habit-category">Life area</label>
            <select id="new-habit-category" name="category">
                ${LIFE_AREAS.map(area =>
                    `<option value="${escapeHTML(area)}">${escapeHTML(area)}</option>`
                ).join("")}
            </select>

            <button class="primary-button" type="submit">+ Add Habit</button>
        </form>

        <div class="habit-page-list">
            ${appData.habits.length === 0
                ? '<p class="empty-message">No habits yet. Add one above.</p>'
                : appData.habits.map(habit => `
                    <div class="habit-row ${isCompleted(habit.id) ? "completed" : ""}">
                        <input
                            type="checkbox"
                            data-complete-habit="${escapeHTML(habit.id)}"
                            ${isCompleted(habit.id) ? "checked" : ""}
                            aria-label="Complete ${escapeHTML(habit.name)}"
                        >
                        <span class="habit-name">${escapeHTML(habit.name)}</span>
                        <span class="habit-category">${escapeHTML(habit.category)}</span>
                        <button class="delete-button" data-delete-habit="${escapeHTML(habit.id)}"
                            aria-label="Delete ${escapeHTML(habit.name)}">×</button>
                    </div>
                `).join("")
            }
        </div>
    `;
}

/* GOALS PAGE */

function renderGoalsPage() {
    const container = $("#extra-page");

    container.innerHTML = `
        <div class="panel-heading">
            <div>
                <p class="eyebrow">THINK BIGGER</p>
                <h2>My Goals</h2>
            </div>
            <span class="stat-icon">◎</span>
        </div>

        <form id="add-goal-form" class="tracker-form">
            <label for="goal-name">Goal description</label>
            <input id="goal-name" name="goal" maxlength="160"
                placeholder="e.g. Finish my first website" required>

            <label for="goal-deadline">Target date (optional)</label>
            <input id="goal-deadline" name="deadline" type="date">

            <button class="primary-button" type="submit">+ Create Goal</button>
        </form>

        <div class="habit-page-list">
            ${appData.goals.length === 0
                ? '<p class="empty-message">Your goals will appear here. Start with one meaningful goal.</p>'
                : appData.goals.map(goal => `
                    <div class="habit-row ${goal.done ? "completed" : ""}">
                        <input type="checkbox" data-complete-goal="${escapeHTML(goal.id)}"
                            ${goal.done ? "checked" : ""} aria-label="Complete goal">
                        <span class="habit-name">
                            ${escapeHTML(goal.name)}
                            ${goal.deadline ? `<small class="goal-date">Target: ${escapeHTML(goal.deadline)}</small>` : ""}
                        </span>
                        <button class="delete-button" data-delete-goal="${escapeHTML(goal.id)}"
                            aria-label="Delete goal">×</button>
                    </div>
                `).join("")
            }
        </div>
    `;
}

/* MONEY TRACKER */

function renderFinancePage() {
    const container = $("#extra-page");

    const income = appData.transactions
        .filter(item => item.type === "income")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const expenses = appData.transactions
        .filter(item => item.type === "expense")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    container.innerHTML = `
        <div class="panel-heading">
            <div>
                <p class="eyebrow">TAKE CONTROL</p>
                <h2>Money Tracker</h2>
            </div>
            <span class="stat-icon">◇</span>
        </div>

        <div class="finance-summary">
            <div class="finance-stat">
                <p>Total income</p>
                <strong>${formatMoney(income)}</strong>
            </div>
            <div class="finance-stat">
                <p>Total expenses</p>
                <strong>${formatMoney(expenses)}</strong>
            </div>
            <div class="finance-stat">
                <p>Balance</p>
                <strong>${formatMoney(income - expenses)}</strong>
            </div>
        </div>

        <form id="transaction-form" class="tracker-form">
            <label for="transaction-description">Description</label>
            <input id="transaction-description" name="description" maxlength="100"
                placeholder="e.g. Freelance payment or transport" required>

            <label for="transaction-type">Transaction type</label>
            <select id="transaction-type" name="type">
                <option value="income">Income</option>
                <option value="expense">Expense</option>
            </select>

            <label for="transaction-amount">Amount (${escapeHTML(appData.settings.currency)})</label>
            <input id="transaction-amount" name="amount" type="number"
                min="0.01" step="0.01" placeholder="0" required>

            <button class="primary-button" type="submit">+ Record Transaction</button>
        </form>

        <h3 class="subheading">Transaction history</h3>

        <div class="habit-page-list">
            ${appData.transactions.length === 0
                ? '<p class="empty-message">No transactions recorded yet.</p>'
                : [...appData.transactions].reverse().map(item => `
                    <div class="habit-row">
                        <span class="habit-name">
                            ${escapeHTML(item.description)}
                            <small class="goal-date">${escapeHTML(item.date)}</small>
                        </span>
                        <strong class="${item.type === "income" ? "income-text" : "expense-text"}">
                            ${item.type === "income" ? "+" : "−"}${formatMoney(item.amount)}
                        </strong>
                        <button class="delete-button" data-delete-transaction="${escapeHTML(item.id)}"
                            aria-label="Delete transaction">×</button>
                    </div>
                `).join("")
            }
        </div>
    `;
}

/* STATISTICS */

function renderStatisticsPage() {
    const container = $("#extra-page");
    const today = selectedDate;

    const lastSevenDays = [];

    for (let offset = 6; offset >= 0; offset--) {
        const date = new Date(`${today}T12:00:00`);
        date.setDate(date.getDate() - offset);

        const key = localDateKey(date);

        lastSevenDays.push({
            key,
            label: date.toLocaleDateString("en-UG", { weekday: "short" }),
            percent: getCompletion(key),
            count: getCompletedCount(key)
        });
    }

    const average = Math.round(
        lastSevenDays.reduce((sum, day) => sum + day.percent, 0) / lastSevenDays.length
    );

    container.innerHTML = `
        <div class="panel-heading">
            <div>
                <p class="eyebrow">MEASURE YOUR GROWTH</p>
                <h2>Weekly Statistics</h2>
            </div>
            <span class="stat-icon">▥</span>
        </div>

        <div class="finance-stat">
            <p>Average daily completion</p>
            <strong>${average}%</strong>
        </div>

        <div class="weekly-chart">
            ${lastSevenDays.map(day => `
                <div class="chart-column">
                    <span class="chart-value">${day.percent}%</span>
                    <div class="chart-bar-area">
                        <div class="chart-bar" style="height: ${Math.max(day.percent, 2)}%"></div>
                    </div>
                    <span class="chart-label">${day.label}</span>
                </div>
            `).join("")}
        </div>

        <h3 class="subheading">Daily breakdown</h3>

        <div class="habit-page-list">
            ${lastSevenDays.map(day => `
                <div class="habit-row">
                    <span class="habit-name">${day.key}</span>
                    <span class="habit-category">${day.count} / ${appData.habits.length} habits</span>
                    <strong>${day.percent}%</strong>
                </div>
            `).join("")}
        </div>
    `;
}

/* ACHIEVEMENTS */

function renderAchievementsPage() {
    const container = $("#extra-page");
    const streak = calculateStreak();
    const completion = getCompletion();
    const completed = getCompletedCount();

    const achievements = [
        {
            title: "First Step",
            description: "Complete your first daily habit.",
            unlocked: completed >= 1
        },
        {
            title: "Halfway Hero",
            description: "Complete at least half of today's habits.",
            unlocked: completion >= 50
        },
        {
            title: "Perfect Day",
            description: "Complete every habit for a day.",
            unlocked: completion === 100 && appData.habits.length > 0
        },
        {
            title: "Consistency",
            description: "Maintain a three-day perfect streak.",
            unlocked: streak >= 3
        },
        {
            title: "Goal Setter",
            description: "Create your first goal.",
            unlocked: appData.goals.length > 0
        },
        {
            title: "Money Manager",
            description: "Record your first transaction.",
            unlocked: appData.transactions.length > 0
        }
    ];

    container.innerHTML = `
        <div class="panel-heading">
            <div>
                <p class="eyebrow">EVERY STEP COUNTS</p>
                <h2>Achievements</h2>
            </div>
            <span class="stat-icon">✧</span>
        </div>

        <div class="achievement-grid">
            ${achievements.map(item => `
                <div class="achievement-card ${item.unlocked ? "unlocked" : ""}">
                    <div class="achievement-symbol">${item.unlocked ? "✦" : "◇"}</div>
                    <h3>${escapeHTML(item.title)}</h3>
                    <p>${escapeHTML(item.description)}</p>
                    <span>${item.unlocked ? "UNLOCKED" : "LOCKED"}</span>
                </div>
            `).join("")}
        </div>
    `;
}

/* SETTINGS */

function renderSettingsPage() {
    const container = $("#extra-page");

    container.innerHTML = `
        <div class="panel-heading">
            <div>
                <p class="eyebrow">MAKE IT YOURS</p>
                <h2>Settings</h2>
            </div>
            <span class="stat-icon">⚙</span>
        </div>

        <form id="settings-form" class="tracker-form">
            <label for="developer-name">Display name</label>
            <input id="developer-name" name="developerName" maxlength="40"
                value="${escapeHTML(appData.settings.developerName)}" required>

            <label for="currency">Money currency</label>
            <select id="currency" name="currency">
                ${["UGX", "USD", "EUR", "GBP", "KES", "TZS"].map(currency => `
                    <option value="${currency}" ${appData.settings.currency === currency ? "selected" : ""}>
                        ${currency}
                    </option>
                `).join("")}
            </select>

            <label for="streak-goal">Streak goal (days)</label>
            <input id="streak-goal" name="streakGoal" type="number"
                min="1" max="365" value="${Number(appData.settings.streakGoal) || 7}" required>

            <button class="primary-button" type="submit">Save Settings</button>
        </form>

        <div class="settings-warning">
            <h3>Data and privacy</h3>
            <p>Your information is stored in this browser on this device. It is not automatically synced to another device.</p>
            <button class="secondary-button" id="export-data">Export Backup</button>
            <button class="delete-button danger-button" id="reset-data">Reset All Data</button>
        </div>
    `;
}

/* PAGE NAVIGATION */

const PAGE_TITLES = {
    dashboard: "Dashboard",
    habits: "Daily Habits",
    goals: "My Goals",
    finance: "Money Tracker",
    statistics: "Statistics",
    achievements: "Achievements",
    settings: "Settings"
};

function renderActivePage() {
    const title = PAGE_TITLES[activePage] || "Dashboard";
    $("#page-title").textContent = title;

    document.querySelectorAll(".nav-item").forEach(button => {
        const isActive = button.dataset.page === activePage;

        button.classList.toggle("active", isActive);

        if (isActive) {
            button.setAttribute("aria-current", "page");
        } else {
            button.removeAttribute("aria-current");
        }
    });

    const dashboardSections = document.querySelectorAll(
        ".welcome-panel, .stats-grid, .dashboard-grid"
    );

    const isDashboard = activePage === "dashboard";

    dashboardSections.forEach(section => {
        section.hidden = !isDashboard;
    });

    const extraPage = $("#extra-page");
    extraPage.hidden = isDashboard;

    if (isDashboard) return;

    const renderers = {
        habits: renderHabitsPage,
        goals: renderGoalsPage,
        finance: renderFinancePage,
        statistics: renderStatisticsPage,
        achievements: renderAchievementsPage,
        settings: renderSettingsPage
    };

    (renderers[activePage] || renderHabitsPage)();
}

function navigateTo(page) {
    if (!PAGE_TITLES[page]) return;

    activePage = page;
    renderActivePage();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* EVENT HANDLERS */

document.addEventListener("click", event => {
    const navButton = event.target.closest("[data-page]");
    if (navButton) {
        navigateTo(navButton.dataset.page);
        return;
    }

    const gotoButton = event.target.closest("[data-goto]");
    if (gotoButton) {
        navigateTo(gotoButton.dataset.goto);
        return;
    }

    const deleteHabit = event.target.closest("[data-delete-habit]");
    if (deleteHabit) {
        const id = deleteHabit.dataset.deleteHabit;
        const habit = appData.habits.find(item => item.id === id);

        if (habit && confirm(`Delete the habit "${habit.name}"?`)) {
            appData.habits = appData.habits.filter(item => item.id !== id);

            Object.values(appData.days).forEach(day => {
                delete day.completed[id];
            });

            saveData();
            refreshApp();
        }

        return;
    }

    const deleteGoal = event.target.closest("[data-delete-goal]");
    if (deleteGoal) {
        const id = deleteGoal.dataset.deleteGoal;

        if (confirm("Delete this goal?")) {
            appData.goals = appData.goals.filter(goal => goal.id !== id);
            saveData();
            refreshApp();
        }

        return;
    }

    const deleteTransaction = event.target.closest("[data-delete-transaction]");
    if (deleteTransaction) {
        const id = deleteTransaction.dataset.deleteTransaction;

        if (confirm("Delete this transaction?")) {
            appData.transactions = appData.transactions.filter(item => item.id !== id);
            saveData();
            refreshApp();
        }

        return;
    }

    if (event.target.closest("#export-data")) {
        exportBackup();
        return;
    }

    if (event.target.closest("#reset-data")) {
        const confirmed = confirm(
            "This will permanently delete your habits, goals, transactions and progress saved in this browser. Export a backup first if you need one. Continue?"
        );

        if (confirmed) {
            appData = defaultData();
            selectedDate = localDateKey();
            saveData();
            refreshApp();
            navigateTo("dashboard");
        }
    }

    if (event.target.closest("#profile-button")) {
        navigateTo("settings");
    }
});

document.addEventListener("change", event => {
    const checkbox = event.target.closest("[data-complete-habit]");

    if (checkbox) {
        const id = checkbox.dataset.completeHabit;
        getDay().completed[id] = checkbox.checked;

        saveData();
        refreshApp();
        return;
    }

    const goalCheckbox = event.target.closest("[data-complete-goal]");

    if (goalCheckbox) {
        const goal = appData.goals.find(item => item.id === goalCheckbox.dataset.completeGoal);

        if (goal) {
            goal.done = goalCheckbox.checked;
            saveData();
            refreshApp();
        }
    }
});

document.addEventListener("submit", event => {
    event.preventDefault();

    const form = event.target;

    if (form.id === "add-habit-form") {
        const name = $("#new-habit-name").value.trim();
        const category = $("#new-habit-category").value;

        if (!name) return;

        appData.habits.push({
            id: makeId(),
            name,
            category
        });

        saveData();
        refreshApp();
        return;
    }

    if (form.id === "add-goal-form") {
        const name = $("#goal-name").value.trim();
        const deadline = $("#goal-deadline").value;

        if (!name) return;

        appData.goals.push({
            id: makeId(),
            name,
            deadline,
            done: false,
            createdAt: Date.now()
        });

        saveData();
        refreshApp();
        return;
    }

    if (form.id === "transaction-form") {
        const description = $("#transaction-description").value.trim();
        const type = $("#transaction-type").value;
        const amount = Number($("#transaction-amount").value);

        if (!description || !Number.isFinite(amount) || amount <= 0) {
            alert("Enter a description and a valid amount greater than zero.");
            return;
        }

        appData.transactions.push({
            id: makeId(),
            description,
            type,
            amount,
            date: selectedDate,
            createdAt: Date.now()
        });

        saveData();
        refreshApp();
        return;
    }

    if (form.id === "settings-form") {
        appData.settings.developerName = $("#developer-name").value.trim() || "RYAN";
        appData.settings.currency = $("#currency").value;

        const streakGoal = Number($("#streak-goal").value);
        appData.settings.streakGoal = Math.min(365, Math.max(1, streakGoal || 7));

        saveData();
        refreshApp();
        alert("Your settings have been saved.");
    }
});

/* BACKUP */

function exportBackup() {
    const data = JSON.stringify(appData, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `ryanwrite-tracker-backup-${localDateKey()}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

/* REFRESH */

function refreshApp() {
    renderDashboard();
    renderActivePage();
}

/* STARTUP */

function initializeApp() {
    renderDate();

    // Ensure today's record exists.
    getDay();
    saveData();

    renderDashboard();
    renderActivePage();

    console.log("RYANWRITE DAILY LIFE TRACKER initialized successfully.");
}

initializeApp();
