import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Trades from "./pages/Trades";
import Courses from "./pages/Courses";
import Batches from "./pages/Batches";
import BatchDetail from "./pages/BatchDetail";
import Students from "./pages/Students";
import Applications from "./pages/Applications";
import Attendance from "./pages/Attendance";
import LiveClasses from "./pages/LiveClasses";
import LiveRoom from "./pages/LiveRoom";
import Certificates from "./pages/Certificates";
import Payments from "./pages/Payments";
import Invoice from "./pages/Invoice";
import Certificate from "./pages/Certificate";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/app" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/app/trades" element={<ProtectedRoute><Trades /></ProtectedRoute>} />
            <Route path="/app/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
            <Route path="/app/batches" element={<ProtectedRoute><Batches /></ProtectedRoute>} />
            <Route path="/app/batches/:id" element={<ProtectedRoute><BatchDetail /></ProtectedRoute>} />
            <Route path="/app/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
            <Route path="/app/applications" element={<ProtectedRoute><Applications /></ProtectedRoute>} />
            <Route path="/app/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
            <Route path="/app/live" element={<ProtectedRoute><LiveClasses /></ProtectedRoute>} />
            <Route path="/app/live/:id" element={<ProtectedRoute><LiveRoom /></ProtectedRoute>} />
            <Route path="/app/certificates" element={<ProtectedRoute><Certificates /></ProtectedRoute>} />
            <Route path="/app/certificates/:id" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />
            <Route path="/app/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
            <Route path="/app/payments/:id" element={<ProtectedRoute><Invoice /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
