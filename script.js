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

  const PARAMS_CONFIG = {
    totalItems: { min: 3, max: 100 },
    keySize: { min: 2, max: 9 },
    batchSize: { min: 3, max: 10 },
  };

  let gameParams = {
    totalItems: 30,
    keySize: 9,
    batchSize: 10,
  };

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
  let isMemorizeMode = false;
  let isShuffleMode = false;
  let isMemorizing = false;
  let memorizeTimer = null;
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
  const memorizeModeToggle = document.getElementById("memorize-mode-toggle");
  const memorizeModeToggleResults = document.getElementById(
    "memorize-mode-toggle-results",
  );
  const shuffleModeToggle = document.getElementById("shuffle-mode-toggle");
  const shuffleModeToggleResults = document.getElementById(
    "shuffle-mode-toggle-results",
  );

  const keyDisplayWrapper = document.getElementById("key-display-wrapper");
  const keyDisplay = document.getElementById("key-display");
  const keyTimerSVG = document.getElementById("key-timer");
  const numberPad = document.getElementById("number-pad");
  const sequenceDisplay = document.getElementById("sequence-display");
  const resultsTableContainer = document.getElementById(
    "results-table-container",
  );
  const iconPreviewGrid = document.getElementById("icon-preview-grid");

  // --- Parameter Controls ---
  const paramValueSpans = {
    totalItems: [
      document.getElementById("total-items-value"),
      document.getElementById("total-items-value-results"),
    ],
    keySize: [
      document.getElementById("key-size-value"),
      document.getElementById("key-size-value-results"),
    ],
    batchSize: [
      document.getElementById("batch-size-value"),
      document.getElementById("batch-size-value-results"),
    ],
  };

  function updateParameter(param, step) {
    const config = PARAMS_CONFIG[param];
    let currentValue = gameParams[param];
    let newValue = currentValue + step;

    // Clamp the value within the defined min/max
    newValue = Math.max(config.min, Math.min(config.max, newValue));
    gameParams[param] = newValue;

    // Additional validation for inter-dependencies
    const maxBatch = Math.min(
      gameParams.totalItems,
      PARAMS_CONFIG.batchSize.max,
    );
    if (gameParams.batchSize > maxBatch) {
      gameParams.batchSize = maxBatch;
    }

    renderParamsUI();
  }

  function renderParamsUI() {
    for (const param in gameParams) {
      paramValueSpans[param].forEach((span) => {
        if (span) span.textContent = gameParams[param];
      });
    }
  }

  document.querySelectorAll(".param-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const param = button.dataset.param;
      const step = parseInt(button.dataset.step, 10);
      updateParameter(param, step);
    });
  });

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
    let digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    if (isShuffleMode) {
      digits.sort(() => 0.5 - Math.random());
    }
    iconsForKey.forEach((icon, i) => {
      keyMap.set(icon.icon, digits.slice(0, iconsForKey.length)[i]);
    });
    renderKey();
  }

  function setupGame() {
    isHardMode = hardModeToggle.checked;
    isMemorizeMode = memorizeModeToggle.checked;
    isShuffleMode = shuffleModeToggle.checked;
    currentItemIndex = 0;
    errorCount = 0;
    totalPausedTime = 0;
    isPaused = false;
    isMemorizing = false;
    clearTimeout(memorizeTimer);
    sequence = [];
    keyMap.clear();
    currentSessionStats = {};
    markdownStats = "";

    const { totalItems, keySize, batchSize } = gameParams;

    if (isHardMode) {
      const numBatches = Math.ceil(totalItems / batchSize);
      for (let i = 0; i < numBatches; i++) {
        const keyIconsForBatch = [...ICONS]
          .sort(() => 0.5 - Math.random())
          .slice(0, keySize);
        const itemsInThisBatch = Math.min(
          batchSize,
          totalItems - sequence.length,
        );
        for (let j = 0; j < itemsInThisBatch; j++) {
          sequence.push(keyIconsForBatch[Math.floor(Math.random() * keySize)]);
        }
      }
    } else {
      const keyIcons = [...ICONS]
        .sort(() => 0.5 - Math.random())
        .slice(0, keySize);
      generateNewKey(keyIcons);
      for (let i = 0; i < totalItems; i++) {
        sequence.push(keyIcons[Math.floor(Math.random() * keySize)]);
      }
    }

    const firstBatchIcons = [
      ...new Set(sequence.slice(0, batchSize).map((i) => i.icon)),
    ].map((iconName) => ICONS.find((i) => i.icon === iconName));
    generateNewKey(firstBatchIcons);

    renderSequenceBatch();
    renderNumberPad();
  }

  function renderKey() {
    keyDisplay.innerHTML = "";
    keyDisplay.style.gridTemplateColumns = `repeat(${Math.min(gameParams.keySize, 5)}, 1fr)`;
    keyMap.forEach((digit, iconName) => {
      const iconData = ICONS.find((i) => i.icon === iconName);
      const item = document.createElement("div");
      item.className = "grid-item";
      item.innerHTML = `<span class="iconoir" style="font-family: iconoir;">${iconData.font}</span><span class="icon-value">${digit}</span>`;
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
    const { batchSize } = gameParams;
    sequenceDisplay.innerHTML = "";
    sequenceDisplay.style.gridTemplateColumns = `repeat(${Math.min(batchSize, 5)}, 1fr)`;
    const start = Math.floor(currentItemIndex / batchSize) * batchSize;
    const end = start + batchSize;
    const batch = sequence.slice(start, end);
    batch.forEach((iconData) => {
      const item = document.createElement("div");
      item.className = "grid-item";
      item.innerHTML = `<span class="iconoir" style="font-family: iconoir;">${iconData.font}</span>`;
      sequenceDisplay.appendChild(item);
    });
    highlightCurrentItem();
  }

  function showKeyWithTimer() {
    isMemorizing = true;
    keyDisplay.classList.remove("hidden-by-memorize");
    keyTimerSVG.classList.remove("hidden");

    const rect = keyTimerSVG.querySelector("rect");

    requestAnimationFrame(() => {
      const width = keyDisplayWrapper.clientWidth;
      const height = keyDisplayWrapper.clientHeight;
      if (width === 0 || height === 0) {
        return;
      }
      const perimeter = 2 * (width + height);
      rect.style.transition = "none";
      rect.style.strokeDasharray = perimeter;
      rect.style.strokeDashoffset = 0;
      void rect.offsetWidth;
      rect.style.transition = "stroke-dashoffset 9s linear";
      rect.style.strokeDashoffset = perimeter;
    });

    clearTimeout(memorizeTimer);
    memorizeTimer = setTimeout(() => {
      keyDisplay.classList.add("hidden-by-memorize");
      keyTimerSVG.classList.add("hidden");
      isMemorizing = false;
      highlightCurrentItem();
      if (rect) {
        rect.style.transition = "none";
      }
    }, 9000);
  }

  function highlightCurrentItem() {
    if (isMemorizing) return;
    document
      .querySelectorAll("#sequence-display .grid-item")
      .forEach((el) => el.classList.remove("current-item"));

    if (currentItemIndex >= gameParams.totalItems) return;

    const sequenceIndexInBatch = currentItemIndex % gameParams.batchSize;
    const currentElement = sequenceDisplay.children[sequenceIndexInBatch];
    if (currentElement) {
      currentElement.classList.add("current-item");
      itemStartTime = performance.now();
    }
  }

  function handleNumberPress(digit) {
    if (!gameActive || isPaused || isMemorizing) return;
    const { totalItems, batchSize } = gameParams;
    const timeTaken = performance.now() - itemStartTime;
    const iconName = sequence[currentItemIndex].icon;
    if (!currentSessionStats[iconName]) {
      currentSessionStats[iconName] = { attempts: 0, correct: 0, totalTime: 0 };
    }
    currentSessionStats[iconName].attempts++;
    const correctDigit = keyMap.get(sequence[currentItemIndex].icon);
    const currentElement =
      sequenceDisplay.children[currentItemIndex % batchSize];
    if (digit === correctDigit) {
      currentSessionStats[iconName].correct++;
      currentSessionStats[iconName].totalTime += timeTaken;
      currentElement.classList.add("correct-answer");
      setTimeout(() => currentElement.classList.remove("correct-answer"), 500);
      currentItemIndex++;
      if (currentItemIndex >= totalItems) {
        endGame();
        return;
      }
      if (currentItemIndex > 0 && currentItemIndex % batchSize === 0) {
        let keyChanged = false;
        if (isHardMode) {
          const currentBatchStart = currentItemIndex;
          const nextBatchIcons = [
            ...new Set(
              sequence
                .slice(currentBatchStart, currentBatchStart + batchSize)
                .map((i) => i.icon),
            ),
          ].map((iconName) => ICONS.find((i) => i.icon === iconName));
          generateNewKey(nextBatchIcons);
          keyChanged = true;
        } else if (isShuffleMode) {
          const currentIcons = Array.from(keyMap.keys()).map((iconName) =>
            ICONS.find((i) => i.icon === iconName),
          );
          generateNewKey(currentIcons);
          keyChanged = true;
        }

        if (keyChanged && isMemorizeMode) {
          showKeyWithTimer();
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

    if (isMemorizeMode) {
      showKeyWithTimer();
    } else {
      keyDisplay.classList.remove("hidden-by-memorize");
      keyTimerSVG.classList.add("hidden");
    }
  }

  function endGame() {
    gameActive = false;
    hardModeToggleResults.checked = hardModeToggle.checked;
    memorizeModeToggleResults.checked = memorizeModeToggle.checked;
    shuffleModeToggleResults.checked = shuffleModeToggle.checked;

    const activeModes = [];
    if (isHardMode) activeModes.push("Hard");
    if (isShuffleMode) activeModes.push("Shuffle");
    if (isMemorizeMode) activeModes.push("Memorize");

    let mode = activeModes.join(" / ");
    if (mode === "") mode = "Normal";

    const config = `${gameParams.keySize}@${gameParams.batchSize}/${gameParams.totalItems}`;

    allSessionsData.push({
      stats: currentSessionStats,
      mode: mode,
      config: config,
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
    const addRow = (ctx, label, stat, style, config) => {
      const { atts, success, avgT } = calc(stat);
      const iconData = ICONS.find((i) => i.icon === label);
      const iconHtml = iconData
        ? `<span class="iconoir" style="font-family: iconoir;">${iconData.font}</span>`
        : "";
      const configHtml = config ? ` <small>(${config})</small>` : "";

      const labelHtml = {
        header: `<td colspan="4">${label}${configHtml}</td>`,
        main: `<td><strong>${label}</strong></td><td>${atts}</td><td>${success}</td><td>${avgT}</td>`,
        sub: `<td>${iconHtml}${label}</td><td>${atts}</td><td>${success}</td><td>${avgT}</td>`,
      };
      const labelMd = {
        header: `| **${label}** ${config ? `(${config})` : ""} | | | |\n`,
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
        `Session ${i + 1} (${session.mode})`,
        null,
        "header",
        session.config,
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
    const finalItems = allSessionsData.reduce(
      (acc, s) => acc + parseInt(s.config.split("/")[1], 10),
      0,
    );
    const finalAccuracy =
      finalItems > 0
        ? (((finalItems - finalErrors) / finalItems) * 100).toFixed(1)
        : 0;

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
    highlightCurrentItem();
  }

  // --- Sync Toggles ---
  hardModeToggle.addEventListener("change", () => {
    hardModeToggleResults.checked = hardModeToggle.checked;
  });
  hardModeToggleResults.addEventListener("change", () => {
    hardModeToggle.checked = hardModeToggleResults.checked;
  });
  memorizeModeToggle.addEventListener("change", () => {
    memorizeModeToggleResults.checked = memorizeModeToggle.checked;
  });
  memorizeModeToggleResults.addEventListener("change", () => {
    memorizeModeToggle.checked = memorizeModeToggleResults.checked;
  });
  shuffleModeToggle.addEventListener("change", () => {
    shuffleModeToggleResults.checked = shuffleModeToggle.checked;
  });
  shuffleModeToggleResults.addEventListener("change", () => {
    shuffleModeToggle.checked = shuffleModeToggleResults.checked;
  });

  startBtn.addEventListener("click", () => {
    allSessionsData = [];
    startGame();
  });
  restartBtn.addEventListener("click", startGame);
  resumeBtn.addEventListener("click", resumeGame);
  pauseBtn.addEventListener("click", pauseGame);
  copyBtn.addEventListener("click", () => copyToClipboard(markdownStats));

  // Initialize parameter controls
  renderParamsUI();
});
