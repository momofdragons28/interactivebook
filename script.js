// Инициализация переменных, включая таймеры, состояние и элементы интерфейса
let autoChoiceTimeout = null;
let timerInterval = null;
let gameData;
let currentState = localStorage.getItem("gameState") || "start";
const resultsPanel = document.getElementById("results");
const restartButton = document.querySelector(".restart-button");
const textSizeSlider = document.getElementById("text-size-slider");
let activeTyping = null;

// Загрузка данных игры из JSON-файла
async function loadGameData() {
  try {
    const response = await fetch("gameData.json");
    gameData = await response.json();
    updateGame();
  } catch (error) {
    console.error("Ошибка загрузки gameData.json:", error);
  }
}

// Заменяет переносы строк в тексте на HTML <br> теги
function formatTextWithLineBreaks(text) {
  return text.replace(/\n/g, "<br>");
}

// Основная функция для обновления состояния игры и интерфейса
function updateGame() {
  clearTimeout(autoChoiceTimeout);
  clearInterval(timerInterval);
  document.getElementById("timerDisplay").textContent = "";

  const state = gameData[currentState];
  const questionEl = document.getElementById("question");
  const choice1 = document.getElementById("choice1");
  const choice2 = document.getElementById("choice2");

  // Если у текущего состояния есть выборы
  if (state.choices.length > 0) {
    const timerDisplay = document.getElementById("timerDisplay");

    // Установка таймера автоселекта, если он задан
    if (state.timer && typeof state.defaultChoice === "number") {
      let remainingTime = Math.floor(state.timer / 1000);
      timerDisplay.textContent = `Нужно срочно выбрать! Осталось ${remainingTime} секунд.`;

      // Интервал обратного отсчёта таймера
      timerInterval = setInterval(() => {
        remainingTime--;
        if (remainingTime > 0) {
          timerDisplay.textContent = `Нужно срочно выбрать! Осталось ${remainingTime} секунд.`;
        } else {
          clearInterval(timerInterval);
        }
      }, 1000);

      // Таймер для автоматического выбора по умолчанию
      autoChoiceTimeout = setTimeout(() => {
        const defaultIndex = state.defaultChoice;
        const defaultOption = state.choices[defaultIndex];
        if (defaultOption) {
          handleChoice(defaultOption.next, defaultIndex === 0 ? "#28a745" : "#007bff");
        }
      }, state.timer);
    }

    // Вставляем вопрос и варианты выбора
    questionEl.innerHTML = formatTextWithLineBreaks(state.question);

    choice1.textContent = state.choices[0].text;
    choice2.textContent = state.choices[1].text;

    choice1.onclick = () => handleChoice(state.choices[0].next, "#28a745");
    choice2.onclick = () => handleChoice(state.choices[1].next, "#007bff");

    choice1.style.display = "inline-block";
    choice2.style.display = "inline-block";

    questionEl.className = "";
  } else {
    // Если нет выбора, отображаем завершение или результат
    choice1.style.display = "none";
    choice2.style.display = "none";

    if (state.endingType) {
      questionEl.innerHTML = formatTextWithLineBreaks(state.endingType);
      questionEl.className = "ending-message";
      if (state.endingMood) {
        questionEl.classList.add(`ending-${state.endingMood}`);
      }
    } else {
      questionEl.innerHTML = formatTextWithLineBreaks(state.question);
    }
  }

  // Показываем кнопку рестарта после первого шага
  if (currentState !== "start") {
    restartButton.style.display = "inline-block";
  }
}

// Обработка выбора пользователя
function handleChoice(nextState, color) {
  clearTimeout(autoChoiceTimeout);
  clearInterval(timerInterval);
  document.getElementById("timerDisplay").textContent = "";
  currentState = nextState;
  localStorage.setItem("gameState", currentState);
  updateGame();
  addResult(gameData[nextState].result, color, true);

  const savedResults = JSON.parse(localStorage.getItem("gameResults")) || [];
  savedResults.push({ text: gameData[nextState].result, color });
  localStorage.setItem("gameResults", JSON.stringify(savedResults));
}

// Добавляет результат выбора в интерфейс, с возможной анимацией
function addResult(text, color, animate = true) {
  // Убираем жирность у предыдущего текста
  const previousTextElements = resultsPanel.querySelectorAll(".result strong:nth-child(2)");
  previousTextElements.forEach((el) => {
    el.style.fontWeight = "normal";
  });

  // Если уже идёт анимация текста, завершить её и показать весь текст
  if (activeTyping) {
    clearTimeout(activeTyping);
    activeTyping = null;
    const lastStrong = resultsPanel.querySelector(".result:last-child strong:last-child");
    if (lastStrong) {
      const raw = lastStrong.dataset.fullText || lastStrong.textContent;
      lastStrong.innerHTML = formatTextWithLineBreaks(raw);
    }
  }

  // Создание HTML элементов для результата
  const resultElement = document.createElement("div");
  resultElement.classList.add("result");

  const words = text.split(" ");
  const firstWord = words[0];
  const restOfText = words.slice(1).join(" ");

  const firstWordElement = document.createElement("strong");
  firstWordElement.textContent = firstWord;
  firstWordElement.style.backgroundColor = color;
  firstWordElement.style.color = "white";
  firstWordElement.style.padding = "2px 5px";
  firstWordElement.style.borderRadius = "4px";

  const restOfTextElement = document.createElement("strong");
  restOfTextElement.dataset.fullText = restOfText;
  restOfTextElement.innerHTML = formatTextWithLineBreaks(restOfText);
  restOfTextElement.style.fontWeight = "bold";

  resultElement.appendChild(firstWordElement);
  resultElement.appendChild(restOfTextElement);
  resultsPanel.appendChild(resultElement);

  // Удаляем старые результаты, если их больше заданного лимита
  const maxVisibleResults = 20;
  const currentResults = resultsPanel.querySelectorAll(".result");
  if (currentResults.length > maxVisibleResults) {
    resultsPanel.removeChild(currentResults[0]);
  }
  resultsPanel.scrollTop = resultsPanel.scrollHeight;

  // Запускаем анимацию, если нужно
  if (animate) {
    typeText(restOfTextElement, restOfText);
  }
}

// Эффект "печатающегося текста"
function typeText(element, text) {
  let index = 0;
  const speed = 30;

  function type() {
    if (index < text.length) {
      element.innerHTML = formatTextWithLineBreaks(text.slice(0, index + 1));
      index++;
      activeTyping = setTimeout(type, speed);
    } else {
      activeTyping = null;
    }
  }

  type();
}

// Сброс состояния игры
function restartGame() {
  currentState = "start";
  localStorage.setItem("gameState", currentState);
  localStorage.removeItem("gameResults");
  updateGame();
  resultsPanel.innerHTML = "";
  restartButton.style.display = "none";
}

// Запускаем загрузку данных при инициализации
loadGameData();

// Если игра уже не в начале, восстанавливаем результаты
if (currentState !== "start") {
  const savedResults = JSON.parse(localStorage.getItem("gameResults")) || [];
  savedResults.forEach((result) => {
    addResult(result.text, result.color, false);
  });
}

// Тема: тёмная и светлая
function setDarkTheme() {
  document.body.classList.add("dark-theme");
  localStorage.setItem("theme", "dark");
}

function setLightTheme() {
  document.body.classList.remove("dark-theme");
  localStorage.setItem("theme", "light");
}

const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  setDarkTheme();
}

// Изменение размера текста через слайдер
function updateTextSize() {
  const textSize = textSizeSlider.value;
  document.documentElement.style.setProperty("--font-size", `${textSize}rem`);
}

textSizeSlider.addEventListener("input", updateTextSize);

const savedTextSize = localStorage.getItem("textSize");
if (savedTextSize) {
  textSizeSlider.value = savedTextSize;
  updateTextSize();
}

textSizeSlider.addEventListener("change", () => {
  localStorage.setItem("textSize", textSizeSlider.value);
});

// Горячие клавиши управления игрой
// 1 и 2 — выбор варианта
// R — перезапуск
// T — переключение темы
// + и - — изменение размера текста

document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  const code = e.code;

  if (["input", "textarea"].includes(document.activeElement.tagName.toLowerCase())) return;

  if (key === "1" || code === "Digit1") {
    document.getElementById("choice1")?.click();
  } else if (key === "2" || code === "Digit2") {
    document.getElementById("choice2")?.click();
  } else if (key === "r" || code === "KeyR") {
    restartButton?.click();
  } else if (key === "t" || code === "KeyT") {
    if (document.body.classList.contains("dark-theme")) {
      setLightTheme();
    } else {
      setDarkTheme();
    }
  } else if (key === "+" || key === "=+") {
    let current = parseFloat(textSizeSlider.value);
    if (current < parseFloat(textSizeSlider.max)) {
      textSizeSlider.value = (current + 0.1).toFixed(1);
      updateTextSize();
      localStorage.setItem("textSize", textSizeSlider.value);
    }
  } else if (key === "-" || key === "-_") {
    let current = parseFloat(textSizeSlider.value);
    if (current > parseFloat(textSizeSlider.min)) {
      textSizeSlider.value = (current - 0.1).toFixed(1);
      updateTextSize();
      localStorage.setItem("textSize", textSizeSlider.value);
    }
  }
});
