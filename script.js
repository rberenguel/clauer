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

  const startScreen = document.getElementById("start-screen");
  const gameScreen = document.getElementById("game-screen");
  const resultsScreen = document.getElementById("results-screen");
  const pauseModal = document.getElementById("pause-modal");

  const startBtn = document.getElementById("start-btn");
  const restartBtn = document.getElementById("restart-btn");
  const resumeBtn = document.getElementById("resume-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const hardModeToggle = document.getElementById("hard-mode-toggle");

  const keyDisplay = document.getElementById("key-display");
  const numberPad = document.getElementById("number-pad");
  const sequenceDisplay = document.getElementById("sequence-display");

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

    if (isHardMode) {
      for (let i = 0; i < TOTAL_ITEMS / BATCH_SIZE; i++) {
        const keyIconsForBatch = [...ICONS]
          .sort(() => 0.5 - Math.random())
          .slice(0, KEY_SIZE);
        for (let j = 0; j < BATCH_SIZE; j++) {
          sequence.push(keyIconsForBatch[Math.floor(Math.random() * KEY_SIZE)]);
        }
      }
      const firstBatchIcons = [...new Set(sequence.slice(0, BATCH_SIZE))];
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
    }
  }

  function handleNumberPress(digit) {
    if (!gameActive || isPaused) return;
    const correctDigit = keyMap.get(sequence[currentItemIndex].icon);
    const currentElement =
      sequenceDisplay.children[currentItemIndex % BATCH_SIZE];

    if (digit === correctDigit) {
      currentElement.classList.add("correct-answer");
      setTimeout(() => {
        currentElement.classList.remove("correct-answer");
      }, 1500);

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
              sequence.slice(currentBatchStart, currentBatchStart + BATCH_SIZE),
            ),
          ];
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
  }

  function endGame() {
    gameActive = false;
    const endTime = performance.now();
    const totalTime = ((endTime - startTime - totalPausedTime) / 1000).toFixed(
      2,
    );
    const accuracy = (((TOTAL_ITEMS - errorCount) / TOTAL_ITEMS) * 100).toFixed(
      1,
    );

    document.getElementById("time-result").textContent = `Time: ${totalTime}s`;
    document.getElementById("accuracy-result").textContent =
      `Accuracy: ${accuracy}% (${TOTAL_ITEMS - errorCount}/${TOTAL_ITEMS})`;

    gameScreen.classList.add("hidden");
    resultsScreen.classList.remove("hidden");
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

  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", startGame);
  resumeBtn.addEventListener("click", resumeGame);
  pauseBtn.addEventListener("click", pauseGame);
});
