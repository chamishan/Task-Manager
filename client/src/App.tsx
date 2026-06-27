import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import TasksList from "@/pages/TasksList";
import TaskDetail from "@/pages/TaskDetail";
import Board from "@/pages/Board";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tasks" element={<TasksList />} />
          <Route path="/tasks/:id" element={<TaskDetail />} />
          <Route path="/board" element={<Board />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/tasks" replace />} />
    </Routes>
  );
}
