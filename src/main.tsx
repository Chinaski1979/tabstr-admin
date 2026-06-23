import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";

import App from "@/App";
import { AuthProvider } from "@/providers/AuthProvider";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/sonner";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
