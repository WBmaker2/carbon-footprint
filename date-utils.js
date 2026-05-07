(function () {
  function toPaddedNumber(value) {
    return String(value).padStart(2, "0");
  }

  function getLocalDateKey(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return "";
    }

    const year = date.getFullYear();
    const month = toPaddedNumber(date.getMonth() + 1);
    const day = toPaddedNumber(date.getDate());
    return year + "-" + month + "-" + day;
  }

  function getDateFromKey(dateKey) {
    if (typeof dateKey !== "string" || dateKey.length === 0) {
      return new Date(NaN);
    }

    const parts = dateKey.split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
      return new Date(NaN);
    }

    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function isDateKey(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const parts = value.split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
      return false;
    }

    const year = parts[0];
    const month = parts[1];
    const day = parts[2];

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day)
    ) {
      return false;
    }

    const parsedDate = new Date(year, month - 1, day);
    return (
      parsedDate.getFullYear() === year &&
      parsedDate.getMonth() + 1 === month &&
      parsedDate.getDate() === day
    );
  }

  function getTodayKey() {
    return getLocalDateKey(new Date());
  }

  window.CarbonTrackerDate = {
    getDateFromKey: getDateFromKey,
    getDateKey: getLocalDateKey,
    getLocalDateKey: getLocalDateKey,
    getTodayKey: getTodayKey,
    isDateKey: isDateKey,
  };
})();
