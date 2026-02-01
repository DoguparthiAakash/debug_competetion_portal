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
  useEffect(() => {
    if (socket && isConnected) {
      if (isAdmin) {
        socket.emit('admin_login');
      } else if (student) {
        // First time register? Or just always update last seen
        socket.emit('register_student', student);
      }
    }
  }, [socket, isConnected, student, isAdmin]);


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
