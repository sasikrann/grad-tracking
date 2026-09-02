// ไฟล์สำหรับเริ่มรัน backend server
// ใช้ดึง app จาก app.js แล้วสั่งให้ server ทำงานที่ port ที่กำหนด
import app from "./app.js";
import pool from "./config/database.js";
import {
  startMilestoneReminderScheduler,
  stopMilestoneReminderScheduler,
} from "./services/milestone-reminder-scheduler.service.js";

process.env.TZ ||= "Asia/Bangkok";

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.info(`Backend is running on http://localhost:${port}`);
  startMilestoneReminderScheduler();
});

let isShuttingDown = false;

function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.info(`${signal} received. Shutting down gracefully.`);
  stopMilestoneReminderScheduler();
  server.close(async (error) => {
    try {
      await pool.end();
    } finally {
      if (error) console.error("Unable to close the HTTP server cleanly:", error);
      process.exitCode = error ? 1 : 0;
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
