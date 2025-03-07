import React, { useEffect, useState } from "react";
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

interface TaskGroup {
  groupId: number;
  label: string;
  periodsPerDay: number;
  allowance: number;
}

const Dashboard = () => {
  const [localUserData, setLocalUserData] = useState<any | null>(null);
  const [localFinancialData, setLocalFinancialData] = useState<any | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<string>("0");
  const [activeTab, setActiveTab] = useState<"financialSummary" | "tasks">("financialSummary");
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [periodInfo, setPeriodInfo] = useState<PeriodInfo | null>(null);
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [selectedTaskGroup, setSelectedTaskGroup] = useState<number>(0);
  const [hasPeriods, setHasPeriods] = useState<boolean>(false);
  const navigate = useNavigate();
  
  /**
   * Converts a time string in HH:MM format to minutes since midnight
   * @param timeStr Time string in HH:MM format
   * @returns Number of minutes since midnight
   */
  const convertTimeStringToMinutes = (timeStr: string): number => {
    let hours = 0;
    let minutes = 0;
    
    if (timeStr.includes(':')) {
      const [hourStr, minuteStr] = timeStr.split(':');
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
        
        fetchUserPeriodInfo(parsedUserData.id);
        fetchFinancialAndTasks(parsedUserData.id);
      } catch (error) {
        console.error("Error parsing user data:", error);
        navigate("/login");
      }
    } else {
      navigate("/login");
    }
  }, []);

  /**
   * Fetch period information specific to the user
   * @param userId The user's unique identifier
   */
  const fetchUserPeriodInfo = async (userId: string) => {
    try {
      const response = await fetch(`http://localhost:5001/getPeriods?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching period data: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.periods && data.periods.length > 0) {
        // User has periods
        setHasPeriods(true);
        
        // Calculate current period based on current time
        const now = new Date();
        const currentTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const currentTime = convertTimeStringToMinutes(currentTimeStr);
        
        // Convert period strings to minutes for comparison
        const periodTimes = data.periods.map((time: string) => convertTimeStringToMinutes(time));
        
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
          workingHours: 8 // Default or from data if available
        });
        
        setCurrentPeriod(currentPeriodNumber);
        setTimeRemaining(timeRemainingSeconds);
        
        // Set task groups if available
        if (data.userTaskGroups && data.userTaskGroups.length > 0) {
          setTaskGroups(data.userTaskGroups);
          setSelectedTaskGroup(data.userTaskGroups[0].groupId);
        }
        
        console.log("Received period info:", data);
      } else {
        // User has no periods
        console.log("No periods found for this user");
        setHasPeriods(false);
        setPeriodInfo({
          currentPeriod: "",
          currentPeriodNumber: "0",
          timeRemaining: 0,
          currentTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          periodsPerDay: 0,
          workingHours: 0
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
        // Global periods exist
        setHasPeriods(true);
        
        // Use the same period calculation logic as in fetchUserPeriodInfo
        const now = new Date();
        const currentTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const currentTime = convertTimeStringToMinutes(currentTimeStr);
        
        // Convert period strings to minutes for comparison
        const periodTimes = data.periods.map((time: string) => convertTimeStringToMinutes(time));
        
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
          workingHours: 8 // Default or from data if available
        });
        
        setCurrentPeriod(currentPeriodNumber);
        setTimeRemaining(timeRemainingSeconds);
      } else {
        // No global periods exist either
        console.log("No global periods found");
        setHasPeriods(false);
        setPeriodInfo({
          currentPeriod: "",
          currentPeriodNumber: "0",
          timeRemaining: 0,
          currentTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          periodsPerDay: 0,
          workingHours: 0
        });
        setCurrentPeriod("0");
        setTimeRemaining(0);
      }
    } catch (error) {
      console.error("Error fetching global period data:", error);
      
      // No periods at all
      setHasPeriods(false);
      setPeriodInfo({
        currentPeriod: "",
        currentPeriodNumber: "0",
        timeRemaining: 0,
        currentTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        periodsPerDay: 0,
        workingHours: 0
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
      const financialResponse = await fetch(`http://localhost:5001/getUserData?userId=${userId}`);
      
      if (!financialResponse.ok) {
        throw new Error(`Error fetching financial data: ${financialResponse.statusText}`);
      }
      
      const financialData = await financialResponse.json();
      
      if (financialData.success) {
        setLocalFinancialData({
          allowance: financialData.financial.allowance || 0,
          commission: financialData.financial.commission || 0,
          spent: financialData.financial.spent || 0,
          remaining: financialData.financial.remaining || 0
        });
        
        // Update localStorage
        localStorage.setItem("financialData", JSON.stringify({
          id: userId,
          allowance: financialData.financial.allowance || 0,
          commission: financialData.financial.commission || 0,
          spent: financialData.financial.spent || 0,
          remaining: financialData.financial.remaining || 0
        }));
      } else {
        console.error("Financial data fetch failed:", financialData.message);
      }

      // Get tasks
      await fetchTasks(0, currentPeriod);
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
  const fetchTasks = async (groupId: number, periodNumber: string) => {
    try {
      setIsLoading(true);
      
      // Get tasks for the specific period and task group
      const tasksResponse = await fetch(`http://localhost:5001/getTasks?groupId=${groupId}&periodNumber=${periodNumber}`);
      
      if (!tasksResponse.ok) {
        throw new Error(`Error fetching tasks: ${tasksResponse.statusText}`);
      }
      
      const taskResult = await tasksResponse.json();
      
      if (taskResult.success) {
        // Format tasks for the UI
        const formattedTasks = taskResult.tasks.map((task: any) => ({
          id: task.id,
          taskLabel: task.board || "Task",
          stock: task.stock || "",
          type: task.type || "",
          price: task.price || 0,
          extra: task.extra || "",
          quantity: task.quantity || 0,
          totalPrice: task.cost || 0,
          period: periodNumber,
          userId: localUserData?.id
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
   * Set up timer to update remaining time counter
   */
  useEffect(() => {
    // Only use timer if user has periods
    if (!hasPeriods) return;
    
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up, fetch new period info
          if (localUserData?.id) {
            fetchUserPeriodInfo(localUserData.id);
          } else {
            fetchGlobalPeriodInfo();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer); // Cleanup interval on unmount
  }, [localUserData, hasPeriods]);

  /**
   * Refresh period data every 5 minutes as a backup
   */
  useEffect(() => {
    if (localUserData) {
      const refreshTimer = setInterval(() => {
        fetchUserPeriodInfo(localUserData.id);
      }, 5 * 60 * 1000); // Every 5 minutes
      
      return () => clearInterval(refreshTimer);
    }
  }, [localUserData]);

  /**
   * Fetch tasks when period or task group changes
   */
  useEffect(() => {
    if (localUserData && currentPeriod && currentPeriod !== "0") {
      fetchTasks(selectedTaskGroup, currentPeriod);
    }
  }, [currentPeriod, selectedTaskGroup, localUserData]);

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
            quantity: task.quantity || 1
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
          localStorage.setItem("financialData", JSON.stringify({
            id: localUserData.id,
            allowance: result.financial.allowance || 0,
            commission: result.financial.commission || 0,
            spent: result.financial.spent || 0,
            remaining: result.financial.remaining || 0
          }));
          
          // Remove the acknowledged task from the list
          setTasks(prevTasks => prevTasks.filter(t => t.id !== task.id));
          
          // Update localStorage for tasks
          const updatedTasks = tasks.filter(t => t.id !== task.id);
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
      const currentPeriodTasks = tasks.filter(t => t.period === currentPeriod);
      
      // Process each task sequentially
      for (const task of currentPeriodTasks) {
        try {
          const response = await fetch("http://localhost:5001/acknowledgeTask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: localUserData.id,
              taskId: task.id,
              quantity: task.quantity || 1
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
          }
        } catch (error) {
          console.error(`Error acknowledging task ${task.id}:`, error);
        }
      }
      
      // Remove all tasks for the current period
      setTasks(prevTasks => prevTasks.filter(t => t.period !== currentPeriod));
      
      // Update localStorage
      const updatedTasks = tasks.filter(t => t.period !== currentPeriod);
      localStorage.setItem("taskData", JSON.stringify(updatedTasks));
      localStorage.setItem("financialData", JSON.stringify(localFinancialData));
      
      setIsLoading(false);
    }
  };

  /**
   * Format time remaining in seconds to HH:MM:SS format with leading zeros
   * @param seconds Time in seconds
   * @returns Formatted time string in HH:MM:SS format
   */
  const formatTimeRemaining = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Handle task group selection change
   * @param event The select element change event
   */
  const handleTaskGroupChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const groupId = parseInt(event.target.value);
    setSelectedTaskGroup(groupId);
    fetchTasks(groupId, currentPeriod);
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <Navbar
        onLogout={() => {
          localStorage.clear();
          sessionStorage.clear();
          console.clear();
          navigate("/login");
          window.location.reload();
        }}
      />

      {/* Tab Navigation */}
      <BarSection setActiveTab={setActiveTab} activeTab={activeTab} />

      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 text-center">
          Welcome {localUserData?.firstName || "Guest"}
        </h1>

        {/* Task Group Selection (only show in tasks tab) */}
        {activeTab === "tasks" && taskGroups.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center justify-between">
              <label htmlFor="taskGroup" className="font-medium text-gray-700">
                Task Group:
              </label>
              <select
                id="taskGroup"
                className="ml-4 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedTaskGroup}
                onChange={handleTaskGroupChange}
              >
                {taskGroups.map((group) => (
                  <option key={group.groupId} value={group.groupId}>
                    {group.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center items-center mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
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