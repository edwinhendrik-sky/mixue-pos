const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./mixue_absen_gps.db', (err) => {
    if (err) {
        console.error('Gagal terhubung ke database', err.message);
    } else {
        console.log('Terhubung ke database SQLite (Komponen Gaji & Parent-Child).');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS stores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_name TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            radius_meter INTEGER DEFAULT 50000
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            job_position TEXT,
            organization TEXT,
            bank TEXT,
            no_rekening TEXT,
            pin TEXT DEFAULT '1234',
            join_date TEXT,
            store_id INTEGER,
            FOREIGN KEY(store_id) REFERENCES stores(id)
        )`);

        // Tabel Komponen Gaji Karyawan (Parent-Child dengan employees)
        db.run(`CREATE TABLE IF NOT EXISTS employee_salaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER,
            basic_salary REAL DEFAULT 0,
            allowance_leader REAL DEFAULT 0,
            allowance_weekend REAL DEFAULT 0,
            allowance_overtime REAL DEFAULT 0,
            allowance_sosmed REAL DEFAULT 0,
            bonus_sales REAL DEFAULT 0,
            bonus_other REAL DEFAULT 0,
            deduction_late REAL DEFAULT 0,
            deduction_absence REAL DEFAULT 0,
            deduction_cashadvance REAL DEFAULT 0,
            deduction_other REAL DEFAULT 0,
            FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS shifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shift_name TEXT NOT NULL,
            time_range TEXT NOT NULL,
            store_id INTEGER,
            FOREIGN KEY(store_id) REFERENCES stores(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER,
            shift_id INTEGER,
            store_id INTEGER,
            date TEXT,
            clock_in TEXT,
            clock_out TEXT,
            selfie TEXT,
            status TEXT,
            FOREIGN KEY(employee_id) REFERENCES employees(id),
            FOREIGN KEY(shift_id) REFERENCES shifts(id),
            FOREIGN KEY(store_id) REFERENCES stores(id)
        )`);

        db.get(`SELECT COUNT(*) as count FROM stores`, (err, row) => {
            if (row.count === 0) {
                const storesData = [
                    { name: 'MANAGEMENT SMB', code: 'SMB', lat: -6.9175, lon: 107.6191 },
                    { name: 'MIXUE MAJALAYA', code: 'MAJ', lat: -7.0385, lon: 107.7512 },
                    { name: 'MIXUE NANJUNG', code: 'NAN', lat: -6.9274, lon: 107.5311 },
                    { name: 'MIXUE TANJUNG SARI', code: 'TSD', lat: -6.8912, lon: 107.7854 },
                    { name: 'MIXUE KADIPATEN', code: 'KDP', lat: -6.7123, lon: 108.2045 },
                    { name: 'MIXUE CIMALAKA', code: 'CIM', lat: -6.8321, lon: 107.9234 },
                    { name: 'MIXUE JATIWANGI', code: 'JTW', lat: -6.7451, lon: 108.2612 },
                    { name: 'MIXUE MALANGBONG', code: 'MLB', lat: -7.1324, lon: 107.9821 }
                ];

                storesData.forEach((s) => {
                    db.run(`INSERT INTO stores (store_name, latitude, longitude, radius_meter) VALUES (?, ?, ?, 50000)`, [s.name, s.lat, s.lon], function(err) {
                        if (!err) {
                            const storeId = this.lastID;
                            db.run(`INSERT INTO shifts (shift_name, time_range, store_id) VALUES ('Shift Pagi', '08:00 - 16:00', ?)`, [storeId]);
                            db.run(`INSERT INTO shifts (shift_name, time_range, store_id) VALUES ('Shift Siang', '12:00 - 20:00', ?)`, [storeId]);
                        }
                    });
                });

                // Inisialisasi Admin
                db.run(`INSERT INTO employees (employee_id, name, job_position, organization, bank, no_rekening, pin, join_date, store_id) VALUES ('admin', 'Administrator Pusat', 'ADMINISTRATOR', 'MANAGEMENT SMB', '-', '-', 'admin123', '2024-01-01', 1)`, function(err) {
                    if (!err) {
                        db.run(`INSERT INTO employee_salaries (employee_id) VALUES (?)`, [this.lastID]);
                    }
                });

                const employeesList = [
                    ['ASEP HAMIDILLAH', 'AREA MANAGER', 'MANAGEMENT SMB', 'BCA', '4181044351', '1700000', '2024-01-10', 'MANAGEMENT SMB'],
                    ['DIMAS GUNAWAN', 'AREA MANAGER', 'Management SMB', 'Mandiri', '1300023002416', '1800000', '2024-01-10', 'MANAGEMENT SMB'],
                    ['ROBI IKBAL JAELANI', 'SHIFT LEADER', 'MIXUE MAJALAYA', 'BCA', '3761565581', '1650000', '2024-03-01', 'MIXUE MAJALAYA'],
                    ['FEBRI ANDRIYANI', 'OUTLET CREW', 'MIXUE MAJALAYA', 'Seabank Indonesia', '901384598431', '1650000', '2024-04-12', 'MIXUE MAJALAYA'],
                    ['HARI MAHAR DIKA AGUSTIANSYAH', 'OUTLET CREW', 'MIXUE MAJALAYA', 'Seabank Indonesia', '901537710240', '1500000', '2024-05-15', 'MIXUE MAJALAYA'],
                    ['IRVAN RAVLI', 'OUTLET CREW', 'MIXUE MAJALAYA', 'BCA', '7840314485', '1500000', '2024-06-01', 'MIXUE MAJALAYA'],
                    ['ANDHIKA SAPUTRA', 'PROBATION', 'MIXUE MAJALAYA', 'Seabank Indonesia', '9014411398435', '1200000', '2025-01-10', 'MIXUE MAJALAYA'],
                    ['SITI LUCYTA', 'SHIFT LEADER PROBATION', 'MIXUE NANJUNG', 'Mandiri', '1320025875346', '1650000', '2024-03-15', 'MIXUE NANJUNG'],
                    ['Andika', 'OUTLET CREW', 'MIXUE NANJUNG', 'BCA', '7495056210', '1650000', '2024-04-01', 'MIXUE NANJUNG'],
                    ['CHASA WARGANA', 'OUTLET CREW', 'MIXUE NANJUNG', 'Seabank Indonesia', '901943331407', '1650000', '2024-04-10', 'MIXUE NANJUNG'],
                    ['Raka Haditya', 'PROBATION', 'MIXUE NANJUNG', 'Seabank Indonesia', '901051758489', '1200000', '2025-01-15', 'MIXUE NANJUNG'],
                    ['Riska Nuraini', 'TRAINING', 'MIXUE NANJUNG', 'Seabank Indonesia', '901154854445', '0', '2025-02-01', 'MIXUE NANJUNG'],
                    ['Angga Rahayu', 'SHIFT LEADER PROBATION', 'MIXUE TANJUNG SARI', 'Seabank Indonesia', '901005306004', '1400000', '2024-05-01', 'MIXUE TANJUNG SARI'],
                    ['Rendi Aprilyansah', 'OUTLET CREW', 'MIXUE TANJUNG SARI', 'Seabank Indonesia', '901009832910', '1650000', '2024-05-10', 'MIXUE TANJUNG SARI'],
                    ['Nofia Ramadani', 'OUTLET CREW', 'MIXUE TANJUNG SARI', 'BCA', '7405235765', '1400000', '2024-06-01', 'MIXUE TANJUNG SARI'],
                    ['ANDRA NURANANDA', 'OUTLET CREW', 'MIXUE TANJUNG SARI', 'BCA', '6395491036', '1650000', '2024-06-15', 'MIXUE TANJUNG SARI'],
                    ['Muhamad Reza Setiawan', 'OUTLET CREW', 'MIXUE TANJUNG SARI', 'Seabank Indonesia', '901870456845', '1400000', '2024-07-01', 'MIXUE TANJUNG SARI'],
                    ['FAISHAL FADHIL', 'SHIFT LEADER', 'MIXUE KADIPATEN', 'BRI', '429701011754508', '1550000', '2024-02-01', 'MIXUE KADIPATEN'],
                    ['Dea Mutiarani', 'OUTLET CREW', 'MIXUE KADIPATEN', 'Seabank Indonesia', '901827647735', '1400000', '2024-03-01', 'MIXUE KADIPATEN'],
                    ['MUHAMAD FAJAR DWI FIRMANSYAH', 'OUTLET CREW', 'MIXUE KADIPATEN', 'BCA', '7381088484', '1400000', '2024-04-01', 'MIXUE KADIPATEN'],
                    ['Elja Firmansyah', 'PROBATION', 'MIXUE KADIPATEN', 'Seabank Indonesia', '901788572741', '1100000', '2025-01-01', 'MIXUE KADIPATEN'],
                    ['Rheinaldhy Mahardhika Permana', 'OUTLET CREW', 'MIXUE KADIPATEN', 'BNI', '2082463913', '1100000', '2025-01-10', 'MIXUE KADIPATEN'],
                    ['ACENG NUROHMAT', 'SHIFT LEADER', 'MIXUE CIMALAKA', 'Mandiri', '1310021865292', '1550000', '2024-02-15', 'MIXUE CIMALAKA'],
                    ['Dinni Aryanti', 'OUTLET CREW', 'MIXUE CIMALAKA', 'Mandiri', '1310021697786', '1400000', '2024-03-10', 'MIXUE CIMALAKA'],
                    ['JOHAN', 'OUTLET CREW', 'MIXUE CIMALAKA', 'Seabank Indonesia', '901226385002', '1400000', '2024-04-15', 'MIXUE CIMALAKA'],
                    ['Zaki Hakim', 'OUTLET CREW', 'MIXUE CIMALAKA', 'BCA', '6282369130', '1400000', '2024-05-01', 'MIXUE CIMALAKA'],
                    ['Muhammad Andra Septian', 'PROBATION', 'MIXUE CIMALAKA', 'Seabank Indonesia', '901994124626', '1100000', '2025-01-05', 'MIXUE CIMALAKA'],
                    ['Dandi Lesmana', 'TRAINING', 'MIXUE CIMALAKA', 'BNI', '1979024997', '0', '2025-02-10', 'MIXUE CIMALAKA'],
                    ['REQY AGUNG GUMELAR', 'SHIFT LEADER', 'MIXUE JATIWANGI', 'BCA', '8180388371', '1550000', '2024-01-20', 'MIXUE JATIWANGI'],
                    ['RAMANDA PUTRA WALUYO', 'OUTLET CREW', 'MIXUE JATIWANGI', 'BRI', '430501009909500', '1400000', '2024-03-01', 'MIXUE JATIWANGI'],
                    ['Naufal Shidiq', 'OUTLET CREW', 'MIXUE JATIWANGI', 'Mandiri', '1340029442430', '1400000', '2024-04-01', 'MIXUE JATIWANGI'],
                    ['Puja Esti Pangestu', 'OUTLET CREW', 'MIXUE JATIWANGI', 'Seabank Indonesia', '901458868785', '1550000', '2024-05-01', 'MIXUE JATIWANGI'],
                    ['Tegar Nugraha', 'PROBATION', 'MIXUE JATIWANGI', 'BRI', '130301006563534', '1100000', '2025-01-12', 'MIXUE JATIWANGI'],
                    ['ANDI AHMAD', 'SHIFT LEADER PROBATION', 'MIXUE MALANGBONG', 'Mandiri', '1310021001948', '1550000', '2024-06-01', 'MIXUE MALANGBONG'],
                    ['MUTIA DWI ANDANI', 'PROBATION', 'MIXUE MALANGBONG', 'BNI', '1987004062', '1100000', '2025-01-15', 'MIXUE MALANGBONG'],
                    ['Egi Juwandi', 'PROBATION', 'MIXUE MALANGBONG', 'Mandiri', '1310023897830', '1100000', '2025-01-20', 'MIXUE MALANGBONG'],
                    ['Jujun Azzuhri', 'PROBATION', 'MIXUE MALANGBONG', 'Seabank Indonesia', '901437485150', '1100000', '2025-02-01', 'MIXUE MALANGBONG']
                ];

                setTimeout(() => {
                    const storeCounters = {};
                    employeesList.forEach((emp) => {
                        const orgName = emp[7];
                        const joinDate = emp[6];
                        const basicSalaryNum = parseFloat(emp[5]) || 0;
                        const matchedStore = storesData.find(s => s.name.toUpperCase() === orgName.toUpperCase());
                        const storeCode = matchedStore ? matchedStore.code : 'MIX';
                        
                        if (!storeCounters[storeCode]) {
                            storeCounters[storeCode] = 1;
                        } else {
                            storeCounters[storeCode]++;
                        }

                        const sequenceNum = String(storeCounters[storeCode]).padStart(3, '0');
                        const uniqueEmpId = `${storeCode}-${sequenceNum}`;

                        db.get(`SELECT id FROM stores WHERE store_name = ?`, [orgName], (err, storeRow) => {
                            if (storeRow) {
                                db.run(`INSERT INTO employees (employee_id, name, job_position, organization, bank, no_rekening, pin, join_date, store_id) VALUES (?, ?, ?, ?, ?, ?, '1234', ?, ?)`, 
                                    [uniqueEmpId, emp[0], emp[1], emp[2], emp[3], emp[4], joinDate, storeRow.id], function(err) {
                                        if (!err) {
                                            const newEmpId = this.lastID;
                                            // Masukkan data default komponen gaji (Parent-Child)
                                            db.run(`INSERT INTO employee_salaries (employee_id, basic_salary) VALUES (?, ?)`, [newEmpId, basicSalaryNum]);
                                        }
                                    });
                            }
                        });
                    });
                }, 500);

                console.log('Database komponen gaji berhasil diinisialisasi.');
            }
        });
    });
}

module.exports = db;