import { Counter } from "../models/counter.model";

interface CounterConfig {
    name: string;
    prefix: string;
    padding: number;
}

const COUNTER_CONFIGS: CounterConfig[] = [
    { name: "lender", prefix: "L", padding: 3 },
    { name: "investment", prefix: "INV-", padding: 5 },
    { name: "repayment", prefix: "REP-", padding: 5 },
    { name: "vehicle", prefix: "VH-", padding: 5 },
    { name: "consignment", prefix: "CS-", padding: 5 },
    { name: "vehicleOwner", prefix: "OWN-", padding: 3 },
];

/**
 * Initialize counters for a specific admin (called when a new admin is created).
 * Each admin gets their own fresh set of counters starting at 0.
 * When called without adminId (e.g. at app startup), it's a no-op since counters
 * are created on-demand per admin via upsert in getNextId.
 */
export const initializeCounters = async (adminId?: string): Promise<void> => {
    if (!adminId) return; // No-op at startup — admin counters created on demand
    for (const config of COUNTER_CONFIGS) {
        await Counter.findOneAndUpdate(
            { name: config.name, adminId },
            {
                $setOnInsert: {
                    name: config.name,
                    adminId,
                    seq: 0,
                    prefix: config.prefix,
                    padding: config.padding,
                },
            },
            { upsert: true, new: true }
        );
    }
    console.log(`✅ Counters initialized for admin ${adminId}`);
};

/**
 * Get the next sequential ID for a given counter name scoped to an admin.
 * Returns a formatted string like "VH-00001", "L001", etc.
 */
export const getNextId = async (name: string, adminId: string): Promise<string> => {
    const config = COUNTER_CONFIGS.find((c) => c.name === name);
    if (!config) throw new Error(`Counter config for "${name}" not defined`);

    const counter = await Counter.findOneAndUpdate(
        { name, adminId },
        {
            $inc: { seq: 1 },
            $setOnInsert: { prefix: config.prefix, padding: config.padding },
        },
        { upsert: true, new: true }
    );

    const paddedSeq = String(counter!.seq).padStart(counter!.padding, "0");
    return `${counter!.prefix}${paddedSeq}`;
};

const counterService = { initializeCounters, getNextId };
export default counterService;
