import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import First from "./components/login.tsx";
import Dashboard from "./components/dashboard.tsx";
 
function App() {
  // ✅ Load user data from local storage
  const [userData, setUserData] = useState(() => {
    const savedUser = localStorage.getItem("userData");
    return savedUser ? JSON.parse(savedUser) : null; // ✅ Store as an object
  });

  const [financialData, setFinancialData] = useState(() => {
    const savedFinancial = localStorage.getItem("financialData");
    return savedFinancial ? JSON.parse(savedFinancial) : null;
  });

  const [taskData, setTaskData] = useState(() => {
    const savedTasks = localStorage.getItem("taskData");
    return savedTasks ? JSON.parse(savedTasks) : [];
  });

  useEffect(() => {
    const fetchStoredData = () => {
      try {
        const storedUserData = localStorage.getItem("userData");
        const storedFinancialData = localStorage.getItem("financialData");
        const storedTaskData = localStorage.getItem("taskData");

        if (storedUserData) setUserData(JSON.parse(storedUserData));
        if (storedFinancialData) setFinancialData(JSON.parse(storedFinancialData));
        if (storedTaskData) setTaskData(JSON.parse(storedTaskData));
      } catch (error) {
        console.error("Error parsing stored data:", error);
      }
    };

    fetchStoredData();
    window.addEventListener("storage", fetchStoredData);
    return () => window.removeEventListener("storage", fetchStoredData);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={<First setUserData={setUserData} setFinancialData={setFinancialData} setTaskData={setTaskData} />} 
        />
        <Route 
          path="/login" 
          element={<First setUserData={setUserData} setFinancialData={setFinancialData} setTaskData={setTaskData} />} 
        />
        <Route 
          path="/dashboard" 
          element={userData ? <Dashboard userData={userData} financialData={financialData} taskData={taskData} /> : <First setUserData={setUserData} setFinancialData={setFinancialData} setTaskData={setTaskData} />} 
        />
 
      </Routes>
    </BrowserRouter>
  );
}

export default App;
