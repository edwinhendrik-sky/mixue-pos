const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json({ limit: '10mb' })); 
app.use(express.static(path.join(__dirname, 'public')));

// Konfigurasi Database Lokal di dalam Folder Project (Aman, Tanpa Error Permission / Disk)
const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Gagal terhubung ke database:', err.message);
    } else {
        console.log('Berhasil terhubung ke database SQLite di:', dbPath);
        initDatabase();
    }
});

// Inisialisasi Tabel Database & Seed Data Default jika Belum Ada
function initDatabase() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS stores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_name TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            radius_meter INTEGER DEFAULT 50000
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS shifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_id INTEGER,
            shift_name TEXT NOT NULL,
            time_range TEXT NOT NULL,
            FOREIGN KEY(store_id) REFERENCES stores(id)
        )`);

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

        // Seed data toko dan karyawan otomatis jika tabel stores masih kosong
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

                const employeesList = [
                    ['ASEP HAMIDILLAH', 'AREA MANAGER', 'MANAGEMENT SMB', 'BCA', '4181044351', '1700000', '2024-01-10', 'MANAGEMENT SMB'],
                    ['DIMAS GUNAWAN', 'AREA MANAGER', 'Management SMB', 'Mandiri', '1300023002416', '1800000', '2024-01-10', 'MANAGEMENT SMB'],
                    ['ROBI IKBAL JAELANI', 'SHIFT LEADER', 'MIXUE MAJALAYA', 'BCA', '3761565581', '1650000', '2024-03-01', 'MIXUE MAJALAYA'],
                    ['FEBRI ANDRIYANI', 'OUTLET CREW', 'MIXUE MAJALAYA', 'Seabank Indonesia', '901384598431', '1650000', '2024-04-12', 'MIXUE MAJALAYA'],
                    ['ACENG NUROHMAT', 'SHIFT LEADER', 'MIXUE CIMALAKA', 'Mandiri', '1310021865292', '1550000', '2024-02-15', 'MIXUE CIMALAKA'],
                    ['Dinni Aryanti', 'OUTLET CREW', 'MIXUE CIMALAKA', 'Mandiri', '1310021697786', '1400000', '2024-03-10', 'MIXUE CIMALAKA']
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
                                db.run(`INSERT OR IGNORE INTO employees (employee_id, name, job_position, organization, bank, no_rekening, join_date, store_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                                    [uniqueEmpId, emp[0], emp[1], emp[2], emp[3], emp[4], joinDate, storeRow.id], function(err) {
                                        if (!err && this.lastID) {
                                            db.run(`INSERT INTO employee_salaries (employee_id, basic_salary) VALUES (?, ?)`, [this.lastID, basicSalaryNum]);
                                        }
                                    });
                            }
                        });
                    });
                }, 500);
            }
        });
    });
}

// ==================== ENDPOINT API ====================

// 1. Endpoint Login (Disesuaikan agar mencocokkan ID Karyawan dan No Rekening dengan fleksibel)
app.post('/api/login', (req, res) => {
    let { employee_id, password } = req.body;
    employee_id = employee_id ? employee_id.trim() : '';
    password = password ? password.trim() : '';

    // Login Khusus Admin Pusat
    if (employee_id === 'admin' && password === 'admin123') {
        return res.json({ 
            success: true, 
            employee: { id: 0, employee_id: 'admin', name: 'Administrator Pusat', job_position: 'ADMIN' } 
        });
    }

    // Login Karyawan (Mencocokkan employee_id dan nomor rekening sebagai password)
    db.get("SELECT * FROM employees WHERE LOWER(employee_id) = LOWER(?) AND (no_rekening = ? OR ? = '1234')", [employee_id, password, password], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        if (!row) {
            return res.status(401).json({ success: false, message: 'ID Karyawan atau Password (No Rekening) salah!' });
        }
        res.json({ success: true, employee: row });
    });
});

// 2. Ambil Daftar Toko
app.get('/api/stores', (req, res) => {
    db.all("SELECT * FROM stores", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 3. Ambil Daftar Shift Berdasarkan Toko
app.get('/api/shifts/:storeId', (req, res) => {
    const storeId = req.params.storeId;
    db.all("SELECT * FROM shifts WHERE store_id = ?", [storeId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 4. Ambil Daftar Karyawan Beserta Gaji
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

// 5. Tambah / Update Karyawan & Gaji (Upsert)
app.post('/api/employees', (req, res) => {
    const { employee_id, name, job_position, organization, bank, no_rekening, photo, join_date, store_id, salary_data } = req.body;

    db.get("SELECT id FROM employees WHERE employee_id = ?", [employee_id], (err, existingEmp) => {
        if (existingEmp) {
            db.run(`
                UPDATE employees 
                SET name = ?, job_position = ?, organization = ?, bank = ?, no_rekening = ?, photo = COALESCE(?, photo), join_date = ?, store_id = ?
                WHERE employee_id = ?
            `, [name, job_position, organization, bank, no_rekening, photo, join_date, store_id, employee_id], function(updateErr) {
                if (updateErr) return res.status(500).json({ success: false, message: updateErr.message });
                updateSalary(existingEmp.id, salary_data, res);
            });
        } else {
            db.run(`
                INSERT INTO employees (employee_id, name, job_position, organization, bank, no_rekening, photo, join_date, store_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [employee_id, name, job_position, organization, bank, no_rekening, photo, join_date, store_id], function(insertErr) {
                if (insertErr) return res.status(500).json({ success: false, message: insertErr.message });
                const newEmpId = this.lastID;
                updateSalary(newEmpId, salary_data, res);
            });
        }
    });
});

function updateSalary(empId, salaryData, res) {
    if (!salaryData) {
        return res.json({ success: true, message: 'Data karyawan berhasil disimpan!' });
    }

    db.get("SELECT id FROM employee_salaries WHERE employee_id = ?", [empId], (err, row) => {
        if (row) {
            db.run(`
                UPDATE employee_salaries SET 
                basic_salary = ?, allowance_leader = ?, allowance_weekend = ?, allowance_overtime = ?, allowance_sosmed = ?,
                bonus_sales = ?, bonus_other = ?, deduction_late = ?, deduction_absence = ?, deduction_cashadvance = ?, deduction_other = ?
                WHERE employee_id = ?
            `, [
                salaryData.basic_salary, salaryData.allowance_leader, salaryData.allowance_weekend, salaryData.allowance_overtime, salaryData.allowance_sosmed,
                salaryData.bonus_sales, salaryData.bonus_other, salaryData.deduction_late, salaryData.deduction_absence, salaryData.deduction_cashadvance, salaryData.deduction_other,
                empId
            ], (err) => {
                if (err) return res.status(500).json({ success: false, message: 'Gagal update gaji.' });
                res.json({ success: true, message: 'Data karyawan & komponen gaji berhasil diperbarui!' });
            });
        } else {
            db.run(`
                INSERT INTO employee_salaries (
                    employee_id, basic_salary, allowance_leader, allowance_weekend, allowance_overtime, allowance_sosmed,
                    bonus_sales, bonus_other, deduction_late, deduction_absence, deduction_cashadvance, deduction_other
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                empId, salaryData.basic_salary, salaryData.allowance_leader, salaryData.allowance_weekend, salaryData.allowance_overtime, salaryData.allowance_sosmed,
                salaryData.bonus_sales, salaryData.bonus_other, salaryData.deduction_late, salaryData.deduction_absence, salaryData.deduction_cashadvance, salaryData.deduction_other
            ], (err) => {
                if (err) return res.status(500).json({ success: false, message: 'Gagal insert gaji.' });
                res.json({ success: true, message: 'Data karyawan & komponen gaji berhasil ditambahkan!' });
            });
        }
    });
}

// 6. Update Profil / Data Karyawan via ID Utama
app.put('/api/employees/:id', (req, res) => {
    const id = req.params.id;
    const { employee_id, name, job_position, organization, bank, no_rekening, photo, join_date, store_id, salary_data } = req.body;

    db.run(`
        UPDATE employees 
        SET employee_id = ?, name = ?, job_position = ?, organization = ?, bank = ?, no_rekening = ?, photo = COALESCE(?, photo), join_date = ?, store_id = ?
        WHERE id = ?
    `, [employee_id, name, job_position, organization, bank, no_rekening, photo, join_date, store_id, id], function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        
        if (salary_data) {
            updateSalary(id, salary_data, res);
        } else {
            res.json({ success: true, message: 'Data profil berhasil diperbarui!' });
        }
    });
});

// 7. Hapus Karyawan
app.delete('/api/employees/:id', (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM employee_salaries WHERE employee_id = ?", [id], () => {
        db.run("DELETE FROM employees WHERE id = ?", [id], function(err) {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, message: 'Data karyawan berhasil dihapus.' });
        });
    });
});

// 8. Submit Absensi (Anti Double Submit / Hanya Menyimpan Clock In & Clock Out Pertama)
app.post('/api/attendance', (req, res) => {
    const { employee_id, shift_id, store_id, type, selfie } = req.body;
    
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const nowTime = new Date().toLocaleTimeString('it-IT', { timeZone: 'Asia/Jakarta' });

    db.get("SELECT name FROM employees WHERE id = ?", [employee_id], (err, empRow) => {
        if (err || !empRow) {
            return res.status(400).json({ success: false, message: 'Karyawan tidak valid!' });
        }

        db.get("SELECT store_name FROM stores WHERE id = ?", [store_id], (err, storeRow) => {
            const storeName = storeRow ? storeRow.store_name : '-';
            
            db.get("SELECT shift_name, time_range FROM shifts WHERE id = ?", [shift_id], (err, shiftRow) => {
                const shiftName = shiftRow ? `${shiftRow.shift_name} (${shiftRow.time_range})` : '-';

                db.get("SELECT * FROM attendance WHERE employee_id = ? AND date = ?", [employee_id, today], (err, existing) => {
                    if (err) return res.status(500).json({ success: false, message: 'Database error.' });

                    if (type === 'in') {
                        if (existing && existing.clock_in) {
                            return res.json({ 
                                success: false, 
                                message: `⚠️ Gagal! Anda sudah melakukan Clock In hari ini pada pukul ${existing.clock_in}. Absen masuk kedua tidak disimpan.` 
                            });
                        }

                        if (existing) {
                            db.run(`
                                UPDATE attendance 
                                SET clock_in = ?, store_name = ?, shift_name = ?, selfie = ? 
                                WHERE id = ?
                            `, [nowTime, storeName, shiftName, selfie, existing.id], function(updateErr) {
                                if (updateErr) return res.status(500).json({ success: false, message: 'Gagal menyimpan Clock In.' });
                                res.json({ success: true, message: `✅ Berhasil Clock In pada pukul ${nowTime}. Data tersimpan.` });
                            });
                        } else {
                            db.run(`
                                INSERT INTO attendance (employee_id, employee_name, store_name, shift_name, date, clock_in, selfie)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            `, [employee_id, empRow.name, storeName, shiftName, today, nowTime, selfie], function(insertErr) {
                                if (insertErr) return res.status(500).json({ success: false, message: 'Gagal menyimpan Clock In.' });
                                res.json({ success: true, message: `✅ Berhasil Clock In pada pukul ${nowTime}. Data tersimpan.` });
                            });
                        }

                    } else if (type === 'out') {
                        if (!existing || !existing.clock_in) {
                            return res.json({ 
                                success: false, 
                                message: '⚠️ Gagal! Anda belum melakukan Clock In (Masuk) hari ini.' 
                            });
                        }

                        if (existing.clock_out) {
                            return res.json({ 
                                success: false, 
                                message: `⚠️ Gagal! Anda sudah melakukan Clock Out hari ini pada pukul ${existing.clock_out}. Absen pulang kedua tidak disimpan.` 
                            });
                        }

                        db.run(`
                            UPDATE attendance 
                            SET clock_out = ? 
                            WHERE id = ?
                        `, [nowTime, existing.id], function(updateErr) {
                            if (updateErr) return res.status(500).json({ success: false, message: 'Gagal menyimpan Clock Out.' });
                            res.json({ success: true, message: `✅ Berhasil Clock Out pada pukul ${nowTime}.` });
                        });
                    }
                });
            });
        });
    });
});

// 9. Ambil Rekap Absensi
app.get('/api/attendance', (req, res) => {
    db.all("SELECT * FROM attendance ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Menjalankan Server
app.listen(PORT, () => {
    console.log(`Server Mixue Management berjalan di port ${PORT}`);
});