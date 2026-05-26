import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/Layout/BottomNav';
import HomePage from './pages/HomePage';
import SplitwisePage from './pages/SplitwisePage';
import StatementsPage from './pages/StatementsPage';
import ReportsPage from './pages/ReportsPage';

export default function App() {
  return (
    <div className="max-w-md mx-auto relative min-h-screen bg-slate-950">
      <Routes>
        <Route path="/"           element={<HomePage />}     />
        <Route path="/splitwise"  element={<SplitwisePage />} />
        <Route path="/statements" element={<StatementsPage />} />
        <Route path="/reports"    element={<ReportsPage />}   />
      </Routes>
      <BottomNav />
    </div>
  );
}
