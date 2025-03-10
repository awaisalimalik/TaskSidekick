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
  const [localFinancialData, setLocalFinancialData] = useState<any | null>(
    null
  );
  const [tasks, setTasks] = useState<any[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<string>("0");
  const [activeTab, setActiveTab] = useState<"financialSummary" | "tasks">(
    "financialSummary"
  );
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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
   * Initialize user data on component mount
   */
  useEffect(() => {
    const storedUserData = localStorage.getItem("userData");
    if (storedUserData) {
      try {
        const parsedUserData = JSON.parse(storedUserData);
        setLocalUserData(parsedUserData);
        fetchFinancialAndTasks(parsedUserData.id);
        fetchUserPeriodInfo(parsedUserData.id);
      } catch (error) {
        console.error("Error parsing user data:", error);
        navigate("/login");
      }
    } else {
      navigate("/login");
    }
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
    try {
      const response = await fetch("http://localhost:5001/getCurrentPeriod");

      if (!response.ok) {
        throw new Error(`Error fetching period data: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.periods && data.periods.length > 0) {
        // Use the same period calculation logic as in fetchUserPeriodInfo
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

        // Find the current period index
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

        // Format period time display
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
      }
    } catch (error) {
      console.error("Error fetching global period data:", error);
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
    }
  };

  /**
   * Fetch financial data and tasks for the user
   * @param userId The user's unique identifier
   */
  const fetchFinancialAndTasks = async (userId: string) => {
    setIsLoading(true);
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
      setIsLoading(true);

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

      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 text-center">
          Welcome {localUserData?.name || "Guest"}
        </h1>

        {isLoading && (
          <div role="status" className="flex justify-center mt-4">
            <svg
              aria-hidden="true"
              className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="currentColor"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                fill="currentFill"
              />
            </svg>
            <span className="sr-only">Loading...</span>
          </div>
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

        {/* Task List Section */}
        {activeTab === "tasks" && !isLoading && (
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
