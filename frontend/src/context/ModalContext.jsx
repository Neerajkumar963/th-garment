import { createContext, useContext, useState, useCallback } from 'react';
import ConfirmModal from '../components/ConfirmModal';

const ModalContext = createContext();

export function ModalProvider({ children }) {
    const [modalConfig, setModalConfig] = useState(null);

    const showConfirm = useCallback((message, onConfirm, title = 'Confirm Action') => {
        setModalConfig({
            message,
            onConfirm: async () => {
                await onConfirm();
                setModalConfig(null);
            },
            title
        });
    }, []);

    const hideConfirm = useCallback(() => {
        setModalConfig(null);
    }, []);

    return (
        <ModalContext.Provider value={{ showConfirm }}>
            {children}
            {modalConfig && (
                <ConfirmModal
                    isOpen={true}
                    onClose={hideConfirm}
                    onConfirm={modalConfig.onConfirm}
                    message={modalConfig.message}
                    title={modalConfig.title}
                />
            )}
        </ModalContext.Provider>
    );
}

export function useModal() {
    return useContext(ModalContext);
}
