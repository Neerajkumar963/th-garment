import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { OrderManagement } from "./components/OrderManagement";
import { ProductionBoard } from "./components/ProductionBoard";
import { Inventory } from "./components/Inventory";
import { ClientManagement } from "./components/ClientManagement";
import { ItemsMaster } from "./components/ItemsMaster";
import { Sales } from "./components/Sales";
import { Cutting } from "./components/Cutting";
import { Employees } from "./components/Employees";
import { Attendance } from "./components/Attendance";
import { Accounts } from "./components/Accounts";
import { Analytics } from "./components/Analytics";
import { Fabricator } from "./components/Fabricator";
import { Login } from "./components/Login";
import { useAuth } from "../contexts/AuthContext";
import { Toaster } from 'react-hot-toast';
import { UserMenu } from "./components/UserMenu";


function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "fabric-stock":
        return <Inventory />;
      case "items-master":
        return <ItemsMaster />;
      case "clients":
        return <ClientManagement />;
      case "orders":
        return <OrderManagement />;
      case "sales":
        return <Sales />;
      case "cutting":
        return <Cutting />;
      case "processing":
        return <ProductionBoard />;
      case "fabricator":
        return <Fabricator />;
      case "employees":
        return <Employees />;
      case "attendance":
        return <Attendance />;
      case "accounts":
        return <Accounts />;
      case "analytics":
        return <Analytics />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Toaster position="top-right" reverseOrder={false} />
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex-1 overflow-auto relative">
        {currentPage === "dashboard" && <UserMenu />}
        {renderPage()}
      </div>
    </div>
  );
}

export default App;
