import cron, { ScheduledTask } from "node-cron";
import mongoose from "mongoose";
import { BackupSettings, IBackupSettings } from "../models/backup-settings.model";
import { runBackup, BackupSchedule } from "./backup.service";

// ─── State ────────────────────────────────────────────────────────────────────

const scheduledTasks: Record<string, ScheduledTask> = {};

// ─── Cron Expression Builder ──────────────────────────────────────────────────
// All times are treated as IST (Asia/Kolkata).
// node-cron uses the system timezone by default; we pass timezone explicitly.

const buildDailyCron = (time: string): string => {
    const [hour, minute] = time.split(":").map(Number);
    return `${minute} ${hour} * * *`;
};

const buildWeeklyCron = (time: string, dayOfWeek: number): string => {
    const [hour, minute] = time.split(":").map(Number);
    return `${minute} ${hour} * * ${dayOfWeek}`;
};

const buildMonthlyCron = (time: string, dayOfMonth: number): string => {
    const [hour, minute] = time.split(":").map(Number);
    // Cap at 28 to avoid skipped months (Feb has min 28 days)
    const safeDay = Math.min(dayOfMonth, 28);
    return `${minute} ${hour} ${safeDay} * *`;
};

// ─── Task Management ──────────────────────────────────────────────────────────

const stopTask = (key: string): void => {
    if (scheduledTasks[key]) {
        scheduledTasks[key].stop();
        delete scheduledTasks[key];
        console.log(`🗓️  [Scheduler] Stopped ${key} backup job`);
    }
};

const startTask = (key: BackupSchedule, cronExpr: string, adminId: string): void => {
    const taskKey = `${adminId}:${key}`;
    stopTask(taskKey);

    scheduledTasks[taskKey] = cron.schedule(
        cronExpr,
        async () => {
            console.log(`⏰ [Scheduler] Running scheduled ${key} backup for admin ${adminId}...`);
            try {
                await runBackup(key, adminId, adminId);
            } catch (err) {
                console.error(`❌ [Scheduler] Scheduled ${key} backup failed for admin ${adminId}:`, err);
            }
        },
        {
            timezone: "Asia/Kolkata",
        }
    );

    console.log(`🗓️  [Scheduler] Started ${key} backup job for admin ${adminId}: ${cronExpr} (IST)`);
};

// ─── Apply Settings ───────────────────────────────────────────────────────────

export const applyScheduleSettings = (settings: IBackupSettings, adminId: string): void => {
    // ── Daily ─────────────────────────────────────────────────────────
    if (settings.dailyEnabled) {
        startTask("daily", buildDailyCron(settings.dailyTime), adminId);
    } else {
        stopTask(`${adminId}:daily`);
    }

    // ── Weekly ─────────────────────────────────────────────────────
    if (settings.weeklyEnabled) {
        startTask("weekly", buildWeeklyCron(settings.weeklyTime, settings.weeklyDay), adminId);
    } else {
        stopTask(`${adminId}:weekly`);
    }

    // ── Monthly ──────────────────────────────────────────────────
    if (settings.monthlyEnabled) {
        startTask("monthly", buildMonthlyCron(settings.monthlyTime, settings.monthlyDay), adminId);
    } else {
        stopTask(`${adminId}:monthly`);
    }
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Called once at server startup. Loads ALL admins' settings and initializes cron jobs per admin.
 */
export const initializeBackupScheduler = async (): Promise<void> => {
    try {
        const allSettings = await BackupSettings.find({}).lean();
        for (const settings of allSettings) {
            const adminId = settings.adminId?.toString();
            if (adminId) {
                applyScheduleSettings(settings as unknown as IBackupSettings, adminId);
            }
        }
        console.log(`✅ Backup scheduler initialized for ${allSettings.length} admin(s)`);
    } catch (err) {
        console.error("❌ Failed to initialize backup scheduler:", err);
    }
};

/**
 * Called whenever backup settings are updated via the API.
 * Reloads cron jobs for the specific admin whose settings changed.
 */
export const reloadScheduler = async (adminId?: string): Promise<void> => {
    try {
        if (adminId) {
            // Reload for a specific admin
            const settings = await BackupSettings.findOne({ adminId: new mongoose.Types.ObjectId(adminId) });
            if (settings) {
                applyScheduleSettings(settings, adminId);
            }
        } else {
            // Reload for ALL admins (fallback)
            const allSettings = await BackupSettings.find({}).lean();
            for (const settings of allSettings) {
                const aid = settings.adminId?.toString();
                if (aid) {
                    applyScheduleSettings(settings as unknown as IBackupSettings, aid);
                }
            }
        }
        console.log("🔄 Backup scheduler reloaded");
    } catch (err) {
        console.error("❌ Failed to reload backup scheduler:", err);
    }
};

const backupSchedulerService = { initializeBackupScheduler, reloadScheduler, applyScheduleSettings };
export default backupSchedulerService;
