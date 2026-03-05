import { calculateMetrics } from "./metrics.js";

const STORAGE_KEY = "clauer_history";

export function saveSessionRecord(sessionData) {
  try {
    const history = getHistory();
    const now = Date.now();
    const dateStr = new Date(now).toISOString().split("T")[0];

    // Calculate metrics using existing calculateMetrics logic
    let metricsObj = {
      cpm: 0,
      accuracy: 0,
      ies: 0,
      cv: 0,
      switchCost: 0,
    };

    if (sessionData.logs && sessionData.logs.length > 0) {
      const metrics = calculateMetrics(sessionData.logs, sessionData.time);
      const totalItems = parseInt(sessionData.config.split("/")[1], 10);
      const accuracy =
        totalItems > 0
          ? ((totalItems - sessionData.errors) / totalItems) * 100
          : 0;

      metricsObj = {
        cpm: parseFloat(metrics.cpm) || 0,
        accuracy: parseFloat(accuracy.toFixed(1)) || 0,
        ies: parseFloat(metrics.ies) || 0,
        cv: parseFloat(metrics.cv) || 0,
        switchCost: parseFloat(metrics.switchCost) || 0,
      };
    }

    const record = {
      timestamp: now,
      dateStr: dateStr,
      config: sessionData.config,
      mode: sessionData.mode,
      metrics: metricsObj,
    };

    history.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save session record", e);
  }
}

export function getHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const history = data ? JSON.parse(data) : [];
    // Sort by timestamp just in case
    return history.sort((a, b) => a.timestamp - b.timestamp);
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
}
