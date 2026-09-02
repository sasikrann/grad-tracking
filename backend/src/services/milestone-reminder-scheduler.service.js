import { createDueMilestoneReminderNotifications } from "./milestone-reminder.service.js";

const reminderCheckIntervalMs = 60 * 60 * 1000;

let reminderScheduler;

async function runReminderCheck() {
  const checkedAt = new Date().toISOString();
  try {
    const result = await createDueMilestoneReminderNotifications();
    console.info({
      event: "milestone_reminder_check",
      checkedAt,
      targetDate: result.targetDate,
      milestonesFound: result.milestonesFound,
      attemptedStages: result.attemptedStages,
      notificationsCreated: result.notifications.length,
      duplicatesSkipped: result.duplicatesSkipped,
    });
  } catch (error) {
    // Keep error logging to surface failures in scheduler
    console.error({
      event: "milestone_reminder_check_failed",
      checkedAt,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

export function startMilestoneReminderScheduler() {
  if (reminderScheduler) return reminderScheduler;

  void runReminderCheck();
  reminderScheduler = setInterval(runReminderCheck, reminderCheckIntervalMs);
  return reminderScheduler;
}

export function stopMilestoneReminderScheduler() {
  if (!reminderScheduler) return;
  clearInterval(reminderScheduler);
  reminderScheduler = undefined;
}
