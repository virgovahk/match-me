import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./components/Login";
import ProfileForm from "./components/ProfileForm";
import ProfileView from "./components/ProfileView";
import OtherProfileView from "./components/OtherProfileView";
import RecommendationsPage from "./recommendation/RecommendationPage";
import PendingRequestsPage from "./connections/PendingRequestsPage";
import ConnectionsPage from "./connections/ConnectionsPage";
import ChatListPage from "./chat/ChatListPage";
import ChatViewPage from "./chat/ChatViewPage";
import { Header } from "./components/Header";
import socket from "./chat/socket";
import { getMyProfile } from "./api";

interface ProtectedRouteProps {
  element: React.ReactElement;
  isAuthenticated: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  element,
  isAuthenticated,
}) => {
  return isAuthenticated ? element : <Navigate to="/login" />;
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogout = () => {
    socket.disconnect();
    setIsAuthenticated(false);
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await getMyProfile();
        setIsAuthenticated(true);
        socket.connect();
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <Router>
      {isAuthenticated && <Header onLogout={handleLogout} />}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: isAuthenticated ? "0 2rem" : "0" }}>
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/profile" />
              ) : (
                <Login onLoginSuccess={() => setIsAuthenticated(true)} />
              )
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute
                isAuthenticated={isAuthenticated}
                element={<ProfileView />}
              />
            }
          />
          <Route
            path="/edit-profile"
            element={
              <ProtectedRoute
                isAuthenticated={isAuthenticated}
                element={
                  <ProfileForm
                    onProfileCreated={() => setIsAuthenticated(true)}
                  />
                }
              />
            }
          />
          <Route
            path="/recommendations"
            element={
              <ProtectedRoute
                isAuthenticated={isAuthenticated}
                element={<RecommendationsPage />}
              />
            }
          />
          <Route
            path="/requests"
            element={
              <ProtectedRoute
                isAuthenticated={isAuthenticated}
                element={<PendingRequestsPage />}
              />
            }
          />
          <Route
            path="/connections"
            element={
              <ProtectedRoute
                isAuthenticated={isAuthenticated}
                element={<ConnectionsPage />}
              />
            }
          />
          <Route
            path="/chats"
            element={
              <ProtectedRoute
                isAuthenticated={isAuthenticated}
                element={<ChatListPage />}
              />
            }
          />
          <Route
            path="/chats/:chatId"
            element={
              <ProtectedRoute
                isAuthenticated={isAuthenticated}
                element={<ChatViewPage />}
              />
            }
          />
          <Route
            path="/users/:id"
            element={
              <ProtectedRoute
                isAuthenticated={isAuthenticated}
                element={<OtherProfileView />}
              />
            }
          />
          <Route
            path="*"
            element={
              <Navigate to={isAuthenticated ? "/profile" : "/login"} />
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
