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
      }
    } else {
      navigate("/login");
    }
  }, []);

  useEffect(() => {
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
    try {
      const response = await fetch("http://localhost:5000/getUserData", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId }),
      });
      const data = await response.json();

      setLocalFinancialData({
        allowance: Number(data.financial.Allowance) || 0,
        commission: Number(data.financial.Commission) || 0,
        spent: Number(data.financial.Spent) || 0,
        remaining: Number(data.financial.Remaining) || 0,
      });

      setTasks(
        data.tasks.map((task: any) => ({
          taskLabel: task["Task Label"],
          stock: task.Stock,
          type: task.Type,
          price: Number(task.Price.replace("$", "")) || 0, // Remove "$" and parse as number
          extra: task.Extra || "",
          quantity: Number(task.Quantity) || 0,
          totalPrice: Number(task["Total Price"].replace("$", "")) || 0, // Remove "$" and parse as number
          period: task.Period.toString(),  // Ensure period is a string
        }))
      );
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleTaskAction = (task: any | null, action: string) => {
    if (action === "acknowledge-all") {
      console.log("Acknowledging all tasks");
    }
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