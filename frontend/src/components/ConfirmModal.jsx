import Modal from './Modal';
import Button from './Button';

export default function ConfirmModal({ isOpen, onClose, onConfirm, message, title = 'Confirm Action' }) {
    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={onConfirm}>
                        Confirm
                    </Button>
                </>
            }
        >
            <p className="text-muted" style={{ fontSize: '1.1rem' }}>
                {message}
            </p>
        </Modal>
    );
}
