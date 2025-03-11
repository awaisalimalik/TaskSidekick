/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./navbar";
import FinancialSummary from "./financialSummary";
import TaskList from "./taskList";
import BarSection from "./bar";

interface PeriodInfo {
  currentPeriod: string;
  currentPeriodNumber: string;
  timeRemaining: number;
  currentTime: string;
  periodsPerDay?: number;
  workingHours?: number;
}

const Dashboard = () => {
  const [localUserData, setLocalUserData] = useState<any | null>(null);
  const [localFinancialData, setLocalFinancialData] = useState<any | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<string>("0");
  const [activeTab, setActiveTab] = useState<"financialSummary" | "tasks">("financialSummary");
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Set to false initially
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true); // Track initial load
  const [periodInfo, setPeriodInfo] = useState<PeriodInfo | null>(null);
  const navigate = useNavigate();

  /**
   * Converts a time string in HH:MM format to minutes since midnight
   * @param timeStr Time string in HH:MM format
   * @returns Number of minutes since midnight
   */
  const convertTimeStringToMinutes = (timeStr: string): number => {
    let hours = 0;
    let minutes = 0;

    if (timeStr.includes(":")) {
      const [hourStr, minuteStr] = timeStr.split(":");
      hours = parseInt(hourStr, 10);
      minutes = parseInt(minuteStr, 10);
    }

    return hours * 60 + minutes;
  };

  /**
   * Load data from localStorage first before making API calls
   */
  useEffect(() => {
    // Check for and load cached data from localStorage
    const loadFromLocalStorage = () => {
      // Load user data
      const storedUserData = localStorage.getItem("userData");
      if (storedUserData) {
        try {
          const parsedUserData = JSON.parse(storedUserData);
          setLocalUserData(parsedUserData);
          
          // Load financial data
          const storedFinancialData = localStorage.getItem("financialData");
          if (storedFinancialData) {
            const parsedFinancialData = JSON.parse(storedFinancialData);
            setLocalFinancialData(parsedFinancialData);
          }
          
          // Load task data
          const storedTaskData = localStorage.getItem("taskData");
          if (storedTaskData) {
            const parsedTaskData = JSON.parse(storedTaskData);
            setTasks(parsedTaskData);
          }
          
          // Initialize with cached period or default
          const cachedPeriod = localStorage.getItem("currentPeriod");
          if (cachedPeriod) {
            setCurrentPeriod(cachedPeriod);
          }
          
          // Fetch fresh data in the background
          fetchFinancialAndTasks(parsedUserData.id);
          fetchUserPeriodInfo(parsedUserData.id);
        } catch (error) {
          console.error("Error parsing cached data:", error);
          navigate("/login");
        }
      } else {
        navigate("/login");
      }
      
      // Mark initial load as complete
      setIsInitialLoad(false);
    };
    
    loadFromLocalStorage();
  }, []);

  useEffect(() => {
    // Reset timer when period changes
    setTimeRemaining(6 * 60 * 60);

    const periodTimer = setInterval(() => {
      setCurrentPeriod((prevPeriod) => {
        const nextPeriod = (parseInt(prevPeriod) % 3) + 1; // Cycle through periods 1, 2, 3
        return nextPeriod.toString();
      });
    }, 6 * 60 * 60 * 1000); // 6 hours in milliseconds

    return () => clearInterval(periodTimer); // Cleanup interval on unmount
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer); // Cleanup interval on unmount
  }, [currentPeriod]); // Reset timer when period changes
  
  /**
   * Fetch period information specific to the user
   * @param userId The user's unique identifier
   */
  const fetchUserPeriodInfo = async (userId: string) => {
    try {
      const response = await fetch(
        `http://localhost:5001/getPeriods?userId=${userId}`
      );

      if (!response.ok) {
        throw new Error(`Error fetching period data: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.periods && data.periods.length > 0) {
        // Calculate current period based on current time
        const now = new Date();
        const currentTimeStr = now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        const currentTime = convertTimeStringToMinutes(currentTimeStr);

        // Convert period strings to minutes for comparison
        const periodTimes = data.periods.map((time: string) =>
          convertTimeStringToMinutes(time)
        );

        // Find the current period index (which period we're in or approaching)
        let currentPeriodIndex = 0;
        for (let i = 0; i < periodTimes.length; i++) {
          if (currentTime < periodTimes[i]) {
            currentPeriodIndex = i;
            break;
          }
          // If we've passed all periods, we're approaching the first period of next day
          if (i === periodTimes.length - 1) {
            currentPeriodIndex = 0;
          }
        }

        // Calculate time remaining until next period
        const nextPeriodTimeMinutes =
          currentTime < periodTimes[currentPeriodIndex]
            ? periodTimes[currentPeriodIndex]
            : periodTimes[0] + 24 * 60; // Add 24 hours if next period is tomorrow

        let timeRemainingMinutes = nextPeriodTimeMinutes - currentTime;

        // If next period is tomorrow, adjust the calculation
        if (nextPeriodTimeMinutes > 24 * 60) {
          timeRemainingMinutes = timeRemainingMinutes % (24 * 60);
        }

        // Convert from minutes to seconds
        const timeRemainingSeconds = timeRemainingMinutes * 60;

        // Format the current period string
        const currentPeriodNumber = (currentPeriodIndex + 1).toString();

        // Format period time display (e.g. "14:30 - 20:00")
        let currentPeriodStartTime = "00:00";
        const currentPeriodEndTime = data.periods[currentPeriodIndex];

        if (currentPeriodIndex > 0) {
          currentPeriodStartTime = data.periods[currentPeriodIndex - 1];
        } else if (data.periods.length > 0) {
          // If we're in the first period, use the last period of previous day as start
          currentPeriodStartTime = data.periods[data.periods.length - 1];
        }

        const periodTimeDisplay = `${currentPeriodStartTime} - ${currentPeriodEndTime}`;

        // Set period information
        setPeriodInfo({
          currentPeriod: periodTimeDisplay,
          currentPeriodNumber: currentPeriodNumber,
          timeRemaining: timeRemainingSeconds,
          currentTime: currentTimeStr,
          periodsPerDay: data.periods.length,
          workingHours: 8, // Default or from data if available
        });

        setCurrentPeriod(currentPeriodNumber);
        setTimeRemaining(timeRemainingSeconds);
        
        // Cache the current period
        localStorage.setItem("currentPeriod", currentPeriodNumber);
      } else {
        setPeriodInfo({
          currentPeriod: "",
          currentPeriodNumber: "0",
          timeRemaining: 0,
          currentTime: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
          periodsPerDay: 0,
          workingHours: 0,
        });
        setCurrentPeriod("0");
        setTimeRemaining(0);

        // Still try global periods as fallback
        fetchGlobalPeriodInfo();
      }
    } catch (error) {
      console.error("Error fetching user period data:", error);
      fetchGlobalPeriodInfo(); // Fallback to global period info
    }
  };

  /**
   * Fallback to fetch global period information when user-specific periods are unavailable
   */
  const fetchGlobalPeriodInfo = async () => {
    // ... (existing code)
  };

  /**
   * Fetch financial data and tasks for the user
   * @param userId The user's unique identifier
   */
  const fetchFinancialAndTasks = async (userId: string) => {
    // Only show loading indicator for subsequent refreshes, not initial load
    if (!isInitialLoad) {
      setIsLoading(true);
    }
    
    try {
      // Get user financial data
      const financialResponse = await fetch(
        `http://localhost:5001/getUserData?userId=${userId}`
      );

      if (!financialResponse.ok) {
        throw new Error(
          `Error fetching financial data: ${financialResponse.statusText}`
        );
      }

      const financialData = await financialResponse.json();

      if (financialData.success) {
        setLocalFinancialData({
          allowance: financialData.financial.allowance || 0,
          commission: financialData.financial.commission || 0,
          spent: financialData.financial.spent || 0,
          remaining: financialData.financial.remaining || 0,
        });

        // Update localStorage
        localStorage.setItem(
          "financialData",
          JSON.stringify({
            id: userId,
            allowance: financialData.financial.allowance || 0,
            commission: financialData.financial.commission || 0,
            spent: financialData.financial.spent || 0,
            remaining: financialData.financial.remaining || 0,
          })
        );
      } else {
        console.error("Financial data fetch failed:", financialData.message);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetch tasks for the current period and task group
   * @param groupId The task group identifier
   * @param periodNumber The current period number
   */
  const fetchTasks = async () => {
    try {
      // Only show loading indicator for subsequent refreshes after initial load
      if (!isInitialLoad) {
        setIsLoading(true);
      }

      // Get tasks for the specific period and task group
      const tasksResponse = await fetch(
        `http://localhost:5001/getTasks?periodNumber=${currentPeriod}`
      );

      if (!tasksResponse.ok) {
        throw new Error(`Error fetching tasks: ${tasksResponse.statusText}`);
      }

      const taskResult = await tasksResponse.json();

      if (taskResult.success) {
        // Format tasks for the UI
        const formattedTasks = taskResult.tasks.map((task: any) => ({
          id: `${task.id}`,
          taskLabel: task.board || "Task",
          stock: task.stock || "",
          type: task.type || "",
          price: task.price || 0,
          extra: task.extra || "",
          quantity: task.quantity || 0,
          totalPrice: task.cost || 0,
          period: currentPeriod,
          userId: localUserData?.id,
        }));

        setTasks(formattedTasks);

        // Update localStorage
        localStorage.setItem("taskData", JSON.stringify(formattedTasks));
      } else {
        console.error("Tasks fetch failed:", taskResult.message);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle task acknowledgment actions
   * @param task The task to acknowledge (null for acknowledging all tasks)
   * @param action The action to perform ("acknowledge" or "acknowledge-all")
   */
  const handleTaskAction = async (task: any, action: string) => {
    if (!localUserData) return;

    setIsLoading(true);

    if (action === "acknowledge") {
      try {
        const response = await fetch("http://localhost:5001/acknowledgeTask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: localUserData.id,
            taskId: task.id,
            currentPeriod: currentPeriod,
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Update financial data
          setLocalFinancialData({
            allowance: result.financial.allowance || 0,
            commission: result.financial.commission || 0,
            spent: result.financial.spent || 0,
            remaining: result.financial.remaining || 0,
          });

          // Update localStorage
          localStorage.setItem(
            "financialData",
            JSON.stringify({
              id: localUserData.id,
              allowance: result.financial.allowance || 0,
              commission: result.financial.commission || 0,
              spent: result.financial.spent || 0,
              remaining: result.financial.remaining || 0,
            })
          );

          // Remove the acknowledged task from the list
          setTasks((prevTasks) => prevTasks.filter((t) => t.id !== task.id));

          // Update localStorage for tasks
          const updatedTasks = tasks.filter((t) => t.id !== task.id);
          localStorage.setItem("taskData", JSON.stringify(updatedTasks));
        } else {
          console.error("Task acknowledgment failed:", result.message);
        }
      } catch (error) {
        console.error("Error acknowledging task:", error);
      } finally {
        setIsLoading(false);
      }
    } else if (action === "acknowledge-all") {
      // Filter tasks for the current period
      const currentPeriodTasks = tasks.filter(
        (t) => t.period === currentPeriod
      );

      // Process each task sequentially
      for (const task of currentPeriodTasks) {
        try {
          const response = await fetch(
            "http://localhost:5001/acknowledgeTask",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: localUserData.id,
                taskId: task.id,
                quantity: task.quantity || 1,
              }),
            }
          );

          const result = await response.json();

          if (result.success) {
            // Update financial data
            setLocalFinancialData({
              allowance: result.financial.allowance || 0,
              commission: result.financial.commission || 0,
              spent: result.financial.spent || 0,
              remaining: result.financial.remaining || 0,
            });
          }
        } catch (error) {
          console.error(`Error acknowledging task ${task.id}:`, error);
        }
      }

      // Remove all tasks for the current period
      setTasks((prevTasks) =>
        prevTasks.filter((t) => t.period !== currentPeriod)
      );

      // Update localStorage
      const updatedTasks = tasks.filter((t) => t.period !== currentPeriod);
      localStorage.setItem("taskData", JSON.stringify(updatedTasks));
      localStorage.setItem("financialData", JSON.stringify(localFinancialData));

      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <Navbar
        onLogout={() => {
          localStorage.clear();
          navigate("/login");
        }}
      />

      {/* Tab Navigation */}
      <BarSection
        fetchTasks={fetchTasks}
        setActiveTab={setActiveTab}
        activeTab={activeTab}
      />

      <div className="p-2 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 text-center">
          Welcome {localUserData?.name || "Guest"}
        </h1>

  {/* Loading overlay that ensures content is visible behind it */}
{isLoading && (
  <>
    {/* Fixed position transparent overlay with reduced opacity */}
    <div className="fixed inset-0 bg-gray-100 opacity-70 z-10"></div>
    
    {/* Centered spinner container */}
    <div className="fixed inset-0 flex items-center justify-center z-20 pointer-events-none">
      <div className="">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          className="w-12 h-12 animate-spin fill-[#28a05c]"
          aria-hidden="true"
        >
          <path d="M304 48a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zm0 416a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zM48 304a48 48 0 1 0 0-96 48 48 0 1 0 0 96zm464-48a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zM142.9 437A48 48 0 1 0 75 369.1 48 48 0 1 0 142.9 437zm0-294.2A48 48 0 1 0 75 75a48 48 0 1 0 67.9 67.9zM369.1 437A48 48 0 1 0 437 369.1 48 48 0 1 0 369.1 437z" />
        </svg>
      </div>
    </div>
  </>
)}

        {/* Show Financial Summary if tab is selected */}
        {activeTab === "financialSummary" && localFinancialData && (
          <FinancialSummary
            financialData={localFinancialData}
            currentPeriod={currentPeriod}
            totalPeriods={periodInfo?.periodsPerDay || 0}
            timeRemaining={timeRemaining}
          />
        )}

        {/* Task List Section - show even during loading */}
        {activeTab === "tasks" && (
          <TaskList
            tasks={tasks}
            selectedPeriod={currentPeriod}
            onTaskAction={handleTaskAction}
            timeRemaining={timeRemaining}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;