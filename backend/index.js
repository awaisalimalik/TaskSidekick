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

// Google Sheets CSV Links (Replace with actual GIDs for each sheet)
const SHEETS_URLS = {
  users: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTSKh0DzuU9FwjWsErr0q3RskFaq5u7VqmIoqryObd1LL4801LQd1I4cQAO8UQ4Dr10ChSt6HOz0Gdr/pub?gid=318498920&single=true&output=csv",
  financial: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTSKh0DzuU9FwjWsErr0q3RskFaq5u7VqmIoqryObd1LL4801LQd1I4cQAO8UQ4Dr10ChSt6HOz0Gdr/pub?gid=1864737476&single=true&output=csv",
  tasks: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTSKh0DzuU9FwjWsErr0q3RskFaq5u7VqmIoqryObd1LL4801LQd1I4cQAO8UQ4Dr10ChSt6HOz0Gdr/pub?gid=423614315&single=true&output=csv",
};

// Helper function to fetch CSV data and parse it
const fetchCSV = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch CSV data");

    const stream = Readable.from(await response.text());
    return new Promise((resolve, reject) => {
      const results = [];
      stream
        .pipe(csv())
        .on("data", (row) => results.push(row))
        .on("end", () => resolve(results))
        .on("error", (err) => reject(err));
    });
  } catch (error) {
    console.error("Error fetching CSV:", error);
    return [];
  }
};

/**
 * ✅ Get All Users (User Sheet)
 */
app.get("/get-users", async (req, res) => {
  const users = await fetchCSV(SHEETS_URLS.users);
  res.json(users);
});

/**
 * ✅ Get Financial Data for a User
 */
app.get("/get-financial", async (req, res) => {
  const { id } = req.query;
  const financialData = await fetchCSV(SHEETS_URLS.financial);

  const userFinance = financialData.find((row) => row.id === id);
  if (!userFinance) return res.status(404).json({ message: "User not found in financial data." });

  res.json(userFinance);
});

/**
 * ✅ Get Tasks for a User
 */
app.get("/get-tasks", async (req, res) => {
  const { id } = req.query;
  const tasksData = await fetchCSV(SHEETS_URLS.tasks);

  const userTasks = tasksData.filter((row) => row.id === id);
  if (userTasks.length === 0) return res.status(404).json({ message: "No tasks found for this user." });

  res.json(userTasks);
});

/**
 * ✅ Check User (Login)
 */
app.post("/check-user", async (req, res) => {
  const { id, pin } = req.body;
  const users = await fetchCSV(SHEETS_URLS.users);

  const user = users.find((row) => row.id === id && row.pin === pin);
  if (!user) return res.status(404).json({ message: "Invalid credentials." });

  res.json({ id: user.id, firstName: user["First Name"] });
});

/**
 * ✅ Get User Financial & Task Data (Fix for "Cannot POST /getUserData")
 */
app.post("/getUserData", async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ message: "User ID is required." });

  try {
    // Fetch Financial Data
    const financialData = await fetchCSV(SHEETS_URLS.financial);
    const userFinance = financialData.find((row) => row.id === id) || null;

    // Fetch Task Data
    const tasksData = await fetchCSV(SHEETS_URLS.tasks);
    const userTasks = tasksData.filter((row) => row.id === id) || [];

    res.json({ financial: userFinance, tasks: userTasks });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Start Server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
