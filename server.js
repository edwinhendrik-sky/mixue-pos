const express = require('express');
const db = require('./database');
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static('public'));

app.get('/api/stores', (req, res) => {
    db.all(`SELECT * FROM stores`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/login', (req, res) => {
    const { employee_id, pin } = req.body;
    if (!employee_id || !pin) {
        return res.status(400).json({ success: false, message: 'ID dan Password wajib diisi!' });
    }

    const query = `SELECT * FROM employees WHERE employee_id = ? AND pin = ?`;
    db.get(query, [employee_id, pin], (err, row) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (!row) {
            return res.status(401).json({ success: false, message: 'ID atau Password salah!' });
        }
        res.json({ success: true, employee: row });
    });
});

// API Karyawan + Komponen Gaji (Parent-Child)
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
        ORDER BY e.id DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Tambah Karyawan + Komponen Gaji
app.post('/api/employees', (req, res) => {
    const { employee_id, name, job_position, organization, bank, no_rekening, join_date, store_id, salary_data } = req.body;
    
    db.run(`INSERT INTO employees (employee_id, name, job_position, organization, bank, no_rekening, pin, join_date, store_id) VALUES (?, ?, ?, ?, ?, ?, '1234', ?, ?)`, 
        [employee_id, name, job_position, organization, bank, no_rekening, join_date, store_id], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        
        const empId = this.lastID;
        const sd = salary_data || {};
        
        db.run(`INSERT INTO employee_salaries (employee_id, basic_salary, allowance_leader, allowance_weekend, allowance_overtime, allowance_sosmed, bonus_sales, bonus_other, deduction_late, deduction_absence, deduction_cashadvance, deduction_other) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                empId, 
                sd.basic_salary || 0, 
                sd.allowance_leader || 0, 
                sd.allowance_weekend || 0, 
                sd.allowance_overtime || 0, 
                sd.allowance_sosmed || 0, 
                sd.bonus_sales || 0, 
                sd.bonus_other || 0, 
                sd.deduction_late || 0, 
                sd.deduction_absence || 0, 
                sd.deduction_cashadvance || 0, 
                sd.deduction_other || 0
            ], (err2) => {
                if (err2) return res.status(500).json({ success: false, error: err2.message });
                res.json({ success: true, message: 'Karyawan dan komponen gaji berhasil ditambahkan!' });
            });
    });
});

// Update Karyawan + Komponen Gaji
app.put('/api/employees/:id', (req, res) => {
    const { name, job_position, organization, bank, no_rekening, join_date, store_id, salary_data } = req.body;
    const empId = req.params.id;

    db.run(`UPDATE employees SET name = ?, job_position = ?, organization = ?, bank = ?, no_rekening = ?, join_date = ?, store_id = ? WHERE id = ?`, 
        [name, job_position, organization, bank, no_rekening, join_date, store_id, empId], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });

        const sd = salary_data || {};
        db.run(`UPDATE employee_salaries SET basic_salary = ?, allowance_leader = ?, allowance_weekend = ?, allowance_overtime = ?, allowance_sosmed = ?, bonus_sales = ?, bonus_other = ?, deduction_late = ?, deduction_absence = ?, deduction_cashadvance = ?, deduction_other = ? WHERE employee_id = ?`,
            [
                sd.basic_salary || 0, 
                sd.allowance_leader || 0, 
                sd.allowance_weekend || 0, 
                sd.allowance_overtime || 0, 
                sd.allowance_sosmed || 0, 
                sd.bonus_sales || 0, 
                sd.bonus_other || 0, 
                sd.deduction_late || 0, 
                sd.deduction_absence || 0, 
                sd.deduction_cashadvance || 0, 
                sd.deduction_other || 0,
                empId
            ], (err2) => {
                if (err2) return res.status(500).json({ success: false, error: err2.message });
                res.json({ success: true, message: 'Data karyawan dan komponen gaji berhasil diperbarui!' });
            });
    });
});

app.delete('/api/employees/:id', (req, res) => {
    const empId = req.params.id;
    db.run(`DELETE FROM employee_salaries WHERE employee_id = ?`, [empId], (err) => {
        db.run(`DELETE FROM employees WHERE id = ?`, [empId], function(err2) {
            if (err2) return res.status(500).json({ success: false, error: err2.message });
            res.json({ success: true, message: 'Karyawan berhasil dihapus!' });
        });
    });
});

app.get('/api/shifts/:storeId', (req, res) => {
    db.all(`SELECT * FROM shifts WHERE store_id = ?`, [req.params.storeId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/attendance', (req, res) => {
    const { employee_id, shift_id, store_id, type, selfie } = req.body;
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString();

    if (type === 'in') {
        const query = `INSERT INTO attendance (employee_id, shift_id, store_id, date, clock_in, selfie, status) VALUES (?, ?, ?, ?, ?, ?, 'Hadir')`;
        db.run(query, [employee_id, shift_id, store_id, date, time, selfie], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Clock In Berhasil Dicatat!' });
        });
    } else if (type === 'out') {
        const query = `UPDATE attendance SET clock_out = ? WHERE employee_id = ? AND date = ?`;
        db.run(query, [time, employee_id, date], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Clock Out Berhasil Dicatat!' });
        });
    }
});

app.get('/api/attendance', (req, res) => {
    const query = `
        SELECT attendance.id, employees.name as employee_name, employees.employee_id, employees.job_position, shifts.shift_name, stores.store_name, stores.id as store_id, attendance.date, attendance.clock_in, attendance.clock_out, attendance.selfie
        FROM attendance
        JOIN employees ON attendance.employee_id = employees.id
        JOIN shifts ON attendance.shift_id = shifts.id
        JOIN stores ON attendance.store_id = stores.id
        ORDER BY attendance.id DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`Server Mixue berjalan di http://localhost:${PORT}`);
});