import { createDueMilestoneReminderNotifications } from './milestones.service.js'

const reminderCheckIntervalMs = 60 * 60 * 1000

let reminderScheduler

async function runReminderCheck() {
  try {
    const notifications = await createDueMilestoneReminderNotifications()
    if (notifications.length) {
      console.info(`Created ${notifications.length} milestone reminder notification(s).`)
    }
  } catch (error) {
    // Keep error logging to surface failures in scheduler
    console.error('Unable to create milestone reminder notifications:', error)
  }
}

export function startMilestoneReminderScheduler() {
  if (reminderScheduler) return reminderScheduler

  void runReminderCheck()
  reminderScheduler = setInterval(runReminderCheck, reminderCheckIntervalMs)
  return reminderScheduler
}
