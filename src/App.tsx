import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Filter,
  ChevronDown,
  Activity,
  UserPlus,
  Clock,
  TrendingUp,
  CreditCard,
  Download,
  RotateCcw,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend
} from 'recharts';
import Papa from 'papaparse';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { motion } from 'motion/react';
import { cn } from './lib/utils';
import { PatientRecord, DashboardStats } from './types';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';
import { saveAs } from 'file-saver';

// --- Constants ---
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1OdVvU7tYlzY4XD7Cy2dmT6fj0vooNmpSTsoE8j-XAhA/export?format=csv&gid=55671347';
const REFRESH_INTERVAL = 60000; // 1 minute

// --- Mock Data Generator ---
const generateMockData = (): PatientRecord[] => {
  const statuses = ['Menunggu', 'Pemeriksaan', 'Observasi', 'Selesai'];
  const genders: ('L' | 'P')[] = ['L', 'P'];
  const polis = ['KLINIK REHABILITASI MEDIK', 'KLINIK PENYAKIT DALAM', 'KLINIK ANAK', 'KLINIK BEDAH'];
  const penjamins = [
    'Asuransi JKN (BPJS Kesehatan)', 
    'Asuransi Pemerintah Daerah (Jamkesda)', 
    'Asuransi Pemerintah Lainnya', 
    'Asuransi Swasta', 
    'Membayar Sendiri'
  ];

  return Array.from({ length: 150 }, (_, i) => {
    const date = new Date();
    // Spread across Jan, Feb, Mar 2026
    const month = Math.floor(Math.random() * 3); // 0, 1, 2
    date.setMonth(month);
    date.setFullYear(2026);
    date.setDate(Math.floor(Math.random() * 28) + 1);
    
    return {
      timestamp: date.toISOString(),
      nama: `Pasien ${i + 1}`,
      umur: Math.floor(Math.random() * 75),
      jk: genders[Math.floor(Math.random() * genders.length)],
      diagnosa: 'Keluhan umum...',
      kode_diagnosa: 'A00',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      dokter: `Dr. ${['Budi', 'Siti', 'Andi', 'Lina'][Math.floor(Math.random() * 4)]}`,
      dpjp: `Dr. ${['Ahmad', 'Zaki', 'Dewi', 'Rina'][Math.floor(Math.random() * 4)]}`,
      waktu_kedatangan: date.toISOString(),
      poli: polis[Math.floor(Math.random() * polis.length)],
      penjamin: penjamins[Math.floor(Math.random() * penjamins.length)],
      kategori_umur: [
        '1-23 jam', '1-7 hari', '8-28 hari', '29 hari - <3 bulan', '3-<6 bulan', '6-11 bulan',
        '1-4 tahun', '5-9 tahun', '10-14 tahun', '15-19 tahun', '20-24 tahun', '25-29 tahun',
        '30-34 tahun', '35-39 tahun', '40-44 tahun', '45-49 tahun', '50-54 tahun', '55-59 tahun',
        '60-64 tahun', '65-69 tahun', '70-74 tahun', '75-79 tahun', '80-84 tahun', '85 tahun ke atas'
      ][Math.floor(Math.random() * 24)],
      status_pasien: ['ADMEDIKA', 'BPJS KESEHATAN', 'BPJS UHC','BPJS KETENAGAKERJAAN', 'JASA RAHARJA', 'PAS PULA', 'UMUM'][Math.floor(Math.random() * 7)],
      cara_keluar: [
        'Atas Permintaan Sendiri (PAPS)',
        'Atas Persetujuan Dokter (PBJ)',
        'Dirujuk ke RS Lain',
        'DOA',
        'Lain-Lain',
        'Meninggal',
        'Rawat Inap'
      ][Math.floor(Math.random() * 7)]
    };
  });
};

// --- Components ---

const KPICard = ({ title, value, icon: Icon, color, subtitle }: { title: string; value: string | number; icon: any; color: string; subtitle?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4"
  >
    <div className={cn("p-3 rounded-lg", color)}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</h3>
      {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate max-w-[150px]">{subtitle}</p>}
    </div>
  </motion.div>
);

const ChartContainer = ({ title, children, icon: Icon, color, height = "350px", style }: { title: string; children: React.ReactNode; icon: any; color: string; height?: string; style?: React.CSSProperties }) => {
  const chartRef = React.useRef<HTMLDivElement>(null);

  const handleDownloadPNG = async () => {
    if (chartRef.current) {
      try {
        const dataUrl = await toPng(chartRef.current, { backgroundColor: '#fff', quality: 1 });
        saveAs(dataUrl, `${title.toLowerCase().replace(/\s+/g, '-')}.png`);
      } catch (err) {
        console.error('Error downloading PNG:', err);
      }
    }
  };

  const combinedStyle: React.CSSProperties = {
    height: height && !height.startsWith('min-h') ? height : undefined,
    minHeight: height && height.startsWith('min-h') ? undefined : '300px',
    ...style
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col w-full min-w-0"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-5 h-5", color)} />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
        </div>
        <button 
          onClick={handleDownloadPNG}
          className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-slate-400 dark:text-slate-500" 
          title="Download PNG"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
      <div ref={chartRef} className={cn("w-full relative")} style={combinedStyle}>
        {children}
      </div>
    </motion.div>
  );
};

const NavTab = ({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void; key?: React.Key }) => (
  <button 
    onClick={onClick}
    className={cn(
      "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
      active 
        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
    )}
  >
    {label}
  </button>
);

const FilterDropdown = ({ label, value, options, onChange, allLabel }: { label: string; value: string; options: string[]; onChange?: (val: string) => void; allLabel?: string }) => {
  const defaultLabel = allLabel || `Semua ${label}`;
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <select 
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 pr-8 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full min-w-[140px]"
        >
          <option value={defaultLabel}>{defaultLabel}</option>
          {options.map(opt => opt && <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
};

const PatientTable = ({ patients }: { patients: PatientRecord[] }) => {
  const handleExportCSV = () => {
    const csvData = patients.map(p => ({
      'Waktu': format(new Date(p.timestamp), 'dd/MM/yyyy HH:mm'),
      'Nama Pasien': p.nama,
      'JK': p.jk,
      'Umur': p.umur,
      'Instalasi': p.poli,
      'Penjamin': p.penjamin,
      'Kode Diagnosa': p.kode_diagnosa,
      'Diagnosa': p.diagnosa
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `daftar-pasien-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const handleExportExcel = () => {
    const excelData = patients.map(p => ({
      'Waktu': format(new Date(p.timestamp), 'dd/MM/yyyy HH:mm'),
      'Nama Pasien': p.nama,
      'JK': p.jk,
      'Umur': p.umur,
      'Instalasi': p.poli,
      'Penjamin': p.penjamin,
      'Kode Diagnosa': p.kode_diagnosa,
      'Diagnosa': p.diagnosa
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pasien");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(blob, `daftar-pasien-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-500" />
          Daftar Pasien Terkini
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded mr-2">
            {patients.length} Pasien
          </span>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-md text-xs font-bold transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-md text-xs font-bold transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Waktu</th>
            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Nama Pasien</th>
            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">JK / Umur</th>
            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Instalasi</th>
            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Penjamin</th>
            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">DPJP</th>
            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Kode</th>
            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Diagnosa</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
          {patients.slice(0, 100).map((p, i) => (
            <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
              <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {format(new Date(p.timestamp), 'dd/MM/yyyy HH:mm')}
              </td>
              <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">{p.nama}</td>
              <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{p.jk} / {p.umur} th</td>
              <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{p.poli}</td>
              <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{p.penjamin}</td>
              <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{p.dpjp}</td>
              <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{p.kode_diagnosa}</td>
              <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-[300px] truncate">{p.diagnosa}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  );
};

const PeriodeTable = ({ 
  title, 
  subtitle, 
  data, 
  months, 
  rowLabel,
  showTotalRow = false,
  accentColor = "text-emerald-600",
  rowOrder
}: { 
  title: string; 
  subtitle?: string; 
  data: Record<string, Record<string, number>>; 
  months: string[]; 
  rowLabel: string;
  showTotalRow?: boolean;
  accentColor?: string;
  rowOrder?: string[];
}) => {
  const rows = rowOrder ? rowOrder.filter(r => data[r]) : Object.keys(data).sort();
  
  const getRowTotal = (row: string) => {
    return months.reduce((sum, month) => sum + (data[row][month] || 0), 0);
  };

  const getMonthTotal = (month: string) => {
    return rows.reduce((sum, row) => sum + (data[row][month] || 0), 0);
  };

  const grandTotal = months.reduce((sum, month) => sum + getMonthTotal(month), 0);

  const handleExportCSV = () => {
    const csvData = rows.map((row, i) => {
      const rowData: Record<string, any> = {
        'No': i + 1,
        [rowLabel]: row
      };
      months.forEach(month => {
        rowData[month] = data[row][month] || 0;
      });
      rowData['Total'] = getRowTotal(row);
      return rowData;
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${title.toLowerCase().replace(/\s+/g, '-')}.csv`);
  };

  const handleExportExcel = () => {
    const excelData = rows.map((row, i) => {
      const rowData: Record<string, any> = {
        'No': i + 1,
        [rowLabel]: row
      };
      months.forEach(month => {
        rowData[month] = data[row][month] || 0;
      });
      rowData['Total'] = getRowTotal(row);
      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(blob, `${title.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={handleExportExcel}
             className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-md text-xs font-bold transition-colors"
           >
             <Download className="w-3.5 h-3.5" /> Excel
           </button>
           <button 
             onClick={handleExportCSV}
             className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-md text-xs font-bold transition-colors"
           >
             <Download className="w-3.5 h-3.5" /> CSV
           </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#2d3748] dark:bg-slate-800 text-white">
              <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-slate-600 dark:border-slate-700 w-16">No</th>
              <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-slate-600 dark:border-slate-700">{rowLabel}</th>
              {months.map(month => (
                <th key={month} className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-slate-600 dark:border-slate-700 text-center">{month}</th>
              ))}
              <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-center">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row, i) => (
              <tr key={row} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">{i + 1}</td>
                <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">{row}</td>
                {months.map(month => (
                  <td key={month} className="px-6 py-4 text-sm font-bold text-center border-r border-slate-100 dark:border-slate-800">
                    <span className={cn(data[row][month] ? accentColor : "text-slate-300 dark:text-slate-700")}>
                      {data[row][month] || '-'}
                    </span>
                  </td>
                ))}
                <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-100 text-center bg-slate-50/30 dark:bg-slate-800/30">
                  {getRowTotal(row).toLocaleString('id-ID')}
                </td>
              </tr>
            ))}
            {showTotalRow && (
              <tr className="bg-[#1a202c] dark:bg-slate-950 text-white font-bold">
                <td colSpan={2} className="px-6 py-4 text-xs uppercase tracking-widest text-right">Total Keseluruhan</td>
                {months.map(month => (
                  <td key={month} className="px-6 py-4 text-sm text-center">
                    {getMonthTotal(month).toLocaleString('id-ID')}
                  </td>
                ))}
                <td className="px-6 py-4 text-sm text-center text-emerald-400">
                  {grandTotal.toLocaleString('id-ID')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');
  const [showNumbers, setShowNumbers] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [isDark, setIsDark] = useState(false);

  // Theme effect
  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateTheme = () => {
      let shouldBeDark = false;
      if (theme === 'system') {
        shouldBeDark = mediaQuery.matches;
      } else {
        shouldBeDark = theme === 'dark';
      }
      
      root.classList.toggle('dark', shouldBeDark);
      setIsDark(shouldBeDark);
    };

    updateTheme();

    const listener = () => {
      if (theme === 'system') updateTheme();
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  const COLORS = useMemo(() => {
    return {
      blue: '#3b82f6',
      pink: '#f472b6',
      green: '#10b981',
      orange: '#f59e0b',
      gray: '#94a3b8',
      lightGray: isDark ? '#1e293b' : '#f1f5f9',
      white: isDark ? '#1e293b' : '#ffffff',
      text: isDark ? '#f1f5f9' : '#1e293b',
      muted: isDark ? '#94a3b8' : '#64748b',
      border: isDark ? '#334155' : '#e2e8f0',
      card: isDark ? '#1e293b' : '#ffffff'
    };
  }, [isDark]);

  const GENDER_COLORS = useMemo(() => [COLORS.blue, COLORS.pink], [COLORS]);

  // Filter states
  const [filterPoli, setFilterPoli] = useState('Semua Poli');
  const [filterTahun, setFilterTahun] = useState('Semua Tahun');
  const [filterBulan, setFilterBulan] = useState('Semua Bulan');
  const [filterJK, setFilterJK] = useState('Semua JK');
  const [filterPenjamin, setFilterPenjamin] = useState('Semua Penjamin');
  const [diagnosaLimit, setDiagnosaLimit] = useState<number | 'All'>(10);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(SHEET_URL);
      if (!response.ok) throw new Error('Gagal mengambil data dari Google Sheets');
      const csvText = await response.text();

      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as string[][];
          if (rows.length < 2) return;
          
          const headers = rows[0];
          const dataRows = rows.slice(1);

          const findIdx = (keys: string[]) => {
            return headers.findIndex(h => keys.some(k => h.toLowerCase().includes(k.toLowerCase())));
          };

          const idxNama = findIdx(['Nama', 'Name', 'Pasien']);
          const idxDiagnosa = findIdx(['Diagnosa', 'Diagnosis', 'Keluhan', 'Penyakit']);
          const idxStatus = findIdx(['Status', 'Keterangan']);
          const idxDokter = findIdx(['Dokter', 'Doctor', 'Medis']);

          const parseDate = (dateStr: string) => {
            if (!dateStr) return new Date();
            
            // Try DD/MM/YYYY first (common in Indonesia)
            const parts = dateStr.split(/[/-\s:]/);
            if (parts.length >= 3) {
              const p0 = parseInt(parts[0]);
              const p1 = parseInt(parts[1]);
              const p2 = parseInt(parts[2]);
              
              let d;
              if (p0 > 12) { // Definitely DD/MM/YYYY
                d = new Date(p2, p1 - 1, p0);
              } else if (p1 > 12) { // Definitely MM/DD/YYYY
                d = new Date(p2, p0 - 1, p1);
              } else {
                // Ambiguous, assume DD/MM/YYYY for Indonesia
                d = new Date(p2, p1 - 1, p0);
              }
              
              if (!isNaN(d.getTime())) return d;
            }

            // Fallback to standard parsing
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) return d;
            
            return new Date();
          };

          const mappedData: PatientRecord[] = dataRows.map((row: string[]) => {
            // Kolom B (index 1) for Timestamp/Waktu
            const timestampStr = (row.length > 1 ? row[1] : '') || new Date().toISOString();
            const timestamp = parseDate(timestampStr).toISOString();
            
            const nama = (idxNama !== -1 && row[idxNama] ? row[idxNama] : 'Unknown');
            
            // Kolom U (index 20) for Umur
            const umurRaw = (row.length > 20 ? row[20] : '0') || '0';
            const umur = parseInt(umurRaw.toString().replace(/[^0-9]/g, '')) || 0;
            
            // Kolom F (index 5) for Jenis Kelamin
            let jk: 'L' | 'P' = 'L';
            const jkRaw = (row.length > 5 ? row[5] : 'L').toString().toUpperCase();
            if (jkRaw.startsWith('P') || jkRaw.includes('PEREMPUAN') || jkRaw.includes('FEMALE') || jkRaw === 'W') jk = 'P';
            else if (jkRaw.startsWith('L') || jkRaw.includes('LAKI') || jkRaw.includes('MALE') || jkRaw === 'M') jk = 'L';

            // Kolom L (index 11) for Kode Diagnosa
            // Kolom M (index 12) for Diagnosa
            const kode_diagnosa = (row.length > 11 ? row[11] : '-') || '-';
            const diagnosa = (row.length > 12 ? row[12] : '-') || '-';
            
            const status = (idxStatus !== -1 && row[idxStatus] ? row[idxStatus] : 'Selesai') || 'Selesai';
            const dokter = (idxDokter !== -1 && row[idxDokter] ? row[idxDokter] : '-') || '-';
            
            // Kolom K (index 10) for DPJP
            const dpjp = (row.length > 10 ? row[10] : '-') || '-';
            
            // Kolom J (index 9) for IGD
            const poli = (row.length > 9 ? row[9] : 'UMUM') || 'UMUM';
            
            // Kolom W (index 22) for Penjamin
            let penjamin = (row.length > 22 ? row[22] : 'Membayar Sendiri') || 'Membayar Sendiri';
            
            // Kolom Q (index 16) for Status Pasien
            const status_pasien = (row.length > 16 ? row[16] : '-') || '-';
            
            // Kolom S (index 18) for Cara Keluar
            const cara_keluar = (row.length > 18 ? row[18] : '-') || '-';
            
            // Kolom U (index 20) for Kategori Umur
            const kategori_umur = (row.length > 20 ? row[20] : '-')?.toString().trim() || '-';
            
            // Map to standard names from the image
            const pUpper = penjamin.toString().toUpperCase();
            if (pUpper.includes('JKN') || pUpper.includes('BPJS')) penjamin = 'Asuransi JKN (BPJS Kesehatan)';
            else if (pUpper.includes('JAMKESDA') || pUpper.includes('DAERAH')) penjamin = 'Asuransi Pemerintah Daerah (Jamkesda)';
            else if (pUpper.includes('PEMERINTAH') || pUpper.includes('LAINNYA')) penjamin = 'Asuransi Pemerintah Lainnya';
            else if (pUpper.includes('SWASTA')) penjamin = 'Asuransi Swasta';
            else if (pUpper.includes('UMUM') || pUpper.includes('SENDIRI') || pUpper.includes('MANDIRI')) penjamin = 'Membayar Sendiri';
            else penjamin = 'Asuransi Pemerintah Lainnya'; // Fallback

            return {
              timestamp,
              nama,
              umur,
              jk,
              diagnosa,
              kode_diagnosa,
              status,
              dokter,
              dpjp,
              waktu_kedatangan: timestamp,
              poli,
              penjamin,
              kategori_umur,
              status_pasien,
              cara_keluar
            };
          });
          setPatients(mappedData);
          setError(null);
          setIsMock(false);
        },
        error: (err) => {
          console.error('Parsing error:', err);
          setPatients(generateMockData());
          setIsMock(true);
        }
      });
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Gagal memuat data. Menggunakan data simulasi.');
      setPatients(generateMockData());
      setIsMock(true);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const matchesSearch = searchQuery === '' || 
        p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.poli.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.diagnosa.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPoli = filterPoli === 'Semua Poli' || p.poli === filterPoli;
      const matchesJK = filterJK === 'Semua JK' || (filterJK === 'Laki-laki' ? p.jk === 'L' : p.jk === 'P');
      const matchesPenjamin = filterPenjamin === 'Semua Penjamin' || p.penjamin === filterPenjamin;

      let matchesDate = true;
      try {
        const date = new Date(p.timestamp);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear().toString();
          const month = format(date, 'MMMM', { locale: id });
          
          if (filterTahun !== 'Semua Tahun' && year !== filterTahun) matchesDate = false;
          if (filterBulan !== 'Semua Bulan' && month !== filterBulan) matchesDate = false;
        }
      } catch (e) {
        // If date parsing fails, we might still want to show it or filter it out
      }

      return matchesSearch && matchesPoli && matchesJK && matchesPenjamin && matchesDate;
    });
  }, [patients, searchQuery, filterPoli, filterTahun, filterBulan, filterJK, filterPenjamin]);

  const stats = useMemo<DashboardStats>(() => {
    const statusCounts: Record<string, number> = {};
    const genderCounts: Record<string, number> = { 'Laki-laki': 0, 'Perempuan': 0 };
    const ageGroups: Record<string, number> = {};
    const poliCounts: Record<string, number> = {};
    const penjaminCounts: Record<string, number> = {};
    const dpjpCounts: Record<string, number> = {};
    const dayCounts: Record<string, number> = { 'Senin': 0, 'Selasa': 0, 'Rabu': 0, 'Kamis': 0, 'Jumat': 0, 'Sabtu': 0, 'Minggu': 0 };
    const monthCounts: Record<string, number> = {};
    const penjaminByMonth: Record<string, Record<string, number>> = {};
    const ageGroupByMonth: Record<string, Record<string, number>> = {};
    const statusByMonth: Record<string, Record<string, number>> = {};
    const caraKeluarByMonth: Record<string, Record<string, number>> = {};
    const dpjpByMonth: Record<string, Record<string, number>> = {};
    const caraKeluarCounts: Record<string, number> = {};
    const monthsSet = new Set<string>();

    filteredPatients.forEach(p => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      const genderLabel = p.jk === 'L' ? 'Laki-laki' : 'Perempuan';
      genderCounts[genderLabel]++;
      
      // Use kategori_umur from Column U (mapped in processCSV)
      const ageBucket = p.kategori_umur || 'Lainnya';
      
      ageGroups[ageBucket] = (ageGroups[ageBucket] || 0) + 1;
      
      const poliLabel = p.poli || 'UMUM';
      poliCounts[poliLabel] = (poliCounts[poliLabel] || 0) + 1;
      
      const penjaminLabel = p.penjamin || 'UMUM';
      penjaminCounts[penjaminLabel] = (penjaminCounts[penjaminLabel] || 0) + 1;

      const dpjpLabel = p.dpjp || '-';
      dpjpCounts[dpjpLabel] = (dpjpCounts[dpjpLabel] || 0) + 1;

      try {
        const date = new Date(p.timestamp);
        if (!isNaN(date.getTime())) {
          const dayName = format(date, 'EEEE', { locale: id });
          if (dayName in dayCounts) dayCounts[dayName]++;

          const monthName = format(date, 'MMMM', { locale: id });
          const monthYear = format(date, 'MMMM yyyy', { locale: id });
          
          monthsSet.add(monthName);
          monthCounts[monthYear] = (monthCounts[monthYear] || 0) + 1;

          // Periode Tab Data
          if (!penjaminByMonth[penjaminLabel]) penjaminByMonth[penjaminLabel] = {};
          penjaminByMonth[penjaminLabel][monthName] = (penjaminByMonth[penjaminLabel][monthName] || 0) + 1;

          if (!ageGroupByMonth[ageBucket]) ageGroupByMonth[ageBucket] = {};
          ageGroupByMonth[ageBucket][monthName] = (ageGroupByMonth[ageBucket][monthName] || 0) + 1;

          const statusLabel = p.status_pasien || '-';
          if (!statusByMonth[statusLabel]) statusByMonth[statusLabel] = {};
          statusByMonth[statusLabel][monthName] = (statusByMonth[statusLabel][monthName] || 0) + 1;

          const caraKeluarLabel = p.cara_keluar || '-';
          if (!caraKeluarByMonth[caraKeluarLabel]) caraKeluarByMonth[caraKeluarLabel] = {};
          caraKeluarByMonth[caraKeluarLabel][monthName] = (caraKeluarByMonth[caraKeluarLabel][monthName] || 0) + 1;
          
          if (!dpjpByMonth[dpjpLabel]) dpjpByMonth[dpjpLabel] = {};
          dpjpByMonth[dpjpLabel][monthName] = (dpjpByMonth[dpjpLabel][monthName] || 0) + 1;
          
          caraKeluarCounts[caraKeluarLabel] = (caraKeluarCounts[caraKeluarLabel] || 0) + 1;
        }
      } catch (e) {
        // Fallback for invalid dates
      }
    });

    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
      .filter(m => monthsSet.has(m));

    const topPoli = Object.entries(poliCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
    const topPenjamin = Object.entries(penjaminCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

    // Sort months chronologically if possible
    const sortedMonths = Object.entries(monthCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        try {
          // Simple sort for "Month Year" format
          const dateA = new Date(parseInt(a.name.split(' ')[1]), ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].indexOf(a.name.split(' ')[0]));
          const dateB = new Date(parseInt(b.name.split(' ')[1]), ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].indexOf(b.name.split(' ')[0]));
          return dateA.getTime() - dateB.getTime();
        } catch (e) { return 0; }
      });

    const allDiagnoses = Object.entries(
      filteredPatients.reduce((acc, p) => {
        const d = p.diagnosa?.trim();
        const k = p.kode_diagnosa?.trim();
        
        let label = '';
        const hasD = d && d !== '-' && d !== '';
        const hasK = k && k !== '-' && k !== '';
        
        if (hasK && hasD) {
          label = `${k} - ${d}`;
        } else if (hasK) {
          label = k;
        } else if (hasD) {
          label = d;
        }
        
        if (label) {
          acc[label] = (acc[label] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>)
    ).sort((a: [string, number], b: [string, number]) => b[1] - a[1]);

    const topDiagnoses = diagnosaLimit === 'All' 
      ? allDiagnoses.map(([name, value]) => ({ name, value }))
      : allDiagnoses.slice(0, diagnosaLimit).map(([name, value]) => ({ name, value }));

    return {
      totalPatients: filteredPatients.length,
      statusCounts,
      monthlyArrivals: sortedMonths,
      genderCounts: Object.entries(genderCounts).map(([name, value]) => ({ name, value })),
      ageGroups: [
        '1-23 jam', '1-7 hari', '8-28 hari', '29 hari - <3 bulan', '3-<6 bulan', '6-11 bulan',
        '1-4 tahun', '5-9 tahun', '10-14 tahun', '15-19 tahun', '20-24 tahun', '25-29 tahun',
        '30-34 tahun', '35-39 tahun', '40-44 tahun', '45-49 tahun', '50-54 tahun', '55-59 tahun',
        '60-64 tahun', '65-69 tahun', '70-74 tahun', '75-79 tahun', '80-84 tahun', '85 tahun ke atas'
      ].map(name => ({ name, value: ageGroups[name] || 0 })),
      dayArrivals: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(name => ({ name, value: dayCounts[name] })),
      topPoli,
      topPenjamin,
      topDiagnoses,
      dpjpCounts: Object.entries(dpjpCounts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value })),
      penjaminByMonth,
      ageGroupByMonth,
      statusByMonth,
      caraKeluarByMonth,
      dpjpByMonth,
      caraKeluarCounts: [
        'Atas Permintaan Sendiri (PAPS)',
        'Atas Persetujuan Dokter (PBJ)',
        'Dirujuk ke RS Lain',
        'DOA',
        'Lain-Lain',
        'Meninggal',
        'Rawat Inap'
      ].map(name => ({ name, value: caraKeluarCounts[name] || 0 })),
      months
    };
  }, [filteredPatients, diagnosaLimit]);

  const uniquePolis = useMemo(() => Array.from(new Set(patients.map(p => p.poli))).sort(), [patients]);
  const uniquePenjamins = useMemo(() => Array.from(new Set(patients.map(p => p.penjamin))).sort(), [patients]);
  const uniqueYears = useMemo(() => Array.from(new Set(patients.map(p => {
    const d = new Date(p.timestamp);
    return isNaN(d.getTime()) ? null : d.getFullYear().toString();
  }).filter(Boolean))).sort(), [patients]);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 px-8 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Dashboard IGD</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monitoring Gawat Darurat 2026</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {isMock && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-100 dark:border-amber-900/30">
              <Activity className="w-3 h-3" />
              Mode Simulasi
            </div>
          )}
          <nav className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-lg">
            {['Overview', 'Diagnosa', 'Cara Keluar', 'DPJP', 'Periode'].map(tab => (
              <NavTab 
                key={tab} 
                label={tab} 
                active={activeTab === tab} 
                onClick={() => setActiveTab(tab)}
              />
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari pasien atau poli..."
                className="bg-slate-100 dark:bg-slate-800 border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 w-64 outline-none text-slate-700 dark:text-slate-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={fetchData}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
              title="Refresh Data"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </button>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setTheme('light')}
                className={cn(
                  "p-1.5 rounded-full transition-all",
                  theme === 'light' ? "bg-white dark:bg-slate-600 text-amber-500 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
                title="Light Mode"
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={cn(
                  "p-1.5 rounded-full transition-all",
                  theme === 'dark' ? "bg-white dark:bg-slate-600 text-blue-400 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
                title="Dark Mode"
              >
                <Moon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme('system')}
                className={cn(
                  "p-1.5 rounded-full transition-all",
                  theme === 'system' ? "bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-200 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
                title="System Mode"
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-8 w-full space-y-8">
        {/* Filter Bar */}
        <section className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-end justify-between gap-4">
          <div className="flex items-end gap-4 overflow-x-auto pb-1">
            <button className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-md text-sm font-bold uppercase tracking-wider">
              <Filter className="w-4 h-4" />
              Global Filters
            </button>

      <FilterDropdown 
        label="Instalasi" 
        value={filterPoli} 
        options={uniquePolis} 
        onChange={setFilterPoli}
        allLabel="Semua Instalasi"
      />
      <FilterDropdown 
        label="Tahun" 
        value={filterTahun} 
        options={uniqueYears} 
        onChange={setFilterTahun}
        allLabel="Semua Tahun"
      />
      <FilterDropdown 
        label="Bulan" 
        value={filterBulan} 
        options={['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']} 
        onChange={setFilterBulan}
        allLabel="Semua Bulan"
      />

            <div className="flex items-center gap-2 mb-2 ml-4 text-slate-600 dark:text-slate-400">
              <input 
                type="checkbox" 
                id="showNumbers" 
                checked={showNumbers}
                onChange={(e) => setShowNumbers(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer bg-white dark:bg-slate-800" 
              />
              <label htmlFor="showNumbers" className="text-sm font-medium cursor-pointer">Angka</label>
            </div>

            <div className="h-10 w-px bg-slate-100 dark:bg-slate-800 mx-2 mb-2" />

            <div className="flex flex-col mb-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Hasil Filter</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{filteredPatients.length} Pasien</span>
            </div>

      <FilterDropdown 
        label="Jenis Kelamin" 
        value={filterJK} 
        options={['Laki-laki', 'Perempuan']} 
        onChange={setFilterJK}
        allLabel="Semua JK"
      />
      <FilterDropdown 
        label="Penjamin" 
        value={filterPenjamin} 
        options={uniquePenjamins} 
        onChange={setFilterPenjamin}
        allLabel="Semua Penjamin"
      />
          </div>

          <button 
            onClick={() => {
              setFilterPoli('Semua Poli');
              setFilterTahun('Semua Tahun');
              setFilterBulan('Semua Bulan');
              setFilterJK('Semua JK');
              setFilterPenjamin('Semua Penjamin');
              setSearchQuery('');
            }}
            className="flex items-center gap-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 text-sm font-bold uppercase tracking-wider mb-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </section>

        {/* Main Content Area */}
        {activeTab === 'Overview' && (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard title="Total Pasien" value={stats.totalPatients.toLocaleString('id-ID')} icon={Users} color="bg-blue-500" />
              <KPICard title="Instalasi Teraktif" value={stats.topPoli} icon={Activity} color="bg-emerald-500" subtitle="Berdasarkan kunjungan" />
              <KPICard title="Penjamin Utama" value={stats.topPenjamin} icon={CreditCard} color="bg-orange-500" subtitle="Metode pembayaran terbanyak" />
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Filter Instalasi
                </p>
                <div className="relative">
                  <select 
                    value={filterPoli}
                    onChange={(e) => setFilterPoli(e.target.value)}
                    className="appearance-none bg-slate-50 border-none rounded-md px-3 py-2 pr-8 text-sm text-slate-700 w-full focus:ring-2 focus:ring-blue-500/20 outline-none"
                  >
                    <option value="Semua Instalasi">All</option>
                    {uniquePolis.map(poli => (
                      <option key={poli} value={poli}>{poli}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <ChartContainer title="Tren Kunjungan Bulanan" icon={TrendingUp} color="text-blue-500" height="400px">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.monthlyArrivals} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: COLORS.muted, fontSize: 10 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.muted, fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={COLORS.blue} 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: COLORS.blue }} 
                      activeDot={{ r: 6 }} 
                      label={showNumbers ? { position: 'top', fill: COLORS.muted, fontSize: 10 } : false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>

              <ChartContainer title="Kunjungan Jenis Kelamin" icon={Users} color="text-pink-500" height="400px">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <Pie
                      data={stats.genderCounts}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={showNumbers ? ({ name, value }) => `${name}: ${value}` : false}
                    >
                      {stats.genderCounts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>

              <ChartContainer title="Kunjungan Berdasarkan Kategori Umur" icon={Users} color="text-emerald-500" height="600px">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.ageGroups} layout="vertical" margin={{ left: 140, right: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: COLORS.muted, fontSize: 9 }} width={140} />
                    <Tooltip />
                    <Bar 
                      dataKey="value" 
                      fill={COLORS.green} 
                      radius={[0, 4, 4, 0]} 
                      barSize={12}
                      label={showNumbers ? { position: 'right', fill: COLORS.muted, fontSize: 10 } : false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

              <ChartContainer title="Kunjungan Berdasarkan Hari Kunjungan" icon={Clock} color="text-orange-500" height="400px">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.dayArrivals} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: COLORS.muted, fontSize: 10 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.muted, fontSize: 10 }} />
                    <Tooltip />
                    <Bar 
                      dataKey="value" 
                      fill={COLORS.orange} 
                      radius={[4, 4, 0, 0]} 
                      barSize={40} 
                      label={showNumbers ? { position: 'top', fill: COLORS.muted, fontSize: 10 } : false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            {/* Recent Patients Table */}
            <PatientTable patients={filteredPatients} />
          </>
        )}

        {activeTab === 'Diagnosa' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                {[10, 20, 'All'].map((limit) => (
                  <button
                    key={limit}
                    onClick={() => setDiagnosaLimit(limit as any)}
                    className={cn(
                      "px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all",
                      diagnosaLimit === limit 
                        ? "bg-blue-600 text-white shadow-md" 
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    {limit === 'All' ? 'Semua' : `Top ${limit}`}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium italic">
                Menampilkan {diagnosaLimit === 'All' ? 'semua' : `top ${diagnosaLimit}`} diagnosa dari {stats.topDiagnoses.length} diagnosa unik yang ditemukan
              </p>
            </div>

            {stats.topDiagnoses.length > 0 ? (
              <ChartContainer 
                title={diagnosaLimit === 'All' ? "Semua Diagnosa" : `Top ${diagnosaLimit} Diagnosa Terbanyak`} 
                icon={Activity} 
                color="text-blue-500" 
                style={{ height: diagnosaLimit === 'All' ? `${Math.max(500, stats.topDiagnoses.length * 35)}px` : '500px' }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topDiagnoses} layout="vertical" margin={{ left: 180, right: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: COLORS.muted, fontSize: 10 }} 
                      width={180} 
                      interval={0}
                    />
                    <Tooltip />
                    <Bar 
                      dataKey="value" 
                      fill={COLORS.blue} 
                      radius={[0, 4, 4, 0]} 
                      barSize={20}
                      label={showNumbers ? { position: 'right', fill: COLORS.muted, fontSize: 10 } : false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                <Activity className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">Tidak Ada Data Diagnosa</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Pastikan file sumber memiliki data pada kolom diagnosa.</p>
              </div>
            )}
            <PatientTable patients={filteredPatients.filter(p => 
              (p.diagnosa && p.diagnosa.trim() !== '-' && p.diagnosa.trim() !== '') || 
              (p.kode_diagnosa && p.kode_diagnosa.trim() !== '-' && p.kode_diagnosa.trim() !== '')
            )} />
          </div>
        )}

        {activeTab === 'Cara Keluar' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <ChartContainer title="Distribusi Cara Keluar" icon={Activity} color="text-purple-500" height="400px">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.caraKeluarCounts} layout="vertical" margin={{ left: 180, right: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: COLORS.muted, fontSize: 10 }} width={180} />
                    <Tooltip />
                    <Bar 
                      dataKey="value" 
                      fill="#9333ea" 
                      radius={[0, 4, 4, 0]} 
                      barSize={20}
                      label={showNumbers ? { position: 'right', fill: COLORS.muted, fontSize: 10 } : false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

              <ChartContainer title="Persentase Cara Keluar" icon={PieChart} color="text-purple-500" height="400px">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <Pie
                      data={stats.caraKeluarCounts.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={showNumbers ? ({ name, value }) => `${name}: ${value}` : false}
                    >
                      {stats.caraKeluarCounts.filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={[
                          '#9333ea', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff', '#f3e8ff', '#faf5ff'
                        ][index % 7]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            <PeriodeTable 
              title="Jumlah Kunjungan Berdasarkan Cara Keluar Per Periode"
              subtitle="Rekapitulasi kunjungan bulanan berdasarkan cara keluar di Kolom S"
              data={stats.caraKeluarByMonth}
              months={stats.months}
              rowLabel="Cara Keluar"
              showTotalRow={true}
              accentColor="text-purple-600"
              rowOrder={[
                'Atas Permintaan Sendiri (PAPS)',
                'Atas Persetujuan Dokter (PBJ)',
                'Dirujuk ke RS Lain',
                'DOA',
                'Lain-Lain',
                'Meninggal',
                'Rawat Inap'
              ]}
            />
          </div>
        )}

        {activeTab === 'DPJP' && (() => {
          const topDPJP = stats.dpjpCounts.slice(0, 10);
          const otherDPJPValue = stats.dpjpCounts.slice(10).reduce((sum, d) => sum + d.value, 0);
          const dpjpPieData = otherDPJPValue > 0 
            ? [...topDPJP, { name: 'Lain-lain', value: otherDPJPValue }]
            : topDPJP;

          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChartContainer 
                  title="Distribusi Kunjungan Berdasarkan DPJP" 
                  icon={Activity} 
                  color="text-indigo-500" 
                  style={{ height: `${Math.max(400, stats.dpjpCounts.length * 40)}px` }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.dpjpCounts} layout="vertical" margin={{ left: 220, right: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: COLORS.muted, fontSize: 10 }} 
                        width={220}
                        interval={0}
                      />
                      <Tooltip />
                      <Bar 
                        dataKey="value" 
                        fill="#6366f1" 
                        radius={[0, 4, 4, 0]} 
                        barSize={20}
                        label={showNumbers ? { position: 'right', fill: COLORS.muted, fontSize: 10 } : false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>

                <ChartContainer title="Persentase Kunjungan Berdasarkan DPJP" icon={PieChart} color="text-indigo-500" height="450px">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <Pie
                        data={dpjpPieData.filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={showNumbers ? ({ name, value }) => `${name}: ${value}` : false}
                      >
                        {dpjpPieData.filter(d => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={[
                            '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#eef2ff'
                          ][index % 6]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>

              <PeriodeTable 
                title="Jumlah Kunjungan Berdasarkan DPJP Per Periode"
                subtitle="Rekapitulasi kunjungan bulanan berdasarkan Dokter Penanggung Jawab Pelayanan (Kolom K)"
                data={stats.dpjpByMonth}
                months={stats.months}
                rowLabel="Nama DPJP"
                showTotalRow={true}
                accentColor="text-indigo-600"
              />
            </div>
          );
        })()}

        {activeTab === 'Periode' && (
          <div className="space-y-6">
            <PeriodeTable 
              title="Jumlah Kunjungan Berdasarkan Penjamin Per Periode"
              subtitle="Rekapitulasi kunjungan bulanan berdasarkan jenis penjamin"
              data={stats.penjaminByMonth}
              months={stats.months}
              rowLabel="Nama Penjamin"
              showTotalRow={true}
              accentColor="text-emerald-600"
              rowOrder={[
                'Asuransi JKN (BPJS Kesehatan)', 
                'Asuransi Pemerintah Daerah (Jamkesda)', 
                'Asuransi Pemerintah Lainnya', 
                'Asuransi Swasta', 
                'Membayar Sendiri'
              ]}
            />
            <PeriodeTable 
              title="Jumlah Kunjungan Berdasarkan Kategori Umur Per Periode"
              subtitle="Rekapitulasi kunjungan bulanan per kategori umur"
              data={stats.ageGroupByMonth}
              months={stats.months}
              rowLabel="Kategori Umur"
              showTotalRow={true}
              accentColor="text-orange-600"
              rowOrder={[
                '1-23 jam', '1-7 hari', '8-28 hari', '29 hari - <3 bulan', '3-<6 bulan', '6-11 bulan',
                '1-4 tahun', '5-9 tahun', '10-14 tahun', '15-19 tahun', '20-24 tahun', '25-29 tahun',
                '30-34 tahun', '35-39 tahun', '40-44 tahun', '45-49 tahun', '50-54 tahun', '55-59 tahun',
                '60-64 tahun', '65-69 tahun', '70-74 tahun', '75-79 tahun', '80-84 tahun', '85 tahun ke atas'
              ]}
            />
            <PeriodeTable 
              title="Jumlah Kunjungan Berdasarkan Status Pasien Per Periode"
              subtitle="Rekapitulasi kunjungan bulanan berdasarkan kategori status di Kolom Q"
              data={stats.statusByMonth}
              months={stats.months}
              rowLabel="Status Pasien"
              showTotalRow={true}
              accentColor="text-blue-600"
              rowOrder={['ADMEDIKA', 'BPJS KESEHATAN','BPJS UHC', 'BPJS KETENAGAKERJAAN', 'JASA RAHARJA', 'PAS PULA', 'MANDIRI InHealth','UMUM']}
            />
          </div>
        )}
      </main>

      {/* Footer / Status Bar */}
      <footer className="bg-white border-t border-slate-200 px-8 py-4 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <p>© 2026 RSUD Deli Serdang - Dashboard Monitoring Gawat Darurat</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span>Sistem Online</span>
          </div>
        </div>
        <p>Terakhir diperbarui: {format(lastUpdated, 'HH:mm:ss')} WIB</p>
      </footer>
    </div>
  );
}
