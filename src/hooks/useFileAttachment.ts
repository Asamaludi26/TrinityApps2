
import { useState, useEffect, useCallback } from 'react';
import { validateFile, fileToBase64, FileValidationError } from '../utils/fileUtils';
import { Attachment } from '../types';
import { generateUUID } from '../utils/uuid';

export interface FileWithPreview {
    id: string;
    file: File;
    previewUrl: string;
}

export const useFileAttachment = (initialAttachments: File[] = []) => {
    const [files, setFiles] = useState<FileWithPreview[]>([]);
    const [errors, setErrors] = useState<string[]>([]);

    // Cleanup memory saat unmount
    useEffect(() => {
        return () => {
            files.forEach(f => URL.revokeObjectURL(f.previewUrl));
        };
    }, []);

    const addFiles = useCallback((newFiles: File[]) => {
        const validFiles: FileWithPreview[] = [];
        const newErrors: string[] = [];

        newFiles.forEach(file => {
            const error = validateFile(file);
            if (error) {
                newErrors.push(error);
            } else {
                validFiles.push({
                    id: generateUUID(),
                    file,
                    previewUrl: URL.createObjectURL(file) // Untuk preview UI saja
                });
            }
        });

        if (newErrors.length > 0) {
            setErrors(prev => [...prev, ...newErrors]);
            // Clear errors after 5 seconds
            setTimeout(() => setErrors([]), 5000);
        }

        setFiles(prev => [...prev, ...validFiles]);
    }, []);

    const removeFile = useCallback((id: string) => {
        setFiles(prev => {
            const target = prev.find(f => f.id === id);
            if (target) URL.revokeObjectURL(target.previewUrl); // Prevent memory leak
            return prev.filter(f => f.id !== id);
        });
    }, []);

    const clearFiles = useCallback(() => {
        files.forEach(f => URL.revokeObjectURL(f.previewUrl));
        setFiles([]);
        setErrors([]);
    }, [files]);

    // Fungsi untuk mengubah state internal menjadi format Attachment yang siap simpan (Base64)
    const processAttachmentsForSubmit = useCallback(async (): Promise<Attachment[]> => {
        const processed = await Promise.all(files.map(async (f) => {
            const base64 = await fileToBase64(f.file);
            return {
                id: Date.now() + Math.random(), // ID numerik untuk kompatibilitas tipe Attachment
                name: f.file.name,
                url: base64, // Simpan Base64 agar persist di LocalStorage
                type: f.file.type.startsWith('image/') ? 'image' : 'pdf'
            };
        }));
        return processed;
    }, [files]);

    return {
        files,
        errors,
        addFiles,
        removeFile,
        clearFiles,
        processAttachmentsForSubmit
    };
};
