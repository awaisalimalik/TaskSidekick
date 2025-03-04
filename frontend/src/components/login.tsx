import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";

interface FirstProps {
  setUserData: React.Dispatch<React.SetStateAction<any>>;
  setFinancialData: React.Dispatch<React.SetStateAction<any>>;
  setTaskData: React.Dispatch<React.SetStateAction<any>>;
}

function First({ setUserData, setFinancialData, setTaskData }: FirstProps) {
  const [userId, setUserId] = useState("");
  const [pin, setPin] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!userId || !pin) {
      alert("Please enter both User ID and PIN");
      return;
    }

    try {
      // ✅ Step 1: Check User Login
      const response = await fetch("http://localhost:5000/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, pin }),
      });

      if (!response.ok) {
        alert("Invalid UserID or PIN. Please try again.");
        return;
      }

      const userData = await response.json();
      console.log("User Data:", userData);
      setUserData(userData); // ✅ Fix: Store as an object, not an array

      // ✅ Step 2: Fetch Financial Data
      const financialResponse = await fetch(
        `http://localhost:5000/get-financial?id=${userId}`
      );
      const financialData = await financialResponse.json();
      console.log("Financial Data:", financialData);
      setFinancialData(financialData); // ✅ Fix: Store as an object, not an array

      // ✅ Step 3: Fetch Task Data
      const taskResponse = await fetch(
        `http://localhost:5000/get-tasks?id=${userId}`
      );
      const taskData = await taskResponse.json();
      console.log("Task Data:", taskData);
      setTaskData(taskData); // ✅ Fix: Store as an array

      // ✅ Step 4: Store in Local Storage
      localStorage.setItem("userData", JSON.stringify(userData));
      localStorage.setItem("financialData", JSON.stringify(financialData));
      localStorage.setItem("taskData", JSON.stringify(taskData));

      // ✅ Step 5: Redirect to Dashboard
      navigate("/dashboard");

      // Clear input fields
      setUserId("");
      setPin("");
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred. Please try again.");
    }
  };

  // Function to handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="components">
      <div id="login" className="section">
        <div className="banner">
          <img src="bg-banner.jpg" alt="" />
        </div>
        <div className="login-container">
          <div className="login-part">
            <div className="container" id="loginPage">
              <h1 className="log">Login</h1>

              <label htmlFor="loginid">UserID</label>
              <input
                type="text"
                id="loginid"
                placeholder="Enter your user ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                onKeyDown={handleKeyPress} // Handle Enter key press
              />

              <label htmlFor="loginPassword">PIN</label>
              <input
                type="password"
                id="loginPassword"
                placeholder="Enter your PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={handleKeyPress} // Handle Enter key press
              />

              <button className="login-btn" onClick={handleLogin}>
                Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default First;
