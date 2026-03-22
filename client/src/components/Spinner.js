import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Spinner = ({ path = "login" }) => {
  const [count, setCount] = useState(3);
  const navigate = useNavigate();
  const location = useLocation();

  // Ho Jin Han, A0266275W
  // Tick effect only runs while count > 0
  useEffect(() => {
    if (count <= 0) return;
    const interval = setInterval(() => {
      setCount((c) => c - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [count]);

  // Ho Jin Han, A0266275W
  // Redirect effect triggers exactly once at count === 0
  useEffect(() => {
    if (count !== 0) return;
    navigate(`/${path}`, { state: location.pathname });
  }, [count, navigate, path, location.pathname]);

  return (
    <>
      <div
        className="d-flex flex-column justify-content-center align-items-center"
        style={{ height: "100vh" }}
      >
        <h1 className="Text-center">redirecting to you in {count} second </h1>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    </>
  );
};

export default Spinner;
