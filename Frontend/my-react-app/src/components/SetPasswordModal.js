// Frontend/my-react-app/src/components/SetPasswordModal.js
import React, { useState } from 'react';
import '../styles/SetPasswordModal.css'; // Create this CSS file

// Accept modalError prop to display error from parent
const SetPasswordModal = ({ user, onSetPassword, onClose, modalError }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        // setSetPasswordModalError(''); // Clear error before action (Parent handles this now)
        setLoading(true);

        // Basic frontend validation before sending to parent
        if (!newPassword || !confirmPassword) {
             onSetPassword(user.id, { error: "Wszystkie pola hasła są wymagane." }); // Pass error back to parent
             setLoading(false);
             return;
        }
        if (newPassword !== confirmPassword) {
             onSetPassword(user.id, { error: "Hasła nie są identyczne." }); // Pass error back to parent
             setLoading(false);
             return;
        }
         // Optional: add basic frontend length check
        if (newPassword.length < 8) {
             onSetPassword(user.id, { error: "Hasło musi mieć co najmniej 8 znaków." }); // Pass error back to parent
             setLoading(false);
             return;
        }

        // Call the onSetPassword prop function, which handles the API call and error state in parent
        // Parent handler will call setLoading(false) and onClose() on success/failure
        await onSetPassword(user.id, { new_password: newPassword, confirm_password: confirmPassword });

        // Loading is turned off by the parent handler after the API call finishes (either success or error)
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose}>×</button>
                <h2 className="modal-title">Ustaw hasło dla: {user.username}</h2>
                <div className="modal-body">
                     {/* Display error message passed from parent's state */}
                     {modalError && <div className="error-message">{modalError}</div>}

                    <form onSubmit={handleSubmit} className="set-password-form">
                        <div className="form-group">
                            <label htmlFor="new-password">Nowe hasło</label>
                            <input
                                type="password"
                                id="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="form-input"
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="confirm-password">Potwierdź hasło</label>
                            <input
                                type="password"
                                id="confirm-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="form-input"
                                required
                                disabled={loading}
                            />
                        </div>
                        <button type="submit" className="button" disabled={loading}>
                            {loading ? 'Zapisywanie...' : 'Zapisz nowe hasło'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SetPasswordModal;