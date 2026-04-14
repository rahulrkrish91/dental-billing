import { useMemo, useState } from 'react';

const API_BASE = 'http://localhost:5000';

const initialTreatments = [{ treatmentName: '', amount: '' }];

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #e2e8f0, #dbeafe)',
    padding: '40px 20px',
    fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
    color: '#1e293b',
  },
  card: {
    maxWidth: 980,
    margin: '0 auto',
    background: '#ffffff',
    borderRadius: 18,
    boxShadow: '0 20px 45px rgba(2, 132, 199, 0.12)',
    padding: 28,
    border: '1px solid #e2e8f0',
  },
  title: { margin: 0, fontSize: 28, fontWeight: 700 },
  subtitle: { margin: '8px 0 24px', color: '#64748b' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  label: { fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'block' },
  input: {
    width: '100%',
    border: '1px solid #cbd5e1',
    borderRadius: 12,
    padding: '11px 12px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  sectionTitle: { fontSize: 17, marginTop: 24, marginBottom: 10 },
  treatmentRow: {
    display: 'grid',
    gridTemplateColumns: '1.8fr 1fr auto',
    gap: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  addBtn: {
    background: '#f0f9ff',
    color: '#0369a1',
    border: '1px solid #bae6fd',
    padding: '9px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 600,
  },
  deleteBtn: {
    background: '#fff1f2',
    color: '#be123c',
    border: '1px solid #fecdd3',
    padding: '9px 10px',
    borderRadius: 10,
    cursor: 'pointer',
  },
  submitBtn: {
    marginTop: 20,
    width: '100%',
    background: '#0284c7',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '12px 16px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
  total: {
    marginTop: 14,
    padding: 14,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    textAlign: 'right',
    fontWeight: 700,
    color: '#0284c7',
  },
  previewHeader: { marginBottom: 14, fontSize: 24 },
  iframe: {
    width: '100%',
    height: 550,
    border: '1px solid #dbeafe',
    borderRadius: 14,
  },
  actions: { display: 'flex', gap: 12, marginTop: 16 },
  secondaryBtn: {
    flex: 1,
    background: '#f8fafc',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    padding: '11px 12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  whatsappBtn: {
    flex: 1,
    background: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '11px 12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
};

const formatINR = (value) =>
  `₹ ${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

function App() {
  const [patientName, setPatientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [treatments, setTreatments] = useState(initialTreatments);
  const [pdfUrl, setPdfUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const total = useMemo(
    () => treatments.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0),
    [treatments],
  );

  const updateTreatment = (index, key, value) => {
    setTreatments((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const addRow = () => setTreatments((prev) => [...prev, { treatmentName: '', amount: '' }]);

  const deleteRow = (index) => {
    setTreatments((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const resetForm = () => {
    setPatientName('');
    setPhoneNumber('');
    setTreatments(initialTreatments);
    setPdfUrl('');
    setLoading(false);
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!patientName.trim() || !phoneNumber.trim()) {
      alert('Please enter patient name and WhatsApp number.');
      return;
    }

    const cleanTreatments = treatments
      .map((t) => ({ treatment_name: t.treatmentName.trim(), amount: Number(t.amount) }))
      .filter((t) => t.treatment_name && !Number.isNaN(t.amount) && t.amount >= 0);

    if (!cleanTreatments.length) {
      alert('Please add at least one valid treatment with amount.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/generate-bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName,
          phoneNumber,
          treatments: cleanTreatments,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to generate bill');
      }

      setPdfUrl(data.pdfUrl);
    } catch (error) {
      alert(
        `Unable to generate invoice. Please confirm backend server and MySQL are running.\n\nError: ${error.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsApp = () => {
    const cleanedPhone = phoneNumber.replace(/\D/g, '').replace(/^91/, '');
    const message = `Hi ${patientName}, your dental treatment receipt is ready. You can view/download it here: ${pdfUrl} \n\nRegards, Vamis Dental Care.`;
    const waUrl = `https://wa.me/91${cleanedPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {!pdfUrl ? (
          <>
            <h1 style={styles.title}>Dental Billing MVP</h1>
            <p style={styles.subtitle}>Create a treatment invoice, preview PDF, and share via WhatsApp.</p>

            <form onSubmit={submit}>
              <div style={styles.row}>
                <div>
                  <label style={styles.label}>Patient Name</label>
                  <input
                    style={styles.input}
                    placeholder="Enter patient name"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={styles.label}>WhatsApp Number</label>
                  <input
                    style={styles.input}
                    placeholder="e.g. 9876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              <h3 style={styles.sectionTitle}>Treatments &amp; Services</h3>

              {treatments.map((item, index) => (
                <div key={index} style={styles.treatmentRow}>
                  <input
                    style={styles.input}
                    placeholder="Treatment Name"
                    value={item.treatmentName}
                    onChange={(e) => updateTreatment(index, 'treatmentName', e.target.value)}
                  />
                  <input
                    style={styles.input}
                    placeholder="Amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) => updateTreatment(index, 'amount', e.target.value)}
                  />
                  <button
                    style={styles.deleteBtn}
                    type="button"
                    onClick={() => deleteRow(index)}
                    disabled={treatments.length === 1}
                    title={treatments.length === 1 ? 'At least one row is required' : 'Delete row'}
                  >
                    Delete
                  </button>
                </div>
              ))}

              <button type="button" style={styles.addBtn} onClick={addRow}>
                + Add Treatment
              </button>

              <div style={styles.total}>Live Total: {formatINR(total)}</div>

              <button style={styles.submitBtn} type="submit" disabled={loading}>
                {loading ? 'Generating...' : 'Preview Invoice'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 style={styles.previewHeader}>Document Preview</h2>
            <iframe title="Invoice Preview" src={pdfUrl} style={styles.iframe} />
            <div style={styles.actions}>
              <button type="button" style={styles.secondaryBtn} onClick={resetForm}>
                ← Back / Create New
              </button>
              <button type="button" style={styles.whatsappBtn} onClick={sendWhatsApp}>
                Send via WhatsApp
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
