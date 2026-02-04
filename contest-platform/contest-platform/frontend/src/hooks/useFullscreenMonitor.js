import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useFullscreenMonitor
 * 
 * Custom hook to monitor fullscreen status and detect violations.
 * Automatically enters fullscreen when enabled and tracks violations
 * like exiting fullscreen, tab switching, and window blur.
 * 
 * @param {boolean} isEnabled - Whether monitoring is active
 * @param {function} onViolation - Callback when violation is detected
 * @param {object} student - Student object with rollNumber
 * @returns {object} - { enterFullscreen, exitFullscreen, isFullscreen, violationCount, showWarning, warningMessage }
 */
export function useFullscreenMonitor(isEnabled, onViolation, student) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [violationCount, setViolationCount] = useState(0);
    const [showWarning, setShowWarning] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const lastViolationTime = useRef(0);
    const isMonitoring = useRef(false);

    // Enter fullscreen
    const enterFullscreen = useCallback(async () => {
        try {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                await elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                await elem.msRequestFullscreen();
            }
        } catch (err) {
            console.error('Failed to enter fullscreen:', err);
        }
    }, []);

    // Exit fullscreen
    const exitFullscreen = useCallback(async () => {
        try {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                await document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                await document.msExitFullscreen();
            }
        } catch (err) {
            console.error('Failed to exit fullscreen:', err);
        }
    }, []);

    // Log violation to backend
    const logViolation = useCallback(async (violationType) => {
        if (!student?.rollNumber || !onViolation) return;

        // Debounce violations (max 1 per 2 seconds)
        const now = Date.now();
        if (now - lastViolationTime.current < 2000) return;
        lastViolationTime.current = now;

        try {
            await onViolation(violationType);
            setViolationCount(prev => prev + 1);
        } catch (err) {
            console.error('Failed to log violation:', err);
        }
    }, [student, onViolation]);

    // Show warning message
    const displayWarning = useCallback((message) => {
        setWarningMessage(message);
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 5000); // Hide after 5 seconds
    }, []);

    // Handle fullscreen change
    useEffect(() => {
        if (!isEnabled) return;

        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.msFullscreenElement
            );

            setIsFullscreen(isCurrentlyFullscreen);

            // If monitoring is active and user exited fullscreen
            if (isMonitoring.current && !isCurrentlyFullscreen) {
                logViolation('exit_fullscreen');
                displayWarning('⚠️ Warning: You have exited fullscreen.');
                // Re-enter fullscreen after a short delay
                setTimeout(() => enterFullscreen(), 1000);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('msfullscreenchange', handleFullscreenChange);
        };
    }, [isEnabled, logViolation, displayWarning, enterFullscreen]);

    // Handle tab switching and window blur
    useEffect(() => {
        if (!isEnabled || !isMonitoring.current) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                logViolation('tab_switch');
                displayWarning('⚠️ Warning: You switched tabs or minimized the window.');
            }
        };

        const handleWindowBlur = () => {
            logViolation('window_blur');
            displayWarning('⚠️ Warning: You switched to another application.');
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleWindowBlur);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleWindowBlur);
        };
    }, [isEnabled, logViolation, displayWarning]);

    // Start monitoring
    const startMonitoring = useCallback(() => {
        isMonitoring.current = true;
        enterFullscreen();
    }, [enterFullscreen]);

    // Stop monitoring
    const stopMonitoring = useCallback(() => {
        isMonitoring.current = false;
        exitFullscreen();
    }, [exitFullscreen]);

    return {
        enterFullscreen,
        exitFullscreen,
        isFullscreen,
        violationCount,
        showWarning,
        warningMessage,
        startMonitoring,
        stopMonitoring
    };
}
