import { useContext } from 'react';
import { AuthProvider, ThemeProvider, MeetingProvider, ToastProvider, useAuth, useMeeting } from '@/contexts';
import { ToastContext } from '@/contexts/ToastContext';
import { ToastContainer } from '@/components/ui/custom';
import { LoginPage, DashboardPage, LobbyPage, MeetingRoomPage } from '@/pages';
import './App.css';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const { isInMeeting, currentMeeting } = useMeeting();

  if (isInMeeting && currentMeeting) {
    return <MeetingRoomPage />;
  }

  if (currentMeeting && !isInMeeting) {
    return <LobbyPage />;
  }

  if (isAuthenticated) {
    return <DashboardPage />;
  }

  return <LoginPage />;
}

function ToastContainerWrapper() {
  const context = useContext(ToastContext);
  if (!context) {
    return null;
  }
  return <ToastContainer toasts={context.toasts} onRemove={context.removeToast} />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MeetingProvider>
          <ToastProvider>
            <AppContent />
            <ToastContainerWrapper />
          </ToastProvider>
        </MeetingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
