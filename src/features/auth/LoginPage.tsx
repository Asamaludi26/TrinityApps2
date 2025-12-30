


import React, { useState, useEffect } from 'react';
import { TrinitiLogoIcon } from '../../components/icons/TrinitiLogoIcon';
import { SpinnerIcon } from '../../components/icons/SpinnerIcon';
import { User } from '../../types';
import Modal from '../../components/ui/Modal';
import { UsersIcon } from '../../components/icons/UsersIcon';
import { DemoAccounts } from './components/DemoAccounts';
import { useAuthStore } from '../../stores/useAuthStore';
import { useUIStore } from '../../stores/useUIStore';
import { useNotification } from '../../providers/NotificationProvider';

interface LoginPageProps {
    onLogin: (email: string, pass: string) => Promise<User>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const loginStore = useAuthStore((state) => state.login);
    const requestReset = useAuthStore((state) => state.requestPasswordReset);
    const setActivePage = useUIStore((state) => state.setActivePage);
    const addNotification = useNotification();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Feature States
    const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    
    // Security: Rate Limiting State
    const [loginAttempts, setLoginAttempts] = useState(0);
    const [isLockedOut, setIsLockedOut] = useState(false);
    const [lockoutTimer, setLockoutTimer] = useState(0);

    useEffect(() => {
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        if (rememberedEmail) {
            setEmail(rememberedEmail);
            setRememberMe(true);
        }
    }, []);
    
    // Timer for Lockout
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (isLockedOut && lockoutTimer > 0) {
            timer = setInterval(() => {
                setLockoutTimer((prev) => prev - 1);
            }, 1000);
        } else if (lockoutTimer === 0) {
            setIsLockedOut(false);
            setLoginAttempts(0); // Reset attempts after lockout
        }
        return () => clearInterval(timer);
    }, [isLockedOut, lockoutTimer]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isLockedOut) return;

        setError('');

        if (!email.trim() || !password.trim()) {
            setError('Email dan kata sandi harus diisi.');
            return;
        }
        // Generic email regex check
        if (!/\S+@\S+\.\S+/.test(email)) {
            setError('Format email tidak valid.');
            return;
        }
        
        setIsLoading(true);

        if (rememberMe) {
            localStorage.setItem('rememberedEmail', email);
        } else {
            localStorage.removeItem('rememberedEmail');
        }

        try {
            await loginStore(email, password);
            setActivePage('dashboard');
            if (onLogin) await onLogin(email, password); 
        } catch (err: any) {
            // Security: Increase attempts on failure
            const newAttempts = loginAttempts + 1;
            setLoginAttempts(newAttempts);
            
            if (newAttempts >= 3) {
                setIsLockedOut(true);
                setLockoutTimer(30); // 30 seconds lockout
                setError('Terlalu banyak percobaan gagal. Silakan tunggu 30 detik.');
            } else {
                 // Security: Mask specific errors
                 const message = err.message || 'Gagal untuk login.';
                 if (message.includes('not found') || message.includes('Invalid credentials')) {
                      setError('Email atau kata sandi yang Anda masukkan salah.');
                 } else {
                      setError('Terjadi kesalahan pada server. Silakan coba lagi.');
                 }
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotEmail.trim() || !/\S+@\S+\.\S+/.test(forgotEmail)) {
            addNotification('Mohon masukkan email yang valid.', 'error');
            return;
        }
        
        setIsLoading(true);
        try {
            await requestReset(forgotEmail);
            // Security: Always show success message even if email doesn't exist (to prevent enumeration)
            addNotification('Jika email terdaftar, instruksi reset akan dikirimkan ke Admin.', 'success');
            setIsForgotModalOpen(false);
            setForgotEmail('');
        } catch (err) {
            addNotification('Gagal memproses permintaan reset.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
             <Modal
                isOpen={isDemoModalOpen}
                onClose={() => setIsDemoModalOpen(false)}
                title="Akun Uji Coba (Demo)"
                size="md"
            >
                <DemoAccounts />
            </Modal>
            
            <Modal
                isOpen={isForgotModalOpen}
                onClose={() => setIsForgotModalOpen(false)}
                title="Lupa Kata Sandi?"
                size="sm"
                hideDefaultCloseButton
            >
                <form onSubmit={handleForgotPassword} className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Masukkan alamat email akun Anda. Permintaan reset password akan dikirimkan ke Super Admin untuk ditinjau.
                    </p>
                    <div>
                        <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input 
                            type="email" 
                            id="forgot-email" 
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-tm-primary focus:ring focus:ring-tm-primary/50 sm:text-sm p-2 border"
                            placeholder="nama@triniti.com"
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setIsForgotModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                        <button type="submit" disabled={isLoading} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover disabled:opacity-70">
                            {isLoading && <SpinnerIcon className="w-4 h-4 mr-2" />} Kirim Permintaan
                        </button>
                    </div>
                </form>
            </Modal>

            <div className="flex items-center justify-center min-h-screen bg-tm-light px-4">
                <div className="w-full max-w-md">
                    <div className="flex flex-col items-center justify-center mb-8">
                        <TrinitiLogoIcon className="w-16 h-16 text-tm-primary" />
                        <h1 className="mt-4 text-3xl font-bold tracking-tight text-tm-dark">
                            Triniti<span className="font-light opacity-80">Asset</span>
                        </h1>
                        <p className="mt-1 text-gray-600">Sistem Manajemen Inventori Aset</p>
                    </div>

                    <div className="p-8 bg-white border border-gray-200/80 rounded-xl shadow-md animate-zoom-in">
                        <h2 className="text-xl font-semibold text-center text-gray-800">Selamat Datang</h2>
                        <p className="mt-1 text-sm text-center text-gray-500">Silakan masuk untuk melanjutkan</p>
                        
                        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                    Alamat Email
                                </label>
                                <div className="mt-1">
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full px-3 py-2 text-gray-900 placeholder-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-tm-accent focus:border-tm-accent sm:text-sm"
                                        placeholder="anda@triniti.com"
                                        disabled={isLockedOut}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password"className="block text-sm font-medium text-gray-700">
                                    Kata Sandi
                                </label>
                                <div className="mt-1">
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full px-3 py-2 text-gray-900 placeholder-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-tm-accent focus:border-tm-accent sm:text-sm"
                                        disabled={isLockedOut}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <label htmlFor="remember-me" className="flex items-center cursor-pointer select-none group">
                                    <div className="relative">
                                        <input
                                            id="remember-me"
                                            name="remember-me"
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            disabled={isLockedOut}
                                        />
                                        <div className="block w-10 h-6 bg-gray-200 rounded-full transition-colors peer-checked:bg-tm-primary group-hover:bg-gray-300 peer-checked:group-hover:bg-tm-primary-hover peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-tm-accent"></div>
                                        <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4"></div>
                                    </div>
                                    <span className="ml-3 text-sm text-gray-900">
                                        Ingat saya
                                    </span>
                                </label>

                                <div className="text-sm">
                                    <button type="button" onClick={() => setIsForgotModalOpen(true)} className="font-medium text-tm-primary hover:text-tm-primary-hover">
                                        Lupa kata sandi?
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 text-sm text-center text-red-700 bg-red-100 border-l-4 border-red-500 rounded-r-lg">
                                    {error}
                                </div>
                            )}

                            <div>
                                <button
                                    type="submit"
                                    disabled={isLoading || isLockedOut}
                                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-semibold text-white transition-all duration-200 border border-transparent rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tm-accent disabled:bg-tm-primary/70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <>
                                            <SpinnerIcon className="w-5 h-5 mr-2.5" />
                                            Memproses...
                                        </>
                                    ) : isLockedOut ? (
                                        `Tunggu ${lockoutTimer} detik`
                                    ) : (
                                        'Masuk'
                                    )}
                                </button>
                            </div>
                        </form>
                        <div className="mt-6 text-center">
                            <button
                                onClick={() => setIsDemoModalOpen(true)}
                                className="inline-flex items-center gap-2 text-sm font-medium text-tm-secondary hover:text-tm-primary"
                            >
                                <UsersIcon className="w-4 h-4" />
                                Lihat Akun Demo
                            </button>
                        </div>
                    </div>
                    <p className="mt-8 text-xs text-center text-gray-500">
                        &copy; {new Date().getFullYear()} PT. Triniti Media Indonesia. All rights reserved.
                    </p>
                </div>
            </div>
        </>
    );
};

export default LoginPage;