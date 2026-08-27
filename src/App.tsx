// Root component — immediately.run renders the default export of THIS file.
// Global CSS is imported here (not in main.tsx) because immediately.run's
// runtime never loads main.tsx; anything the rendered tree needs must be
// reachable from App.tsx.
import './index.css';
import './App.css';
import { useCalendar } from './hooks/useCalendar';
import Splash from './components/Splash';
import StoreChooser from './components/StoreChooser';
import CalendarShell from './components/CalendarShell';
import Notice from './components/Notice';

function App() {
  const cal = useCalendar();
  return (
    <div className="app">
      {cal.phase === 'booting' && <Splash />}
      {cal.phase === 'choose' && (
        <StoreChooser
          onCreate={cal.createShared}
          onOpen={cal.openShared}
          onPrivate={cal.usePrivate}
          canGoBack={cal.store !== null}
          onBack={cal.reload}
        />
      )}
      {cal.phase === 'ready' && <CalendarShell cal={cal} />}
      {cal.notice && <Notice text={cal.notice} onClose={() => cal.setNotice(null)} />}
    </div>
  );
}

export default App;
