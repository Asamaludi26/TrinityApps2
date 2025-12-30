
import React from 'react';
import { User } from '../../types';
import FormPageLayout from '../../components/layout/FormPageLayout';
import { SpinnerIcon } from '../../components/icons/SpinnerIcon';
import { UserIcon } from '../../components/icons/UserIcon';
import { EnvelopeIcon } from '../../components/icons/EnvelopeIcon';
import { LockIcon } from '../../components/icons/LockIcon';
import { EyeIcon } from '../../components/icons/EyeIcon';
import { EyeSlashIcon } from '../../components/icons/EyeSlashIcon';
import { CheckIcon } from '../../components/icons/CheckIcon';
import { CloseIcon } from '../../components/icons/CloseIcon';
import { useManageAccountLogic } from './hooks/useManageAccountLogic';
import { PasswordStrengthMeter } from './components/PasswordStrengthMeter';

interface ManageAccountPageProps {
    currentUser: User;
    onBack: () => void;
}

const FormSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="pt-6 border-t border-gray-200 first:pt-0 first:border-t-0">
        <div className="flex items-center mb-4">
            {icon}
            <h3 className="text-lg font-semibold text-tm-dark">{title}</h3>
        </div>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const CheckListItem: React.FC<{ met: boolean; text: React.ReactNode }> = ({ met, text }) => (
    <li className={`flex items-start gap-2 transition-colors ${met ? 'text-green-700' : 'text-gray-500'}`}>
       {met
           ? <CheckIcon className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
           : <CloseIcon className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" />}
       <span>{text}</span>
   </li>
);

const ManageAccountPage: React.FC<ManageAccountPageProps> = ({ currentUser, onBack }) => {
    const {
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
    } = useManageAccountLogic({ currentUser });

    return (
        <FormPageLayout title="Kelola Akun Saya">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8">
                <FormSection title="Profil" icon={<UserIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
                     <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="block w-full px-3 py-2 mt-1 bg-gray-50 border border-gray-300 text-sm text-gray-700 rounded-lg shadow-sm" />
                        {nameError && <p className="mt-1 text-xs text-danger-text">{nameError}</p>}
                    </div>
                     <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Alamat Email</label>
                        <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required className="block w-full px-3 py-2 mt-1 bg-gray-50 border border-gray-300 text-sm text-gray-700 rounded-lg shadow-sm" />
                        {emailError && <p className="mt-1 text-xs text-danger-text">{emailError}</p>}
                    </div>
                </FormSection>

                <FormSection title="Ubah Kata Sandi" icon={<LockIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
                    <p className="text-sm text-gray-500 -mt-2">Kosongkan jika Anda tidak ingin mengubah kata sandi.</p>
                    <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">Kata Sandi Saat Ini</label>
                        <div className="relative mt-1">
                            <input type={passwordVisibility.current ? 'text' : 'password'} id="currentPassword" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="block w-full px-3 py-2 pr-10 bg-gray-50 border border-gray-300 text-sm text-gray-700 rounded-lg shadow-sm" />
                            <button type="button" onClick={() => setPasswordVisibility(p => ({...p, current: !p.current}))} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-tm-primary">
                                {passwordVisibility.current ? <EyeSlashIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Kata Sandi Baru</label>
                        <div className="relative mt-1">
                            <input type={passwordVisibility.new ? 'text' : 'password'} id="newPassword" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="block w-full px-3 py-2 pr-10 bg-gray-50 border border-gray-300 text-sm text-gray-700 rounded-lg shadow-sm" />
                            <button type="button" onClick={() => setPasswordVisibility(p => ({...p, new: !p.new}))} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-tm-primary">
                                {passwordVisibility.new ? <EyeSlashIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
                            </button>
                        </div>
                        {newPassword && <PasswordStrengthMeter passwordStrength={passwordStrength} />}
                        {newPassword && (
                            <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 space-y-1">
                                <p className="font-semibold text-gray-700 mb-2">Kata sandi harus memenuhi kriteria berikut:</p>
                                <ul className="space-y-1.5">
                                    <CheckListItem met={passwordChecks.length} text="Minimal 8 karakter." />
                                    <CheckListItem met={passwordChecks.upperLower} text="Kombinasi huruf besar dan kecil." />
                                    <CheckListItem met={passwordChecks.number} text="Sertakan setidaknya satu angka." />
                                    <CheckListItem met={passwordChecks.symbol} text={<span>Sertakan setidaknya satu simbol (<code>!@#$%^&*...</code>).</span>} />
                                    <CheckListItem met={passwordChecks.noSpaces} text="Tidak boleh mengandung spasi." />
                                     <CheckListItem met={passwordChecks.onlyAllowed} text={<span>Hanya menggunakan simbol yang diizinkan: <code className="break-all">{allowedSymbols}</code></span>} />
                                </ul>
                            </div>
                        )}
                    </div>
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Konfirmasi Kata Sandi Baru</label>
                         <div className="relative mt-1">
                            <input type="text" id="confirmPassword" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="block w-full px-3 py-2 pr-10 bg-gray-50 border border-gray-300 text-sm text-gray-700 rounded-lg shadow-sm" />
                             {/* Note: The mock functionality doesn't strictly hide confirm password but logic implies it should match new password type */}
                        </div>
                    </div>
                    {passwordError && <p className="mt-1 text-xs text-danger-text">{passwordError}</p>}
                </FormSection>
                
                <div className="flex justify-end pt-5 space-x-3 border-t">
                    <button type="button" onClick={onBack} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
                        Kembali
                    </button>
                    <button type="submit" disabled={isLoading} className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover disabled:bg-tm-primary/70">
                        {isLoading && <SpinnerIcon className="w-5 h-5 mr-2"/>}
                        Simpan Perubahan
                    </button>
                </div>
            </form>
        </FormPageLayout>
    );
};

export default ManageAccountPage;
