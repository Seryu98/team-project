import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// ✅ BrowserRouter 제거 (App.jsx에 이미 있음)
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);