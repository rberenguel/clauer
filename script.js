document.addEventListener("DOMContentLoaded", () => {
  const ICONS = [
    "birthday-cake",
    "book",
    "cycling",
    "medal-1st",
    "gym",
    "wolf",
    "bounce-right",
    "sound-high",
    "bathroom",
    "developer",
    "floppy-disk",
    "wristwatch",
    "attachment",
    "emoji",
    "pizza-slice",
    "orange-slice",
    "arcade",
    "pacman",
    "box-iso",
    "light-bulb",
    "sofa",
    "small-lamp",
    "gift",
    "edit-pencil",
    "rocket",
  ];
  const TOTAL_ITEMS = 30;
  const KEY_SIZE = 10;
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
    randomizedIcons.forEach((iconName) => {
      const iconWrapper = document.createElement("div");
      iconWrapper.className = "preview-icon";
      iconWrapper.innerHTML = `<span class="iconoir iconoir-${iconName}"></span>`;
      iconPreviewGrid.appendChild(iconWrapper);
    });
  }

  function generateNewKey(iconsForKey) {
    keyMap.clear();
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
    iconsForKey.forEach((iconName, i) => {
      keyMap.set(iconName, digits[i]);
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
    keyMap.forEach((digit, iconName) => {
      const item = document.createElement("div");
      item.className = "grid-item";
      item.innerHTML = `<span class="iconoir iconoir-${iconName}"></span><span class="icon-value">${digit}</span>`;
      keyDisplay.appendChild(item);
    });
  }

  function renderNumberPad() {
    numberPad.innerHTML = "";
    const keypadOrder = [7, 8, 9, 4, 5, 6, 1, 2, 3];

    keypadOrder.forEach((digit) => {
      const button = document.createElement("button");
      button.textContent = digit;
      button.addEventListener("click", () => handleNumberPress(digit));
      numberPad.appendChild(button);
    });

    const spacer = document.createElement("div");
    const zeroButton = document.createElement("button");
    zeroButton.textContent = "0";
    zeroButton.addEventListener("click", () => handleNumberPress(0));

    const pauseContainer = document.createElement("div");
    pauseContainer.id = "pause-btn-container";
    const pauseButton = document.createElement("button");
    pauseButton.id = "pause-btn";
    pauseButton.innerHTML = '<span class="iconoir iconoir-pause"></span>';
    pauseButton.addEventListener("click", pauseGame);
    pauseContainer.appendChild(pauseButton);

    numberPad.appendChild(spacer);
    numberPad.appendChild(zeroButton);
    numberPad.appendChild(pauseContainer);
  }

  function renderSequenceBatch() {
    sequenceDisplay.innerHTML = "";
    const start = Math.floor(currentItemIndex / BATCH_SIZE) * BATCH_SIZE;
    const end = start + BATCH_SIZE;
    const batch = sequence.slice(start, end);

    batch.forEach((iconName) => {
      const item = document.createElement("div");
      item.className = "grid-item";
      item.innerHTML = `<span class="iconoir iconoir-${iconName}"></span>`;
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

    const correctDigit = keyMap.get(sequence[currentItemIndex]);
    const currentElement =
      sequenceDisplay.children[currentItemIndex % BATCH_SIZE];

    if (digit === correctDigit) {
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
});
