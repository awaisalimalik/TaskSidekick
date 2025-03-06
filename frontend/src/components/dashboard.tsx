import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./navbar";
import FinancialSummary from "./financialSummary";
import TaskList from "./taskList";
import BarSection from "./bar";

interface DashboardProps {}

const Dashboard: React.FC<DashboardProps> = () => {
  const [localUserData, setLocalUserData] = useState<any | null>(null);
  const [localFinancialData, setLocalFinancialData] = useState<any | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<string>("1");  // Default period as string
  const [activeTab, setActiveTab] = useState<"financialSummary" | "tasks">("financialSummary"); // Default to Financial Summary
  const [timeRemaining, setTimeRemaining] = useState<number>(6 * 60 * 60); // Initialize timeRemaining state (6 hours in seconds)
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUserData = localStorage.getItem("userData");
    if (storedUserData) {
      try {
        const parsedUserData = JSON.parse(storedUserData);
        setLocalUserData(parsedUserData);
        fetchFinancialAndTasks(parsedUserData.id);
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

  const fetchFinancialAndTasks = async (userId: string) => {
    setIsLoading(true);
    try {
      // First, get user financial data using the new endpoint
      const financialResponse = await fetch(`http://localhost:5000/getUserData?userId=${userId}`);
      
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
        
        // Also update localStorage
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

      // Then, get periods from the user's active task groups
      const periodsResponse = await fetch(`http://localhost:5000/getPeriods?userId=${userId}`);
      
      if (periodsResponse.ok) {
        const periodsData = await periodsResponse.json();
        if (periodsData.success && periodsData.periods.length > 0) {
          // Use the first period, but keep the current format (numeric string)
          // We're not changing the actual period system, just making sure we have valid periods
          setCurrentPeriod("1");
        }
      }

      // Finally, get tasks using the new endpoint
      const tasksResponse = await fetch(`http://localhost:5000/getTasks?groupId=0`);
      
      if (!tasksResponse.ok) {
        throw new Error(`Error fetching tasks: ${tasksResponse.statusText}`);
      }
      
      const taskResult = await tasksResponse.json();
      
      if (taskResult.success) {
        // Format the tasks to match your expected structure and assign them to periods
        const formattedTasks = taskResult.tasks.map((task: any, index: number) => {
          // Distribute tasks across periods (for demo purposes)
          const period = ((index % 3) + 1).toString();
          
          return {
            id: task.id,
            taskLabel: task.board || "Task",
            stock: task.stock || "",
            type: task.type || "",
            price: task.price || 0,
            extra: task.extra || "",
            quantity: task.quantity || 0,
            totalPrice: task.cost || 0,
            period: period,
            userId: userId
          };
        });
        
        setTasks(formattedTasks);
        
        // Update localStorage
        localStorage.setItem("taskData", JSON.stringify(formattedTasks));
      } else {
        console.error("Tasks fetch failed:", taskResult.message);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskAction = async (task: any, action: string) => {
    if (!localUserData) return;
    
    setIsLoading(true);
    
    if (action === "acknowledge") {
      try {
        const response = await fetch("http://localhost:5000/acknowledgeTask", {
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
          // Update the financial data with the new values
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
          
          // Also update localStorage for tasks
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
          const response = await fetch("http://localhost:5000/acknowledgeTask", {
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
            // Update financial data after each successful acknowledgment
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
      
      // After processing all tasks, remove acknowledged tasks from the list
      setTasks(prevTasks => prevTasks.filter(t => t.period !== currentPeriod));
      
      // Update localStorage
      const updatedTasks = tasks.filter(t => t.period !== currentPeriod);
      localStorage.setItem("taskData", JSON.stringify(updatedTasks));
      localStorage.setItem("financialData", JSON.stringify(localFinancialData));
      
      setIsLoading(false);
    }
  };

  // Refresh data every minute to keep it updated
  useEffect(() => {
    if (localUserData) {
      const refreshTimer = setInterval(() => {
        fetchFinancialAndTasks(localUserData.id);
      }, 60000); // Refresh every minute
      
      return () => clearInterval(refreshTimer);
    }
  }, [localUserData]);

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
            totalPeriods={3} // Assuming there are 3 periods
            timeRemaining={timeRemaining} // Pass timeRemaining state
          />
        )}

        {/* Task List Section */}
        {activeTab === "tasks" && (
          <TaskList
            tasks={tasks}
            selectedPeriod={currentPeriod}
            onTaskAction={handleTaskAction}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;