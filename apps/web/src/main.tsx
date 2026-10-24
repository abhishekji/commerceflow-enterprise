import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./context/AuthContext";
import { NoticeProvider } from "./context/NoticeContext";
import "./common/styles/index.scss";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <NoticeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </NoticeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
