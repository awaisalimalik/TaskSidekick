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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [periodInfo, setPeriodInfo] = useState<PeriodInfo | null>(null);
  const [periodTimes, setPeriodTimes] = useState<string[]>([]);
  const [isWithinWorkingHours, setIsWithinWorkingHours] = useState<boolean>(false);
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
   * Formats minutes since midnight to HH:MM
   * @param minutes Minutes since midnight
   * @returns Formatted time string
   */
  const formatMinutesToTimeString = (minutes: number): string => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  /**
   * Adds minutes to a time and handles day boundaries
   * @param timeInMinutes Time in minutes since midnight
   * @param minutesToAdd Minutes to add
   * @returns New time in minutes, wrapping around midnight if needed
   */
  const addMinutesToTime = (timeInMinutes: number, minutesToAdd: number): number => {
    return (timeInMinutes + minutesToAdd) % (24 * 60);
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

  // Replace the period cycling effect with one that checks periodically
  useEffect(() => {
    // Only start the timer if we have valid period info and are in an active period
    if (periodInfo && periodInfo.currentPeriodNumber !== "0" && periodInfo.timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // When time expires, refresh period info
            if (localUserData) {
              fetchUserPeriodInfo(localUserData.id);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer); // Cleanup interval on unmount
    }
  }, [periodInfo, localUserData]);

  // Add a new effect that periodically refreshes period info
  useEffect(() => {
    // Refresh period info every minute to handle period transitions
    if (localUserData) {
      const periodUpdateTimer = setInterval(() => {
        fetchUserPeriodInfo(localUserData.id);
      }, 60 * 1000); // Check every minute
      
      return () => clearInterval(periodUpdateTimer);
    }
  }, [localUserData]);

  /**
   * Fetch period information specific to the user
   * @param userId The user's unique identifier
   */
  const fetchUserPeriodInfo = async (userId: string) => {
    try {
      // Use the existing getPeriods endpoint
      const response = await fetch(
        `http://localhost:5001/getPeriods?userId=${userId}`
      );

      if (!response.ok) {
        throw new Error(`Error fetching period data: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log("Backend period data:", data);
      console.log("Periods array:", data.periods);

      if (data.success && data.periods && data.periods.length > 0) {
        const transactionsPerDay = data.periods.length;
        setPeriodTimes(data.periods);
        
        console.log(`Found ${transactionsPerDay} periods:`, data.periods);
        
        // Get current time
        const now = new Date();
        const currentTimeStr = now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        const currentTime = convertTimeStringToMinutes(currentTimeStr);
        console.log(`Current time: ${currentTimeStr} (${currentTime} minutes)`);
        
        // Always consider as within working hours for 24/7 operation
        setIsWithinWorkingHours(true);
        
        // Calculate period durations based on transactions per day
        const workingHours = 8; // Always use 8-hour workday
        const hoursPerPeriod = workingHours / transactionsPerDay;
        const minutesPerPeriod = hoursPerPeriod * 60;
        
        console.log(`Hours per period: ${hoursPerPeriod}, Minutes per period: ${minutesPerPeriod}`);
        
        // Convert period times to minutes
        const periodStartTimes: number[] = data.periods.map((time: string): number => convertTimeStringToMinutes(time));
        
        // Calculate period end times (start time + duration)
        const periodEndTimes = periodStartTimes.map(startTime => 
          addMinutesToTime(startTime, minutesPerPeriod)
        );
        
        // Format for display
        const formattedPeriodRanges = periodStartTimes.map((startTime, index) => {
          const endTime = periodEndTimes[index];
          return `${formatMinutesToTimeString(startTime)} - ${formatMinutesToTimeString(endTime)}`;
        });
        
        console.log("Period ranges:", formattedPeriodRanges);
        
        // Find current period
        let currentPeriodIndex = -1;
        
        for (let i = 0; i < periodStartTimes.length; i++) {
          const startTime = periodStartTimes[i];
          const endTime = periodEndTimes[i];
          
          // Handle periods that don't cross midnight
          if (startTime < endTime) {
            if (currentTime >= startTime && currentTime < endTime) {
              currentPeriodIndex = i;
              console.log(`Found period ${i+1}: ${startTime} - ${endTime}`);
              break;
            }
          } 
          // Handle periods that cross midnight
          else {
            if (currentTime >= startTime || currentTime < endTime) {
              currentPeriodIndex = i;
              console.log(`Found period ${i+1} (crosses midnight): ${startTime} - ${endTime}`);
              break;
            }
          }
        }
        
        if (currentPeriodIndex !== -1) {
          // Found an active period
          const startTime = periodStartTimes[currentPeriodIndex];
          const endTime = periodEndTimes[currentPeriodIndex];
          const periodRange = formattedPeriodRanges[currentPeriodIndex];
          
          // Calculate time remaining
          let timeRemainingMinutes;
          
          // If period crosses midnight and current time is after midnight
          if (startTime > endTime && currentTime < endTime) {
            timeRemainingMinutes = endTime - currentTime;
          } 
          // Normal case or after start time before midnight
          else {
            // Calculate time until end, wrapping around midnight if needed
            if (currentTime <= endTime) {
              timeRemainingMinutes = endTime - currentTime;
            } else {
              timeRemainingMinutes = (24 * 60 - currentTime) + endTime;
            }
          }
          
          const timeRemainingSeconds = timeRemainingMinutes * 60;
          console.log(`Time remaining: ${timeRemainingMinutes} minutes (${timeRemainingSeconds} seconds)`);
          
          // Set period information
          setPeriodInfo({
            currentPeriod: periodRange,
            currentPeriodNumber: (currentPeriodIndex + 1).toString(),
            timeRemaining: timeRemainingSeconds,
            currentTime: currentTimeStr,
            periodsPerDay: transactionsPerDay,
            workingHours: workingHours,
          });
          
          setCurrentPeriod((currentPeriodIndex + 1).toString());
          setTimeRemaining(timeRemainingSeconds);
          
          // Cache the current period
          localStorage.setItem("currentPeriod", (currentPeriodIndex + 1).toString());
          
        } else {
          // Not in any period
          setPeriodInfo({
            currentPeriod: "No Active Period",
            currentPeriodNumber: "0",
            timeRemaining: 0,
            currentTime: currentTimeStr,
            periodsPerDay: transactionsPerDay,
            workingHours: workingHours,
          });
          setCurrentPeriod("0");
          setTimeRemaining(0);
          console.log("Not in any active period");
        }
      } else {
        // No periods available
        setPeriodInfo({
          currentPeriod: "No Period Data",
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
        setPeriodTimes([]);
        setIsWithinWorkingHours(false);
      }
    } catch (error) {
      console.error("Error fetching user period data:", error);
      // Set default values
      setPeriodInfo({
        currentPeriod: "Error Loading Periods",
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
      setPeriodTimes([]);
      setIsWithinWorkingHours(false);
    }
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
   * Fetch tasks for the current period
   */
  const fetchTasks = async () => {
    try {
      // Only show loading indicator for subsequent refreshes after initial load
      if (!isInitialLoad) {
        setIsLoading(true);
      }

      // Get tasks for the specific period
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

        {/* Loading overlay */}
        {isLoading && (
          <>
            <div className="fixed inset-0 bg-gray-100 opacity-70 z-10"></div>
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
            periodTimes={periodTimes}
            isWithinWorkingHours={isWithinWorkingHours}
          />
        )}

        {/* Task List Section */}
        {activeTab === "tasks" && (
          <TaskList
            tasks={tasks}
            selectedPeriod={currentPeriod}
            onTaskAction={handleTaskAction}
            timeRemaining={timeRemaining}
            totalPeriods={periodInfo?.periodsPerDay || 0}
             isWithinWorkingHours={isWithinWorkingHours}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;