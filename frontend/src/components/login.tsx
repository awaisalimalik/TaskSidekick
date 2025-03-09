import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";

interface FirstProps {
  setUserData: React.Dispatch<React.SetStateAction<any>>;
  
}

function First({ setUserData}: FirstProps) {
  const [userId, setUserId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState({ userId: false, pin: false, login: false });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError({ userId: !userId, pin: !pin, login: false });

    if (!userId || !pin) {
      return;
    }

    setIsLoading(true);
    try {
      // Using the new login endpoint from the updated backend
      const response = await fetch("http://localhost:5001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, pin }),
      });

      if (!response.ok) {
        setError((prev) => ({ ...prev, login: true }));
        setIsLoading(false);
        return;
      }

      const loginData = await response.json();
      
      if (!loginData.success) {
        setError((prev) => ({ ...prev, login: true }));
        setIsLoading(false);
        return;
      }

      // Format user data to match your existing structure
      const userData = {
        id: loginData.userId,
        name: loginData.name
      };
      
      setUserData(userData);

      // Get user financial data and task data using the new endpoints
      const userDataResponse = await fetch(
        `http://localhost:5001/getUserData?userId=${loginData.userId}`
      );
      
      if (!userDataResponse.ok) {
        throw new Error("Failed to fetch user data");
      }
      
      const userDataResult = await userDataResponse.json();
      
      // Format financial data to match your existing structure
      const financialData = {
        id: loginData.userId,
        allowance: userDataResult.financial.allowance,
        commission: userDataResult.financial.commission,
        spent: userDataResult.financial.spent,
        remaining: userDataResult.financial.remaining
      };

      // Store data in localStorage
      localStorage.setItem("userData", JSON.stringify(userData));
      localStorage.setItem("financialData", JSON.stringify(financialData));

      navigate("/dashboard");

      setUserId("");
      setPin("");
    } catch (error) {
      console.error("Error:", error);
      setError((prev) => ({ ...prev, login: true }));
    } finally {
      setIsLoading(false);
    }
  };

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
              <div>
                <label className="yu" htmlFor="loginid">UserID</label>
                <input
                  type="text"
                  id="loginid"
                  placeholder="Enter your user ID"
                  value={userId}
                  onChange={(e) => {
                    setUserId(e.target.value);
                    setError((prev) => ({ ...prev, userId: false }));
                  }}
                  onKeyDown={handleKeyPress}
                />
                {error.userId && <span className="error">This field is required</span>}
              </div>

              <div>
                <label htmlFor="loginPassword">PIN</label>
                <input
                  type="password"
                  id="loginPassword"
                  placeholder="Enter your PIN"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setError((prev) => ({ ...prev, pin: false }));
                  }}
                  onKeyDown={handleKeyPress}
                />
                {error.pin && <span className="error">This field is required</span>}
              </div>

              <button className="login-btn" onClick={handleLogin} disabled={isLoading}>
                {isLoading ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 512 512"
                    className="spinner"
                  >
                    <path d="M304 48a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zm0 416a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zM48 304a48 48 0 1 0 0-96 48 48 0 1 0 0 96zm464-48a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zM142.9 437A48 48 0 1 0 75 369.1 48 48 0 1 0 142.9 437zm0-294.2A48 48 0 1 0 75 75a48 48 0 1 0 67.9 67.9zM369.1 437A48 48 0 1 0 437 369.1 48 48 0 1 0 369.1 437z" />
                  </svg>
                ) : (
                  "Login"
                )}
              </button>
              {error.login && <span className="error">Invalid UserID or PIN</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default First;