import { getHistory } from "./storage.js";
import { elements } from "./ui.js";

let currentViewDate = new Date();
let currentSessions = [];

export function openHistoryModal() {
  currentSessions = getHistory();
  currentViewDate = new Date(); // reset to current month

  if (currentSessions.length === 0) {
    elements.historyList.innerHTML =
      "<p style='text-align:center; opacity:0.7; margin-top:2rem;'>No history available yet. Play a game!</p>";
    elements.historyModal.classList.add("visible");
    return;
  }

  renderCalendar(currentSessions);
  elements.historyModal.classList.add("visible");
}

function computeStreak(sessions) {
  if (!sessions || sessions.length === 0) return 0;

  const daySet = new Set();
  sessions.forEach((s) => {
    const d = new Date(s.timestamp);
    daySet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  });

  const check = new Date();
  check.setHours(0, 0, 0, 0);
  const todayKey = `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`;

  if (!daySet.has(todayKey)) {
    check.setDate(check.getDate() - 1);
  }

  let streak = 0;
  while (
    daySet.has(`${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`)
  ) {
    streak++;
    check.setDate(check.getDate() - 1);
  }
  return streak;
}

function renderCalendar(sessions) {
  const historyList = elements.historyList;

  if (!sessions || sessions.length === 0) {
    historyList.innerHTML =
      '<p style="opacity: 0.7; text-align: center;">No completed sessions yet.</p>';
    return;
  }

  // Group sessions by date
  const sessionsByDate = {};
  sessions.forEach((session) => {
    const date = new Date(session.timestamp);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    if (!sessionsByDate[dateKey]) {
      sessionsByDate[dateKey] = [];
    }
    sessionsByDate[dateKey].push(session);
  });

  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  let startingDayOfWeek = firstDay.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  const monthName = currentViewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const streak = computeStreak(sessions);

  const streakHtml =
    streak > 0
      ? `<div class="calendar-streak">🔥 ${streak}-day streak</div>`
      : "";

  let html = `
    <div class="calendar-header">
      <button class="calendar-nav" id="prev-month">&larr;</button>
      <h3>${monthName}</h3>
      <button class="calendar-nav" id="next-month">&rarr;</button>
    </div>
    ${streakHtml}
    <div class="calendar-grid">
      <div class="calendar-day-header">Mon</div>
      <div class="calendar-day-header">Tue</div>
      <div class="calendar-day-header">Wed</div>
      <div class="calendar-day-header">Thu</div>
      <div class="calendar-day-header">Fri</div>
      <div class="calendar-day-header">Sat</div>
      <div class="calendar-day-header">Sun</div>
  `;

  for (let i = 0; i < startingDayOfWeek; i++) {
    html += '<div class="calendar-day empty"></div>';
  }

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const daySessions = sessionsByDate[dateKey] || [];
    const sessionCount = daySessions.length;

    const isToday = isCurrentMonth && today.getDate() === day;
    const hasData = sessionCount > 0;

    let classes = "calendar-day";
    if (isToday) classes += " today";
    if (hasData) classes += " has-sessions";

    html += `
      <div class="${classes}" data-date="${dateKey}">
        <div class="calendar-day-number">${day}</div>
        ${sessionCount > 0 ? `<div class="session-indicator">${sessionCount}</div>` : ""}
      </div>
    `;
  }

  html += "</div>";

  const trendsHtml = renderTrends(sessions);
  html += trendsHtml;

  html += '<div id="day-details" class="day-details hidden"></div>';

  historyList.innerHTML = html;

  document.getElementById("prev-month")?.addEventListener("click", (e) => {
    e.stopPropagation();
    currentViewDate.setMonth(currentViewDate.getMonth() - 1);
    renderCalendar(sessions);
  });

  document.getElementById("next-month")?.addEventListener("click", (e) => {
    e.stopPropagation();
    currentViewDate.setMonth(currentViewDate.getMonth() + 1);
    renderCalendar(sessions);
  });

  document.querySelectorAll(".calendar-day.has-sessions").forEach((dayEl) => {
    dayEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const dateKey = dayEl.dataset.date;
      const daySessions = sessionsByDate[dateKey] || [];
      showDayDetails(dateKey, daySessions);
    });
  });
}

function renderTrends(sessions) {
  if (!sessions || sessions.length === 0) return "";

  // Sort all sessions by time descending and take the last 15
  const recentSessions = [...sessions]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 15)
    .reverse();

  if (recentSessions.length < 2) return ""; // need at least 2 points for a trend

  // Create mini charts for CPM, Accuracy, CV, and IES
  const metricsToTrack = [
    {
      key: "cpm",
      label: "CPM",
      desc: "Throughput",
      invertColor: false,
      bestIcon:
        '<span class="iconoir iconoir-arrow-up"></span> <span class="iconoir iconoir-check"></span>',
    },
    {
      key: "accuracy",
      label: "Accuracy",
      desc: "Correctness",
      invertColor: false,
      bestIcon:
        '<span class="iconoir iconoir-arrow-up"></span> <span class="iconoir iconoir-check"></span>',
    },
    {
      key: "cv",
      label: "CV",
      desc: "Stability",
      invertColor: true,
      bestIcon:
        '<span class="iconoir iconoir-arrow-down"></span> <span class="iconoir iconoir-check"></span>',
    },
    {
      key: "ies",
      label: "IES",
      desc: "Efficiency",
      invertColor: true,
      bestIcon:
        '<span class="iconoir iconoir-arrow-down"></span> <span class="iconoir iconoir-check"></span>',
    },
  ];

  let chartsHtml = '<div class="history-trends">';

  metricsToTrack.forEach((metric) => {
    const values = recentSessions.map((s) => s.metrics[metric.key]);
    const max = Math.max(...values, 1);
    const min = Math.min(...values);

    // Visualize relative delta above min point
    const MathMax = Math.max;
    const range = max - min;
    const padding = range * 0.1;
    const chartMax = max;
    const chartMin = MathMax(0, min - padding);

    let barsHtml = "";
    values.forEach((val) => {
      let heightPct = 10;
      if (range > 0) {
        heightPct = MathMax(
          5,
          ((val - chartMin) / (chartMax - chartMin)) * 100,
        );
      }

      let barClass = "trend-bar";
      if (val === max) barClass += metric.invertColor ? " low" : " high";
      if (val === min) barClass += metric.invertColor ? " high" : " low";

      barsHtml += `<div class="${barClass}" style="height: ${heightPct}%;"></div>`;
    });

    chartsHtml += `
      <div class="trend-chart">
        <div class="trend-header">
          <div class="trend-label"><strong>${metric.label}</strong> (${metric.desc})</div>
          <div class="trend-best">${metric.bestIcon}</div>
        </div>
        <div class="trend-bars">${barsHtml}</div>
      </div>
    `;
  });

  chartsHtml += "</div>";
  return chartsHtml;
}

function showDayDetails(dateKey, daySessions) {
  const detailsEl = document.getElementById("day-details");
  if (!detailsEl) return;

  const date = new Date(dateKey + "T12:00:00");
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  const sortedSessions = [...daySessions].sort(
    (a, b) => b.timestamp - a.timestamp,
  );

  let html = `
    <div class="day-details-header">
      <h3>${dateStr}</h3>
      <button class="close-details" id="close-details">×</button>
    </div>
    <div class="day-sessions">
  `;

  sortedSessions.forEach((session, index) => {
    const time = new Date(session.timestamp);
    const hours = String(time.getHours()).padStart(2, "0");
    const minutes = String(time.getMinutes()).padStart(2, "0");
    const timeStr = `${hours}:${minutes}`;

    html += `
      <div class="session-card" data-session-index="${index}">
        <div class="session-header">
          <strong>${session.mode} (${session.config})</strong>
          <span class="session-time">${timeStr}</span>
        </div>
        <div class="session-stats">
          <span>CPM: ${session.metrics.cpm}</span>
          <span>Acc: ${session.metrics.accuracy}%</span>
          <span>IES: ${session.metrics.ies}</span>
          <span>CV: ${session.metrics.cv}%</span>
        </div>
      </div>
    `;
  });

  html += "</div>";

  detailsEl.innerHTML = html;
  detailsEl.classList.remove("hidden");

  document.getElementById("close-details")?.addEventListener("click", (e) => {
    e.stopPropagation();
    detailsEl.classList.add("hidden");
  });
}
