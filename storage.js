(function () {
  function getStorageMeta() {
    return {
      key: window.CarbonTrackerConfig.STORAGE_KEY,
      version: window.CarbonTrackerConfig.STORAGE_VERSION,
    };
  }

  function cloneDefaultState() {
    return Object.assign({}, window.CarbonTrackerConfig.DEFAULT_STATE);
  }

  function getLocalDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function getLegacySampleRecords() {
    const templates = [
      {
        offsetDays: 0,
        state: {
          plastic: 2,
          paper: 4,
          can: 1,
          general: 1,
          electricityMinutes: 20,
        },
      },
      {
        offsetDays: 1,
        state: {
          plastic: 1,
          paper: 2,
          can: 0,
          general: 2,
          electricityMinutes: 30,
        },
      },
      {
        offsetDays: 2,
        state: {
          plastic: 3,
          paper: 1,
          can: 1,
          general: 0,
          electricityMinutes: 10,
        },
      },
      {
        offsetDays: 3,
        state: {
          plastic: 0,
          paper: 3,
          can: 0,
          general: 1,
          electricityMinutes: 40,
        },
      },
    ];

    return templates.reduce(function (records, template) {
      const date = new Date();
      date.setDate(date.getDate() - template.offsetDays);
      records[getLocalDateKey(date)] = sanitizeState(template.state);
      return records;
    }, {});
  }

  function areSameState(leftState, rightState) {
    const items = window.CarbonTrackerConfig.ITEMS;

    return items.every(function (item) {
      return Number(leftState[item.key] || 0) === Number(rightState[item.key] || 0);
    });
  }

  function isLegacySampleOnly(records) {
    const legacyRecords = getLegacySampleRecords();
    const recordKeys = Object.keys(records || {}).sort();
    const legacyKeys = Object.keys(legacyRecords).sort();

    if (recordKeys.length !== legacyKeys.length) {
      return false;
    }

    return recordKeys.every(function (key, index) {
      return (
        key === legacyKeys[index] &&
        areSameState(records[key], legacyRecords[key])
      );
    });
  }

  function isEmptyState(state) {
    const defaultState = cloneDefaultState();
    const items = window.CarbonTrackerConfig.ITEMS;

    return items.every(function (item) {
      return (
        Number(state[item.key] || 0) === Number(defaultState[item.key] || 0)
      );
    });
  }

  function normalizeValueByStep(value, step) {
    return Math.max(0, Math.round(value / step) * step);
  }

  function sanitizeState(input) {
    const baseState = cloneDefaultState();
    const items = window.CarbonTrackerConfig.ITEMS;
    const hasLegacyElectricityValue =
      input &&
      typeof input === "object" &&
      Object.prototype.hasOwnProperty.call(input, "electricityMinutes");
    const legacyElectricityValue = hasLegacyElectricityValue
      ? Math.max(0, Number(input.electricityMinutes) || 0)
      : 0;
    const hasLegacyExtraElectricityValue =
      input &&
      typeof input === "object" &&
      Object.prototype.hasOwnProperty.call(input, "extraElectricityMinutes");
    const legacyExtraElectricityValue = hasLegacyExtraElectricityValue
      ? Math.max(0, Number(input.extraElectricityMinutes) || 0)
      : 0;

    if (!input || typeof input !== "object") {
      return baseState;
    }

    items.forEach(function (item) {
      let rawValue = input[item.key];

      if (item.key === "hvacMinutes" && rawValue === undefined && hasLegacyExtraElectricityValue) {
        rawValue = legacyExtraElectricityValue;
      }

      if (rawValue === undefined || rawValue === null || rawValue === "") {
        return;
      }

      const numericValue = Number(rawValue);

      if (!Number.isFinite(numericValue) || numericValue < 0) {
        return;
      }

      const normalizedValue = normalizeValueByStep(numericValue, item.step);
      baseState[item.key] = Math.max(0, normalizedValue);
    });

    if (hasLegacyElectricityValue) {
      const defaultLighting = Number(baseState.baseLightingMinutes || 0);

      if (!Object.prototype.hasOwnProperty.call(input, "baseLightingMinutes")) {
        baseState.baseLightingMinutes = defaultLighting;
      }

      if (!Object.prototype.hasOwnProperty.call(input, "hvacMinutes")) {
        const inferredHvacMinutes =
          legacyElectricityValue <= defaultLighting
            ? legacyElectricityValue
            : legacyElectricityValue - defaultLighting;

        baseState.hvacMinutes = normalizeValueByStep(
          inferredHvacMinutes,
          30
        );
      }
    }

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
    const storageKey = getStorageMeta().key;

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

  function normalizeStoragePayload(raw) {
    const currentVersion = getStorageMeta().version;

    if (!raw) {
      return {
        version: currentVersion,
        dailyRecords: {},
        migrated: false,
      };
    }

    if (raw.dailyRecords && typeof raw.dailyRecords === "object") {
      const safeRecords = sanitizeDailyRecords(raw.dailyRecords);
      const migratedRecords = isLegacySampleOnly(safeRecords) ? {} : safeRecords;

      return {
        version: currentVersion,
        dailyRecords: migratedRecords,
        migrated: Number(raw.version || 0) !== currentVersion,
      };
    }

    const migratedState = sanitizeState(raw);
    if (isEmptyState(migratedState)) {
      return {
        version: currentVersion,
        dailyRecords: {},
        migrated: true,
      };
    }

    const todayKey = getLocalDateKey(new Date());
    return {
      version: currentVersion,
      dailyRecords: {
        [todayKey]: migratedState,
      },
      migrated: true,
    };
  }

  function loadDailyRecords() {
    const raw = readRawStorage();
    const normalized = normalizeStoragePayload(raw);

    if (normalized.migrated) {
      persistDailyRecords(normalized.dailyRecords);
    }

    return normalized.dailyRecords;
  }

  function persistDailyRecords(dailyRecords) {
    const storageMeta = getStorageMeta();
    const safeRecords = sanitizeDailyRecords(dailyRecords);
    window.localStorage.setItem(
      storageMeta.key,
      JSON.stringify({
        version: storageMeta.version,
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

  function clearAllData() {
    window.localStorage.removeItem(getStorageMeta().key);
  }

  window.CarbonTrackerStorage = {
    clearAllData: clearAllData,
    clearStateForDate: clearStateForDate,
    getStateForDate: getStateForDate,
    isEmptyState: isEmptyState,
    loadDailyRecords: loadDailyRecords,
    saveStateForDate: saveStateForDate,
    sanitizeState: sanitizeState,
  };
})();
