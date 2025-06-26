document.addEventListener("DOMContentLoaded", () => {
  const ICONS = [
    { icon: "birthday-cake", font: "&#xe088;" },
    { icon: "book", font: "&#xe094;" },
    { icon: "cycling", font: "&#xe13c;" },
    { icon: "medal-1st", font: "&#xe2f5;" },
    { icon: "gym", font: "&#xe244;" },
    { icon: "wolf", font: "&#xe536;" },
    { icon: "bounce-right", font: "&#xe0a3;" },
    { icon: "sound-high", font: "&#xe469;" },
    { icon: "bathroom", font: "&#xe469;" },
    { icon: "developer", font: "&#xe469;" },
    { icon: "floppy-disk", font: "&#xe201;" },
    { icon: "wristwatch", font: "&#xe539;" },
    { icon: "attachment", font: "&#xe061;" },
    { icon: "emoji", font: "&#xe1b9;" },
    { icon: "pizza-slice", font: "&#xe3a9;" },
    { icon: "orange-slice", font: "&#xe363;" },
    { icon: "arcade", font: "&#xe037;" },
    { icon: "pacman", font: "&#xe36a;" },
    { icon: "box-iso", font: "&#xe0a8;" },
    { icon: "light-bulb", font: "&#xe2bb;" },
    { icon: "sofa", font: "&#xe463;" },
    { icon: "small-lamp", font: "&#xe45b;" },
    { icon: "gift", font: "&#xe220;" },
    { icon: "edit-pencil", font: "&#xe19a;" },
    { icon: "rocket", font: "&#xe3f2;" },
  ];
  const TOTAL_ITEMS = 30;
  const KEY_SIZE = 9;
  const BATCH_SIZE = 10;

  let keyMap = new Map();
  let sequence = [];
  let currentItemIndex = 0;
  let errorCount = 0;
  let gameActive = false;
  let startTime = 0;
  let pauseTime = 0;
  let totalPausedTime = 0;
  let isPaused = false;
  let isHardMode = false;
  let currentSessionStats = {};
  let allSessionsData = [];
  let itemStartTime = 0;
  let markdownStats = "";

  const startScreen = document.getElementById("start-screen");
  const gameScreen = document.getElementById("game-screen");
  const resultsScreen = document.getElementById("results-screen");
  const pauseModal = document.getElementById("pause-modal");
  const startBtn = document.getElementById("start-btn");
  const restartBtn = document.getElementById("restart-btn");
  const resumeBtn = document.getElementById("resume-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const copyBtn = document.getElementById("copy-btn");
  const hardModeToggle = document.getElementById("hard-mode-toggle");
  const hardModeToggleResults = document.getElementById(
    "hard-mode-toggle-results",
  );
  const keyDisplay = document.getElementById("key-display");
  const numberPad = document.getElementById("number-pad");
  const sequenceDisplay = document.getElementById("sequence-display");
  const resultsTableContainer = document.getElementById(
    "results-table-container",
  );
  const iconPreviewGrid = document.getElementById("icon-preview-grid");

  if (iconPreviewGrid) {
    const randomizedIcons = [...ICONS].sort(() => 0.5 - Math.random());
    const n = randomizedIcons.length;
    const cols = Math.ceil(Math.sqrt(n));
    iconPreviewGrid.style.setProperty("--grid-cols", cols);
    randomizedIcons.forEach((icon) => {
      const iconWrapper = document.createElement("div");
      iconWrapper.className = "preview-icon";
      iconWrapper.innerHTML = `${icon.font}`;
      iconPreviewGrid.appendChild(iconWrapper);
    });
  }
  function generateNewKey(iconsForKey) {
    keyMap.clear();
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    iconsForKey.forEach((icon, i) => {
      keyMap.set(icon.icon, digits[i]);
    });
    renderKey();
  }
  function setupGame() {
    isHardMode = hardModeToggle.checked;
    currentItemIndex = 0;
    errorCount = 0;
    totalPausedTime = 0;
    isPaused = false;
    sequence = [];
    keyMap.clear();
    currentSessionStats = {};
    markdownStats = "";
    if (isHardMode) {
      for (let i = 0; i < TOTAL_ITEMS / BATCH_SIZE; i++) {
        const keyIconsForBatch = [...ICONS]
          .sort(() => 0.5 - Math.random())
          .slice(0, KEY_SIZE);
        for (let j = 0; j < BATCH_SIZE; j++) {
          sequence.push(keyIconsForBatch[Math.floor(Math.random() * KEY_SIZE)]);
        }
      }
      const firstBatchIcons = [
        ...new Set(sequence.slice(0, BATCH_SIZE).map((i) => i.icon)),
      ].map((iconName) => ICONS.find((i) => i.icon === iconName));
      generateNewKey(firstBatchIcons);
    } else {
      const keyIcons = [...ICONS]
        .sort(() => 0.5 - Math.random())
        .slice(0, KEY_SIZE);
      generateNewKey(keyIcons);
      for (let i = 0; i < TOTAL_ITEMS; i++) {
        sequence.push(keyIcons[Math.floor(Math.random() * KEY_SIZE)]);
      }
    }
    renderSequenceBatch();
    renderNumberPad();
  }
  function renderKey() {
    keyDisplay.innerHTML = "";
    keyMap.forEach((digit, icon) => {
      const item = document.createElement("div");
      item.className = "grid-item";
      item.innerHTML = `<span class="iconoir iconoir-${icon}"></span><span class="icon-value">${digit}</span>`;
      keyDisplay.appendChild(item);
    });
  }
  function renderNumberPad() {
    numberPad.innerHTML = "";
    const keypadOrder = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    keypadOrder.forEach((digit) => {
      const button = document.createElement("button");
      button.textContent = digit;
      button.addEventListener("click", () => handleNumberPress(digit));
      numberPad.appendChild(button);
    });
  }
  function renderSequenceBatch() {
    sequenceDisplay.innerHTML = "";
    const start = Math.floor(currentItemIndex / BATCH_SIZE) * BATCH_SIZE;
    const end = start + BATCH_SIZE;
    const batch = sequence.slice(start, end);
    batch.forEach((icon) => {
      const item = document.createElement("div");
      item.className = "grid-item";
      item.innerHTML = `<span class="iconoir iconoir-${icon.icon}"></span>`;
      sequenceDisplay.appendChild(item);
    });
    highlightCurrentItem();
  }
  function highlightCurrentItem() {
    document
      .querySelectorAll("#sequence-display .grid-item")
      .forEach((el) => el.classList.remove("current-item"));
    const sequenceIndexInBatch = currentItemIndex % BATCH_SIZE;
    const currentElement = sequenceDisplay.children[sequenceIndexInBatch];
    if (currentElement) {
      currentElement.classList.add("current-item");
      itemStartTime = performance.now();
    }
  }
  function handleNumberPress(digit) {
    if (!gameActive || isPaused) return;
    const timeTaken = performance.now() - itemStartTime;
    const iconName = sequence[currentItemIndex].icon;
    if (!currentSessionStats[iconName]) {
      currentSessionStats[iconName] = { attempts: 0, correct: 0, totalTime: 0 };
    }
    currentSessionStats[iconName].attempts++;
    const correctDigit = keyMap.get(sequence[currentItemIndex].icon);
    const currentElement =
      sequenceDisplay.children[currentItemIndex % BATCH_SIZE];
    if (digit === correctDigit) {
      currentSessionStats[iconName].correct++;
      currentSessionStats[iconName].totalTime += timeTaken;
      currentElement.classList.add("correct-answer");
      setTimeout(() => currentElement.classList.remove("correct-answer"), 500);
      currentItemIndex++;
      if (currentItemIndex >= TOTAL_ITEMS) {
        endGame();
        return;
      }
      if (currentItemIndex % BATCH_SIZE === 0) {
        if (isHardMode) {
          const currentBatchStart = currentItemIndex;
          const nextBatchIcons = [
            ...new Set(
              sequence
                .slice(currentBatchStart, currentBatchStart + BATCH_SIZE)
                .map((i) => i.icon),
            ),
          ].map((iconName) => ICONS.find((i) => i.icon === iconName));
          generateNewKey(nextBatchIcons);
        }
        renderSequenceBatch();
      } else {
        highlightCurrentItem();
      }
    } else {
      errorCount++;
      currentElement.classList.add("shake");
      setTimeout(() => currentElement.classList.remove("shake"), 500);
    }
  }
  function startGame() {
    setupGame();
    gameActive = true;
    startTime = performance.now();
    startScreen.classList.add("hidden");
    resultsScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    pauseModal.classList.remove("visible");
    copyBtn.textContent = "Copy as Markdown";
  }
  function endGame() {
    gameActive = false;
    hardModeToggleResults.checked = hardModeToggle.checked;
    allSessionsData.push({
      stats: currentSessionStats,
      mode: isHardMode ? "Hard" : "Normal",
      errors: errorCount,
      time: (performance.now() - startTime - totalPausedTime) / 1000,
    });
    const report = generateStatsReport();
    resultsTableContainer.innerHTML = report.html;
    markdownStats = report.markdown;
    gameScreen.classList.add("hidden");
    resultsScreen.classList.remove("hidden");
  }
  function generateStatsReport() {
    let html =
      '<table class="results-table"><thead><tr><th>Stat</th><th>Atts</th><th>%</th><th>AvgT(s)</th></tr></thead><tbody>';
    let markdown = "### Clauer Report\n\n";
    const grandTotalByIcon = {};
    const calc = (stat) => {
      if (!stat || stat.attempts === 0)
        return { atts: 0, success: "N/A", avgT: "N/A" };
      const successRate = (stat.correct / stat.attempts) * 100;
      const avgTime =
        stat.correct > 0 ? stat.totalTime / stat.correct / 1000 : 0;
      return {
        atts: stat.attempts,
        success: successRate.toFixed(1),
        avgT: avgTime.toFixed(2),
      };
    };
    const addRow = (ctx, label, stat, style) => {
      const { atts, success, avgT } = calc(stat);
      const labelHtml = {
        header: `<td colspan="4">${label}</td>`,
        main: `<td><strong>${label}</strong></td><td>${atts}</td><td>${success}</td><td>${avgT}</td>`,
        sub: `<td><span class="iconoir iconoir-${label}"></span>${label}</td><td>${atts}</td><td>${success}</td><td>${avgT}</td>`,
      };
      const labelMd = {
        header: `| **${label}** | | | |\n`,
        main: `| **${label}** | ${atts} | ${success} | ${avgT} |\n`,
        sub: `|  ↳ ${label} | ${atts} | ${success} | ${avgT} |\n`,
      };
      ctx.html += `<tr class="${style}-row">${labelHtml[style]}</tr>`;
      ctx.markdown += labelMd[style];
    };
    const reportContext = { html, markdown };
    reportContext.markdown += "| Stat | Atts | % | AvgT(s) |\n";
    reportContext.markdown += "|:-----|-----:|----:|--------:|\n";
    allSessionsData.forEach((session, i) => {
      addRow(
        reportContext,
        `Session ${i + 1} (${session.mode} Mode)`,
        null,
        "header",
      );
      const sessionOverall = { attempts: 0, correct: 0, totalTime: 0 };
      const sortedIcons = Object.keys(session.stats).sort();
      sortedIcons.forEach((iconName) => {
        const iconStat = session.stats[iconName];
        sessionOverall.attempts += iconStat.attempts;
        sessionOverall.correct += iconStat.correct;
        sessionOverall.totalTime += iconStat.totalTime;
        if (!grandTotalByIcon[iconName]) {
          grandTotalByIcon[iconName] = {
            attempts: 0,
            correct: 0,
            totalTime: 0,
          };
        }
        grandTotalByIcon[iconName].attempts += iconStat.attempts;
        grandTotalByIcon[iconName].correct += iconStat.correct;
        grandTotalByIcon[iconName].totalTime += iconStat.totalTime;
      });
      addRow(reportContext, "Overall", sessionOverall, "main");
      sortedIcons.forEach((iconName) => {
        addRow(reportContext, iconName, session.stats[iconName], "sub");
      });
    });
    if (allSessionsData.length > 1) {
      addRow(reportContext, "Total (All Sessions)", null, "header");
      const grandTotalOverall = { attempts: 0, correct: 0, totalTime: 0 };
      const sortedTotalIcons = Object.keys(grandTotalByIcon).sort();
      sortedTotalIcons.forEach((iconName) => {
        const totalIconStat = grandTotalByIcon[iconName];
        grandTotalOverall.attempts += totalIconStat.attempts;
        grandTotalOverall.correct += totalIconStat.correct;
        grandTotalOverall.totalTime += totalIconStat.totalTime;
      });
      addRow(reportContext, "Overall", grandTotalOverall, "main");
      sortedTotalIcons.forEach((iconName) => {
        addRow(reportContext, iconName, grandTotalByIcon[iconName], "sub");
      });
    }
    reportContext.html += "</tbody></table>";
    const finalTime = allSessionsData.reduce((acc, s) => acc + s.time, 0);
    const finalErrors = allSessionsData.reduce((acc, s) => acc + s.errors, 0);
    const finalItems = allSessionsData.length * TOTAL_ITEMS;
    const finalAccuracy = (
      ((finalItems - finalErrors) / finalItems) *
      100
    ).toFixed(1);
    document.getElementById("time-result").textContent =
      `Total Time: ${finalTime.toFixed(2)}s`;
    document.getElementById("accuracy-result").textContent =
      `Overall Accuracy: ${finalAccuracy}% (${finalItems - finalErrors}/${finalItems})`;

    return reportContext;
  }
  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => (copyBtn.textContent = "Copy as Markdown"), 2000);
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = 0;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        copyBtn.textContent = "Copied!";
        setTimeout(() => (copyBtn.textContent = "Copy as Markdown"), 2000);
      } catch (err) {
        console.error("Fallback: Oops, unable to copy", err);
      }
      document.body.removeChild(textArea);
    }
  }
  function pauseGame() {
    if (!gameActive || isPaused) return;
    isPaused = true;
    pauseTime = performance.now();
    pauseModal.classList.add("visible");
  }
  function resumeGame() {
    if (!gameActive || !isPaused) return;
    totalPausedTime += performance.now() - pauseTime;
    isPaused = false;
    pauseModal.classList.remove("visible");
  }

  hardModeToggle.addEventListener("change", () => {
    hardModeToggleResults.checked = hardModeToggle.checked;
  });
  hardModeToggleResults.addEventListener("change", () => {
    hardModeToggle.checked = hardModeToggleResults.checked;
  });
  startBtn.addEventListener("click", () => {
    allSessionsData = [];
    startGame();
  });
  restartBtn.addEventListener("click", startGame);
  resumeBtn.addEventListener("click", resumeGame);
  pauseBtn.addEventListener("click", pauseGame);
  copyBtn.addEventListener("click", () => copyToClipboard(markdownStats));
});
