import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import csv from "csv-parser";
import { Readable } from "stream";

const app = express();

// Enable CORS for the frontend
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(express.json());

// Using a single CSV file URL for the entire spreadsheet
const SPREADSHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR1_-Z4GKyatzrb3JtWiCWyk7ksCtqAGtW8DfcrOFOTuTnCi9yPZJMXKS-_Rsp8je-uwlOjMKEsLT5H/pub?output=csv";

// Google Apps Script web app URL (for write operations)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzYQo27tVk2HByyOPKcovQuSH43weKxiqjOnUxbOIqEqEKquzepKv7qChNCMiMdcFK7/exec";

// Store parsed data in memory to avoid fetching repeatedly
let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Helper function to fetch CSV data and process all sheets
const fetchAndProcessData = async () => {
  const currentTime = Date.now();
  
  // Use cached data if available and fresh
  if (cachedData && (currentTime - lastFetchTime < CACHE_DURATION)) {
    return cachedData;
  }
  
  try {
    console.log("Fetching spreadsheet data from:", SPREADSHEET_CSV_URL);
    const response = await fetch(SPREADSHEET_CSV_URL);
    
    if (!response.ok) {
      console.error(`Response status: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch CSV data: ${response.statusText}`);
    }

    const csvText = await response.text();
    console.log(`CSV data received (sample): ${csvText.substring(0, 200)}...`);
    
    // Parse the CSV data
    const stream = Readable.from(csvText);
    const rows = await new Promise((resolve, reject) => {
      const results = [];
      stream
        .pipe(csv())
        .on("data", (row) => results.push(row))
        .on("end", () => {
          console.log(`Parsed ${results.length} rows from CSV`);
          resolve(results);
        })
        .on("error", (err) => {
          console.error("Error parsing CSV:", err);
          reject(err);
        });
    });
    
    // Process the rows into structured data
    // This is a simplified approach to work with a single sheet
    // We'll treat the first column as a "sheet identifier"
    
    const processedData = {
      user_data: rows.filter(row => row["name*"] !== undefined), // User data has a name* column
      budget: rows.filter(row => row["Label"] !== undefined),    // Budget data has a Label column
      task: rows.filter(row => row["BOARD"] !== undefined),      // Task data has a BOARD column
      history: rows.filter(row => row["PURCHASE DATE"] !== undefined), // History has PURCHASE DATE
      payscale: rows.filter(row => row["rank"] !== undefined),   // Payscale has rank column
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

// Helper function to post data to Google Apps Script
const postToGoogleScript = async (action, data) => {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        ...data,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to post to Google Script: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error posting to Google Script:", error);
    throw error;
  }
};

/**
 * Handle user login
 */
app.post("/login", async (req, res) => {
  const { userId, pin } = req.body;
  
  if (!userId || !pin) {
    return res.status(400).json({ success: false, message: "User ID and PIN are required" });
  }
  
  try {
    // Fetch and process all data
    const data = await fetchAndProcessData();
    
    // Find user with matching ID and PIN in user_data
    const user = data.user_data.find(
      (user) => user["user id*"] === userId && user["pin*"] === pin.toString()
    );
    
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    
    // Return success with user ID for subsequent requests
    return res.json({
      success: true,
      userId: user["user id*"],
      name: user["name*"]
    });
    
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Server error during login" });
  }
});

/**
 * Get user data including financial information and active task groups
 */
app.get("/getUserData", async (req, res) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ success: false, message: "User ID is required" });
  }
  
  try {
    // Fetch and process all data
    const data = await fetchAndProcessData();
    
    // Find user
    const user = data.user_data.find((user) => user["user id*"] === userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    // Get basic user info
    const userInfo = {
      userId: user["user id*"],
      name: user["name*"],
      rank: parseInt(user["rating"] || "0", 10),
      commission: parseFloat(user["CREDIT1"] || "0"),
      spent: parseFloat(user["DEBIT1"] || "0")
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
          monthlyAllocation: parseFloat(budgetRow["monthly allocation Monthly Budget"] || "0"),
          periods: [
            budgetRow["Period 1"],
            budgetRow["Period 2"],
            budgetRow["Period 3"],
            budgetRow["Period 4"]
          ].filter(Boolean) // Remove empty periods
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
        remaining: remaining
      },
      activeTaskGroups: activeTaskGroups
    });
    
  } catch (error) {
    console.error("Error fetching user data:", error);
    return res.status(500).json({ success: false, message: "Server error fetching user data" });
  }
});

/**
 * Get tasks for a specific task group
 */
app.get("/getTasks", async (req, res) => {
  const { groupId } = req.query;
  
  if (!groupId && groupId !== "0") {
    return res.status(400).json({ success: false, message: "Group ID is required" });
  }
  
  try {
    // Fetch and process all data
    const data = await fetchAndProcessData();
    const taskData = data.task;
    
    // For now, return all tasks (in a real implementation, you would filter by group ID)
    // You may need to adjust this based on your actual task sheet structure
    const tasks = taskData.map((row, index) => ({
      id: index,
      board: row["BOARD"],
      stock: row["STOCK"],
      type: row["TYPE"],
      price: parseFloat(row["PRICE"] || "0"),
      quantity: parseInt(row["QUANTITY"] || "1", 10),
      extra: row["EXTRA "],
      cost: parseFloat(row["COST"] || "0"),
      // Add other task fields as needed
    }));
    
    return res.json({
      success: true,
      tasks: tasks
    });
    
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return res.status(500).json({ success: false, message: "Server error fetching tasks" });
  }
});

/**
 * Acknowledge a task (update financial data)
 * 
 * This is a critical function that updates the user's financial data according to
 * the client's requirements. It:
 * 1. Retrieves the user's rank
 * 2. Looks up the commission rate from the payscale sheet
 * 3. Calculates the task cost
 * 4. Updates the commission (CREDIT1) and spent (DEBIT1) values
 * 5. Logs the transaction to the history sheet
 */
app.post("/acknowledgeTask", async (req, res) => {
  const { userId, taskId, quantity = 1 } = req.body;
  
  if (!userId || !taskId) {
    return res.status(400).json({ success: false, message: "User ID and task ID are required" });
  }
  
  try {
    // Fetch all data
    const data = await fetchAndProcessData();
    
    // Get user data
    const user = data.user_data.find(u => u["user id*"] === userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    // Get task data
    const taskIndex = parseInt(taskId, 10);
    if (isNaN(taskIndex) || taskIndex < 0 || taskIndex >= data.task.length) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }
    const task = data.task[taskIndex];
    
    // Get user's rank for commission calculation
    const userRank = parseInt(user["rating"] || "1", 10);
    
    // Look up commission rate from payscale sheet
    const payscaleEntry = data.payscale.find(p => parseInt(p["rank"], 10) === userRank);
    if (!payscaleEntry) {
      return res.status(404).json({ success: false, message: "Payscale not found for user rank" });
    }
    
    const commissionRate = parseFloat(payscaleEntry["rate/task"] || "0");
    
    // Calculate task cost and earned commission
    const taskCost = parseFloat(task["COST"] || "0") * quantity;
    const earnedCommission = commissionRate * quantity;
    
    // Update user's financial data
    const currentCommission = parseFloat(user["CREDIT1"] || "0");
    const currentSpent = parseFloat(user["DEBIT1"] || "0");
    
    const newCommission = currentCommission + earnedCommission;
    const newSpent = currentSpent + taskCost;
    
    // Since we can't directly update the Google Sheet from our backend,
    // we'll post to the Google Apps Script web app to handle the update
    const result = await postToGoogleScript("acknowledgeTask", {
      userId,
      taskId,
      quantity,
      newCommission,
      newSpent,
      taskCost,
      earnedCommission,
      taskDetails: {
        board: task["BOARD"],
        stock: task["STOCK"],
        type: task["TYPE"],
        price: task["PRICE"],
        quantity: quantity
      }
    });
    
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    
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
          monthlyAllocation: parseFloat(budgetRow["monthly allocation Monthly Budget"] || "0")
        });
      }
    }
    
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
        remaining: totalAllocation - newSpent
      }
    });
    
  } catch (error) {
    console.error("Error acknowledging task:", error);
    return res.status(500).json({ success: false, message: "Server error acknowledging task" });
  }
});

/**
 * Get user transaction history
 */
app.get("/getHistory", async (req, res) => {
  const { userId, limit } = req.query;
  
  if (!userId) {
    return res.status(400).json({ success: false, message: "User ID is required" });
  }
  
  try {
    // Fetch and process all data
    const data = await fetchAndProcessData();
    const historyData = data.history;
    
    // Filter history by user ID
    // Assuming there's a PURCHASE BY column that matches the user's name or ID
    const userHistory = historyData
      .filter(record => record["PURCHASE BY"] === userId)
      .slice(0, limit ? parseInt(limit, 10) : undefined)
      .map(record => ({
        date: record["PURCHASE DATE"],
        title: record["TITLE"],
        department: record["DEPARTMENT"],
        group: record["GROUP"],
        section: record["SECTION"],
        // Add cost and commission if available in your history sheet
      }));
    
    return res.json({
      success: true,
      history: userHistory
    });
    
  } catch (error) {
    console.error("Error fetching history:", error);
    return res.status(500).json({ success: false, message: "Server error fetching history" });
  }
});

/**
 * Get available periods for a user
 */
app.get("/getPeriods", async (req, res) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ success: false, message: "User ID is required" });
  }
  
  try {
    // Fetch and process all data
    const data = await fetchAndProcessData();
    const userData = data.user_data;
    const budgetData = data.budget;
    
    // Find user
    const user = userData.find((user) => user["user id*"] === userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
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
        ["Period 1", "Period 2", "Period 3", "Period 4"].forEach(periodKey => {
          if (budgetRow[periodKey] && periods.indexOf(budgetRow[periodKey]) === -1) {
            periods.push(budgetRow[periodKey]);
          }
        });
      }
    }
    
    // Sort periods (assuming they're time strings)
    periods.sort();
    
    return res.json({
      success: true,
      periods: periods
    });
    
  } catch (error) {
    console.error("Error fetching periods:", error);
    return res.status(500).json({ success: false, message: "Server error fetching periods" });
  }
});

/**
 * Update user profile
 */
app.post("/updateProfile", async (req, res) => {
  const { userId, profileData } = req.body;
  
  if (!userId || !profileData) {
    return res.status(400).json({ success: false, message: "User ID and profile data are required" });
  }
  
  try {
    // Post to Google Apps Script to handle the update
    const result = await postToGoogleScript("updateProfile", {
      userId,
      profileData
    });
    
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    
    // Invalidate the cache since data was modified
    cachedData = null;
    
    return res.json({
      success: true,
      message: "Profile updated successfully"
    });
    
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ success: false, message: "Server error updating profile" });
  }
});

/**
 * COMPATIBILITY ENDPOINTS FOR EXISTING CODE
 */

/**
 * Check User (Login) - For compatibility with your existing code
 */
app.post("/check-user", async (req, res) => {
  const { id, pin } = req.body;
  
  if (!id || !pin) {
    return res.status(400).json({ message: "User ID and PIN are required" });
  }
  
  try {
    // Use the fetchAndProcessData function
    const data = await fetchAndProcessData();
    
    const user = data.user_data.find(
      (user) => user["user id*"] === id && user["pin*"] === pin.toString()
    );
    
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }
    
    // Format response to match what your existing frontend expects
    return res.json({ 
      id: user["user id*"], 
      firstName: user["name*"]
    });
    
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error during login" });
  }
});

/**
 * Get All Users (User Sheet) - For compatibility with your existing code
 */
app.get("/get-users", async (req, res) => {
  try {
    const data = await fetchAndProcessData();
    const users = data.user_data;
    
    // Transform to match your expected format
    const formattedUsers = users.map(user => ({
      id: user["user id*"],
      "First Name": user["name*"],
      pin: user["pin*"]
      // Add other fields as needed by your frontend
    }));
    
    res.json(formattedUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error fetching users" });
  }
});

/**
 * Get Financial Data for a User - For compatibility with your existing code
 */
app.get("/get-financial", async (req, res) => {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ message: "User ID is required" });
  }
  
  try {
    const data = await fetchAndProcessData();
    const userData = data.user_data;
    const budgetData = data.budget;
    
    const user = userData.find((user) => user["user id*"] === id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found in financial data." });
    }
    
    // Find active task groups for this user to calculate allowance
    const activeTaskGroups = [];
    
    // Check the binary flags
    for (let i = 0; i <= 9; i++) {
      const flagName = i === 0 ? "Activatetask" : `Activatetask${i}`;
      
      if (user[flagName] === "1" && i < budgetData.length) {
        const budgetRow = budgetData[i];
        
        activeTaskGroups.push({
          monthlyAllocation: parseFloat(budgetRow["monthly allocation Monthly Budget"] || "0")
        });
      }
    }
    
    // Calculate total allocation
    const totalAllocation = activeTaskGroups.reduce(
      (sum, group) => sum + (group.monthlyAllocation || 0), 
      0
    );
    
    // Format response to match what your existing frontend expects
    const financialData = {
      id: user["user id*"],
      allowance: totalAllocation,
      commission: parseFloat(user["CREDIT1"] || "0"),
      spent: parseFloat(user["DEBIT1"] || "0"),
      remaining: totalAllocation - parseFloat(user["DEBIT1"] || "0")
    };
    
    res.json(financialData);
  } catch (error) {
    console.error("Error fetching financial data:", error);
    res.status(500).json({ message: "Server error fetching financial data" });
  }
});

/**
 * Get Tasks for a User - For compatibility with your existing code
 */
app.get("/get-tasks", async (req, res) => {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ message: "User ID is required" });
  }
  
  try {
    const data = await fetchAndProcessData();
    const taskData = data.task;
    
    // Transform tasks to match your expected format and associate with user
    const userTasks = taskData.map((row, index) => ({
      id: index.toString(),
      title: row["STOCK"] || 'Task',
      type: row["TYPE"],
      price: parseFloat(row["PRICE"] || "0"),
      quantity: parseInt(row["QUANTITY"] || "1", 10),
      cost: parseFloat(row["COST"] || "0"),
      userId: id // Associate with the requested user
    }));
    
    if (userTasks.length === 0) {
      return res.status(404).json({ message: "No tasks found for this user." });
    }
    
    res.json(userTasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Server error fetching tasks" });
  }
});

/**
 * Get User Financial & Task Data (Fix for "Cannot POST /getUserData")
 */
app.post("/getUserData", async (req, res) => {
  const { id } = req.body;
  
  if (!id) {
    return res.status(400).json({ message: "User ID is required." });
  }
  
  try {
    const data = await fetchAndProcessData();
    const userData = data.user_data;
    const budgetData = data.budget;
    const taskData = data.task;
    
    const user = userData.find((user) => user["user id*"] === id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Calculate financial data
    const activeTaskGroups = [];
    
    for (let i = 0; i <= 9; i++) {
      const flagName = i === 0 ? "Activatetask" : `Activatetask${i}`;
      
      if (user[flagName] === "1" && i < budgetData.length) {
        const budgetRow = budgetData[i];
        
        activeTaskGroups.push({
          monthlyAllocation: parseFloat(budgetRow["monthly allocation Monthly Budget"] || "0")
        });
      }
    }
    
    const totalAllocation = activeTaskGroups.reduce(
      (sum, group) => sum + (group.monthlyAllocation || 0), 
      0
    );
    
    const financialData = {
      id: user["user id*"],
      allowance: totalAllocation,
      commission: parseFloat(user["CREDIT1"] || "0"),
      spent: parseFloat(user["DEBIT1"] || "0"),
      remaining: totalAllocation - parseFloat(user["DEBIT1"] || "0")
    };
    
    // Get tasks
    const userTasks = taskData.map((row, index) => ({
      id: index.toString(),
      title: row["STOCK"] || 'Task',
      type: row["TYPE"],
      price: parseFloat(row["PRICE"] || "0"),
      quantity: parseInt(row["QUANTITY"] || "1", 10),
      cost: parseFloat(row["COST"] || "0"),
      userId: id
    }));
    
    res.json({ financial: financialData, tasks: userTasks });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Start Server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Serving data from: ${SPREADSHEET_CSV_URL}`);
  console.log(`Using Google Script for updates: ${GOOGLE_SCRIPT_URL}`);
  console.log(`To test the server, try: http://localhost:${PORT}/get-users`);
  console.log("Make sure your frontend is running on http://localhost:5173");
});