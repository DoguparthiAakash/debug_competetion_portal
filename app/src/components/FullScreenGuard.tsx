import React, { useEffect } from 'react';

interface FullScreenGuardProps {
    isActive: boolean;
    onViolation: () => void;
}

export const FullScreenGuard: React.FC<FullScreenGuardProps> = ({ isActive, onViolation }) => {
    useEffect(() => {
        if (!isActive) return;

        const enforce = () => {
            if (!document.fullscreenElement) {
                onViolation();
                // Try to re-enter (browser might block this without user gesture, but we try)
                // document.documentElement.requestFullscreen().catch(() => {});
            }
        };

        const handleVisibility = () => {
            if (document.hidden) onViolation();
        };

        document.addEventListener('fullscreenchange', enforce);
        document.addEventListener('visibilitychange', handleVisibility);

        // Initial entry
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error("Fullscreen request failed:", err);
                // We don't trigger violation here, we just wait for the user to interact or the enforcement loop
            });
        }

        return () => {
            document.removeEventListener('fullscreenchange', enforce);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [isActive, onViolation]);

    return null;
};
