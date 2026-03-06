(function () {
  function cloneDefaultState() {
    return Object.assign({}, window.CarbonTrackerConfig.DEFAULT_STATE);
  }

  function getLocalDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function createSampleRecords() {
    const templates = window.CarbonTrackerConfig.SAMPLE_RECORD_TEMPLATES || [];

    return templates.reduce(function (records, template) {
      const date = new Date();
      date.setDate(date.getDate() - template.offsetDays);
      records[getLocalDateKey(date)] = sanitizeState(template.state);
      return records;
    }, {});
  }

  function isEmptyState(state) {
    const items = window.CarbonTrackerConfig.ITEMS;

    return items.every(function (item) {
      return Number(state[item.key] || 0) === 0;
    });
  }

  function sanitizeState(input) {
    const baseState = cloneDefaultState();
    const items = window.CarbonTrackerConfig.ITEMS;

    if (!input || typeof input !== "object") {
      return baseState;
    }

    items.forEach(function (item) {
      const rawValue = input[item.key];
      const numericValue = Number(rawValue);

      if (!Number.isFinite(numericValue) || numericValue < 0) {
        baseState[item.key] = 0;
        return;
      }

      const normalizedValue = Math.round(numericValue / item.step) * item.step;
      baseState[item.key] = Math.max(0, normalizedValue);
    });

    return baseState;
  }

  function sanitizeDailyRecords(records) {
    const safeRecords = {};

    if (!records || typeof records !== "object") {
      return safeRecords;
    }

    Object.keys(records).forEach(function (dateKey) {
      const safeState = sanitizeState(records[dateKey]);
      if (!isEmptyState(safeState)) {
        safeRecords[dateKey] = safeState;
      }
    });

    return safeRecords;
  }

  function readRawStorage() {
    const storageKey = window.CarbonTrackerConfig.STORAGE_KEY;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return null;
      }

      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function loadDailyRecords() {
    const raw = readRawStorage();

    if (!raw) {
      return createSampleRecords();
    }

    if (raw.dailyRecords && typeof raw.dailyRecords === "object") {
      const safeRecords = sanitizeDailyRecords(raw.dailyRecords);
      return Object.keys(safeRecords).length > 0 ? safeRecords : createSampleRecords();
    }

    const migratedState = sanitizeState(raw);
    if (isEmptyState(migratedState)) {
      return createSampleRecords();
    }

    const todayKey = getLocalDateKey(new Date());
    return {
      [todayKey]: migratedState,
    };
  }

  function persistDailyRecords(dailyRecords) {
    const storageKey = window.CarbonTrackerConfig.STORAGE_KEY;
    const safeRecords = sanitizeDailyRecords(dailyRecords);
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        dailyRecords: safeRecords,
      })
    );
    return safeRecords;
  }

  function getStateForDate(dateKey, dailyRecords) {
    return sanitizeState((dailyRecords || {})[dateKey]);
  }

  function saveStateForDate(dateKey, state, dailyRecords) {
    const nextRecords = Object.assign({}, dailyRecords || {});
    const safeState = sanitizeState(state);

    if (isEmptyState(safeState)) {
      delete nextRecords[dateKey];
    } else {
      nextRecords[dateKey] = safeState;
    }

    return persistDailyRecords(nextRecords);
  }

  function clearStateForDate(dateKey, dailyRecords) {
    const nextRecords = Object.assign({}, dailyRecords || {});
    delete nextRecords[dateKey];
    return persistDailyRecords(nextRecords);
  }

  window.CarbonTrackerStorage = {
    clearStateForDate: clearStateForDate,
    getStateForDate: getStateForDate,
    isEmptyState: isEmptyState,
    loadDailyRecords: loadDailyRecords,
    saveStateForDate: saveStateForDate,
    sanitizeState: sanitizeState,
  };
})();
