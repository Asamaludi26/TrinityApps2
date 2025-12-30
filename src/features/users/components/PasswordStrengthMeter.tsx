
import React from 'react';

interface PasswordStrengthProps {
    passwordStrength: { score: number; label: string; color: string; };
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthProps> = ({ passwordStrength }) => {
    if (passwordStrength.score === 0) {
        return null;
    }

    return (
        <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${passwordStrength.score * 25}%` }}
                ></div>
            </div>
            <span className={`text-xs font-semibold w-20 text-right ${
                passwordStrength.score <= 1 ? 'text-red-500' :
                passwordStrength.score === 2 ? 'text-orange-500' :
                passwordStrength.score === 3 ? 'text-blue-500' :
                'text-green-500'
            }`}>
                {passwordStrength.label}
            </span>
        </div>
    );
};
