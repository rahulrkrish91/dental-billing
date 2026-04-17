const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/pdfs', express.static(path.join(__dirname, 'public', 'pdfs')));

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dental_billing',
};

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
});

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const formatINR = (amount) => `₹ ${Number(amount || 0).toLocaleString('en-IN')}`;

const registerFontsSafely = (doc) => {
  // Place these font files in ./public/fonts/
  // - Roboto-Regular.ttf
  // - Roboto-Bold.ttf
  const regularFontPath = path.join(__dirname, 'public', 'fonts', 'Roboto-Regular.ttf');
  const boldFontPath = path.join(__dirname, 'public', 'fonts', 'Roboto-Bold.ttf');

  try {
    if (fs.existsSync(regularFontPath) && fs.existsSync(boldFontPath)) {
      doc.registerFont('body', regularFontPath);
      doc.registerFont('bold', boldFontPath);
      return { body: 'body', bold: 'bold' };
    }
  } catch (error) {
    console.warn('Custom font load failed. Falling back to built-in fonts.', error.message);
  }

  return { body: 'Helvetica', bold: 'Helvetica-Bold' };
};

const drawReceiptPdf = ({ invoiceId, patientName, phoneNumber, items, totalAmount, outputPath }) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  const colors = {
    text: '#1e293b',
    subtitle: '#64748b',
    brand: '#0284c7',
    tableHeaderBg: '#f8fafc',
    border: '#e2e8f0',
    successBg: '#dcfce7',
    successText: '#166534',
  };

  const fonts = registerFontsSafely(doc);

  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;
  const top = doc.page.margins.top;
  const rightX = left + contentWidth;

  const logoPngPath = path.join(__dirname, 'public', 'images', 'logo.png');
  const logoJpgPath = path.join(__dirname, 'public', 'images', 'logo.jpg');
  const logoPath = fs.existsSync(logoPngPath) ? logoPngPath : logoJpgPath;
  const logoSize = 48;

  let y = top;

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, left, y, { fit: [logoSize, logoSize], align: 'left', valign: 'top' });
  } else {
    doc.roundedRect(left, y, logoSize, logoSize, 8).lineWidth(1).strokeColor(colors.border).stroke();
  }

  doc
    .font(fonts.bold)
    .fontSize(18)
    .fillColor(colors.text)
    .text('Vamis Dental Care', left + logoSize + 12, y + 6);

  doc
    .font(fonts.body)
    .fontSize(10)
    .fillColor(colors.subtitle)
    .text('Govt hospital road, Chakarakkal', left + logoSize + 12, y + 28)
    .text('Kannur - 670613', left + logoSize + 12, y + 42)
    .text('Phone: 730678934 | roshnap@gmail.com', left + logoSize + 12, y + 56);

  doc
    .font(fonts.bold)
    .fontSize(10)
    .fillColor(colors.text)
    .text('Reg: KL-123-ABC | GSTIN: 1233212312', left + logoSize + 12, y + 72);

  const badgeWidth = 118;
  const badgeHeight = 34;
  doc
    .roundedRect(rightX - badgeWidth, y, badgeWidth, badgeHeight, 12)
    .fill(colors.brand);
  doc
    .font(fonts.bold)
    .fontSize(14)
    .fillColor('#ffffff')
    .text('RECEIPT', rightX - badgeWidth, y + 10, { width: badgeWidth, align: 'center' });

  const formattedId = `DC-${invoiceId + 1460000}A`;
  const dateText = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const metaY = y + 44;
  doc.font(fonts.body).fontSize(10).fillColor(colors.subtitle);
  doc.text(`Invoice ID: ${formattedId}`, rightX - 180, metaY, { width: 180, align: 'right' });
  doc.text(`Date: ${dateText}`, rightX - 180, metaY + 16, { width: 180, align: 'right' });

  const statusW = 90;
  const statusH = 22;
  const statusY = metaY + 34;
  doc.roundedRect(rightX - statusW, statusY, statusW, statusH, 11).fill(colors.successBg);
  doc
    .font(fonts.bold)
    .fontSize(10)
    .fillColor(colors.successText)
    .text('Completed', rightX - statusW, statusY + 6, { width: statusW, align: 'center' });

  y = top + 122;
  doc.moveTo(left, y).lineTo(rightX, y).lineWidth(1).strokeColor(colors.border).stroke();

  y += 18;
  const colGap = 24;
  const colW = (contentWidth - colGap) / 2;

  doc.font(fonts.bold).fontSize(10).fillColor(colors.subtitle).text('TREATED BY', left, y);
  doc
    .font(fonts.body)
    .fontSize(11)
    .fillColor(colors.text)
    .text('Dr. Roshna P', left, y + 16)
    .text('Proprietor', left, y + 32)
    .text('+91 730678934', left, y + 48);

  const rightColX = left + colW + colGap;
  doc.font(fonts.bold).fontSize(10).fillColor(colors.subtitle).text('BILLED TO', rightColX, y);
  doc
    .font(fonts.body)
    .fontSize(11)
    .fillColor(colors.text)
    .text(patientName, rightColX, y + 16)
    .text(`Phone: ${phoneNumber}`, rightColX, y + 32)
    .text('Blood Group: A+', rightColX, y + 48);

  y += 82;

  const tableX = left;
  const tableW = contentWidth;
  const amountColW = 150;

  doc.roundedRect(tableX, y, tableW, 30, 8).fill(colors.tableHeaderBg);
  doc
    .font(fonts.bold)
    .fontSize(10)
    .fillColor(colors.subtitle)
    .text('TREATMENT DESCRIPTION', tableX + 12, y + 10, { width: tableW - amountColW - 24 })
    .text('AMOUNT (₹)', tableX + tableW - amountColW, y + 10, { width: amountColW - 12, align: 'right' });

  y += 30;
  doc.lineWidth(1).strokeColor(colors.border);

  items.forEach((item) => {
    const rowHeight = 28;
    doc
      .font(fonts.body)
      .fontSize(11)
      .fillColor(colors.text)
      .text(item.treatment_name, tableX + 12, y + 9, { width: tableW - amountColW - 24 })
      .text(formatINR(item.amount), tableX + tableW - amountColW, y + 9, { width: amountColW - 12, align: 'right' });

    y += rowHeight;
    doc.moveTo(tableX, y).lineTo(tableX + tableW, y).strokeColor(colors.border).stroke();
  });

  const serviceFee = 0;
  y += 10;
  doc
    .font(fonts.body)
    .fontSize(11)
    .fillColor(colors.subtitle)
    .text('Service Fee', tableX + tableW - amountColW - 120, y, { width: 120, align: 'right' })
    .text(formatINR(serviceFee), tableX + tableW - amountColW, y, { width: amountColW - 12, align: 'right' });

  y += 26;
  doc.roundedRect(tableX, y, tableW, 40, 8).fill(colors.tableHeaderBg);
  doc
    .font(fonts.bold)
    .fontSize(12)
    .fillColor(colors.text)
    .text('Total Amount', tableX + 12, y + 13)
    .fillColor(colors.brand)
    .text(formatINR(totalAmount + serviceFee), tableX + tableW - amountColW, y + 13, {
      width: amountColW - 12,
      align: 'right',
    });

  y += 72;
  doc
    .font(fonts.bold)
    .fontSize(10)
    .fillColor(colors.subtitle)
    .text("DOCTOR'S NOTES: Next sitting scheduled. Please maintain oral hygiene.", left, y);

  y += 22;
  doc
    .font(fonts.body)
    .fontSize(10)
    .fillColor(colors.subtitle)
    .text('Thank you for choosing Vamis Dental Care. | Helpline: +91 730678934', left, y);

  const signY = y + 44;
  const signX = rightX - 170;
  doc.moveTo(signX, signY).lineTo(rightX, signY).strokeColor(colors.border).stroke();
  doc
    .font(fonts.body)
    .fontSize(10)
    .fillColor(colors.subtitle)
    .text('Authorised Signatory', signX, signY + 6, { width: 170, align: 'center' });
  doc
    .font(fonts.bold)
    .fontSize(10)
    .fillColor(colors.text)
    .text('Dr. Roshna P', signX, signY + 20, { width: 170, align: 'center' });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

app.post('/api/generate-bill', async (req, res) => {
  const { patientName, phoneNumber, treatments } = req.body;

  if (!patientName || !phoneNumber || !Array.isArray(treatments) || treatments.length === 0) {
    return res.status(400).json({ message: 'Invalid request payload.' });
  }

  const cleanItems = treatments
    .map((t) => ({
      treatment_name: String(t.treatment_name || t.treatmentName || '').trim(),
      amount: Number(t.amount),
    }))
    .filter((t) => t.treatment_name && !Number.isNaN(t.amount) && t.amount >= 0);

  if (!cleanItems.length) {
    return res.status(400).json({ message: 'At least one valid treatment is required.' });
  }

  const totalAmount = cleanItems.reduce((sum, item) => sum + item.amount, 0);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [patientResult] = await connection.execute(
      'INSERT INTO Patients (name, phone_number) VALUES (?, ?)',
      [patientName, phoneNumber],
    );

    const patientId = patientResult.insertId;

    const [invoiceResult] = await connection.execute(
      'INSERT INTO Invoices (patient_id, total_amount) VALUES (?, ?)',
      [patientId, totalAmount],
    );

    const invoiceId = invoiceResult.insertId;

    for (const item of cleanItems) {
      await connection.execute(
        'INSERT INTO Invoice_Items (invoice_id, treatment_name, amount) VALUES (?, ?, ?)',
        [invoiceId, item.treatment_name, item.amount],
      );
    }

    const pdfDir = path.join(__dirname, 'public', 'pdfs');
    ensureDir(pdfDir);
    const filename = `invoice-${invoiceId}.pdf`;
    const outputPath = path.join(pdfDir, filename);

    await drawReceiptPdf({
      invoiceId,
      patientName,
      phoneNumber,
      items: cleanItems,
      totalAmount,
      outputPath,
    });

    await connection.commit();

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.status(201).json({
      success: true,
      invoiceId,
      pdfUrl: `${baseUrl}/pdfs/${filename}`,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Billing error:', error);
    res.status(500).json({ message: 'Failed to generate bill. Check server logs / database connection.' });
  } finally {
    connection.release();
  }
});



app.get('/api/expenses', async (req, res) => {
  const { from, to } = req.query;

  try {
    let query = 'SELECT id, expense_date, category, description, amount, created_at FROM Expenses';
    const params = [];

    if (from && to) {
      query += ' WHERE expense_date BETWEEN ? AND ?';
      params.push(from, to);
    }

    query += ' ORDER BY expense_date DESC, id DESC';

    const [rows] = await pool.execute(query, params);
    const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount), 0);

    return res.json({
      success: true,
      totalAmount,
      count: rows.length,
      expenses: rows,
    });
  } catch (error) {
    console.error('Fetch expenses error:', error);
    return res.status(500).json({ message: 'Failed to fetch expenses.' });
  }
});

app.post('/api/expenses', async (req, res) => {
  const { expenseDate, category, description, amount } = req.body;
  const validCategories = ['Rent', 'Assistant Salary', 'IMAGE IMA Fees', 'Purchase Items', 'Other'];

  if (!expenseDate || !category || !description || Number.isNaN(Number(amount))) {
    return res.status(400).json({ message: 'expenseDate, category, description and amount are required.' });
  }

  if (!validCategories.includes(category)) {
    return res.status(400).json({ message: 'Invalid expense category.' });
  }

  if (Number(amount) < 0) {
    return res.status(400).json({ message: 'Amount cannot be negative.' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO Expenses (expense_date, category, description, amount) VALUES (?, ?, ?, ?)',
      [expenseDate, category, description.trim(), Number(amount)],
    );

    return res.status(201).json({
      success: true,
      expenseId: result.insertId,
      message: 'Expense saved successfully.',
    });
  } catch (error) {
    console.error('Create expense error:', error);
    return res.status(500).json({ message: 'Failed to save expense.' });
  }
});



app.get('/api/dashboard', async (req, res) => {
  const view = req.query.view === 'daily' ? 'daily' : 'monthly';
  const monthParam = String(req.query.month || '').trim();

  const now = new Date();

  try {
    if (view === 'monthly') {
      const year = Number(req.query.year) || now.getFullYear();
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const [monthlyRows] = await pool.execute(
        `SELECT
          DATE_FORMAT(created_at, '%Y-%m') AS period_key,
          SUM(total_amount) AS revenue,
          COUNT(*) AS invoices_sent
        FROM Invoices
        WHERE DATE(created_at) BETWEEN ? AND ?
        GROUP BY period_key
        ORDER BY period_key ASC`,
        [startDate, endDate],
      );

      const [repeatingRows] = await pool.execute(
        `SELECT
          DATE_FORMAT(i.created_at, '%Y-%m') AS period_key,
          COUNT(DISTINCT i.patient_id) AS repeating_customers
        FROM Invoices i
        WHERE DATE(i.created_at) BETWEEN ? AND ?
          AND EXISTS (
            SELECT 1
            FROM Invoices prev
            WHERE prev.patient_id = i.patient_id
              AND prev.created_at < DATE_FORMAT(i.created_at, '%Y-%m-01')
          )
        GROUP BY period_key
        ORDER BY period_key ASC`,
        [startDate, endDate],
      );

      const [expenseRows] = await pool.execute(
        `SELECT
          DATE_FORMAT(expense_date, '%Y-%m') AS period_key,
          SUM(amount) AS clinic_expenses
        FROM Expenses
        WHERE expense_date BETWEEN ? AND ?
        GROUP BY period_key
        ORDER BY period_key ASC`,
        [startDate, endDate],
      );

      const [expenseDetailRows] = await pool.execute(
        `SELECT
          DATE_FORMAT(expense_date, '%Y-%m') AS period_key,
          category,
          description,
          amount
        FROM Expenses
        WHERE expense_date BETWEEN ? AND ?
        ORDER BY expense_date DESC, id DESC`,
        [startDate, endDate],
      );

      const [detailRows] = await pool.execute(
        `SELECT
          DATE_FORMAT(i.created_at, '%Y-%m') AS period_key,
          i.id AS invoice_id,
          p.name AS patient_name,
          GROUP_CONCAT(ii.treatment_name ORDER BY ii.id SEPARATOR ', ') AS treatments
        FROM Invoices i
        JOIN Patients p ON p.id = i.patient_id
        LEFT JOIN Invoice_Items ii ON ii.invoice_id = i.id
        WHERE DATE(i.created_at) BETWEEN ? AND ?
        GROUP BY period_key, i.id, p.name
        ORDER BY i.created_at DESC`,
        [startDate, endDate],
      );

      const periodMap = new Map();
      for (let month = 1; month <= 12; month += 1) {
        const periodKey = `${year}-${String(month).padStart(2, '0')}`;
        periodMap.set(periodKey, {
          period: periodKey,
          revenue: 0,
          invoicesSent: 0,
          repeatingCustomers: 0,
          clinicExpenses: 0,
          details: [],
        });
      }

      monthlyRows.forEach((row) => {
        if (periodMap.has(row.period_key)) {
          periodMap.get(row.period_key).revenue = Number(row.revenue || 0);
          periodMap.get(row.period_key).invoicesSent = Number(row.invoices_sent || 0);
        }
      });

      repeatingRows.forEach((row) => {
        if (periodMap.has(row.period_key)) {
          periodMap.get(row.period_key).repeatingCustomers = Number(row.repeating_customers || 0);
        }
      });

      expenseRows.forEach((row) => {
        if (periodMap.has(row.period_key)) {
          periodMap.get(row.period_key).clinicExpenses = Number(row.clinic_expenses || 0);
        }
      });

      detailRows.forEach((row) => {
        if (periodMap.has(row.period_key)) {
          periodMap.get(row.period_key).details.push({
            label: row.patient_name,
            description: row.treatments || 'No treatments recorded',
          });
        }
      });

      expenseDetailRows.forEach((row) => {
        if (periodMap.has(row.period_key)) {
          periodMap.get(row.period_key).details.push({
            label: `Expense - ${row.category}`,
            description: `${row.description} (${row.amount})`,
          });
        }
      });

      const series = [...periodMap.values()];
      const totals = series.reduce(
        (acc, item) => {
          acc.revenue += item.revenue;
          acc.invoicesSent += item.invoicesSent;
          acc.repeatingCustomers += item.repeatingCustomers;
          acc.clinicExpenses += item.clinicExpenses;
          return acc;
        },
        { revenue: 0, invoicesSent: 0, repeatingCustomers: 0, clinicExpenses: 0 },
      );

      return res.json({
        success: true,
        view,
        year,
        yAxisBaseMax: 2000,
        totals,
        series,
      });
    }

    const monthMatch = monthParam.match(/^(\d{4})-(\d{2})$/);
    const year = monthMatch ? Number(monthMatch[1]) : now.getFullYear();
    const monthIndex = monthMatch ? Number(monthMatch[2]) - 1 : now.getMonth();

    const periodEnd = new Date(year, monthIndex + 1, 0);
    const monthString = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

    const startDate = `${monthString}-01`;
    const endDate = `${monthString}-${String(periodEnd.getDate()).padStart(2, '0')}`;

    const [dailyRows] = await pool.execute(
      `SELECT
        DATE(created_at) AS period_key,
        SUM(total_amount) AS revenue,
        COUNT(*) AS invoices_sent
      FROM Invoices
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY period_key
      ORDER BY period_key ASC`,
      [startDate, endDate],
    );

    const [repeatingRows] = await pool.execute(
      `SELECT
        DATE(i.created_at) AS period_key,
        COUNT(DISTINCT i.patient_id) AS repeating_customers
      FROM Invoices i
      WHERE DATE(i.created_at) BETWEEN ? AND ?
        AND EXISTS (
          SELECT 1
          FROM Invoices prev
          WHERE prev.patient_id = i.patient_id
            AND DATE(prev.created_at) < DATE(i.created_at)
        )
      GROUP BY period_key
      ORDER BY period_key ASC`,
      [startDate, endDate],
    );

    const [expenseRows] = await pool.execute(
      `SELECT
        expense_date AS period_key,
        SUM(amount) AS clinic_expenses
      FROM Expenses
      WHERE expense_date BETWEEN ? AND ?
      GROUP BY period_key
      ORDER BY period_key ASC`,
      [startDate, endDate],
    );

    const [expenseDetailRows] = await pool.execute(
      `SELECT
        expense_date AS period_key,
        category,
        description,
        amount
      FROM Expenses
      WHERE expense_date BETWEEN ? AND ?
      ORDER BY expense_date DESC, id DESC`,
      [startDate, endDate],
    );

    const [detailRows] = await pool.execute(
      `SELECT
        DATE(i.created_at) AS period_key,
        i.id AS invoice_id,
        p.name AS patient_name,
        GROUP_CONCAT(ii.treatment_name ORDER BY ii.id SEPARATOR ', ') AS treatments
      FROM Invoices i
      JOIN Patients p ON p.id = i.patient_id
      LEFT JOIN Invoice_Items ii ON ii.invoice_id = i.id
      WHERE DATE(i.created_at) BETWEEN ? AND ?
      GROUP BY period_key, i.id, p.name
      ORDER BY i.created_at DESC`,
      [startDate, endDate],
    );

    const daysInMonth = periodEnd.getDate();
    const dayMap = new Map();

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dayKey = `${monthString}-${String(day).padStart(2, '0')}`;
      dayMap.set(dayKey, {
        period: dayKey,
        revenue: 0,
        invoicesSent: 0,
        repeatingCustomers: 0,
        clinicExpenses: 0,
        details: [],
      });
    }

    dailyRows.forEach((row) => {
      const dayKey = new Date(row.period_key).toISOString().slice(0, 10);
      if (dayMap.has(dayKey)) {
        dayMap.get(dayKey).revenue = Number(row.revenue || 0);
        dayMap.get(dayKey).invoicesSent = Number(row.invoices_sent || 0);
      }
    });

    repeatingRows.forEach((row) => {
      const dayKey = new Date(row.period_key).toISOString().slice(0, 10);
      if (dayMap.has(dayKey)) {
        dayMap.get(dayKey).repeatingCustomers = Number(row.repeating_customers || 0);
      }
    });

    expenseRows.forEach((row) => {
      const dayKey = new Date(row.period_key).toISOString().slice(0, 10);
      if (dayMap.has(dayKey)) {
        dayMap.get(dayKey).clinicExpenses = Number(row.clinic_expenses || 0);
      }
    });

    detailRows.forEach((row) => {
      const dayKey = new Date(row.period_key).toISOString().slice(0, 10);
      if (dayMap.has(dayKey)) {
        dayMap.get(dayKey).details.push({
          label: row.patient_name,
          description: row.treatments || 'No treatments recorded',
        });
      }
    });

    expenseDetailRows.forEach((row) => {
      const dayKey = new Date(row.period_key).toISOString().slice(0, 10);
      if (dayMap.has(dayKey)) {
        dayMap.get(dayKey).details.push({
          label: `Expense - ${row.category}`,
          description: `${row.description} (${row.amount})`,
        });
      }
    });

    const series = [...dayMap.values()];
    const totals = series.reduce(
      (acc, item) => {
        acc.revenue += item.revenue;
        acc.invoicesSent += item.invoicesSent;
        acc.repeatingCustomers += item.repeatingCustomers;
        acc.clinicExpenses += item.clinicExpenses;
        return acc;
      },
      { revenue: 0, invoicesSent: 0, repeatingCustomers: 0, clinicExpenses: 0 },
    );

    return res.json({
      success: true,
      view,
      month: monthString,
      yAxisBaseMax: 2000,
      totals,
      series,
    });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    return res.status(500).json({ message: 'Failed to fetch dashboard metrics.' });
  }
});

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
