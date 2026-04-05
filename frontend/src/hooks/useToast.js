import { useState, useCallback } from 'react';

export const useToast = () => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now();
        const toast = { id, message, type };

        setToasts((prev) => [...prev, toast]);

        if (duration) {
            const timer = setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, duration);
            return () => clearTimeout(timer);
        }

        return () => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        };
    }, []);

    const success = useCallback((message, duration) => showToast(message, 'success', duration), [showToast]);
    const error = useCallback((message, duration) => showToast(message, 'error', duration), [showToast]);
    const warning = useCallback((message, duration) => showToast(message, 'warning', duration), [showToast]);
    const info = useCallback((message, duration) => showToast(message, 'info', duration), [showToast]);

    return { toasts, showToast, success, error, warning, info };
};