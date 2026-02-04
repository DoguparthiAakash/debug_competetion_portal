import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

import { Student, ContestStatus } from './src/utils/types';
import { loadState, saveState } from './src/utils/helpers';
import { AdminDashboard } from './src/components/AdminDashboard';
import { Registration } from './src/components/Registration';
import { TerminatedScreen } from './src/components/TerminatedScreen';
import { ResultScreen } from './src/components/ResultScreen';
import { Header } from './src/components/Header';
import { Instructions } from './src/components/Instructions';
import { Landing } from './src/components/Landing';
import { ContestEnvironment } from './src/components/ContestEnvironment';
import { SocketProvider, useSocket } from './src/utils/SocketContext';

const AppContent = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { socket, isConnected } = useSocket();

  // Initial Load
  useEffect(() => {
    const saved = loadState();
    if (saved) setStudent(saved);
  }, []);

  // Sync with Server (Register/Update)
  const studentRef = React.useRef(student);
  useEffect(() => { studentRef.current = student; }, [student]);

  useEffect(() => {
    if (!socket) return;

    if (isAdmin) {
      const handleConnect = () => socket.emit('admin_login');
      if (socket.connected) handleConnect();
      socket.on('connect', handleConnect);
      return () => { socket.off('connect', handleConnect); };
    } else {
      const register = () => {
        if (studentRef.current) {
          console.log('Registering/Re-registering student with server (Global)...');
          socket.emit('register_student', studentRef.current);
        }
      };

      if (socket.connected && student) register();

      socket.on('connect', register);
      // Also periodic sync just in case server restarts silently or drops validation
      const interval = setInterval(() => {
        if (socket.connected && studentRef.current) {
          socket.emit('register_student', studentRef.current);
        }
      }, 5000); // Pulse every 5 seconds to ensure visibility

      return () => {
        socket.off('connect', register);
        clearInterval(interval);
      };
    }
  }, [socket, isAdmin]); // Removed student/isConnected dependency here, managed via ref and connect event


  // Listen for Admin Commands
  useEffect(() => {
    if (!socket) return;

    const handler = (data: { command: string, payload: any }) => {
      console.log("Received Command:", data);
      if (data.command === 'force_terminate') {
        setStudent(prev => prev ? ({ ...prev, contestStatus: 'TERMINATED', violationAttempts: 99, isDisqualified: true }) : null);
      }
      // Handle other commands (add_time etc) if implemented in backend fully
      // But currently backend just emits command. Frontend needs to handle logic.
    };

    socket.on('command_received', handler);
    return () => { socket.off('command_received', handler); };
  }, [socket]);


  const updateStudent = (s: Student) => {
    setStudent(s);
    saveState(s);
    // Real-time Sync
    if (socket && isConnected) {
      // socket.emit('update_progress', s); // Deprecated: Let backend handle updates via API calls or specific events?
      // Actually keeping it for now if backend listens to it, but backend server.js likely doesn't have 'update_progress' listener 
      // based on my memory. It has 'register_student'. 
      // Let's check server.js later. For now, we rely on API calls for critical updates.
    }
  };

  const [showRegister, setShowRegister] = useState(false);

  // ... (keep existing effects)

  const handleAdminLogin = () => setIsAdmin(true);

  if (isAdmin) {
    return <AdminDashboard
      student={student}
      onExit={() => setIsAdmin(false)}
      onUpdateStudent={updateStudent}
      onUnlock={() => {
        if (student) {
          const updated = { ...student, contestStatus: 'ACTIVE' as ContestStatus, violationAttempts: 0, isDisqualified: false };
          updateStudent(updated);
          setIsAdmin(false);
        }
      }}
      onReset={() => {
        if (confirm("Are you sure? This will delete all student data.")) {
          localStorage.removeItem('contest_state');
          setStudent(null);
          setIsAdmin(false);
          setShowRegister(false);
        }
      }}
    />;
  }

  if (!student) {
    if (showRegister) {
      return <Registration onRegister={updateStudent} onAdminLogin={handleAdminLogin} />;
    }
    return <Landing onEnter={() => setShowRegister(true)} onAdmin={handleAdminLogin} />;
    // Registration has onAdminLogin. Landing has onAdmin. 
    // Let's pass handleAdminLogin to Landing if we want direct admin access. 
  }

  if (student.contestStatus === 'TERMINATED') {
    return <TerminatedScreen student={student} onReturnHome={() => setStudent(null)} />; // Need to reset student to go home? or just refresh?
  }

  if (student.contestStatus === 'SUBMITTED') {
    return <ResultScreen student={student} />;
  }

  if (student.contestStatus === 'INSTRUCTIONS' || student.contestStatus === 'REGISTERING') { // Handle REGISTERING status if leftover
    return (
      <>
        <Header student={student} onLogout={() => setStudent(null)} />
        <Instructions round={student.currentRound} onStart={() => {
          // Enter fullscreen
          document.documentElement.requestFullscreen().catch(() => { });
          const updated = { ...student, contestStatus: 'ACTIVE' as ContestStatus };
          updateStudent(updated);
        }} />
      </>
    );
  }

  return <ContestEnvironment student={student} updateStudent={updateStudent} onAdminLogin={handleAdminLogin} />;
};

const App = () => (
  <SocketProvider>
    <AppContent />
  </SocketProvider>
);

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
