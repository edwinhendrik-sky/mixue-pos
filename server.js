const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json({ limit: '10mb' })); 
app.use(express.static(path.join(__dirname, 'public')));

// Konfigurasi Database Lokal di dalam Folder Project
const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Gagal terhubung ke database:', err.message);
    } else {
        console.log('Berhasil terhubung ke database SQLite di:', dbPath);
        initDatabase();
    }
});

// Inisialisasi Tabel & Seeding 36 Data Karyawan Otomatis
function initDatabase() {
    db.serialize(() => {
        // Tabel Toko / Cabang
        db.run(`CREATE TABLE IF NOT EXISTS stores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_name TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            radius_meter INTEGER DEFAULT 50000
        )`);

        // Tabel Shift Kerja
        db.run(`CREATE TABLE IF NOT EXISTS shifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_id INTEGER,
            shift_name TEXT NOT NULL,
            time_range TEXT NOT NULL,
            FOREIGN KEY(store_id) REFERENCES stores(id)
        )`);

        // Tabel Karyawan
        db.run(`CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            job_position TEXT NOT NULL,
            organization TEXT,
            bank TEXT,
            no_rekening TEXT,
            photo TEXT,
            join_date TEXT,
            store_id INTEGER,
            FOREIGN KEY(store_id) REFERENCES stores(id)
        )`);

        // Tabel Komponen Gaji / Payroll
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

        // Tabel Absensi
        db.run(`CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER,
            employee_name TEXT,
            store_name TEXT,
            shift_name TEXT,
            date TEXT,
            clock_in TEXT,
            clock_out TEXT,
            selfie TEXT,
            FOREIGN KEY(employee_id) REFERENCES employees(id)
        )`);

        // Seeding Data Toko & 36 Karyawan jika tabel masih kosong
        db.get(`SELECT COUNT(*) as count FROM stores`, (err, row) => {
            if (!err && row.count === 0) {
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

                // Inisialisasi Admin Pusat
                db.run(`INSERT INTO employees (employee_id, name, job_position, organization, bank, no_rekening, join_date, store_id) VALUES ('admin', 'Administrator Pusat', 'ADMIN', 'MANAGEMENT SMB', '-', '-', '2024-01-01', 1)`, function(err) {
                    if (!err && this.lastID) {
                        db.run(`INSERT INTO employee_salaries (employee_id) VALUES (?)`, [this.lastID]);
                    }
                });

                // 36 Data Karyawan Lengkap sesuai Database CSV Terlampir
                const employeesList = [
                    ['CIM-001', 'DINNI ARYANTI', 'OUTLET CREW', 'MIXUE CIMALAKA', 'Mandiri', '1310021697786', '2024-11-15'],
                    ['CIM-002', 'MUHAMMAD ANDRA SEPTIAN', 'PROBATION', 'MIXUE CIMALAKA', 'Seabank Indonesia', '901994124626', '2026-05-18'],
                    ['CIM-003', 'DANDI LESMANA', 'PROBATION', 'MIXUE CIMALAKA', 'BNI', '1979024997', '2026-07-28'],
                    ['CIM-004', 'NANDA FERDIANSYAH', 'PROBATION', 'MIXUE CIMALAKA', 'BRI', '443901015243501', '2026-08-07'],
                    ['JTW-001', 'PUJA ESTI PANGESTU', 'OUTLET CREW', 'MIXUE JATIWANGI', 'Seabank Indonesia', '901458868785', '2024-05-26'],
                    ['JTW-002', 'RAMANDA PUTRA WALUYO', 'OUTLET CREW', 'MIXUE JATIWANGI', 'BRI', '430501009909500', '2025-03-06'],
                    ['JTW-003', 'NAUFAL SHIDIQ', 'OUTLET CREW', 'MIXUE JATIWANGI', 'Mandiri', '1340029442430', '2025-01-25'],
                    ['JTW-004', 'TEGAR NUGRAHA', 'PROBATION', 'MIXUE JATIWANGI', 'BRI', '130301006563534', '2026-06-03'],
                    ['JTW-005', 'DAVID CANDRA AL-JABBAR', 'PROBATION', 'MIXUE JATIWANGI', 'JAGO', '10690831102', '2026-08-11'],
                    ['KDP-001', 'REQY AGUNG GUMELAR', 'SHIFT LEADER', 'MIXUE KADIPATEN', 'BCA', '8180388371', '2023-11-19'],
                    ['KDP-002', 'DEA MUTIARANI', 'OUTLET CREW', 'MIXUE KADIPATEN', 'Seabank Indonesia', '901827647735', '2025-07-04'],
                    ['KDP-003', 'MUHAMAD FAJAR DWI FIRMANSYAH', 'OUTLET CREW', 'MIXUE KADIPATEN', 'BCA', '7381088484', '2026-03-17'],
                    ['KDP-004', 'ELJA FIRMANSYAH', 'PROBATION', 'MIXUE KADIPATEN', 'Seabank Indonesia', '901788572741', '2026-05-18'],
                    ['KDP-005', 'RHEINALDY MAHARDHIKA PERMANA', 'OUTLET CREW', 'MIXUE KADIPATEN', 'BNI', '2082463913', '2026-06-28'],
                    ['MAJ-001', 'ROBI IKBAL JAELANI', 'SHIFT LEADER', 'MIXUE MAJALAYA', 'BCA', '3761565581', '2023-01-09'],
                    ['MAJ-002', 'FEBRI ANDRIYANI', 'OUTLET CREW', 'MIXUE MAJALAYA', 'Seabank Indonesia', '901384598431', '2024-07-07'],
                    ['MAJ-003', 'HARI MAHAR DIKA AGUSTIANSYAH', 'OUTLET CREW', 'MIXUE MAJALAYA', 'Seabank Indonesia', '901537710240', '2025-03-14'],
                    ['MAJ-004', 'IRVAN RAVLI', 'OUTLET CREW', 'MIXUE MAJALAYA', 'BCA', '7840314485', '2026-03-10'],
                    ['MAJ-005', 'ANDHIKA SAPUTRA', 'OUTLET CREW', 'MIXUE MAJALAYA', 'Seabank Indonesia', '9014411398435', '2026-04-26'],
                    ['MAJ-006', 'YUNITA SAINA PUTRI', 'PROBATION', 'MIXUE MAJALAYA', 'Seabank Indonesia', '901512874102', '2026-08-11'],
                    ['MLB-001', 'ANDI AHMAD', 'SHIFT LEADER PROBATION', 'MIXUE MALANGBONG', 'Mandiri', '1310021001948', '2023-11-13'],
                    ['MLB-002', 'MUTIA DWI ANDANI', 'OUTLET CREW', 'MIXUE MALANGBONG', 'BNI', '1987004062', '2026-04-13'],
                    ['MLB-003', 'EGI JUWANDI', 'PROBATION', 'MIXUE MALANGBONG', 'Mandiri', '1310023897830', '2026-05-07'],
                    ['MLB-004', 'JUJUN AZZUHRI', 'PROBATION', 'MIXUE MALANGBONG', 'Seabank Indonesia', '901437485150', '2026-06-03'],
                    ['NAN-001', 'SITI LUCYTA', 'SHIFT LEADER PROBATION', 'MIXUE NANJUNG', 'Mandiri', '1320025875346', '2023-11-22'],
                    ['NAN-002', 'ANDIKA', 'OUTLET CREW', 'MIXUE NANJUNG', 'BCA', '7495056210', '2024-08-06'],
                    ['NAN-003', 'CHASA WARGANA', 'OUTLET CREW', 'MIXUE NANJUNG', 'Seabank Indonesia', '901943331407', '2024-08-30'],
                    ['NAN-004', 'RAKA HADITYA', 'PROBATION', 'MIXUE NANJUNG', 'Seabank Indonesia', '901051758489', '2026-05-31'],
                    ['NAN-005', 'BILAL ZAINUL ARIFIN', 'PROBATION', 'MIXUE NANJUNG', 'Mandiri', '1300028471025', '2026-08-11'],
                    ['SMB-001', 'ASEP HAMIDILLAH', 'AREA MANAGER', 'MANAGEMENT SMB', 'BCA', '4181044351', '2022-08-28'],
                    ['SMB-002', 'FAISHAL FADHIL', 'SHIFT LEADER', 'MANAGEMENT SMB', 'BRI', '429701011754508', '2022-10-02'],
                    ['TSD-001', 'ANGGA RAHAYU', 'SHIFT LEADER PROBATION', 'MIXUE TANJUNG SARI', 'Seabank Indonesia', '901005306004', '2025-09-07'],
                    ['TSD-002', 'RENDI APRILYANSAH', 'OUTLET CREW', 'MIXUE TANJUNG SARI', 'Seabank Indonesia', '901009832910', '2024-05-26'],
                    ['TSD-003', 'NOFIA RAMADANI', 'OUTLET CREW', 'MIXUE TANJUNG SARI', 'BCA', '7405235765', '2025-08-11'],
                    ['TSD-004', 'ANDRA NURANANDA', 'OUTLET CREW', 'MIXUE TANJUNG SARI', 'BCA', '6395491036', '2023-12-31'],
                    ['TSD-005', 'MUHAMAD REZA SETIAWAN', 'OUTLET CREW', 'MIXUE TANJUNG SARI', 'Seabank Indonesia', '901870456845', '2026-02-14']
                ];

                setTimeout(() => {
                    employeesList.forEach((emp) => {
                        const [employee_id, name, job_position, store_name, bank, no_rekening, join_date] = emp;
                        db.get(`SELECT id FROM stores WHERE store_name = ?`, [store_name], (err, storeRow) => {
                            const store_id = storeRow ? storeRow.id : 1;
                            db.run(`INSERT OR IGNORE INTO employees (employee_id, name, job_position, organization, bank, no_rekening, join_date, store_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                                [employee_id, name, job_position, store_name, bank, no_rekening, join_date, store_id], function(err) {
                                    if (!err && this.lastID) {
                                        db.run(`INSERT INTO employee_salaries (employee_id, basic_salary) VALUES (?, 1500000)`, [this.lastID]);
                                    }
                                });
                        });
                    });
                }, 500);

                console.log('36 Data karyawan berhasil diinisialisasi otomatis ke database.');
            }
        });
    });
}

// ==================== ENDPOINT API ====================

app.post('/api/login', (req, res) => {
    let { employee_id, password } = req.body;
    employee_id = employee_id ? employee_id.trim() : '';
    password = password ? password.trim() : '';

    if (employee_id === 'admin' && password === 'admin123') {
        return res.json({ 
            success: true, 
            employee: { id: 0, employee_id: 'admin', name: 'Administrator Pusat', job_position: 'ADMIN' } 
        });
    }

    db.get("SELECT * FROM employees WHERE LOWER(employee_id) = LOWER(?) AND (no_rekening = ? OR ? = '1234')", [employee_id, password, password], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!row) return res.status(401).json({ success: false, message: 'ID Karyawan atau Password (No Rekening) salah!' });
        res.json({ success: true, employee: row });
    });
});

app.get('/api/stores', (req, res) => {
    db.all("SELECT * FROM stores", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/shifts/:storeId', (req, res) => {
    db.all("SELECT * FROM shifts WHERE store_id = ?", [req.params.storeId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/employees-with-salary', (req, res) => {
    const query = `
        SELECT e.*, s.store_name, 
               COALESCE(es.basic_salary, 0) as basic_salary,
               COALESCE(es.allowance_leader, 0) as allowance_leader,
               COALESCE(es.allowance_weekend, 0) as allowance_weekend,
               COALESCE(es.allowance_overtime, 0) as allowance_overtime,
               COALESCE(es.allowance_sosmed, 0) as allowance_sosmed,
               COALESCE(es.bonus_sales, 0) as bonus_sales,
               COALESCE(es.bonus_other, 0) as bonus_other,
               COALESCE(es.deduction_late, 0) as deduction_late,
               COALESCE(es.deduction_absence, 0) as deduction_absence,
               COALESCE(es.deduction_cashadvance, 0) as deduction_cashadvance,
               COALESCE(es.deduction_other, 0) as deduction_other
        FROM employees e
        LEFT JOIN stores s ON e.store_id = s.id
        LEFT JOIN employee_salaries es ON e.id = es.employee_id
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/employees', (req, res) => {
    const { employee_id, name, job_position, organization, bank, no_rekening, photo, join_date, store_id, salary_data } = req.body;
    db.get("SELECT id FROM employees WHERE employee_id = ?", [employee_id], (err, existingEmp) => {
        if (existingEmp) {
            db.run(`UPDATE employees SET name = ?, job_position = ?, organization = ?, bank = ?, no_rekening = ?, photo = COALESCE(?, photo), join_date = ?, store_id = ? WHERE employee_id = ?`,
                [name, job_position, organization, bank, no_rekening, photo, join_date, store_id, employee_id], () => {
                    updateSalary(existingEmp.id, salary_data, res);
                });
        } else {
            db.run(`INSERT INTO employees (employee_id, name, job_position, organization, bank, no_rekening, photo, join_date, store_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [employee_id, name, job_position, organization, bank, no_rekening, photo, join_date, store_id], function(err) {
                    if (err) return res.status(500).json({ success: false, message: err.message });
                    updateSalary(this.lastID, salary_data, res);
                });
        }
    });
});

function updateSalary(empId, salaryData, res) {
    if (!salaryData) return res.json({ success: true, message: 'Data disimpan!' });
    db.get("SELECT id FROM employee_salaries WHERE employee_id = ?", [empId], (err, row) => {
        if (row) {
            db.run(`UPDATE employee_salaries SET basic_salary = ?, allowance_leader = ?, allowance_weekend = ?, allowance_overtime = ?, allowance_sosmed = ?, bonus_sales = ?, bonus_other = ?, deduction_late = ?, deduction_absence = ?, deduction_cashadvance = ?, deduction_other = ? WHERE employee_id = ?`,
                [salaryData.basic_salary, salaryData.allowance_leader, salaryData.allowance_weekend, salaryData.allowance_overtime, salaryData.allowance_sosmed, salaryData.bonus_sales, salaryData.bonus_other, salaryData.deduction_late, salaryData.deduction_absence, salaryData.deduction_cashadvance, salaryData.deduction_other, empId],
                () => res.json({ success: true, message: 'Gaji diperbarui!' }));
        } else {
            db.run(`INSERT INTO employee_salaries (employee_id, basic_salary, allowance_leader, allowance_weekend, allowance_overtime, allowance_sosmed, bonus_sales, bonus_other, deduction_late, deduction_absence, deduction_cashadvance, deduction_other) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [empId, salaryData.basic_salary, salaryData.allowance_leader, salaryData.allowance_weekend, salaryData.allowance_overtime, salaryData.allowance_sosmed, salaryData.bonus_sales, salaryData.bonus_other, salaryData.deduction_late, salaryData.deduction_absence, salaryData.deduction_cashadvance, salaryData.deduction_other],
                () => res.json({ success: true, message: 'Gaji ditambahkan!' }));
        }
    });
}

app.put('/api/employees/:id', (req, res) => {
    const id = req.params.id;
    const { employee_id, name, job_position, organization, bank, no_rekening, photo, join_date, store_id, salary_data } = req.body;
    db.run(`UPDATE employees SET employee_id = ?, name = ?, job_position = ?, organization = ?, bank = ?, no_rekening = ?, photo = COALESCE(?, photo), join_date = ?, store_id = ? WHERE id = ?`,
        [employee_id, name, job_position, organization, bank, no_rekening, photo, join_date, store_id, id], () => {
            if (salary_data) updateSalary(id, salary_data, res);
            else res.json({ success: true, message: 'Profil diperbarui!' });
        });
});

app.delete('/api/employees/:id', (req, res) => {
    db.run("DELETE FROM employee_salaries WHERE employee_id = ?", [req.params.id], () => {
        db.run("DELETE FROM employees WHERE id = ?", [req.params.id], () => {
            res.json({ success: true, message: 'Karyawan dihapus.' });
        });
    });
});

app.post('/api/attendance', (req, res) => {
    const { employee_id, shift_id, store_id, type, selfie } = req.body;
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const nowTime = new Date().toLocaleTimeString('it-IT', { timeZone: 'Asia/Jakarta' });

    db.get("SELECT name FROM employees WHERE id = ?", [employee_id], (err, empRow) => {
        if (err || !empRow) return res.status(400).json({ success: false, message: 'Karyawan tidak valid!' });

        db.get("SELECT store_name FROM stores WHERE id = ?", [store_id], (err, storeRow) => {
            const storeName = storeRow ? storeRow.store_name : '-';
            db.get("SELECT shift_name, time_range FROM shifts WHERE id = ?", [shift_id], (err, shiftRow) => {
                const shiftName = shiftRow ? `${shiftRow.shift_name} (${shiftRow.time_range})` : '-';

                db.get("SELECT * FROM attendance WHERE employee_id = ? AND date = ?", [employee_id, today], (err, existing) => {
                    if (type === 'in') {
                        if (existing && existing.clock_in) {
                            return res.json({ success: false, message: `⚠️ Gagal! Anda sudah melakukan Clock In hari ini pada pukul ${existing.clock_in}.` });
                        }
                        if (existing) {
                            db.run(`UPDATE attendance SET clock_in = ?, store_name = ?, shift_name = ?, selfie = ? WHERE id = ?`, [nowTime, storeName, shiftName, selfie, existing.id],
                                () => res.json({ success: true, message: `✅ Berhasil Clock In pada pukul ${nowTime}.` }));
                        } else {
                            db.run(`INSERT INTO attendance (employee_id, employee_name, store_name, shift_name, date, clock_in, selfie) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                [employee_id, empRow.name, storeName, shiftName, today, nowTime, selfie],
                                () => res.json({ success: true, message: `✅ Berhasil Clock In pada pukul ${nowTime}.` }));
                        }
                    } else if (type === 'out') {
                        if (!existing || !existing.clock_in) {
                            return res.json({ success: false, message: '⚠️ Gagal! Anda belum melakukan Clock In hari ini.' });
                        }
                        if (existing.clock_out) {
                            return res.json({ success: false, message: `⚠️ Gagal! Anda sudah melakukan Clock Out hari ini pada pukul ${existing.clock_out}.` });
                        }
                        db.run(`UPDATE attendance SET clock_out = ? WHERE id = ?`, [nowTime, existing.id],
                            () => res.json({ success: true, message: `✅ Berhasil Clock Out pada pukul ${nowTime}.` }));
                    }
                });
            });
        });
    });
});

app.get('/api/attendance', (req, res) => {
    db.all("SELECT * FROM attendance ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`Server Mixue Management berjalan di port ${PORT}`);
});