import { useEffect, useMemo, useState } from 'react';

const API_BASE = 'http://localhost:5000';
const LOGO_SRC = '/images/logo.png';
const initialTreatments = [{ treatmentName: '', amount: '' }];
const expenseCategories = ['Rent', 'Assistant Salary', 'IMAGE IMA Fees', 'Purchase Items', 'Other'];

const styles = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg, #e2e8f0, #dbeafe)', padding: '40px 20px', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', color: '#1e293b' },
  card: { maxWidth: 1100, margin: '0 auto', background: '#ffffff', borderRadius: 18, boxShadow: '0 20px 45px rgba(2, 132, 199, 0.12)', padding: 28, border: '1px solid #e2e8f0' },
  headerBrand: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', marginBottom: 16 },
  headerLogo: { width: 54, height: 54, borderRadius: 12, objectFit: 'contain', background: '#0f172a', border: '1px solid #334155', padding: 4 },
  tabRow: { display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap' },
  tabBtn: { background: '#f8fafc', border: '1px solid #cbd5e1', color: '#1e293b', borderRadius: 999, padding: '10px 14px', cursor: 'pointer', fontWeight: 600 },
  tabBtnActive: { background: '#0284c7', border: '1px solid #0284c7', color: '#ffffff' },
  title: { margin: 0, fontSize: 28, fontWeight: 700 },
  subtitle: { margin: '8px 0 24px', color: '#64748b' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  label: { fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'block' },
  input: { width: '100%', border: '1px solid #cbd5e1', borderRadius: 12, padding: '11px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#ffffff', color: '#0f172a', caretColor: '#0f172a', WebkitTextFillColor: '#0f172a', colorScheme: 'light' },
  sectionTitle: { fontSize: 17, marginTop: 24, marginBottom: 10 },
  treatmentCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, marginTop: 10 },
  treatmentRow: { display: 'grid', gridTemplateColumns: '1.8fr 1fr auto', gap: 10, marginBottom: 10, alignItems: 'center' },
  addBtn: { background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', padding: '9px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 600 },
  deleteBtn: { background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', padding: '9px 10px', borderRadius: 10, cursor: 'pointer' },
  submitBtn: { marginTop: 20, width: '100%', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 16px', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  total: { marginTop: 14, padding: 14, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, textAlign: 'right', fontWeight: 700, color: '#0284c7' },
  previewHeader: { marginBottom: 14, fontSize: 24 },
  iframe: { width: '100%', height: 550, border: '1px solid #dbeafe', borderRadius: 14 },
  actions: { display: 'flex', gap: 12, marginTop: 16 },
  secondaryBtn: { flex: 1, background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 10, padding: '11px 12px', fontWeight: 600, cursor: 'pointer' },
  whatsappBtn: { flex: 1, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 12px', fontWeight: 700, cursor: 'pointer' },
  expenseGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  expenseSummary: { margin: '16px 0', background: '#ecfeff', border: '1px solid #bae6fd', padding: 14, borderRadius: 12, color: '#0369a1', fontWeight: 700 },
  expenseTable: { width: '100%', borderCollapse: 'collapse', marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' },
  th: { textAlign: 'left', padding: '10px 8px', fontSize: 13, color: '#475569', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' },
  td: { padding: '10px 8px', fontSize: 14, borderBottom: '1px solid #f1f5f9' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', gap: 12, marginBottom: 16 },
  kpiCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 },
  kpiLabel: { color: '#64748b', fontSize: 12, marginBottom: 6 },
  kpiValue: { color: '#0f172a', fontSize: 24, fontWeight: 700 },
  chartGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: 14 },
  chartCard: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 },
  chartTitle: { margin: '0 0 10px', fontSize: 16, color: '#0f172a' },
};

const formatINR = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const getToday = () => new Date().toISOString().slice(0, 10);

const periodLabel = (period, view) => {
  if (view === 'daily') return Number(String(period).slice(-2));
  const [y, m] = String(period).split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'short' });
};

const hoverSummary = (item) => {
  if (!item.details?.length) return 'No customer/treatment data for this period.';
  return item.details.slice(0, 4).map((entry) => `${entry.label || '-'}: ${entry.description || '-'}`).join(' | ');
};

function AxisBarChart({ title, data, valueKey, formatter, yBaseMax = 2000, view, onBarClick, onBack, selectedItem, onViewDetails }) {
  const values = data.map((item) => Number(item[valueKey] || 0));
  const yMax = Math.max(yBaseMax, Math.max(...values, 0));
  const chartHeight = 210;
  const chartWidth = Math.max(data.length * 22, 620);

  return (
    <div style={styles.chartCard}>
      <h3 style={styles.chartTitle}>{title}</h3>
      {view === 'daily' && (
        <button type="button" style={{ ...styles.secondaryBtn, marginBottom: 8 }} onClick={onBack}>
          ← Back to Month View
        </button>
      )}
      <button
        type="button"
        style={{ ...styles.secondaryBtn, marginBottom: 8 }}
        disabled={!selectedItem}
        onClick={onViewDetails}
      >
        View Details Info
      </button>
      {!data.length && <p style={styles.subtitle}>No data available yet.</p>}
      {!!data.length && (
        <div style={{ overflowX: 'auto' }}>
          <svg width={chartWidth + 80} height={chartHeight + 56} role="img" aria-label={title}>
            <line x1="55" y1={chartHeight + 10} x2={chartWidth + 60} y2={chartHeight + 10} stroke="#94a3b8" />
            <line x1="55" y1="10" x2="55" y2={chartHeight + 10} stroke="#94a3b8" />

            {[0, yMax / 2, yMax].map((tick) => {
              const y = chartHeight + 10 - (tick / yMax) * chartHeight;
              return (
                <g key={`${title}-${tick}`}>
                  <line x1="55" y1={y} x2={chartWidth + 60} y2={y} stroke="#e2e8f0" />
                  <text x="50" y={y + 4} textAnchor="end" fill="#64748b" fontSize="11">{formatter(Math.round(tick))}</text>
                </g>
              );
            })}

            {data.map((item, index) => {
              const value = Number(item[valueKey] || 0);
              const barHeight = yMax > 0 ? (value / yMax) * chartHeight : 0;
              const x = 60 + index * 22;
              const y = chartHeight + 10 - barHeight;
              return (
                <g key={`${title}-${item.period}`}>
                  <rect
                    x={x}
                    y={y}
                    width={12}
                    height={barHeight}
                    fill="#0284c7"
                    rx="3"
                    style={{ cursor: view === 'monthly' ? 'pointer' : 'default' }}
                    onClick={() => onBarClick?.(item)}
                  >
                    <title>{hoverSummary(item)}</title>
                  </rect>
                  <text x={x + 6} y={chartHeight + 25} textAnchor="middle" fill="#64748b" fontSize="10">{periodLabel(item.period, view)}</text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
      <p style={{ ...styles.subtitle, marginTop: 8 }}>Y-axis range: 0 to {formatter(Math.round(yMax))}</p>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [logoVisible, setLogoVisible] = useState(true);

  const [patientName, setPatientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [treatments, setTreatments] = useState(initialTreatments);
  const [pdfUrl, setPdfUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const [expenseDate, setExpenseDate] = useState(getToday());
  const [expenseCategory, setExpenseCategory] = useState(expenseCategories[0]);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseList, setExpenseList] = useState([]);
  const [expenseTotal, setExpenseTotal] = useState(0);

  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [monthlySeries, setMonthlySeries] = useState([]);
  const [dailyByMonth, setDailyByMonth] = useState({});
  const [dashboardTotals, setDashboardTotals] = useState({ revenue: 0, invoicesSent: 0, repeatingCustomers: 0, clinicExpenses: 0 });
  const [dashboardYear, setDashboardYear] = useState(new Date().getFullYear());
  const [chartState, setChartState] = useState({
    revenue: { view: 'monthly', month: '' },
    invoicesSent: { view: 'monthly', month: '' },
    repeatingCustomers: { view: 'monthly', month: '' },
    clinicExpenses: { view: 'monthly', month: '' },
  });


  const [selectedBars, setSelectedBars] = useState({
    revenue: null,
    invoicesSent: null,
    repeatingCustomers: null,
    clinicExpenses: null,
  });
  const [detailsPage, setDetailsPage] = useState(null);

  const total = useMemo(() => treatments.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0), [treatments]);

  const fetchExpenses = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/expenses`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not fetch expenses');
      setExpenseList(data.expenses || []);
      setExpenseTotal(data.totalAmount || 0);
    } catch (error) {
      alert(`Could not load expenses. Check backend/MySQL.\n\nError: ${error.message}`);
    }
  };

  const fetchMonthlyDashboard = async () => {
    setDashboardLoading(true);
    try {
      const year = new Date().getFullYear();
      const response = await fetch(`${API_BASE}/api/dashboard?view=monthly&year=${year}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not fetch dashboard data');
      setMonthlySeries(data.series || []);
      setDashboardTotals(data.totals || { revenue: 0, invoicesSent: 0, repeatingCustomers: 0, clinicExpenses: 0 });
      setDashboardYear(data.year || year);
      setChartState({
        revenue: { view: 'monthly', month: '' },
        invoicesSent: { view: 'monthly', month: '' },
        repeatingCustomers: { view: 'monthly', month: '' },
        clinicExpenses: { view: 'monthly', month: '' },
      });
    } catch (error) {
      alert(`Could not load dashboard. Check backend/MySQL.\n\nError: ${error.message}`);
    } finally {
      setDashboardLoading(false);
    }
  };

  const fetchDailyForMonth = async (month) => {
    if (dailyByMonth[month]) return;
    try {
      const response = await fetch(`${API_BASE}/api/dashboard?view=daily&month=${month}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not fetch daily breakdown');
      setDailyByMonth((prev) => ({ ...prev, [month]: data.series || [] }));
    } catch (error) {
      alert(`Could not load daily breakdown.\n\nError: ${error.message}`);
    }
  };

  useEffect(() => {
    if (activeTab === 'expenses') fetchExpenses();
    if (activeTab === 'dashboard') fetchMonthlyDashboard();
  }, [activeTab]);

  const setChartToDaily = async (key, month) => {
    await fetchDailyForMonth(month);
    setChartState((prev) => ({ ...prev, [key]: { view: 'daily', month } }));
  };

  const setChartToMonthly = (key) => {
    setChartState((prev) => ({ ...prev, [key]: { view: 'monthly', month: '' } }));
  };

  const chartData = (key) => {
    const state = chartState[key];
    if (state.view === 'daily' && state.month) return dailyByMonth[state.month] || [];
    return monthlySeries;
  };


  const handleChartBarClick = async (key, item) => {
    setSelectedBars((prev) => ({ ...prev, [key]: item }));
    if (chartState[key].view === 'monthly') {
      await setChartToDaily(key, item.period);
    }
  };

  const openDetailsPage = (key, title) => {
    const selected = selectedBars[key];
    if (!selected) return;
    setDetailsPage({
      title,
      period: selected.period,
      details: selected.details || [],
    });
    setActiveTab('details');
  };

  const updateTreatment = (index, key, value) => {
    setTreatments((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const addRow = () => setTreatments((prev) => [...prev, { treatmentName: '', amount: '' }]);
  const deleteRow = (index) => setTreatments((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const resetBillingForm = () => {
    setPatientName('');
    setPhoneNumber('');
    setTreatments(initialTreatments);
    setPdfUrl('');
    setLoading(false);
  };

  const submitInvoice = async (e) => {
    e.preventDefault();
    if (!patientName.trim() || !phoneNumber.trim()) return alert('Please enter patient name and WhatsApp number.');

    const cleanTreatments = treatments
      .map((t) => ({ treatment_name: t.treatmentName.trim(), amount: Number(t.amount) }))
      .filter((t) => t.treatment_name && !Number.isNaN(t.amount) && t.amount >= 0);

    if (!cleanTreatments.length) return alert('Please add at least one valid treatment with amount.');

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/generate-bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientName, phoneNumber, treatments: cleanTreatments }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to generate bill');
      setPdfUrl(data.pdfUrl);
      fetchMonthlyDashboard();
    } catch (error) {
      alert(`Unable to generate invoice. Please confirm backend server and MySQL are running.\n\nError: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const submitExpense = async (e) => {
    e.preventDefault();
    if (!expenseDate || !expenseCategory || !expenseDescription.trim() || Number(expenseAmount) < 0) {
      return alert('Please enter valid expense date, category, description and amount.');
    }

    setExpenseLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/expenses`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseDate, category: expenseCategory, description: expenseDescription, amount: Number(expenseAmount) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to save expense');
      setExpenseDescription('');
      setExpenseAmount('');
      await fetchExpenses();
    } catch (error) {
      alert(`Unable to save expense. Please check backend/MySQL.\n\nError: ${error.message}`);
    } finally {
      setExpenseLoading(false);
    }
  };

  const sendWhatsApp = () => {
    const cleanedPhone = phoneNumber.replace(/\D/g, '').replace(/^91/, '');
    const message = `Hi ${patientName}, your dental treatment receipt is ready. You can view/download it here: ${pdfUrl}\n\nRegards, Vamis Dental Care.`;
    window.open(`https://wa.me/91${cleanedPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.headerBrand}>
          {logoVisible && <img src={LOGO_SRC} alt="Vamis Dental Care" style={styles.headerLogo} onError={() => setLogoVisible(false)} />}
          <h1 style={{ ...styles.title, fontSize: 22 }}>Vamis Dental Care</h1>
          <p style={{ ...styles.subtitle, margin: '4px 0 0' }}>Billing, Expenses & Analytics Dashboard</p>
        </div>

        <div style={styles.tabRow}>
          {['dashboard', 'billing', 'expenses'].map((tab) => (
            <button
              key={tab}
              type="button"
              style={{ ...styles.tabBtn, ...(activeTab === tab ? styles.tabBtnActive : {}) }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'dashboard' ? 'Dashboard' : tab === 'billing' ? 'Billing & PDF' : 'Clinic Expenses'}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <>
            <h2 style={styles.previewHeader}>Dashboard Analytics</h2>
            <p style={styles.subtitle}>Monthly bars show January to December. Click any bar to drill down into days for that graph only.</p>
            <p style={{ ...styles.subtitle, marginTop: -12 }}>Year: {dashboardYear}</p>

            <div style={styles.kpiGrid}>
              <div style={styles.kpiCard}><div style={styles.kpiLabel}>Amount Received</div><div style={styles.kpiValue}>{formatINR(dashboardTotals.revenue)}</div></div>
              <div style={styles.kpiCard}><div style={styles.kpiLabel}>Invoices Sent</div><div style={styles.kpiValue}>{dashboardTotals.invoicesSent}</div></div>
              <div style={styles.kpiCard}><div style={styles.kpiLabel}>Repeating Customers</div><div style={styles.kpiValue}>{dashboardTotals.repeatingCustomers}</div></div>
              <div style={styles.kpiCard}><div style={styles.kpiLabel}>Clinic Expenses</div><div style={styles.kpiValue}>{formatINR(dashboardTotals.clinicExpenses)}</div></div>
            </div>

            {dashboardLoading ? (
              <p style={styles.subtitle}>Loading charts...</p>
            ) : (
              <div style={styles.chartGrid}>
                <AxisBarChart
                  title={chartState.revenue.view === 'monthly' ? 'Monthly Amount Received' : `Daily Amount Received (${chartState.revenue.month})`}
                  data={chartData('revenue')}
                  valueKey="revenue"
                  formatter={formatINR}
                  yBaseMax={2000}
                  view={chartState.revenue.view}
                  onBarClick={(item) => handleChartBarClick('revenue', item)}
                  onBack={() => setChartToMonthly('revenue')}
                  selectedItem={selectedBars.revenue}
                  onViewDetails={() => openDetailsPage('revenue', 'Amount Received')}
                />
                <AxisBarChart
                  title={chartState.invoicesSent.view === 'monthly' ? 'Monthly Invoices Sent' : `Daily Invoices Sent (${chartState.invoicesSent.month})`}
                  data={chartData('invoicesSent')}
                  valueKey="invoicesSent"
                  formatter={(value) => value}
                  yBaseMax={2000}
                  view={chartState.invoicesSent.view}
                  onBarClick={(item) => handleChartBarClick('invoicesSent', item)}
                  onBack={() => setChartToMonthly('invoicesSent')}
                  selectedItem={selectedBars.invoicesSent}
                  onViewDetails={() => openDetailsPage('invoicesSent', 'Invoices Sent')}
                />
                <AxisBarChart
                  title={chartState.repeatingCustomers.view === 'monthly' ? 'Monthly Repeating Customers' : `Daily Repeating Customers (${chartState.repeatingCustomers.month})`}
                  data={chartData('repeatingCustomers')}
                  valueKey="repeatingCustomers"
                  formatter={(value) => value}
                  yBaseMax={2000}
                  view={chartState.repeatingCustomers.view}
                  onBarClick={(item) => handleChartBarClick('repeatingCustomers', item)}
                  onBack={() => setChartToMonthly('repeatingCustomers')}
                  selectedItem={selectedBars.repeatingCustomers}
                  onViewDetails={() => openDetailsPage('repeatingCustomers', 'Repeating Customers')}
                />

                <AxisBarChart
                  title={chartState.clinicExpenses.view === 'monthly' ? 'Monthly Clinic Expenses' : `Daily Clinic Expenses (${chartState.clinicExpenses.month})`}
                  data={chartData('clinicExpenses')}
                  valueKey="clinicExpenses"
                  formatter={formatINR}
                  yBaseMax={2000}
                  view={chartState.clinicExpenses.view}
                  onBarClick={(item) => handleChartBarClick('clinicExpenses', item)}
                  onBack={() => setChartToMonthly('clinicExpenses')}
                  selectedItem={selectedBars.clinicExpenses}
                  onViewDetails={() => openDetailsPage('clinicExpenses', 'Clinic Expenses')}
                />
              </div>
            )}
          </>
        )}


        {activeTab === 'details' && detailsPage && (
          <>
            <h2 style={styles.previewHeader}>{detailsPage.title} - Details</h2>
            <p style={styles.subtitle}>Selected period: {detailsPage.period}</p>
            <button type="button" style={{ ...styles.secondaryBtn, maxWidth: 260 }} onClick={() => setActiveTab('dashboard')}>
              ← Back to Dashboard
            </button>
            <table style={styles.expenseTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Label</th>
                  <th style={styles.th}>Description</th>
                </tr>
              </thead>
              <tbody>
                {!detailsPage.details.length && (
                  <tr>
                    <td style={styles.td} colSpan={2}>No details available for this item.</td>
                  </tr>
                )}
                {detailsPage.details.map((item, index) => (
                  <tr key={`${item.label}-${index}`}>
                    <td style={styles.td}>{item.label || '-'}</td>
                    <td style={styles.td}>{item.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {activeTab === 'billing' && (
          <>
            {!pdfUrl ? (
              <>
                <h2 style={styles.previewHeader}>Dental Billing MVP</h2>
                <p style={styles.subtitle}>Create a treatment invoice, preview PDF, and share via WhatsApp.</p>
                <form onSubmit={submitInvoice}>
                  <div style={styles.row}>
                    <div><label style={styles.label}>Patient Name</label><input style={styles.input} value={patientName} onChange={(e) => setPatientName(e.target.value)} required /></div>
                    <div><label style={styles.label}>WhatsApp Number</label><input style={styles.input} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required /></div>
                  </div>
                  <div style={styles.treatmentCard}>
                    <h3 style={{ ...styles.sectionTitle, marginTop: 0 }}>Treatments &amp; Services</h3>
                    {treatments.map((item, index) => (
                      <div key={index} style={styles.treatmentRow}>
                        <input style={styles.input} placeholder="Treatment Name" value={item.treatmentName} onChange={(e) => updateTreatment(index, 'treatmentName', e.target.value)} />
                        <input style={styles.input} placeholder="Amount" type="number" min="0" step="0.01" value={item.amount} onChange={(e) => updateTreatment(index, 'amount', e.target.value)} />
                        <button style={styles.deleteBtn} type="button" onClick={() => deleteRow(index)} disabled={treatments.length === 1}>Delete</button>
                      </div>
                    ))}
                    <button type="button" style={styles.addBtn} onClick={addRow}>+ Add Treatment</button>
                    <div style={styles.total}>Live Total: {formatINR(total)}</div>
                  </div>
                  <button style={styles.submitBtn} type="submit" disabled={loading}>{loading ? 'Generating...' : 'Preview Invoice'}</button>
                </form>
              </>
            ) : (
              <>
                <h2 style={styles.previewHeader}>Document Preview</h2>
                <iframe title="Invoice Preview" src={pdfUrl} style={styles.iframe} />
                <div style={styles.actions}>
                  <button type="button" style={styles.secondaryBtn} onClick={resetBillingForm}>← Back / Create New</button>
                  <button type="button" style={styles.whatsappBtn} onClick={sendWhatsApp}>Send via WhatsApp</button>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'expenses' && (
          <>
            <h2 style={styles.previewHeader}>Clinic Expense Tracker</h2>
            <p style={styles.subtitle}>Track rent, assistant salary, IMAGE IMA fees, purchase items, and other expenses.</p>
            <form onSubmit={submitExpense}>
              <div style={styles.expenseGrid}>
                <div><label style={styles.label}>Expense Date</label><input type="date" style={styles.input} value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required /></div>
                <div><label style={styles.label}>Category</label><select style={styles.input} value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} required>{expenseCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
                <div><label style={styles.label}>Description</label><input style={styles.input} value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} required /></div>
                <div><label style={styles.label}>Amount</label><input style={styles.input} type="number" min="0" step="0.01" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} required /></div>
              </div>
              <button style={styles.submitBtn} type="submit" disabled={expenseLoading}>{expenseLoading ? 'Saving...' : 'Save Expense'}</button>
            </form>
            <div style={styles.expenseSummary}>Total Tracked Expenses: {formatINR(expenseTotal)}</div>
            <table style={styles.expenseTable}>
              <thead><tr><th style={styles.th}>Date</th><th style={styles.th}>Category</th><th style={styles.th}>Description</th><th style={styles.th}>Amount</th></tr></thead>
              <tbody>
                {!expenseList.length && <tr><td style={styles.td} colSpan={4}>No expenses tracked yet.</td></tr>}
                {expenseList.map((expense) => <tr key={expense.id}><td style={styles.td}>{new Date(expense.expense_date).toLocaleDateString('en-IN')}</td><td style={styles.td}>{expense.category}</td><td style={styles.td}>{expense.description}</td><td style={styles.td}>{formatINR(expense.amount)}</td></tr>)}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
