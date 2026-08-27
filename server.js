const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// INISIALISASI app HARUS DI SINI (SEBELUM app.use)
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// --- 1. API STORES ---
app.get('/api/stores', (req, res) => {
    db.all("SELECT * FROM stores", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// --- 2. API SHIFTS ---
app.get('/api/shifts/:store_id', (req, res) => {
    const { store_id } = req.params;
    db.all("SELECT * FROM shifts WHERE store_id = ?", [store_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// --- 3. API EMPLOYEES & SALARY (Database Karyawan & Gaji) ---
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
    
    db.run(`INSERT INTO employees (employee_id, name, job_position, organization, bank, no_rekening, photo, join_date, store_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [employee_id, name, job_position, organization, bank, no_rekening, photo, join_date, store_id],
        function(err) {
            if (err) return res.status(400).json({ success: false, message: 'Gagal menambah karyawan: ' + err.message });
            const newEmpId = this.lastID;

            if (salary_data) {
                db.run(`INSERT INTO employee_salaries (employee_id, basic_salary, allowance_leader, allowance_weekend, allowance_overtime, allowance_sosmed, bonus_sales, bonus_other, deduction_late, deduction_absence, deduction_cashadvance, deduction_other) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [newEmpId, salary_data.basic_salary || 0, salary_data.allowance_leader || 0, salary_data.allowance_weekend || 0, salary_data.allowance_overtime || 0, salary_data.allowance_sosmed || 0, salary_data.bonus_sales || 0, salary_data.bonus_other || 0, salary_data.deduction_late || 0, salary_data.deduction_absence || 0, salary_data.deduction_cashadvance || 0, salary_data.deduction_other || 0]
                );
            }
            res.json({ success: true, message: 'Karyawan dan komponen gaji berhasil ditambahkan!' });
        }
    );
});

app.put('/api/employees/:id', (req, res) => {
    const { id } = req.params;
    const { employee_id, name, job_position, organization, bank, no_rekening, photo, join_date, store_id, salary_data } = req.body;

    db.run(`UPDATE employees SET employee_id=?, name=?, job_position=?, organization=?, bank=?, no_rekening=?, photo=?, join_date=?, store_id=? WHERE id=?`,
        [employee_id, name, job_position, organization, bank, no_rekening, photo, join_date, store_id, id],
        (err) => {
            if (err) return res.status(400).json({ success: false, message: 'Gagal memperbarui karyawan: ' + err.message });

            if (salary_data) {
                db.get(`SELECT id FROM employee_salaries WHERE employee_id = ?`, [id], (salCheckErr, salRow) => {
                    if (salRow) {
                        db.run(`UPDATE employee_salaries SET basic_salary=?, allowance_leader=?, allowance_weekend=?, allowance_overtime=?, allowance_sosmed=?, bonus_sales=?, bonus_other=?, deduction_late=?, deduction_absence=?, deduction_cashadvance=?, deduction_other=? WHERE employee_id=?`,
                            [salary_data.basic_salary || 0, salary_data.allowance_leader || 0, salary_data.allowance_weekend || 0, salary_data.allowance_overtime || 0, salary_data.allowance_sosmed || 0, salary_data.bonus_sales || 0, salary_data.bonus_other || 0, salary_data.deduction_late || 0, salary_data.deduction_absence || 0, salary_data.deduction_cashadvance || 0, salary_data.deduction_other || 0, id]
                        );
                    } else {
                        db.run(`INSERT INTO employee_salaries (employee_id, basic_salary, allowance_leader, allowance_weekend, allowance_overtime, allowance_sosmed, bonus_sales, bonus_other, deduction_late, deduction_absence, deduction_cashadvance, deduction_other) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [id, salary_data.basic_salary || 0, salary_data.allowance_leader || 0, salary_data.allowance_weekend || 0, salary_data.allowance_overtime || 0, salary_data.allowance_sosmed || 0, salary_data.bonus_sales || 0, salary_data.bonus_other || 0, salary_data.deduction_late || 0, salary_data.deduction_absence || 0, salary_data.deduction_cashadvance || 0, salary_data.deduction_other || 0]
                        );
                    }
                });
            }
            res.json({ success: true, message: 'Data karyawan dan gaji berhasil diperbarui!' });
        }
    );
});

app.delete('/api/employees/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM employee_salaries WHERE employee_id = ?`, [id], () => {
        db.run(`DELETE FROM employees WHERE id = ?`, [id], (err) => {
            if (err) return res.status(400).json({ success: false, message: 'Gagal menghapus: ' + err.message });
            res.json({ success: true, message: 'Data karyawan berhasil dihapus.' });
        });
    });
});

// --- 4. API ATTENDANCE (Database Absensi) ---
app.post('/api/attendance', (req, res) => {
    const { employee_id, shift_id, store_id, type, selfie } = req.body;
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const nowTime = new Date().toLocaleTimeString('it-IT', { timeZone: 'Asia/Jakarta' });

    db.get("SELECT * FROM employees WHERE id = ?", [employee_id], (err, empRow) => {
        if (err || !empRow) return res.status(400).json({ success: false, message: 'Data karyawan tidak valid atau tidak ditemukan!' });

        db.get("SELECT store_name FROM stores WHERE id = ?", [store_id || empRow.store_id], (err, storeRow) => {
            const storeName = storeRow ? storeRow.store_name : (empRow.organization || 'Management SMB');
            
            db.get("SELECT shift_name, time_range FROM shifts WHERE id = ?", [shift_id], (err, shiftRow) => {
                const shiftName = shiftRow ? `${shiftRow.shift_name} (${shiftRow.time_range})` : 'Shift Reguler';

                db.get("SELECT * FROM attendance WHERE employee_id = ? AND date = ?", [employee_id, today], (err, existing) => {
                    if (type === 'in') {
                        if (existing && existing.clock_in) {
                            return res.json({ success: false, message: `⚠️ Gagal! Anda sudah melakukan Clock In hari ini pada pukul ${existing.clock_in}.` });
                        }
                        if (existing) {
                            db.run(`UPDATE attendance SET clock_in = ?, store_name = ?, shift_name = ?, selfie = ? WHERE id = ?`, 
                                [nowTime, storeName, shiftName, selfie || existing.selfie, existing.id],
                                (updateErr) => {
                                    if (updateErr) return res.status(500).json({ success: false, message: updateErr.message });
                                    res.json({ success: true, message: `✅ Berhasil Clock In pada pukul ${nowTime}.` });
                                });
                        } else {
                            db.run(`INSERT INTO attendance (employee_id, employee_name, store_name, shift_name, date, clock_in, selfie) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                [empRow.id, empRow.name, storeName, shiftName, today, nowTime, selfie],
                                (insertErr) => {
                                    if (insertErr) return res.status(500).json({ success: false, message: insertErr.message });
                                    res.json({ success: true, message: `✅ Berhasil Clock In pada pukul ${nowTime}.` });
                                });
                        }
                    } else if (type === 'out') {
                        if (!existing || !existing.clock_in) {
                            return res.json({ success: false, message: '⚠️ Gagal! Anda belum melakukan Clock In hari ini.' });
                        }
                        if (existing.clock_out) {
                            return res.json({ success: false, message: `⚠️ Gagal! Anda sudah melakukan Clock Out hari ini pada pukul ${existing.clock_out}.` });
                        }
                        db.run(`UPDATE attendance SET clock_out = ? WHERE id = ?`, [nowTime, existing.id],
                            (outErr) => {
                                if (outErr) return res.status(500).json({ success: false, message: outErr.message });
                                res.json({ success: true, message: `✅ Berhasil Clock Out pada pukul ${nowTime}.` });
                            });
                    }
                });
            });
        });
    });
});
app.post('/api/login', (req, res) => {
    const { employee_id, password } = req.body;
    
    // Query untuk mencocokkan ID karyawan dan PIN/Password
    const query = `
        SELECT e.*, s.store_name 
        FROM employees e 
        LEFT JOIN stores s ON e.store_id = s.id 
        WHERE e.employee_id = ? AND e.pin = ?
    `;
    
    db.get(query, [employee_id, password], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Kesalahan server: ' + err.message });
        }
        if (!row) {
            return res.json({ success: false, message: 'ID Karyawan atau Password salah!' });
        }
        res.json({ success: true, employee: row });
    });
});
app.get('/api/attendance', (req, res) => {
    const query = `
        SELECT a.id, 
               COALESCE(e.employee_id, a.employee_id) as employee_id, 
               COALESCE(e.name, a.employee_name) as employee_name, 
               COALESCE(s.store_name, a.store_name) as store_name, 
               a.shift_name, a.date, a.clock_in, a.clock_out, a.selfie, 
               COALESCE(e.job_position, '-') as job_position
        FROM attendance a
        LEFT JOIN employees e ON a.employee_id = e.id OR a.employee_id = e.employee_id
        LEFT JOIN stores s ON e.store_id = s.id
        ORDER BY a.id DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan modular di http://localhost:${PORT}`);
});