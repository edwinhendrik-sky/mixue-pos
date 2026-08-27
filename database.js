const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Memisahkan atau memusatkan file database SQLite
const dbPath = path.resolve(__dirname, 'mixue_system.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Gagal terhubung ke database:', err.message);
    } else {
        console.log('✅ Terhubung ke database SQLite modular.');
        initDatabases();
    }
});

function initDatabases() {
    db.serialize(() => {
        // 1. Database Toko (Stores)
        db.run(`CREATE TABLE IF NOT EXISTS stores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_name TEXT UNIQUE NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            radius_meter INTEGER DEFAULT 50000
        )`);

        // 2. Database Shift
        db.run(`CREATE TABLE IF NOT EXISTS shifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_id INTEGER,
            shift_name TEXT NOT NULL,
            time_range TEXT NOT NULL,
            FOREIGN KEY(store_id) REFERENCES stores(id)
        )`);

        // 3. Database Karyawan (Employees)
        db.run(`CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            job_position TEXT,
            organization TEXT,
            bank TEXT,
            no_rekening TEXT,
            pin TEXT DEFAULT '1234',
            photo TEXT,
            join_date TEXT,
            store_id INTEGER,
            FOREIGN KEY(store_id) REFERENCES stores(id)
        )`);

        // 4. Database Gaji Karyawan (Employee Salaries)
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

        // 5. Database Absensi (Attendance)
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

        // Seed / Initial Data Check
        db.get(`SELECT COUNT(*) as count FROM stores`, (err, row) => {
            if (row && row.count === 0) {
                console.log('⚙️ Mengisi data awal master toko & shift...');
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

                // Inisialisasi Akun Admin Utama
                db.run(`INSERT INTO employees (employee_id, name, job_position, organization, bank, no_rekening, pin, join_date, store_id) VALUES ('admin', 'Administrator Pusat', 'ADMINISTRATOR', 'MANAGEMENT SMB', '-', '-', 'admin123', '2024-01-01', 1)`, function(err) {
                    if (!err) {
                        db.run(`INSERT INTO employee_salaries (employee_id) VALUES (?)`, [this.lastID]);
                    }
                });
            }
        });
    });
}

module.exports = db;