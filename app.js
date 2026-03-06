(function () {
  const config = window.CarbonTrackerConfig;
  const storage = window.CarbonTrackerStorage;
  const chartApi = window.CarbonTrackerChart;

  const today = new Date();
  const todayKey = getDateKey(today);
  let selectedDateKey = todayKey;
  let dailyRecords = storage.loadDailyRecords();
  let state = storage.getStateForDate(selectedDateKey, dailyRecords);
  let dailyChartInstance = null;
  let weeklyTrendChartInstance = null;

  function formatToday() {
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "full",
    }).format(new Date());
  }

  function formatShortDate(date) {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    }).format(date);
  }

  function formatCompactDate(date) {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "numeric",
      day: "numeric",
    }).format(date);
  }

  function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function getDateFromKey(dateKey) {
    const parts = dateKey.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function getLastNDates(count) {
    const dates = [];

    for (let index = 0; index < count; index += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - index);
      dates.push(date);
    }

    return dates;
  }

  function getItemByKey(key) {
    return config.ITEMS.find(function (item) {
      return item.key === key;
    });
  }

  function getTotalCount(currentState) {
    return config.ITEMS.reduce(function (total, item) {
      if (item.key === "electricityMinutes") {
        return total + currentState[item.key] / item.step;
      }

      return total + currentState[item.key];
    }, 0);
  }

  function getTotalCarbon(currentState) {
    return config.ITEMS.reduce(function (total, item) {
      return total + currentState[item.key] * item.carbonFactor;
    }, 0);
  }

  function getTopItem(currentState) {
    let topItem = null;

    config.ITEMS.forEach(function (item) {
      const currentComparableValue = currentState[item.key] / item.step;
      const topComparableValue = topItem
        ? currentState[topItem.key] / topItem.step
        : -1;

      if (!topItem || currentComparableValue > topComparableValue) {
        topItem = item;
      }
    });

    if (!topItem || currentState[topItem.key] === 0) {
      return null;
    }

    return topItem;
  }

  function getEcoLevel(totalCarbon) {
    return config.ECO_LEVELS.find(function (level) {
      return totalCarbon <= level.maxCarbon;
    });
  }

  function getTopItemFromRecords(records) {
    const totalsByItem = config.ITEMS.reduce(function (acc, item) {
      acc[item.key] = 0;
      return acc;
    }, {});

    Object.keys(records).forEach(function (dateKey) {
      const currentState = records[dateKey];

      config.ITEMS.forEach(function (item) {
        totalsByItem[item.key] += currentState[item.key] / item.step;
      });
    });

    let topItem = null;
    let topValue = -1;

    config.ITEMS.forEach(function (item) {
      if (totalsByItem[item.key] > topValue) {
        topItem = item;
        topValue = totalsByItem[item.key];
      }
    });

    if (!topItem || topValue <= 0) {
      return null;
    }

    return topItem;
  }

  function getRecentRecords() {
    return getLastNDates(config.HISTORY_DAYS).map(function (date) {
      const dateKey = getDateKey(date);
      const dayState = storage.getStateForDate(dateKey, dailyRecords);
      return {
        date: date,
        dateKey: dateKey,
        state: dayState,
      };
    });
  }

  function getTip(topItem, totalCarbon) {
    if (!topItem) {
      return {
        title: "기록을 시작해 보세요",
        text: "첫 기록을 남기면 우리 반이 어떤 활동에서 탄소를 만들고 있는지 바로 알 수 있어요.",
      };
    }

    if (totalCarbon >= 3.5) {
      return {
        title: "줄일 수 있는 부분을 찾아보세요",
        text: topItem.tip + " " + topItem.label + " 항목부터 줄여 보면 좋아요.",
      };
    }

    return {
      title: "잘 살펴보고 있어요",
      text: topItem.tip + " 지금처럼 기록하면서 변화를 비교해 보세요.",
    };
  }

  function createControlCard(item) {
    const wrapper = document.createElement("article");
    wrapper.className = "control-card";
    wrapper.innerHTML =
      '<div class="control-copy">' +
      '  <div class="control-title">' +
      '    <span class="control-swatch" aria-hidden="true"></span>' +
      "    <strong></strong>" +
      "  </div>" +
      "  <p></p>" +
      "</div>" +
      '<div class="control-actions">' +
      '  <button class="action-button decrease-button" type="button" aria-label=""></button>' +
      '  <div class="value-chip" aria-live="polite"></div>' +
      '  <button class="action-button increase-button" type="button" aria-label=""></button>' +
      "</div>";

    wrapper.dataset.key = item.key;
    wrapper.querySelector(".control-swatch").style.backgroundColor = item.color;
    wrapper.querySelector(".control-title strong").textContent = item.label;
    wrapper.querySelector(".control-copy p").textContent = item.description;

    const decreaseButton = wrapper.querySelector(".decrease-button");
    const increaseButton = wrapper.querySelector(".increase-button");

    decreaseButton.textContent = "−";
    increaseButton.textContent = "+";
    decreaseButton.style.backgroundColor = item.color;
    increaseButton.style.backgroundColor = item.color;
    decreaseButton.setAttribute("aria-label", item.label + " 줄이기");
    increaseButton.setAttribute("aria-label", item.label + " 늘리기");

    return wrapper;
  }

  function renderControls() {
    const grid = document.getElementById("controlGrid");
    grid.innerHTML = "";

    config.ITEMS.forEach(function (item) {
      grid.appendChild(createControlCard(item));
    });
  }

  function updateSelectedDateUI() {
    const selectedDate = getDateFromKey(selectedDateKey);
    const isTodaySelected = selectedDateKey === todayKey;
    const titleText = isTodaySelected
      ? "오늘 기록을 수정하고 있어요"
      : formatShortDate(selectedDate) + " 기록을 수정하고 있어요";
    const descriptionText = isTodaySelected
      ? "오늘의 교실 기록을 입력하거나 고칠 수 있어요."
      : formatShortDate(selectedDate) + "에 저장한 기록을 불러와서 수정할 수 있어요.";

    document.getElementById("recordDate").value = selectedDateKey;
    document.getElementById("selectedDateTitle").textContent = titleText;
    document.getElementById("selectedDateDescription").textContent = descriptionText;
  }

  function updateControlValues() {
    config.ITEMS.forEach(function (item) {
      const card = document.querySelector('[data-key="' + item.key + '"]');
      if (!card) {
        return;
      }

      const valueChip = card.querySelector(".value-chip");
      valueChip.textContent = state[item.key] + item.unit;
    });
  }

  function updateSummary() {
    const totalCarbon = getTotalCarbon(state);
    const topItem = getTopItem(state);
    const ecoLevel = getEcoLevel(totalCarbon);
    const tip = getTip(topItem, totalCarbon);

    document.getElementById("totalCount").textContent = String(getTotalCount(state));
    document.getElementById("totalCarbon").textContent = totalCarbon.toFixed(2) + " kg";
    document.getElementById("topItem").textContent = topItem ? topItem.label : "아직 없음";
    document.getElementById("ecoStatus").textContent = ecoLevel.label;
    document.getElementById("statusDescription").textContent = ecoLevel.description;
    document.getElementById("tipTitle").textContent = tip.title;
    document.getElementById("tipText").textContent = tip.text;

    const statusCard = document.querySelector(".status-card");
    statusCard.classList.remove("good", "normal", "alert");
    statusCard.classList.add(ecoLevel.className);
  }

  function renderHistory() {
    const recentRecords = getRecentRecords();
    const activeRecords = recentRecords.filter(function (entry) {
      return !storage.isEmptyState(entry.state);
    });
    const weeklyCarbon = activeRecords.reduce(function (total, entry) {
      return total + getTotalCarbon(entry.state);
    }, 0);
    const weeklyTopItem = getTopItemFromRecords(
      activeRecords.reduce(function (acc, entry) {
        acc[entry.dateKey] = entry.state;
        return acc;
      }, {})
    );

    document.getElementById("weeklyActiveDays").textContent =
      String(activeRecords.length) + "일";
    document.getElementById("weeklyCarbon").textContent =
      weeklyCarbon.toFixed(2) + " kg";
    document.getElementById("weeklyTopItem").textContent = weeklyTopItem
      ? weeklyTopItem.label
      : "아직 없음";

    const historyList = document.getElementById("historyList");
    historyList.innerHTML = "";

    recentRecords.forEach(function (entry) {
      const item = document.createElement("button");
      const entryTopItem = getTopItem(entry.state);
      const totalCount = getTotalCount(entry.state);
      const totalCarbon = getTotalCarbon(entry.state);
      const isEmpty = storage.isEmptyState(entry.state);
      const isActive = entry.dateKey === selectedDateKey;

      item.type = "button";
      item.className =
        "history-item" +
        (isEmpty ? " empty" : "") +
        (isActive ? " active" : "");
      item.dataset.dateKey = entry.dateKey;
      item.innerHTML =
        "<div>" +
        "  <h3>" +
        formatShortDate(entry.date) +
        "</h3>" +
        "  <p>" +
        (isEmpty
          ? "기록이 없어요. 눌러서 새로 입력할 수 있어요."
          : "총 " +
            totalCount +
            "단위 · " +
            totalCarbon.toFixed(2) +
            "kg · 최다 항목: " +
            entryTopItem.label) +
        "</p>" +
        "</div>" +
        '<div class="history-value">' +
        (isActive
          ? "선택 중"
          : isEmpty
            ? "기록 없음"
            : totalCarbon.toFixed(2) + " kg") +
        "</div>";

      historyList.appendChild(item);
    });

    const trendLabels = recentRecords
      .slice()
      .reverse()
      .map(function (entry) {
        return formatCompactDate(entry.date);
      });
    const trendValues = recentRecords
      .slice()
      .reverse()
      .map(function (entry) {
        return Number(getTotalCarbon(entry.state).toFixed(2));
      });

    chartApi.updateWeeklyTrendChart(weeklyTrendChartInstance, trendLabels, trendValues);
  }

  function render() {
    updateSelectedDateUI();
    updateControlValues();
    updateSummary();
    renderHistory();
    chartApi.updateDailyCarbonChart(dailyChartInstance, state);
  }

  function persistSelectedState() {
    dailyRecords = storage.saveStateForDate(selectedDateKey, state, dailyRecords);
  }

  function loadSelectedDate(dateKey) {
    selectedDateKey = dateKey;
    state = storage.getStateForDate(selectedDateKey, dailyRecords);
    render();
  }

  function updateState(key, delta) {
    const item = getItemByKey(key);
    if (!item) {
      return;
    }

    state[key] = Math.max(0, state[key] + delta);
    persistSelectedState();
    render();
  }

  function bindControlEvents() {
    const grid = document.getElementById("controlGrid");

    grid.addEventListener("click", function (event) {
      const button = event.target.closest("button");
      if (!button) {
        return;
      }

      const card = event.target.closest(".control-card");
      if (!card) {
        return;
      }

      const item = getItemByKey(card.dataset.key);
      if (!item) {
        return;
      }

      const delta = button.classList.contains("increase-button") ? item.step : -item.step;
      updateState(item.key, delta);
    });
  }

  function bindHistoryEvents() {
    const historyList = document.getElementById("historyList");

    historyList.addEventListener("click", function (event) {
      const button = event.target.closest(".history-item");
      if (!button) {
        return;
      }

      loadSelectedDate(button.dataset.dateKey);
    });
  }

  function bindDateEvents() {
    const dateInput = document.getElementById("recordDate");
    const todayButton = document.getElementById("todayButton");

    dateInput.max = todayKey;
    dateInput.addEventListener("change", function () {
      const nextDateKey = dateInput.value || todayKey;
      loadSelectedDate(nextDateKey > todayKey ? todayKey : nextDateKey);
    });

    todayButton.addEventListener("click", function () {
      loadSelectedDate(todayKey);
    });
  }

  function bindResetEvent() {
    const resetButton = document.getElementById("resetButton");
    resetButton.addEventListener("click", function () {
      state = Object.assign({}, config.DEFAULT_STATE);
      dailyRecords = storage.clearStateForDate(selectedDateKey, dailyRecords);
      render();
    });
  }

  function initCharts() {
    const dailyFallback = document.getElementById("chartFallback");
    const trendFallback = document.getElementById("trendFallback");
    const dailyCanvas = document.getElementById("carbonChart");
    const trendCanvas = document.getElementById("weeklyTrendChart");

    if (!window.Chart) {
      dailyFallback.hidden = false;
      trendFallback.hidden = false;
      dailyCanvas.hidden = true;
      trendCanvas.hidden = true;
      return;
    }

    dailyChartInstance = chartApi.createDailyCarbonChart(dailyCanvas);
    weeklyTrendChartInstance = chartApi.createWeeklyTrendChart(trendCanvas);
  }

  function initDate() {
    document.getElementById("todayDate").textContent = formatToday();
  }

  function init() {
    initDate();
    renderControls();
    bindControlEvents();
    bindHistoryEvents();
    bindDateEvents();
    bindResetEvent();
    initCharts();
    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
