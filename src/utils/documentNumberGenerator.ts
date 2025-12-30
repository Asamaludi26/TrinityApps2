
/**
 * Menghasilkan nomor dokumen yang unik untuk tanggal tertentu.
 * 
 * Format Standard: PREFIX-YYMMDD-NNNN
 * 
 * Daftar Prefix:
 * - Request: RO (Order), RL (Loan), RR (Return)
 * - Handover: HO, HO-RO, HO-RL, HO-RR
 * - Work Order: WO-IKR (Instalasi), WO-MT (Maintenance), WO-DSM (Dismantle)
 * 
 * @param prefix Prefix untuk nomor dokumen.
 * @param existingDocs Array objek yang memiliki properti `docNumber`.
 * @param date Objek Date opsional. Jika tidak disediakan, akan menggunakan tanggal saat ini.
 * @returns Nomor dokumen baru yang unik untuk tanggal yang ditentukan.
 */
export const generateDocumentNumber = (
  prefix: string,
  // FIX: Allow docNumber to be optional to match the Request type. The implementation already safely handles this.
  existingDocs: { docNumber?: string }[],
  date: Date = new Date()
): string => {
  const d = new Date(date);
  
  // Format Seragam: PREFIX-YYMMDD-NNNN
  // Mencakup semua tipe dokumen utama
  const standardPrefixes = [
      'RO', 'RL', 'RR', 
      'HO', 'HO-RO', 'HO-RL', 'HO-RR', 
      'WO-IKR', 'WO-MT', 'WO-DSM'
  ];

  if (standardPrefixes.includes(prefix)) {
    const year = d.getFullYear().toString().slice(-2); // YY
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    
    // Format: YYMMDD
    const dateStr = `${year}${month}${day}`;

    const dayPrefix = `${prefix}-${dateStr}`;

    const dayDocs = existingDocs.filter(doc => 
      doc.docNumber && doc.docNumber.startsWith(dayPrefix)
    );

    const highestSequence = dayDocs.reduce((max, doc) => {
      const parts = doc.docNumber!.split('-');
      // Format: PREFIX-YYMMDD-NNNN (ambil bagian terakhir)
      const sequenceStr = parts[parts.length - 1];
      const sequence = parseInt(sequenceStr, 10);
      return !isNaN(sequence) && sequence > max ? sequence : max;
    }, 0);

    const newSequence = (highestSequence + 1).toString().padStart(4, '0');
    
    return `${dayPrefix}-${newSequence}`;
  }

  // Fallback untuk prefix lain (Format legacy: PREFIX-YYMMDD-XXX)
  const year = d.getFullYear().toString().slice(-2);
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const dayPrefix = `${prefix}-${dateStr}`;

  const dayDocs = existingDocs.filter(doc => 
    doc.docNumber && doc.docNumber.startsWith(dayPrefix)
  );

  const highestSequence = dayDocs.reduce((max, doc) => {
    const parts = doc.docNumber!.split('-');
    const sequenceStr = parts[parts.length - 1];
    const sequence = parseInt(sequenceStr, 10);
    return !isNaN(sequence) && sequence > max ? sequence : max;
  }, 0);

  const newSequence = (highestSequence + 1).toString().padStart(3, '0');
  
  return `${dayPrefix}-${newSequence}`;
};
