
export const MAX_FILE_SIZE_MB = 0.5; // Diturunkan ke 500KB agar aman untuk LocalStorage Mock
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

export interface FileValidationError {
    file: File;
    error: string;
}

export const validateFile = (file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return `Tipe file ${file.name} tidak didukung. Hanya JPG, PNG, dan PDF.`;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        return `Ukuran file ${file.name} terlalu besar (Max ${MAX_FILE_SIZE_MB}MB untuk demo).`;
    }
    return null;
};

// Konversi File ke Base64 agar bisa disimpan di LocalStorage (Mock Persistence)
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

/**
 * Membuka lampiran (URL atau Base64) di tab baru dengan aman.
 * Mengatasi masalah "Not allowed to navigate top frame to data URL" di Chrome.
 */
export const viewAttachment = async (url: string, fileName: string) => {
    // Jika URL biasa (bukan base64), buka langsung
    if (!url.startsWith('data:')) {
        window.open(url, '_blank');
        return;
    }

    try {
        // Konversi Base64 Data URL menjadi Blob
        const res = await fetch(url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        // Buka Blob URL (Aman di semua browser)
        const newTab = window.open(blobUrl, '_blank');
        
        // Fallback jika popup blocker aktif
        if (!newTab) {
            alert('Pop-up diblokir. Izinkan pop-up untuk melihat lampiran.');
        }

        // Cleanup memori setelah 1 menit (asumsi user sudah melihat)
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (e) {
        console.error("Gagal membuka lampiran:", e);
        alert("Gagal membuka file. Format data mungkin rusak.");
    }
};
