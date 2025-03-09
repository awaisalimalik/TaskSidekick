import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import First from "./components/login.tsx";
import Dashboard from "./components/dashboard.tsx";
 
function App() {
  // ✅ Load user data from local storage
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchStoredData = () => {
      try {
        const storedUserData = localStorage.getItem("userData");

        if (storedUserData) setUserData(JSON.parse(storedUserData));
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
          element={<First setUserData={setUserData}  />} 
        />
        <Route 
          path="/login" 
          element={<First setUserData={setUserData} />} 
        />
        <Route 
          path="/dashboard" 
          element={userData ? <Dashboard  /> : <First setUserData={setUserData}  />} 
        />
 
      </Routes>
    </BrowserRouter>
  );
}

export default App;
