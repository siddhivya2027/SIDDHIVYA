"use client";
import * as React from "react";
import { sendDailyReports } from "@/lib/launch/reports";
import { useStore } from "@/lib/store";

/**
 * Sends the daily Telegram report once a day, the first time anyone opens SIDDHIVYA after the report hour.
 * (Fully automatic sending at a fixed time needs a server database and a scheduled job — see docs/LAUNCH.md.)
 */
let started = "";
export function AutoAlerts() {
  const rules = useStore((s) => s.alertRules);
  const has = useStore((s) => s.launches.length > 0);
  React.useEffect(() => {
    if (!rules.dailyReport || !has) return;
    const today = new Date().toISOString().slice(0, 10);
    if (rules.lastDailyReport === today || started === today || new Date().getHours() < rules.reportHour) return;
    started = today;
    void sendDailyReports();
  }, [rules.dailyReport, rules.lastDailyReport, rules.reportHour, has]);
  return null;
}
