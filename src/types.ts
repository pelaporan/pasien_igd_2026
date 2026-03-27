export interface PatientRecord {
  timestamp: string;
  nama: string;
  umur: number;
  jk: 'L' | 'P';
  diagnosa: string;
  kode_diagnosa: string;
  status: string;
  dokter: string;
  waktu_kedatangan: string;
  poli: string;
  penjamin: string;
  kategori_umur: string;
  status_pasien: string;
  cara_keluar: string;
}

export interface DashboardStats {
  totalPatients: number;
  statusCounts: Record<string, number>;
  monthlyArrivals: { name: string; value: number }[];
  genderCounts: { name: string; value: number }[];
  ageGroups: { name: string; value: number }[];
  dayArrivals: { name: string; value: number }[];
  topPoli: string;
  topPenjamin: string;
  topDiagnoses: { name: string; value: number }[];
  penjaminByMonth: Record<string, Record<string, number>>;
  ageGroupByMonth: Record<string, Record<string, number>>;
  statusByMonth: Record<string, Record<string, number>>;
  caraKeluarByMonth: Record<string, Record<string, number>>;
  caraKeluarCounts: { name: string; value: number }[];
  months: string[];
}
