(function () {
  const dateUtils = window.CarbonTrackerDate;
  let lastStorageError = null;

  function makeStorageError(action, error) {
    const normalizedError =
      error &&
      typeof error === "object" &&
      typeof error.message === "string"
        ? error
        : {
            name: error && error.name ? error.name : "StorageError",
            message:
              typeof error === "string"
                ? error
                : "브라우저 저장소를 사용할 수 없습니다.",
          };

    const baseMessage = normalizedError.message;

    function getUserMessage(actionType) {
      if (actionType === "read") {
        return "저장된 데이터 형식이 손상돼 불러오지 못했어요. 기존 기록은 빈 상태로 시작해요. 백업 파일로 복구할 수 있어요.";
      }
      if (actionType === "migrate") {
        return "로컬 저장 형식을 정리하는 과정에서 오류가 발생해 일부 기록만 보존되었을 수 있어요. 앱 안의 화면 값은 이어서 이어집니다.";
      }
      if (actionType === "clear") {
        return "기록 삭제 요청을 저장소에 반영하지 못했어요. 현재 화면에서는 바뀐 내용이 유지되었지만, 브라우저 저장은 실패했을 수 있어요.";
      }
      return "현재 변경 내용을 브라우저 저장소에 저장하지 못했어요. 새로고침이나 창 닫기 후 반영되지 않을 수 있어요.";
    }

    const userMessage = getUserMessage(action);

    return {
      action: action,
      name: normalizedError.name,
      message: baseMessage,
      userMessage: userMessage,
    };
  }

  function setStorageError(action, error) {
    lastStorageError = makeStorageError(action, error);
  }

  function clearStorageError() {
    lastStorageError = null;
  }

  function getLastStorageError() {
    return lastStorageError ? Object.assign({}, lastStorageError) : null;
  }

  function getStorageMeta() {
    return {
      key: window.CarbonTrackerConfig.STORAGE_KEY,
      version: window.CarbonTrackerConfig.STORAGE_VERSION,
    };
  }

  const BACKUP_SCHEMA = "carbon-footprint-backup";
  const BACKUP_APP_NAME = "carbon-footprint";
  const MIN_BACKUP_VERSION = 1;

  function cloneDefaultState() {
    return Object.assign({}, window.CarbonTrackerConfig.DEFAULT_STATE);
  }

  function getLocalDateKey(date) {
    return dateUtils.getLocalDateKey(date);
  }

  function isDateKey(value) {
    return dateUtils.isDateKey(value);
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
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

        baseState.hvacMinutes = normalizeValueByStep(inferredHvacMinutes, 30);
      }
    }

    return baseState;
  }

  function sanitizeDailyRecords(records) {
    const safeRecords = {};

    if (!isObject(records)) {
      return safeRecords;
    }

    Object.keys(records).forEach(function (dateKey) {
      if (!isDateKey(dateKey)) {
        return;
      }

      const safeState = sanitizeState(records[dateKey]);
      if (!isEmptyState(safeState)) {
        safeRecords[dateKey] = safeState;
      }
    });

    return safeRecords;
  }

  function createBackupPayload(dailyRecords) {
    const safeRecords = sanitizeDailyRecords(dailyRecords);
    return {
      schema: BACKUP_SCHEMA,
      version: getStorageMeta().version,
      appName: BACKUP_APP_NAME,
      exportedAt: new Date().toISOString(),
      dailyRecords: safeRecords,
    };
  }

  function parseBackupVersion(input) {
    const currentVersion = getStorageMeta().version;
    const rawVersion =
      input.storageVersion !== undefined
        ? input.storageVersion
        : input.backupVersion !== undefined
          ? input.backupVersion
          : input.version;
    if (rawVersion === undefined || rawVersion === null) {
      return currentVersion;
    }

    const parsedVersion = Number(rawVersion);
    if (
      !Number.isInteger(parsedVersion) ||
      parsedVersion < MIN_BACKUP_VERSION ||
      parsedVersion > currentVersion
    ) {
      throw new Error(
        "이 앱에서 만든 백업 파일이 아닙니다. 백업 버전이 호환되지 않습니다."
      );
    }

    return parsedVersion;
  }

  function parseBackupPayload(input) {
    if (!isObject(input)) {
      throw new Error(
        "이 앱에서 만든 백업 파일이 아닙니다. 올바른 JSON 객체가 아닙니다."
      );
    }

    if (input.schema !== BACKUP_SCHEMA || input.appName !== BACKUP_APP_NAME) {
      throw new Error("이 앱에서 만든 백업 파일이 아닙니다.");
    }

    const version = parseBackupVersion(input);

    const rawRecords = input.dailyRecords;
    if (!isObject(rawRecords)) {
      throw new Error(
        "이 앱에서 만든 백업 파일 형식이 아닙니다. dailyRecords 객체가 없습니다."
      );
    }

    Object.keys(rawRecords).forEach(function (dateKey) {
      const entry = rawRecords[dateKey];

      if (!isDateKey(dateKey)) {
        throw new Error(
          "백업 파일 형식이 맞지 않습니다. 날짜 키가 YYYY-MM-DD 형식이 아닙니다."
        );
      }

      if (!isObject(entry)) {
        throw new Error(
          "백업 파일 형식이 맞지 않습니다. 날짜별 기록은 객체여야 합니다."
        );
      }
    });

    const safeRecords = sanitizeDailyRecords(rawRecords);
    return Object.assign(
      {},
      {
        version: version,
        appName: input.appName,
        exportedAt: input.exportedAt,
      },
      {
        dailyRecords: safeRecords,
      }
    );
  }

  function mergeDailyRecords(dailyRecords, incomingDailyRecords) {
    const normalized = sanitizeDailyRecords(incomingDailyRecords);
    const base = sanitizeDailyRecords(dailyRecords);
    return persistDailyRecordsWithResult(Object.assign({}, base, normalized));
  }

  function mergeDailyRecordsWithResult(dailyRecords, incomingDailyRecords) {
    return mergeDailyRecords(dailyRecords, incomingDailyRecords);
  }

  function replaceDailyRecords(incomingDailyRecords) {
    const normalized = sanitizeDailyRecords(incomingDailyRecords);
    return persistDailyRecordsWithResult(normalized);
  }

  function replaceDailyRecordsWithResult(incomingDailyRecords) {
    return replaceDailyRecords(incomingDailyRecords);
  }

  function readRawStorage() {
    const storageKey = getStorageMeta().key;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === null || raw === "") {
        return { ok: true, payload: null, error: null };
      }

      return { ok: true, payload: JSON.parse(raw), error: null };
    } catch (error) {
      return { ok: false, payload: null, error: makeStorageError("read", error) };
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

    if (isObject(raw.dailyRecords)) {
      const safeRecords = sanitizeDailyRecords(raw.dailyRecords);
      const sourceVersion = Number(raw.version || 0);

      return {
        version: currentVersion,
        dailyRecords: safeRecords,
        migrated: sourceVersion !== currentVersion,
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
    const rawResult = readRawStorage();
    if (!rawResult.ok) {
      setStorageError("read", rawResult.error);
      return {
        ok: false,
        records: {},
        error: rawResult.error,
      };
    }

    const normalized = normalizeStoragePayload(rawResult.payload);
    if (!normalized.migrated) {
      clearStorageError();
      return {
        ok: true,
        records: normalized.dailyRecords,
        error: null,
      };
    }

    const migrationResult = persistDailyRecordsWithResult(
      normalized.dailyRecords,
      "migrate"
    );
    if (!migrationResult.ok) {
      return {
        ok: false,
        records: migrationResult.records,
        error: migrationResult.error,
      };
    }

    return {
      ok: true,
      records: migrationResult.records,
      error: null,
    };
  }

  function persistDailyRecordsWithResult(dailyRecords, operation) {
    const effectiveOperation =
      typeof operation === "string" ? operation : "save";
    const storageMeta = getStorageMeta();
    const safeRecords = sanitizeDailyRecords(dailyRecords);

    try {
      window.localStorage.setItem(
        storageMeta.key,
        JSON.stringify({
          version: storageMeta.version,
          dailyRecords: safeRecords,
        })
      );
      clearStorageError();
      return {
        ok: true,
        records: safeRecords,
        error: null,
      };
    } catch (error) {
      const storageError = makeStorageError(effectiveOperation, error);
      setStorageError(effectiveOperation, storageError);
      return {
        ok: false,
        records: safeRecords,
        error: storageError,
      };
    }
  }

  function persistDailyRecords(dailyRecords) {
    return persistDailyRecordsWithResult(dailyRecords);
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

    return persistDailyRecordsWithResult(nextRecords);
  }

  function clearStateForDate(dateKey, dailyRecords) {
    const nextRecords = Object.assign({}, dailyRecords || {});
    delete nextRecords[dateKey];
    return persistDailyRecordsWithResult(nextRecords);
  }

  function clearAllData() {
    try {
      window.localStorage.removeItem(getStorageMeta().key);
      clearStorageError();
      return {
        ok: true,
        records: {},
        error: null,
      };
    } catch (error) {
      const storageError = makeStorageError("clear", error);
      setStorageError("clear", storageError);
      return {
        ok: false,
        records: {},
        error: storageError,
      };
    }
  }

  window.CarbonTrackerStorage = {
    clearAllData: clearAllData,
    clearStorageError: clearStorageError,
    clearStateForDate: clearStateForDate,
    createBackupPayload: createBackupPayload,
    mergeDailyRecordsWithResult: mergeDailyRecordsWithResult,
    isDateKey: isDateKey,
    getLastStorageError: getLastStorageError,
    getStateForDate: getStateForDate,
    parseBackupPayload: parseBackupPayload,
    isEmptyState: isEmptyState,
    loadDailyRecords: loadDailyRecords,
    persistDailyRecordsWithResult: persistDailyRecordsWithResult,
    saveStateForDate: saveStateForDate,
    replaceDailyRecordsWithResult: replaceDailyRecordsWithResult,
    sanitizeDailyRecords: sanitizeDailyRecords,
    sanitizeState: sanitizeState,
    readRawStorage: readRawStorage,
  };
})();
