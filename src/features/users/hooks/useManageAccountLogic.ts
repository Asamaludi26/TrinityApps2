
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User } from '../../../types';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useMasterDataStore } from '../../../stores/useMasterDataStore';
import { useNotification } from '../../../providers/NotificationProvider';
import * as api from '../../../services/api';

interface UseManageAccountLogicProps {
    currentUser: User;
}

export const useManageAccountLogic = ({ currentUser }: UseManageAccountLogicProps) => {
    const updateCurrentUserStore = useAuthStore((state) => state.updateCurrentUser);
    const addNotification = useNotification();
    
    // Refs for cleanup
    const isMounted = useRef(true);
    
    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    const [name, setName] = useState(currentUser.name);
    const [email, setEmail] = useState(currentUser.email);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [nameError, setNameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const [passwordVisibility, setPasswordVisibility] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    const [isLoading, setIsLoading] = useState(false);

    const allowedSymbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    const allowedSymbolsRegex = new RegExp(`^[a-zA-Z0-9${allowedSymbols.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}]+$`);

    const passwordChecks = useMemo(() => {
        const password = newPassword;
        return {
            length: password.length >= 8,
            upperLower: /[A-Z]/.test(password) && /[a-z]/.test(password),
            number: /\d/.test(password),
            symbol: new RegExp(`[${allowedSymbols.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}]`).test(password),
            noSpaces: !/\s/.test(password),
            onlyAllowed: password === '' || allowedSymbolsRegex.test(password),
        };
    }, [newPassword, allowedSymbolsRegex]);

    const passwordStrength = useMemo(() => {
        const checks = passwordChecks;
        if (!newPassword) return { score: 0, label: '', color: '' };
        
        let score = 0;
        if (checks.length) score++;
        if (checks.upperLower) score++;
        if (checks.number) score++;
        if (checks.symbol) score++;

        if (!checks.noSpaces || !checks.onlyAllowed) return { score: 1, label: 'Error', color: 'bg-red-500' };
        if (score === 0 && newPassword.length > 0) return { score: 1, label: 'Lemah', color: 'bg-red-500' };

        if (score === 1) return { score: 1, label: 'Lemah', color: 'bg-red-500' };
        if (score === 2) return { score: 2, label: 'Sedang', color: 'bg-orange-500' };
        if (score === 3) return { score: 3, label: 'Kuat', color: 'bg-blue-500' };
        if (score >= 4) return { score: 4, label: 'Sangat Kuat', color: 'bg-green-500' };
        return { score: 0, label: '', color: '' };
    }, [newPassword, passwordChecks]);

    const validate = () => {
        let isValid = true;
        setNameError('');
        setEmailError('');
        setPasswordError('');

        if (name.trim().length < 3) {
            setNameError('Nama harus memiliki minimal 3 karakter.');
            isValid = false;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setEmailError('Format email tidak valid.');
            isValid = false;
        }

        if (isValid && (currentPassword || newPassword || confirmPassword)) {
            if (!currentPassword) {
                setPasswordError('Kata sandi saat ini harus diisi untuk mengatur kata sandi baru.');
                isValid = false;
            } else if (!newPassword) {
                setPasswordError('Kata sandi baru harus diisi.');
                isValid = false;
            } else if (!passwordChecks.length) {
                setPasswordError('Kata sandi baru harus memiliki minimal 8 karakter.');
                isValid = false;
            } else if (!passwordChecks.upperLower) {
                setPasswordError('Kata sandi baru harus mengandung kombinasi huruf besar dan kecil.');
                isValid = false;
            } else if (!passwordChecks.number) {
                setPasswordError('Kata sandi baru harus mengandung setidaknya satu angka.');
                isValid = false;
            } else if (!passwordChecks.symbol) {
                setPasswordError('Kata sandi baru harus mengandung setidaknya satu simbol.');
                isValid = false;
            } else if (!passwordChecks.noSpaces) {
                setPasswordError('Kata sandi baru tidak boleh mengandung spasi.');
                isValid = false;
            } else if (!passwordChecks.onlyAllowed) {
                setPasswordError('Kata sandi baru mengandung simbol yang tidak diizinkan.');
                isValid = false;
            } else if (newPassword !== confirmPassword) {
                setPasswordError('Konfirmasi kata sandi baru tidak cocok.');
                isValid = false;
            }
        }
        
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            addNotification('Harap perbaiki error pada formulir.', 'error');
            return;
        }
        
        setIsLoading(true);

        // Simulasi network delay
        try {
             // In real app: await api.updateProfile(...)
             await new Promise(resolve => setTimeout(resolve, 800));

             if (!isMounted.current) return;

             const updatedUser = {
                ...currentUser,
                name: name,
                email: email,
            };
            
            updateCurrentUserStore(updatedUser);
            
            // Updating mock/local storage
            // FIX: updateData requires data object, not callback. Fetch current users first.
            const allUsers = useMasterDataStore.getState().users;
            const updatedUsersList = allUsers.map(u => u.id === currentUser.id ? updatedUser : u);
            await api.updateData('app_users', updatedUsersList);

            if (isMounted.current) {
                addNotification('Akun berhasil diperbarui.', 'success');
                setIsLoading(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch (error) {
            if (isMounted.current) {
                addNotification('Gagal memperbarui akun.', 'error');
                setIsLoading(false);
            }
        }
    };

    return {
        // State
        name, setName,
        email, setEmail,
        currentPassword, setCurrentPassword,
        newPassword, setNewPassword,
        confirmPassword, setConfirmPassword,
        passwordVisibility, setPasswordVisibility,
        isLoading,
        
        // Errors
        nameError, emailError, passwordError,
        
        // Logic Data
        passwordChecks,
        passwordStrength,
        allowedSymbols,
        
        // Actions
        handleSubmit
    };
};
