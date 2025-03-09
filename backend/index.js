import express from "express";
import cors from "cors";
import { google } from "googleapis";
import fs from "fs";
import path from "path";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(express.json());

// Replace this with your actual Spreadsheet ID
const SPREADSHEET_ID = "1j-M4aEe8fjQoctgYMVZzxnZFjmHxRb1aIHZLOokK2sU";

// Store parsed data in memory to avoid fetching repeatedly
let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Initialize Google Sheets API
async function getAuthClient() {
  try {
    // You need to download this from Google Cloud Console
    const credentialsPath = path.join(process.cwd(), "credentials.json");

    // For service account credentials
    if (fs.existsSync(credentialsPath)) {
      const auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      return auth.getClient();
    }

    throw new Error("No authentication method available");
  } catch (error) {
    console.error("Error setting up auth:", error);
    throw error;
  }
}

// Helper function to fetch all sheets data
const fetchAndProcessData = async () => {
  const currentTime = Date.now();

  // Use cached data if available and fresh
  if (cachedData && currentTime - lastFetchTime < CACHE_DURATION) {
    return cachedData;
  }

  try {
    // Get auth client
    const authClient = await getAuthClient();
    const sheets = google.sheets({ version: "v4", auth: authClient });

    // First, get metadata about all sheets in the spreadsheet
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const allSheets = metadata.data.sheets;

    // Process each required sheet
    const sheetData = {};
    const requiredSheets = [
      "user_data",
      "budget",
      "task",
      "history",
      "payscale",
    ];

    for (const sheet of allSheets) {
      const sheetName = sheet.properties.title;

      // Only process sheets we need
      if (requiredSheets.includes(sheetName)) {
        // Get all data from this sheet
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: sheetName,
        });

        const rows = response.data.values;

        if (rows && rows.length > 0) {
          // Convert to array of objects (first row as headers)
          const headers = rows[0];
          const data = [];

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];

            // For task sheet, create a structured object with categories
            if (sheetName === "task") {
              // Initialize structured item
              const item = {
                BOARD: row[0] || "",
                stock: {
                  name: row[1] || "",
                  type: row[2] || "",
                  price: parseFloat(row[3] || "0"),
                  quantity: parseInt(row[4] || "0", 10),
                  extra: row[5] || "",
                  cost: parseFloat(row[6] || "0"),
                },
                airline: {
                  name: row[7] || "",
                  type: row[8] || "",
                  price: parseFloat(row[9] || "0"),
                  quantity: parseInt(row[10] || "0", 10),
                  extra: row[11] || "",
                  cost: parseFloat(row[12] || "0"),
                },
                house: {
                  name: row[13] || "",
                  type: row[14] || "",
                  price: parseFloat(row[15] || "0"),
                  quantity: parseInt(row[16] || "0", 10),
                  extra: row[17] || "",
                  cost: parseFloat(row[18] || "0"),
                },
                cars: {
                  name: row[19] || "",
                  type: row[20] || "",
                  price: parseFloat(row[21] || "0"),
                  quantity: parseInt(row[22] || "0", 10),
                  extra: row[23] || "",
                  cost: parseFloat(row[24] || "0"),
                },
              };
              data.push(item);
            } else {
              // For other sheets, use your existing approach
              const item = {};

              for (let j = 0; j < headers.length; j++) { 
                  item[headers[j]] = row[j];
              }

              // Only add row if it's not empty
              if (Object.keys(item).length > 0) {
                data.push(item);
              }
            }
          }
          sheetData[sheetName] = data;
        } else {
          sheetData[sheetName] = [];
        }
      }
    }

    // Organize data by sheet type
    const processedData = {
      user_data: sheetData.user_data || [],
      budget: sheetData.budget || [],
      task: sheetData.task || [],
      history: sheetData.history || [],
      payscale: sheetData.payscale || [],
    };

    // Cache the processed data
    cachedData = processedData;
    lastFetchTime = currentTime;

    return processedData;
  } catch (error) {
    console.error("Error processing spreadsheet data:", error);
    throw error;
  }
};


/**
 * Handle user login
 */
app.post("/login", async (req, res) => {
  const { userId, pin } = req.body;

  if (!userId || !pin) {
    return res
      .status(400)
      .json({ success: false, message: "User ID and PIN are required" });
  }

  try {
    // Fetch and process all data
    const data = await fetchAndProcessData();

    // Find user with matching ID and PIN in user_data
    const user = data.user_data.find(
      (user) => user["user id*"] === userId && user["pin*"] === pin.toString()
    );

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Return success with user ID for subsequent requests
    return res.json({
      success: true,
      userId: user["user id*"],
      name: user["name*"],
    });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error during login" });
  }
});

/**
 * Get user data including financial information and active task groups
 */
app.get("/getUserData", async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res
      .status(400)
      .json({ success: false, message: "User ID is required" });
  }

  try {
    // Fetch and process all data
    const data = await fetchAndProcessData();

    // Find user
    const user = data.user_data.find((user) => user["user id*"] === userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Get basic user info
    const userInfo = {
      userId: user["user id*"],
      name: user["name*"],
      rank: parseInt(user["rating"] || "0", 10),
      commission: parseFloat(user["CREDIT1"] || "0"),
      spent: parseFloat(user["DEBIT1"] || "0"),
    };

    // Find active task groups for this user based on the binary flags (columns AJ-AS)
    const activeTaskGroups = [];
    const budgetData = data.budget;

    // Check the binary flags (Activatetask, Activatetask1, etc.)
    for (let i = 0; i <= 9; i++) {
      const flagName = i === 0 ? "Activatetask" : `Activatetask${i}`;

      if (user[flagName] === "1" && i < budgetData.length) {
        // This budget record is active for the user (the flag is set to 1)
        const budgetRow = budgetData[i];

        activeTaskGroups.push({
          order: i,
          label: budgetRow["Label"],
          availableTasks: parseInt(budgetRow["Available tasks"] || "0", 10),
          ticketCost: parseFloat(budgetRow["Ticket cost"] || "0"),
          dailyAllocation: parseFloat(budgetRow["Daily Allocation"] || "0"),
          monthlyAllocation: parseFloat(
            budgetRow["monthly allocation Monthly Budget"] || "0"
          ),
          periods: [
            budgetRow["Period 1"],
            budgetRow["Period 2"],
            budgetRow["Period 3"],
            budgetRow["Period 4"],
          ].filter(Boolean), // Remove empty periods
        });
      }
    }

    // Calculate total allocation and remaining budget
    const totalAllocation = activeTaskGroups.reduce(
      (sum, group) => sum + (group.monthlyAllocation || 0),
      0
    );

    const remaining = totalAllocation - userInfo.spent;

    return res.json({
      success: true,
      user: userInfo,
      financial: {
        allowance: totalAllocation,
        commission: userInfo.commission,
        spent: userInfo.spent,
        remaining: remaining,
      },
      activeTaskGroups: activeTaskGroups,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error fetching user data" });
  }
});

/**
 * Get tasks for a specific task group
 */
app.get("/getTasks", async (req, res) => {
  const { periodNumber } = req.query;
  if (!periodNumber) {
    return res
      .status(400)
      .json({ success: false, message: "Group ID is required" });
  }
  cachedData = null;

  try {
    // Fetch and process all data
    const data = await fetchAndProcessData();
    const taskData = data.task;

    // For now, return all tasks (in a real implementation, you would filter by group ID)
    // You may need to adjust this based on your actual task sheet structure
    const tasks = taskData.map((row, index) => {
      const category =
        periodNumber === "1"
          ? row.stock
          : periodNumber === "2"
          ? row.airline
          : periodNumber === "3"
          ? row.house
          : periodNumber === "4"
          ? row.cars
          : row.stock;

      return {
        id: index,
        board: row["BOARD"],
        stock: category.name,
        type: category.type,
        price: category.price,
        quantity: category.quantity,
        extra: category.extra,
        cost: category.cost,
      };
    });

    return res.json({
      success: true,
      tasks: tasks,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error fetching tasks" });
  }
});

/**
 * Acknowledge a task (update financial data)
 */
app.post("/acknowledgeTask", async (req, res) => {
  const { userId, taskId, currentPeriod } = req.body;

  if (!userId || !taskId) {
    return res
      .status(400)
      .json({ success: false, message: "User ID and task ID are required" });
  }

  try {
    // Fetch all data
    const data = await fetchAndProcessData();

    // Get user data
    const user = data.user_data.find((u) => u["user id*"] === userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Get task data
    const taskIndex = parseInt(taskId, 10);
    if (isNaN(taskIndex) || taskIndex < 0 || taskIndex >= data.task.length) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    const tasks = data.task.map((row, index) => {
      const category =
        currentPeriod === "1"
          ? row.stock
          : currentPeriod === "2"
          ? row.airline
          : currentPeriod === "3"
          ? row.house
          : currentPeriod === "4"
          ? row.cars
          : row.stock;

      return {
        id: index,
        board: row["BOARD"],
        stock: category.name,
        type: category.type,
        price: category.price,
        quantity: category.quantity,
        extra: category.extra,
        cost: category.cost,
      };
    });

    const task = tasks[taskIndex];

    // Get user's rank for commission calculation
    const userRank = parseInt(user["rating"] || "1", 10);

    // Look up commission rate from payscale sheet
    const payscaleEntry = data.payscale.find(
      (p) => parseInt(p["rank"], 10) === userRank
    );
    if (!payscaleEntry) {
      return res
        .status(404)
        .json({ success: false, message: "Payscale not found for user rank" });
    }

    const commissionRate = parseFloat(payscaleEntry["rate/task"] || "0");

    // Calculate task cost and earned commission
    const taskCost = parseFloat(task.price || "0") * parseFloat(task.quantity || "0");

    // Update user's financial data
    const currentCommission = parseFloat(user["CREDIT1"] || "0");
    const currentSpent = parseFloat(user["DEBIT1"] || "0");
    const newCommission = currentCommission + commissionRate;
    const newSpent = currentSpent + taskCost;

    // Update user data in memory
    user["CREDIT1"] = newCommission.toString();
    user["DEBIT1"] = newSpent.toString();

    // Update user data in the spreadsheet
    const authClient = await getAuthClient();
    const sheets = google.sheets({ version: "v4", auth: authClient });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `user_data!A${data.user_data.indexOf(user) + 2}:BV${data.user_data.indexOf(user) + 2}`,
      valueInputOption: "RAW",
      resource: {
      values: [Object.values(user)],
      },
    });


    // Invalidate the cache since data was modified
    cachedData = null;

    // Calculate new financial summary
    // Find active task groups for this user to calculate allowance
    const activeTaskGroups = [];
    const budgetData = data.budget;

    // Check the binary flags (Activatetask, Activatetask1, etc.)
    for (let i = 0; i <= 9; i++) {
      const flagName = i === 0 ? "Activatetask" : `Activatetask${i}`;

      if (user[flagName] === "1" && i < budgetData.length) {
        const budgetRow = budgetData[i];

        activeTaskGroups.push({
          monthlyAllocation: parseFloat(
            budgetRow["monthly allocation Monthly Budget"] || "0"
          ),
        });
      }
    }

  

    // Log the acknowledgment
    await logAcknowledgment(user["user id*"], task, newCommission, taskCost, currentPeriod);

    // Calculate total allocation
    const totalAllocation = activeTaskGroups.reduce(
      (sum, group) => sum + (group.monthlyAllocation || 0),
      0
    );

    // Return the updated financial information
    return res.json({
      success: true,
      message: "Task acknowledged successfully",
      financial: {
        allowance: totalAllocation,
        commission: newCommission,
        spent: newSpent,
        remaining: totalAllocation - newSpent,
      },
    });
  } catch (error) {
    console.error("Error acknowledging task:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error acknowledging task" });
  }
});


/**
 * Get available periods for a user
 */
app.get("/getPeriods", async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res
      .status(400)
      .json({ success: false, message: "User ID is required" });
  }

  try {
    // Fetch and process all data
    const data = await fetchAndProcessData();
    const userData = data.user_data;
    const budgetData = data.budget;

    // Find user
    const user = userData.find((user) => user["user id*"] === userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Collect periods from active task groups
    const periods = [];

    // Check the binary flags (Activatetask, Activatetask1, etc.)
    for (let i = 0; i <= 9; i++) {
      const flagName = i === 0 ? "Activatetask" : `Activatetask${i}`;

      if (user[flagName] === "1" && i < budgetData.length) {
        // This budget record is active for the user
        const budgetRow = budgetData[i];

        // Add periods from this budget row
        ["Period 1", "Period 2", "Period 3", "Period 4"].forEach(
          (periodKey) => {
            if (
              budgetRow[periodKey] &&
              periods.indexOf(budgetRow[periodKey]) === -1
            ) {
              periods.push(budgetRow[periodKey]);
            }
          }
        );
      }
    }

    // Sort periods (assuming they're time strings)
    periods.sort();

    return res.json({
      success: true,
      periods: periods,
    });
  } catch (error) {
    console.error("Error fetching periods:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error fetching periods" });
  }
});


  // Log acknowledgment in history sheet
  const logAcknowledgment = async (userId, task, newCommission, taskCost, currentPeriod) => {
    try {
      const authClient = await getAuthClient();
      const sheets = google.sheets({ version: "v4", auth: authClient });

      const timestamp = new Date().toISOString();
      const historyRow = [
        timestamp,          // PURCHASE DATE
        userId,             // PURCHASE BY
        task.board,      // DEPARTMENT
        task.stock,    // ITEMS
        task.quantity,           // Qty
        task.type,    // GROUP
        "",                 // SECTION (empty as not provided)
        `Period ${currentPeriod}`,                 // TITLE (empty as not provided)
        taskCost,           // TOTAL
        newCommission,     // COMMISSION
        "",                 // NOTES (empty as not provided)
        "",                 // APPROVED BY (empty as not provided)
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "history",
        valueInputOption: "RAW",
        resource: {
          values: [historyRow],
        },
      });
    } catch (error) {
      console.error("Error logging acknowledgment:", error);
    }
  };

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
