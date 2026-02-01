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
        setStudent(prev => prev ? ({ ...prev, contestStatus: 'TERMINATED', violationCount: 99 }) : null);
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
      socket.emit('update_progress', s);
    }
  };

  const handleAdminLogin = () => setIsAdmin(true);

  if (isAdmin) {
    return <AdminDashboard
      student={student}
      onExit={() => setIsAdmin(false)}
      onUpdateStudent={updateStudent}
      onUnlock={() => {
        if (student) {
          const updated = { ...student, contestStatus: 'ACTIVE' as ContestStatus, violationCount: 0 };
          updateStudent(updated);
          setIsAdmin(false);
        }
      }}
      onReset={() => {
        if (confirm("Are you sure? This will delete all student data.")) {
          localStorage.removeItem('contest_state');
          setStudent(null);
          setIsAdmin(false);
        }
      }}
    />;
  }

  if (!student) return <Registration onRegister={updateStudent} onAdminLogin={handleAdminLogin} />;

  if (student.contestStatus === 'TERMINATED') {
    return <TerminatedScreen reason="Multiple violations of full-screen protocol detected." onAdminLogin={handleAdminLogin} />;
  }

  if (student.contestStatus === 'SUBMITTED') {
    return <ResultScreen student={student} onAdminLogin={handleAdminLogin} />;
  }

  if (student.contestStatus === 'INSTRUCTIONS') {
    return (
      <>
        <Header onAdminLogin={handleAdminLogin} />
        <Instructions onStart={() => {
          // Enter fullscreen
          document.documentElement.requestFullscreen().catch(() => { });
          updateStudent({ ...student, contestStatus: 'ACTIVE' });
        }} onAdminLogin={handleAdminLogin} />
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
