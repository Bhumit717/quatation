import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import History from "./pages/History";
import NotFound from "./pages/NotFound";

import { useEffect } from "react";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // If the active element is a number input, prevent the wheel event from changing its value
      if (document.activeElement &&
        document.activeElement instanceof HTMLInputElement &&
        document.activeElement.type === "number") {
        document.activeElement.blur(); // Blurring is the most reliable way across browsers
      }
    };

    window.addEventListener("wheel", handleWheel);
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/history" element={<History />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
