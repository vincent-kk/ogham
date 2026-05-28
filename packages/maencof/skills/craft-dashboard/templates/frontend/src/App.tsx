import { HeaderBar } from './components/HeaderBar';
import { StaleBanner } from './components/StaleBanner';
import { Dashboard } from './pages/Dashboard';

export function App() {
  return (
    <div className="app">
      <HeaderBar />
      <StaleBanner />
      <Dashboard />
    </div>
  );
}
