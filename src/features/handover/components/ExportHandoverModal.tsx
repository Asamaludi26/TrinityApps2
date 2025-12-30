
import React, { useState, useMemo, useEffect } from "react";
import { Handover, User, ItemStatus } from "../../../types";
import Modal from "../../../components/ui/Modal";
import { Avatar } from "../../../components/ui/Avatar";
import DatePicker from "../../../components/ui/DatePicker";
import { CustomSelect } from "../../../components/ui/CustomSelect";
import { 
  BsTable, 
  BsCalendarRange, 
  BsInfoCircleFill, 
  BsFileEarmarkText,
  BsFunnel,
  BsCheckCircle,
  BsBoxSeam,
  BsCloudDownload,
  BsClockHistory
} from "react-icons/bs";

interface ExportHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  data: Handover[];
  onConfirmExport: (mappedData: any[], filename: string, extraHeader: any) => void;
}

export const ExportHandoverModal: React.FC<ExportHandoverModalProps> = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  data, 
  onConfirmExport 
}) => {
  // --- STATE ---
  const [rangeType, setRangeType] = useState('month'); 
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('ALL'); 
  const [customFilename, setCustomFilename] = useState('');

  // --- OPTIONS ---
  const rangeOptions = [
    { value: 'today', label: 'Hari Ini' },
    { value: 'week', label: '7 Hari Terakhir' },
    { value: 'month', label: 'Bulan Berjalan' },
    { value: 'year', label: 'Tahun Berjalan' },
    { value: 'custom', label: 'Rentang Tanggal Kustom' },
    { value: 'all', label: 'Seluruh Database' },
  ];

  const statusOptions = [
    { value: 'ALL', label: 'Semua Status' },
    { value: ItemStatus.COMPLETED, label: 'Selesai (Completed)' },
    { value: ItemStatus.IN_PROGRESS, label: 'Dalam Proses' },
  ];

  // --- LOGIC: SMART FILTERING ---
  const filteredData = useMemo(() => {
    const now = new Date();
    const startOfDay = (d: Date) => { const n = new Date(d); n.setHours(0,0,0,0); return n; };
    const endOfDay = (d: Date) => { const n = new Date(d); n.setHours(23,59,59,999); return n; };

    return data.filter(item => {
      const itemDate = new Date(item.handoverDate);
      
      // 1. Filter Date
      let dateMatch = true;
      switch (rangeType) {
        case 'today':
          dateMatch = itemDate.toDateString() === now.toDateString();
          break;
        case 'week': 
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          dateMatch = itemDate >= startOfDay(weekAgo) && itemDate <= endOfDay(now);
          break;
        case 'month':
          dateMatch = itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
          break;
        case 'year':
          dateMatch = itemDate.getFullYear() === now.getFullYear();
          break;
        case 'custom':
          if (startDate && endDate) {
             dateMatch = itemDate >= startOfDay(startDate) && itemDate <= endOfDay(endDate);
          }
          break;
        case 'all':
        default:
          dateMatch = true;
      }

      // 2. Filter Status
      let statusMatch = true;
      if (statusFilter !== 'ALL') {
          statusMatch = item.status === statusFilter;
      }

      return dateMatch && statusMatch;
    });
  }, [data, rangeType, startDate, endDate, statusFilter]);

  // --- LOGIC: DEEP STATISTICS ---
  const stats = useMemo(() => {
      const totalDocs = filteredData.length;
      const completedCount = filteredData.filter(d => d.status === ItemStatus.COMPLETED).length;
      const inProgressCount = filteredData.filter(d => d.status !== ItemStatus.COMPLETED).length;
      
      return {
          totalDocs,
          totalItems: filteredData.reduce((acc, curr) => acc + curr.items.length, 0),
          completedCount,
          inProgressCount,
          completionRate: totalDocs > 0 ? (completedCount / totalDocs) * 100 : 0
      };
  }, [filteredData]);

  // --- EFFECT: SMART AUTO-NAMING ---
  useEffect(() => {
      const datePart = rangeType === 'custom' 
        ? 'CUSTOM' 
        : rangeType.toUpperCase();
      
      const statusPart = statusFilter === 'ALL' 
        ? 'ALL' 
        : statusFilter === ItemStatus.COMPLETED ? 'COMPLETED' : 'PENDING';
      
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      
      setCustomFilename(`HANDOVER_${statusPart}_${datePart}_${timestamp}`);
  }, [rangeType, statusFilter, startDate, endDate]);

  // --- DATA MAPPING ---
  const prepareMappedData = (handovers: Handover[]) => {
    return handovers.map((ho, index) => {
      const itemsFormatted = ho.items
        .map(i => `• ${i.quantity}x ${i.itemName} (${i.conditionNotes})`)
        .join('\n');

      const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('id-ID', { 
        day: '2-digit', month: '2-digit', year: 'numeric' 
      }) : '-';

      return {
        'NO': index + 1,
        'NO. DOKUMEN': ho.docNumber,
        'TANGGAL': fmtDate(ho.handoverDate),
        'REFERENSI': ho.woRoIntNumber || '-',
        'PIHAK MENYERAHKAN': ho.menyerahkan,
        'PIHAK PENERIMA': ho.penerima,
        'STATUS': ho.status,
        'JUMLAH ITEM': ho.items.length,
        'RINCIAN BARANG': itemsFormatted,
        'MENGETAHUI': ho.mengetahui
      };
    });
  };

  const handleExport = () => {
    const mappedData = prepareMappedData(filteredData);
    
    const extraHeader = {
        title: "LAPORAN BERITA ACARA SERAH TERIMA (HANDOVER)",
        metadata: {
            "Diekspor Oleh": currentUser.name,
            "Divisi": currentUser.divisionId ? 'Internal' : '-',
            "Filter Status": statusOptions.find(o => o.value === statusFilter)?.label || statusFilter,
            "Periode Data": rangeType === 'custom' 
                ? `${startDate?.toLocaleDateString('id-ID')} s/d ${endDate?.toLocaleDateString('id-ID')}` 
                : rangeOptions.find(o => o.value === rangeType)?.label || rangeType,
            "Total Item Aset": `${stats.totalItems} Unit`,
            "Tanggal Cetak": new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit' })
        }
    };

    onConfirmExport(mappedData, customFilename || 'DATA_HANDOVER', extraHeader);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ekspor Data Handover" size="xl" hideDefaultCloseButton>
      <div className="flex flex-col h-full bg-slate-50">
        
        {/* 1. Modern Gradient Banner */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <BsTable className="w-32 h-32 transform rotate-12 translate-x-8 -translate-y-8" />
          </div>
          <div className="relative z-10 flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 shadow-lg">
              <BsCloudDownload className="w-6 h-6 text-tm-accent" />
            </div>
            <div>
              <h4 className="text-lg font-bold tracking-tight text-white">Konfigurasi Laporan</h4>
              <p className="text-xs text-slate-300 font-medium mt-1 max-w-lg leading-relaxed">
                Sesuaikan filter periode dan status untuk menghasilkan laporan CSV yang presisi. Data akan diunduh sesuai filter yang aktif.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Main Content - Stacked Layout (Each Row is separate) */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5">
            
            {/* ROW 1: Periode (Full Width) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <BsCalendarRange className="w-3.5 h-3.5 text-tm-primary"/>
                    Periode Data
                </label>
                <div className="flex flex-col gap-3">
                    <CustomSelect 
                        options={rangeOptions} 
                        value={rangeType} 
                        onChange={setRangeType} 
                    />
                    {/* Custom Date Range Animation */}
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${rangeType === 'custom' ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="grid grid-cols-2 gap-4 pt-1">
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <span className="block text-[10px] font-bold text-slate-400 mb-1 ml-1">Dari</span>
                                <DatePicker id="export-start" selectedDate={startDate} onDateChange={setStartDate} />
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <span className="block text-[10px] font-bold text-slate-400 mb-1 ml-1">Sampai</span>
                                <DatePicker id="export-end" selectedDate={endDate} onDateChange={setEndDate} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ROW 2: Status (Full Width) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                 <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <BsFunnel className="w-3.5 h-3.5 text-tm-primary"/>
                    Status Dokumen
                </label>
                <div className="flex flex-col">
                    <CustomSelect 
                        options={statusOptions} 
                        value={statusFilter} 
                        onChange={setStatusFilter} 
                    />
                    <p className="text-[10px] text-slate-400 mt-2 leading-relaxed ml-1">
                        Pilih status 'Selesai' untuk laporan audit final, atau 'Dalam Proses' untuk monitoring operasional harian.
                    </p>
                </div>
            </div>

            {/* ROW 3: Filename (Full Width) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                 <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                    <BsFileEarmarkText className="w-3.5 h-3.5 text-tm-primary"/>
                    Nama File (Preview)
                </label>
                <div className="flex items-center group focus-within:ring-2 focus-within:ring-tm-primary/20 rounded-lg transition-all">
                    <input 
                        type="text" 
                        value={customFilename}
                        onChange={(e) => setCustomFilename(e.target.value)}
                        className="block w-full px-4 py-3 text-xs font-mono font-medium text-slate-700 bg-slate-50 border-y border-l border-slate-300 rounded-l-lg focus:outline-none focus:border-tm-primary focus:bg-white transition-colors"
                        placeholder="Masukkan nama file..."
                    />
                    <span className="px-4 py-3 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-300 rounded-r-lg select-none">.csv</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 ml-1">Nama file otomatis disesuaikan dengan filter yang dipilih.</p>
            </div>

            {/* ROW 4: Live Preview & Stats (Full Width) */}
            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-lg flex flex-col">
                <div className="px-5 py-3 bg-white/5 border-b border-white/5 flex justify-between items-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Summary & Preview</p>
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${filteredData.length > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        <BsInfoCircleFill className="w-3 h-3" /> {filteredData.length > 0 ? 'Ready to Export' : 'No Data Found'}
                    </span>
                </div>
                
                {/* Horizontal Stats Layout */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                     {/* Stat 1 */}
                     <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Total Dokumen</span>
                        <p className="text-3xl font-black text-white">{stats.totalDocs} <span className="text-sm font-medium text-slate-500">File</span></p>
                    </div>

                    {/* Stat 2 */}
                    <div className="flex flex-col md:border-l md:border-white/10 md:pl-8">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                            <BsBoxSeam className="w-3 h-3"/> Aset Terpindah
                        </span>
                        <p className="text-3xl font-black text-tm-accent">{stats.totalItems} <span className="text-sm font-medium text-slate-500">Unit</span></p>
                    </div>

                    {/* Stat 3: Progress Bar */}
                    <div className="flex flex-col md:border-l md:border-white/10 md:pl-8 w-full">
                        {stats.totalDocs > 0 ? (
                            <div className="space-y-2 w-full">
                                <div className="flex justify-between text-[10px] font-medium text-slate-400">
                                    <span className="flex items-center gap-1"><BsCheckCircle className="text-emerald-500"/> Selesai</span>
                                    <span className="flex items-center gap-1"><BsClockHistory className="text-amber-500"/> Proses</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
                                    <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${stats.completionRate}%` }}></div>
                                    <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${100 - stats.completionRate}%` }}></div>
                                </div>
                                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                                    <span>{stats.completedCount} Doc</span>
                                    <span>{stats.inProgressCount} Doc</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-500 text-xs italic text-center">Belum ada data untuk ditampilkan</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 5: Operator Info (Compact) */}
             <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-3 shadow-sm">
                <Avatar name={currentUser.name} className="w-8 h-8 text-[10px]" />
                <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">Operator: {currentUser.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{currentUser.role} Division</p>
                </div>
            </div>

        </div>

        {/* 3. Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex gap-3 shrink-0">
          <button 
            onClick={onClose} 
            className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all uppercase tracking-wider"
          >
            Batal
          </button>
          <button 
            onClick={handleExport} 
            disabled={filteredData.length === 0}
            className="flex-[2] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-tm-primary rounded-xl shadow-lg shadow-tm-primary/30 hover:bg-tm-primary-hover hover:-translate-y-0.5 active:translate-y-0 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed transition-all uppercase tracking-wider"
          >
            <BsTable className="w-4 h-4" />
            Download Laporan
          </button>
        </div>
      </div>
    </Modal>
  );
};
