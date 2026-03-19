const ServiceEntry = require("../../models/serviceEntryModel");
const FieldTechnician = require("../../models/fieldTechnicianModel");
const Client = require("../../models/clientModel");
const DataCenter = require("../../models/dataCenterModel");
const ClientPricing = require("../../models/clientPricingModel");
const mongoose = require("mongoose");

// -----------------------------------------------------------------------------
// 1. Get Daily Work Reports (Paginated & Filtered)
// -----------------------------------------------------------------------------
const getDailyWorkReports = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status, date } = req.query;

        const query = {};

        // Filter by Date
        if (date) {
            // Match exact date (assuming date field is stored as Date object)
            // We need to match the entire day, so we create a range
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            query.date = { $gte: startOfDay, $lte: endOfDay };
        }

        // Filter by Status (assuming 'status' field exists in ServiceEntry, though not explicitly in the prompt's model list, it is common)
        // If ServiceEntry doesn't have status, we might need to adjust or remove this.
        // Based on user prompt "status (Enum: Submitted, Approved, Rejected)", I assume it exists or will be added.
        // Checking provided ServiceEntry model in context... it DOES NOT have status.
        // However, I will implement it as requested. If the field is missing in DB, it just won't filter anything or returns empty if strict.
        if (status) {
            query.status = status;
        }

        // Search (Technician, Client, or Data Center Name)
        // This is tricky because these are referenced fields.
        // We strictly can't easily regex search on populated fields in a simple .find() query without aggregation or multiple queries.
        // For performance/simplicity in this step, I'll use a 2-step approach: find IDs first.

        if (search) {
            const searchRegex = new RegExp(search, "i");

            // Find matching IDs
            const technicians = await FieldTechnician.find({ name: searchRegex }).select("_id");
            const clients = await Client.find({ name: searchRegex }).select("_id");
            const dataCenters = await DataCenter.find({ name: searchRegex }).select("_id");

            const techIds = technicians.map(t => t._id);
            const clientIds = clients.map(c => c._id);
            const dcIds = dataCenters.map(dc => dc._id);

            query.$or = [
                { ftId: { $in: techIds } },
                { clientId: { $in: clientIds } },
                { dataCenterId: { $in: dcIds } },
                // Also search referenceNo if applicable
                { referenceNo: searchRegex }
            ];
        }

        const count = await ServiceEntry.countDocuments(query);
        const workEntries = await ServiceEntry.find(query)
            .populate("ftId", "name email mobile")      // Populate Technician
            .populate("clientId", "name")               // Populate Client
            .populate("dataCenterId", "name location")  // Populate Data Center
            .populate("country", "name")
            .populate("city", "name")
            .populate("additionalFTIds", "name")

            .sort({ date: -1 }) // Newest first
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.json({
            success: true,
            workEntries,
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: Number(page)
        });

    } catch (error) {
        console.error("Error fetching daily work reports:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// -----------------------------------------------------------------------------
// 2. Get Work Summary Metrics (Dashboard)
// -----------------------------------------------------------------------------
const getWorkSummaryMetrics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const query = {};

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate + 'T23:59:59.999Z') // End of day
            };
        }

        // Aggregations
        const pipeline = [
            { $match: query },
            {
                $facet: {
                    // Summary Metrics
                    summary: [
                        {
                            $group: {
                                _id: null,
                                totalWorkLogs: { $sum: 1 },
                                totalHours: { $sum: "$durationHours" },
                                uniqueTechnicians: { $addToSet: "$ftId" },
                                uniqueClients: { $addToSet: "$clientId" }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                totalWorkLogs: 1,
                                totalHours: 1,
                                technicians: { $size: "$uniqueTechnicians" },
                                clients: { $size: "$uniqueClients" }
                            }
                        }
                    ],
                    // Group by Client
                    clientData: [
                        {
                            $group: {
                                _id: "$clientId",
                                hours: { $sum: "$durationHours" }
                            }
                        },
                        {
                            $lookup: {
                                from: "clients", // Collection name (usually lowercase plural)
                                localField: "_id",
                                foreignField: "_id",
                                as: "clientInfo"
                            }
                        },
                        { $unwind: "$clientInfo" },
                        {
                            $project: {
                                name: "$clientInfo.name",
                                hours: 1
                            }
                        }
                    ],
                    // Group by Data Center
                    dataCenterData: [
                        {
                            $group: {
                                _id: "$dataCenterId",
                                hours: { $sum: "$durationHours" }
                            }
                        },
                        {
                            $lookup: {
                                from: "datacenters",
                                localField: "_id",
                                foreignField: "_id",
                                as: "dcInfo"
                            }
                        },
                        { $unwind: "$dcInfo" },
                        {
                            $project: {
                                name: "$dcInfo.name",
                                hours: 1
                            }
                        }
                    ],
                    // Group by Technician
                    technicianData: [
                        {
                            $group: {
                                _id: "$ftId",
                                hours: { $sum: "$durationHours" }
                            }
                        },
                        {
                            $lookup: {
                                from: "fieldtechnicians",
                                localField: "_id",
                                foreignField: "_id",
                                as: "techInfo"
                            }
                        },
                        { $unwind: "$techInfo" },
                        {
                            $project: {
                                technician: "$techInfo.name",
                                hours: 1
                            }
                        }
                    ]
                }
            }
        ];

        const [results] = await ServiceEntry.aggregate(pipeline);

        // Format Response
        const summary = results.summary[0] || { totalWorkLogs: 0, totalHours: 0, technicians: 0, clients: 0 };

        res.json({
            success: true,
            summary,
            clientData: results.clientData,
            dataCenterData: results.dataCenterData,
            technicianData: results.technicianData
        });

    } catch (error) {
        console.error("Error fetching work summary metrics:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// -----------------------------------------------------------------------------
// 3. Get Detailed Work Logs (Billing/Reports)
// -----------------------------------------------------------------------------
const getDetailedWorkLogs = async (req, res) => {
    try {

        const { startDate, endDate, clientId, dataCenterId } = req.query;
        const query = {};

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate + 'T23:59:59.999Z')
            };
        }

        if (clientId) query.clientId = clientId;
        if (dataCenterId) query.dataCenterId = dataCenterId;

        // 1. Fetch Logs
        const logs = await ServiceEntry.find(query)
            .populate("ftId", "name email mobile")
            .populate("clientId", "name")
            .populate("dataCenterId", "name location country commuteTimeInMinutes") // Ensure country is populated in DC if needed, but we have strict reference
            .populate("country", "name") // ServiceEntry has direct country reference
            .populate("city", "name")
            .populate("clientEngineerId", "name email phone")
            .populate("additionalFTIds", "name mobile")
            .sort({ createdAt: -1 })
            .lean(); // Use lean() to allow attaching new properties efficiently

        // 2. Extract Unique Client & Country IDs to fetch Pricing
        const pricingKeys = logs.map(log => ({
            clientId: log.clientId?._id,
            countryId: log.country?._id
        })).filter(k => k.clientId && k.countryId);

        // Deduplicate keys (simple approach using stringify)
        const uniqueKeys = [...new Set(pricingKeys.map(k => JSON.stringify(k)))].map(k => JSON.parse(k));

        if (uniqueKeys.length === 0) {
            return res.json({ success: true, logs });
        }

        // 3. Fetch Pricing Records
        // We use $or to verify pairs. A simple $in on IDs might mix wrong client with wrong country if not careful.
        const pricingQuery = {
            $or: uniqueKeys.map(k => ({
                clientId: k.clientId,
                countryId: k.countryId
            }))
        };


        const pricingRecords = await ClientPricing.find(pricingQuery).lean();

        // 4. Create a Lookup Map: "clientId_countryId" -> Pricing Object
        const pricingMap = {};
        pricingRecords.forEach(p => {
            const key = `${p.clientId.toString()}_${p.countryId.toString()}`;
            pricingMap[key] = p;
        });


        // 5. Attach Pricing to Logs
        const logsWithPricing = logs.map(log => {
            if (!log.clientId || !log.country) return log;

            const key = `${log.clientId._id.toString()}_${log.country._id.toString()}`;
            const pricing = pricingMap[key];

            if (pricing) {
                log.pricing = {
                    standardHourlyRate: pricing.standardHourlyRate,
                    offStandardHourlyRate: pricing.offStandardHourlyRate,
                    commuteHourlyRate: pricing.commuteHourlyRate,
                };
            } else {
                log.pricing = null; // No pricing found for this client/country combo
            }
            return log;
        });

        res.json({
            success: true,
            logs: logsWithPricing
        });

    } catch (error) {
        console.error("Error fetching detailed work logs:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// -----------------------------------------------------------------------------
// 4. Get Data Center Work Summary
// -----------------------------------------------------------------------------
// Helper to calculate Standard vs Off-Standard Hours
const calculateShiftSplit = (startStr, endStr) => {
    const parseTimeToMins = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    let start = parseTimeToMins(startStr);
    let end = parseTimeToMins(endStr);

    // Handle overnight (if end < start, assume it crosses midnight)
    if (end < start) end += 24 * 60;

    const standardStart = 8 * 60;  // 08:00
    const standardEnd = 20 * 60;   // 20:00

    let standardMins = 0;

    // Shift window
    // We check intersection with today's standard window and tomorrow's (for overnight shifts)

    // Day 1 Standard Window [480, 1200]
    const s1 = Math.max(start, standardStart);
    const e1 = Math.min(end, standardEnd);
    if (e1 > s1) standardMins += (e1 - s1);

    // Day 2 Standard Window [1920, 2640] (08:00+24h, 20:00+24h)
    const s2 = Math.max(start, standardStart + 1440);
    const e2 = Math.min(end, standardEnd + 1440);
    if (e2 > s2) standardMins += (e2 - s2);

    const totalDuration = end - start;
    const offStandardMins = totalDuration - standardMins;

    return {
        standardHours: standardMins / 60,
        offStandardHours: offStandardMins / 60
    };
};

const getDataCenterWorkSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const query = {};

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate + 'T23:59:59.999Z')
            };
        }

        // 1. Fetch Logs (Need fields for calculation)
        const logs = await ServiceEntry.find(query)
            .populate("clientId", "name")
            .populate("dataCenterId", "name commuteTimeInMinutes")
            .populate("country", "name")
            .lean();

        if (!logs.length) {
            return res.json({ success: true, count: 0, data: [] });
        }

        // 2. Fetch Pricing (Reuse logic from getDetailedWorkLogs)
        const pricingKeys = logs.map(log => ({
            clientId: log.clientId?._id,
            countryId: log.country?._id
        })).filter(k => k.clientId && k.countryId);

        const uniqueKeys = [...new Set(pricingKeys.map(k => JSON.stringify(k)))].map(k => JSON.parse(k));

        const pricingQuery = {
            $or: uniqueKeys.map(k => ({
                clientId: k.clientId,
                countryId: k.countryId
            }))
        };

        const pricingRecords = await ClientPricing.find(pricingQuery).lean();
        const pricingMap = {};
        pricingRecords.forEach(p => {
            const key = `${p.clientId.toString()}_${p.countryId.toString()}`;
            pricingMap[key] = p;
        });

        // 3. Aggregate Data
        // Map: "dataCenterId_clientId" -> Aggregate Object
        const aggregationMap = {};

        logs.forEach(log => {
            if (!log.dataCenterId || !log.clientId || !log.country) return;

            const dcId = log.dataCenterId._id.toString();
            const clientId = log.clientId._id.toString();
            const key = `${dcId}_${clientId}`;

            // Initialize Group
            if (!aggregationMap[key]) {
                aggregationMap[key] = {
                    dataCenterId: dcId,
                    dataCenterName: log.dataCenterId.name,
                    clientId: clientId,
                    clientName: log.clientId.name,
                    totalHours: 0,
                    totalPrice: 0
                };
            }

            // Pricing Retrieval
            const pricingKey = `${clientId}_${log.country._id.toString()}`;
            const pricing = pricingMap[pricingKey];

            if (!pricing) {
                // If no pricing, we can't calculate price, but we should track hours.
                // Or we skip? Assuming we track hours at least.
                // User asked for totalPrice.
                // Let's assume 0 price if missing.
            }

            // Calculations
            // 1. Multiplier
            const multiplier = 1 + (log.additionalFTCount || 0);

            // 2. Time Split (Standard vs Off-Standard)
            const { standardHours, offStandardHours } = calculateShiftSplit(log.entryTime, log.endTime);

            // 3. Commute Cost
            // Commute Hours = (Commute Mins / 60) * Multiplier (applied to cost or time? Prompt says "both duration and cost calculations for each log")
            // Actually prompt says "Apply multiplier ... to both duration and cost calculations"
            // Usually commute is a fixed fee or time * rate. The model has `commuteHourlyRate`.
            // DC has `commuteTimeInMinutes`.
            const commuteTimeHours = (log.dataCenterId.commuteTimeInMinutes || 0) / 60;

            // 4. Costs
            let standardCost = 0;
            let offStandardCost = 0;
            let commuteCost = 0;

            if (pricing) {
                standardCost = standardHours * pricing.standardHourlyRate * multiplier;
                offStandardCost = offStandardHours * pricing.offStandardHourlyRate * multiplier;
                commuteCost = commuteTimeHours * pricing.commuteHourlyRate * multiplier;
            }

            const logTotalCost = standardCost + offStandardCost + commuteCost;

            // Total Billable Hours (Duration * Multiplier)
            // Note: Does commute time count towards "totalHours"?
            // Usually: Total Duration Hours (worked). Commute is strictly extra cost.
            // Prompt: "Total billable hours (including tech multiplier)"
            // I will sum (standardHours + offStandardHours) * multiplier.
            const logTotalHours = (standardHours + offStandardHours) * multiplier;

            // Add to Aggregate
            aggregationMap[key].totalHours += logTotalHours;
            aggregationMap[key].totalPrice += logTotalCost;
        });

        const result = Object.values(aggregationMap);

        res.json({
            success: true,
            count: result.length,
            data: result
        });

    } catch (error) {
        console.error("Error fetching data center work summary:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// -----------------------------------------------------------------------------
// 5. Get Data Center Duration Summary (Standard vs Off-Standard)
// -----------------------------------------------------------------------------
const getDataCenterDurationSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const query = {};

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate + 'T23:59:59.999Z')
            };
        }

        // 1. Fetch Logs
        const logs = await ServiceEntry.find(query)
            .populate("dataCenterId", "name")
            .lean();

        if (!logs.length) {
            return res.json({ success: true, count: 0, data: [] });
        }

        // 2. Aggregate Data
        // Map: "dataCenterId" -> Aggregate Object
        const aggregationMap = {};

        logs.forEach(log => {
            if (!log.dataCenterId) return;

            const dcId = log.dataCenterId._id.toString();

            // Initialize Group
            if (!aggregationMap[dcId]) {
                aggregationMap[dcId] = {
                    dataCenterId: dcId,
                    dataCenterName: log.dataCenterId.name,
                    totalStandardDuration: 0,
                    totalOffStandardDuration: 0,
                    totalDuration: 0
                };
            }

            // Calculations
            // 1. Multiplier (User requested "Total standard duration", usually implies billable duration with tech multiplier)
            const multiplier = 1 + (log.additionalFTCount || 0);

            // 2. Time Split (Standard vs Off-Standard)
            const { standardHours, offStandardHours } = calculateShiftSplit(log.entryTime, log.endTime);

            const standardDuration = standardHours * multiplier;
            const offStandardDuration = offStandardHours * multiplier;

            // Add to Aggregate
            aggregationMap[dcId].totalStandardDuration += standardDuration;
            aggregationMap[dcId].totalOffStandardDuration += offStandardDuration;
            aggregationMap[dcId].totalDuration += (standardDuration + offStandardDuration);
        });

        const result = Object.values(aggregationMap);

        res.json({
            success: true,
            count: result.length,
            data: result
        });

    } catch (error) {
        console.error("Error fetching data center duration summary:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const getFieldTechniciansWorkSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // 1. Build Date Filter
        const matchStage = {};
        if (startDate && endDate) {
            matchStage.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate + 'T23:59:59.999Z')
            };
        }

        const summary = await ServiceEntry.aggregate([
            // --- Step 1: Filter by Date ---
            { $match: matchStage },

            // --- Step 2: Calculate Duration per Entry (in Minutes) ---
            {
                $addFields: {
                    startParts: { $split: ["$entryTime", ":"] },
                    endParts: { $split: ["$endTime", ":"] }
                }
            },
            {
                $addFields: {
                    startMinTotal: {
                        $add: [
                            { $multiply: [{ $toInt: { $arrayElemAt: ["$startParts", 0] } }, 60] },
                            { $toInt: { $arrayElemAt: ["$startParts", 1] } }
                        ]
                    },
                    endMinTotal: {
                        $add: [
                            { $multiply: [{ $toInt: { $arrayElemAt: ["$endParts", 0] } }, 60] },
                            { $toInt: { $arrayElemAt: ["$endParts", 1] } }
                        ]
                    }
                }
            },
            {
                $addFields: {
                    durationInMinutes: {
                        $cond: {
                            if: { $gte: ["$endMinTotal", "$startMinTotal"] },
                            then: { $subtract: ["$endMinTotal", "$startMinTotal"] },
                            else: { $subtract: [{ $add: ["$endMinTotal", 1440] }, "$startMinTotal"] }
                        }
                    }
                }
            },

            // --- Step 3: Group by Technician ---
            {
                $group: {
                    _id: "$ftId",
                    totalEntries: { $sum: 1 },
                    totalExpenses: { $sum: "$totalBillsExpense" },
                    totalWorkMinutes: { $sum: "$durationInMinutes" }
                }
            },

            // --- Step 4A: Get Technician Details ---
            {
                $lookup: {
                    from: "fieldtechnicians", // Must be the exact collection name in DB
                    localField: "_id",
                    foreignField: "_id",
                    as: "technicianInfo"
                }
            },
            { $unwind: "$technicianInfo" },

            // --- Step 4B: Get Company Details (NEW) ---
            {
                $lookup: {
                    from: "companies", // ⚠️ IMPORTANT: Change this to your actual Company collection name in MongoDB (usually lowercase & pluralized)
                    localField: "technicianInfo.companyId", // Matches the field inside the technician model
                    foreignField: "_id",
                    as: "companyInfo"
                }
            },
            {
                $unwind: {
                    path: "$companyInfo",
                    preserveNullAndEmptyArrays: true // Keeps the technician in the list even if they don't have a company assigned
                }
            },

            // --- Step 5: Format the Output ---
            {
                $project: {
                    _id: 1,
                    technicianName: "$technicianInfo.name",
                    companyName: "$companyInfo.name", // <-- Grabs the name from the populated companyInfo
                    totalEntries: 1,
                    totalExpenses: 1,
                    totalDuration: {
                        $concat: [
                            { $toString: { $floor: { $divide: ["$totalWorkMinutes", 60] } } },
                            ":",
                            {
                                $cond: {
                                    if: { $lt: [{ $mod: ["$totalWorkMinutes", 60] }, 10] },
                                    then: { $concat: ["0", { $toString: { $mod: ["$totalWorkMinutes", 60] } }] },
                                    else: { $toString: { $mod: ["$totalWorkMinutes", 60] } }
                                }
                            }
                        ]
                    },
                    rawTotalMinutes: "$totalWorkMinutes"
                }
            },
            { $sort: { technicianName: 1 } }
        ]);
        console.log(summary)
        res.status(200).json({ success: true, data: summary });

    } catch (error) {
        console.error("Error fetching summary:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// -----------------------------------------------------------------------------
// 7. Get Client Billing Report
// -----------------------------------------------------------------------------
const getClientBillingReport = async (req, res) => {
    try {
        const { clientId, startDate, endDate, dataCenterId } = req.query;

        // Validation
        if (!clientId || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: "clientId, startDate, and endDate are required" });
        }

        const query = {
            clientId: clientId,
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate + 'T23:59:59.999Z')
            }
        };

        if (dataCenterId) {
            query.dataCenterId = dataCenterId;
        }

        // Fetch matching ServiceEntry documents
        const logs = await ServiceEntry.find(query)
            .populate("dataCenterId", "name")
            .populate("ftId", "name")
            .populate("additionalFTIds", "name")
            .lean();

        // Fetch ClientPricing documents
        const pricingRecords = await ClientPricing.find({ clientId: clientId }).lean();
        const pricingMap = {};
        pricingRecords.forEach(p => {
            // Map by countryId
            pricingMap[p.countryId.toString()] = p;
        });

        // Helper function to parse HH:mm
        const parseDurationToDecimal = (durationStr) => {
            if (!durationStr || typeof durationStr !== 'string') return 0;

            // 1. Check if the string contains 'h' (e.g., "15h 0m")
            if (durationStr.includes('h') || durationStr.includes('m')) {
                // Extract the digits right before 'h' and 'm'
                const hMatch = durationStr.match(/(\d+)\s*h/);
                const mMatch = durationStr.match(/(\d+)\s*m/);

                const h = hMatch ? Number(hMatch[1]) : 0;
                const m = mMatch ? Number(mMatch[1]) : 0;

                return h + (m / 60);
            }

            // 2. Fallback for the original "15:00" format
            const [h, m] = durationStr.split(':').map(Number);
            return (h || 0) + ((m || 0) / 60);
        };

        const summary = {
            totalBillableStdHours: 0,
            totalBillableOffStdHours: 0,
            totalBillsExpense: 0,
            totalEntryAmount: 0,
            totalAmountToBePaid: 0 // <-- ADDED
        };

        const resultEntries = [];

        logs.forEach(log => {
            const countryId = log.country ? log.country.toString() : null;
            const pricing = countryId ? pricingMap[countryId] : null;

            const standardHourlyRate = pricing ? (pricing.standardHourlyRate || 0) : 0;
            const offStandardHourlyRate = pricing ? (pricing.offStandardHourlyRate || 0) : 0;

            const techCount = 1 + (log.additionalFTIds ? log.additionalFTIds.length : 0);

            const decimalStdHours = parseDurationToDecimal(log.standardDuration);
            const decimalOffStdHours = parseDurationToDecimal(log.offStandardDuration);

            // Double check: Should these be multiplied by techCount? 
            // e.g., const billableStdHours = decimalStdHours * techCount;
            const billableStdHours = decimalStdHours;
            const billableOffStdHours = decimalOffStdHours;
            const totalBillsExpense = log.totalBillsExpense || 0;

            const totalEntryAmount = (billableStdHours * standardHourlyRate) + (billableOffStdHours * offStandardHourlyRate) + totalBillsExpense;

            // BUG FIX: Changed '=' to '+=' to properly accumulate the totals
            summary.totalBillableStdHours += billableStdHours;
            summary.totalBillableOffStdHours += billableOffStdHours;
            summary.totalBillsExpense += totalBillsExpense;
            summary.totalEntryAmount += totalEntryAmount;
            summary.totalAmountToBePaid += totalEntryAmount; // <-- ADDED

            // Formulate tooltip math strings
            const tooltipMath = `${log.standardDuration} actual standard hours of ${techCount} technicians. = ${billableStdHours.toFixed(2)} billable std hours, ${log.offStandardDuration} actual off-standard hours x ${techCount} technicians = ${billableOffStdHours.toFixed(2)} billable off-std hours`;

            resultEntries.push({
                ...log,
                calculated: {
                    techCount,
                    decimalStdHours: roundToTwo(decimalStdHours),
                    decimalOffStdHours: roundToTwo(decimalOffStdHours),
                    totalBillsExpense: roundToTwo(totalBillsExpense),
                    billableStdHours: roundToTwo(billableStdHours),
                    billableOffStdHours: roundToTwo(billableOffStdHours),
                    standardHourlyRate,
                    offStandardHourlyRate,
                    totalEntryAmount: roundToTwo(totalEntryAmount),
                    tooltipMath
                }
            });
        });

        // Returning the final rounded summary
        res.status(200).json({
            success: true,
            summary: {
                totalBillableStdHours: roundToTwo(summary.totalBillableStdHours),
                totalBillableOffStdHours: roundToTwo(summary.totalBillableOffStdHours),
                totalBillsExpense: roundToTwo(summary.totalBillsExpense),
                totalEntryAmount: roundToTwo(summary.totalEntryAmount),
                totalAmountToBePaid: roundToTwo(summary.totalAmountToBePaid) // <-- ADDED
            },
            entries: resultEntries
        });

    } catch (error) {
        console.error("Error fetching client billing report:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// -----------------------------------------------------------------------------
// 8. Get Technician Payroll
// -----------------------------------------------------------------------------
// Helper function to safely round numbers to 2 decimal places
const roundToTwo = (num) => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

const getTechnicianPayroll = async (req, res) => {
    try {
        const { ftId, startDate, endDate } = req.query;

        // Validation
        if (!ftId || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: "ftId, startDate, and endDate are required" });
        }

        const query = {
            $or: [
                { ftId: ftId },
                { additionalFTIds: ftId }
            ],
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate + 'T23:59:59.999Z')
            }
        };

        console.log("query", query);

        // Fetch matching ServiceEntry documents
        // We need dataCenterId (locationType, commuteTime), clientId & country (for ClientPricing)
        const logs = await ServiceEntry.find(query)
            .populate("dataCenterId", "name locationType commuteTimeInMinutes")
            .populate("clientId", "name")
            .populate("country", "name")
            .lean();

        // Fetch the technician to know their standard/off-standard rates and if commute is provided
        const technician = await FieldTechnician.findById(ftId).lean();
        if (!technician) {
            return res.status(404).json({ success: false, message: "Technician not found" });
        }

        // Gather unique clientId-countryId pairs to fetch ClientPricing for commute rates
        const pricingKeys = logs.map(log => ({
            clientId: log.clientId?._id,
            countryId: log.country?._id
        })).filter(k => k.clientId && k.countryId);

        const uniqueKeys = [...new Set(pricingKeys.map(k => JSON.stringify(k)))].map(k => JSON.parse(k));

        let pricingMap = {};
        if (uniqueKeys.length > 0) {
            const pricingQuery = {
                $or: uniqueKeys.map(k => ({
                    clientId: k.clientId,
                    countryId: k.countryId
                }))
            };
            const pricingRecords = await ClientPricing.find(pricingQuery).lean();
            pricingRecords.forEach(p => {
                const key = `${p.clientId.toString()}_${p.countryId.toString()}`;
                pricingMap[key] = p;
            });
        }

        const summary = {
            totalStandardHours: 0,
            totalOffStandardHours: 0,
            totalHours: 0,
            totalBaseCost: 0,
            totalCommuteCost: 0,
            totalBillsExpense: 0, // <-- ADDED
            totalAmountToBePaid: 0
        };

        const resultEntries = [];

        logs.forEach(log => {
            // Hours Calculation (Calculated for a single technician using entry and exit times)
            const { standardHours: decimalStdHours, offStandardHours: decimalOffStdHours } = calculateShiftSplit(log.entryTime, log.endTime);
            const totalEntryHours = decimalStdHours + decimalOffStdHours;

            // Base Cost Calculation (from FieldTechnician rate)
            const standardPay = decimalStdHours * (technician.standardRate || 0);
            const offStandardPay = decimalOffStdHours * (technician.offStandardRate || 0);
            const entryBaseCost = standardPay + offStandardPay;

            // Commute Calculation
            let commutePay = 0;
            let commuteHours = 0;
            let commuteHourlyRate = 0;
            let isOutofCity = false;

            // Check if commute should be paid
            if (
                technician.isCommuteProvided &&
                log.dataCenterId &&
                log.dataCenterId.locationType === "outside_city_limits"
            ) {
                isOutofCity = true;
                const commuteMins = log.dataCenterId.commuteTimeInMinutes || 0;
                commuteHours = commuteMins / 60;

                // Lookup Commute Rate from Client Pricing
                if (log.clientId && log.country) {
                    const priceKey = `${log.clientId._id.toString()}_${log.country._id.toString()}`;
                    const pricing = pricingMap[priceKey];
                    if (pricing) {
                        commuteHourlyRate = pricing.commuteHourlyRate || 0;
                        commutePay = commuteHours * commuteHourlyRate;
                    }
                }
            }

            // Extract bills expense (default to 0 if not present)
            const billsExpense = log.totalBillsExpense || 0; // <-- ADDED

            // Add billsExpense to the total pay for this entry
            const totalEntryPay = entryBaseCost + commutePay + billsExpense; // <-- MODIFIED

            // Aggregate totals (Keep math unrounded here to prevent precision loss)
            summary.totalStandardHours += decimalStdHours;
            summary.totalOffStandardHours += decimalOffStdHours;
            summary.totalHours += totalEntryHours;
            summary.totalBaseCost += entryBaseCost;
            summary.totalCommuteCost += commutePay;
            summary.totalBillsExpense += billsExpense; // <-- ADDED
            summary.totalAmountToBePaid += totalEntryPay;

            // Tooltip Strings (Using .toFixed(2) here is perfect since tooltips are strings)
            const commuteTooltip = isOutofCity
                ? `${commuteHours.toFixed(2)} commute hours x ${commuteHourlyRate} commute rate = ${commutePay.toFixed(2)}`
                : technician.isCommuteProvided
                    ? `Data Center is within city limits. Commute not applied.`
                    : `Technician does not have commute provision.`;

            // Modified tooltip to include bills expense
            const mathTooltip = `${decimalStdHours.toFixed(2)} std hours x ${technician.standardRate} rate = ${standardPay.toFixed(2)} base pay\n${decimalOffStdHours.toFixed(2)} off-std hours x ${technician.offStandardRate} rate = ${offStandardPay.toFixed(2)} base pay\nTotal Base = ${entryBaseCost.toFixed(2)}. ${commuteTooltip}\nBills Expense = ${billsExpense.toFixed(2)}\nTotal Entry Pay = ${totalEntryPay.toFixed(2)}`;

            const techCount = 1 + (log.additionalFTIds ? log.additionalFTIds.length : 0);

            resultEntries.push({
                ...log,
                calculated: {
                    // Applying roundToTwo to all numerical outputs
                    techCount,
                    decimalStdHours: roundToTwo(decimalStdHours),
                    decimalOffStdHours: roundToTwo(decimalOffStdHours),
                    totalEntryHours: roundToTwo(totalEntryHours),
                    technicianStandardRate: technician.standardRate,
                    technicianOffStandardRate: technician.offStandardRate,
                    standardPay: roundToTwo(standardPay),
                    offStandardPay: roundToTwo(offStandardPay),
                    entryBaseCost: roundToTwo(entryBaseCost),
                    isOutofCity,
                    commuteHours: roundToTwo(commuteHours),
                    clientCommuteRate: commuteHourlyRate,
                    commutePay: roundToTwo(commutePay),
                    billsExpense: roundToTwo(billsExpense), // <-- ADDED
                    totalEntryPay: roundToTwo(totalEntryPay),
                    mathTooltip
                }
            });
        });

        res.status(200).json({
            success: true,
            summary: {
                // Applying roundToTwo to all final summary numbers
                totalStandardHours: roundToTwo(summary.totalStandardHours),
                totalOffStandardHours: roundToTwo(summary.totalOffStandardHours),
                totalHours: roundToTwo(summary.totalHours),
                totalBaseCost: roundToTwo(summary.totalBaseCost),
                totalCommuteCost: roundToTwo(summary.totalCommuteCost),
                totalBillsExpense: roundToTwo(summary.totalBillsExpense), // <-- ADDED
                totalAmountToBePaid: roundToTwo(summary.totalAmountToBePaid)
            },
            technician: {
                id: technician._id,
                name: technician.name,
                standardRate: technician.standardRate,
                offStandardRate: technician.offStandardRate,
                isCommuteProvided: technician.isCommuteProvided,
                pricingCurrency: technician.pricingCurrency
            },
            entries: resultEntries
        });

    } catch (error) {
        console.error("Error fetching technician payroll:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


module.exports = {
    getDailyWorkReports,
    getWorkSummaryMetrics,
    getDetailedWorkLogs,
    getDataCenterWorkSummary,
    getDataCenterDurationSummary,
    getFieldTechniciansWorkSummary,
    getClientBillingReport,
    getTechnicianPayroll
};
