'use client';

import { useEffect, useState } from 'react';
import { WBS_CODES } from '@/lib/constants';
import Papa from 'papaparse';

interface Estimate {
  id: number;
  job_number: string;
  job_name: string;
  wbs_code: string;
  wbs_name: string;
  estimated_hrs: string;
  labor_rate: string;
}

interface EditState {
  id: number;
  job_number: string;
  job_name: string;
  wbs_code: string;
  wbs_name: string;
  estimated_hrs: string;
  labor_rate: string;
}

const WBS_OPTIONS = Object.entries(WBS_CODES);

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState<EditState | null>(null);
  const [bulkCsv, setBulkCsv] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [form, setForm] = useState({
    job_number: '',
    job_name: '',
    wbs_code: '902003',
    estimated_hrs: '',
    labor_rate: '55',
  });
  const [formError, setFormError] = useState('');

  const fetchEstimates = async () => {
    setLoading(true);
    const res = await fetch('/api/estimates');
    if (res.ok) setEstimates(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchEstimates(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.job_number || !form.estimated_hrs) {
      setFormError('Job number and estimated hours are required.');
      return;
    }
    const wbs_name = WBS_CODES[form.wbs_code] || form.wbs_code;
    const res = await fetch('/api/estimates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, wbs_name, estimated_hrs: parseFloat(form.estimated_hrs), labor_rate: parseFloat(form.labor_rate) }),
    });
    if (res.ok) {
      setForm({ job_number: '', job_name: '', wbs_code: '902003', estimated_hrs: '', labor_rate: '55' });
      fetchEstimates();
    } else {
      const d = await res.json();
      setFormError(d.error || 'Failed to save estimate');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this estimate?')) return;
    await fetch(`/api/estimates?id=${id}`, { method: 'DELETE' });
    fetchEstimates();
  };

  const handleEditSave = async () => {
    if (!editRow) return;
    const res = await fetch('/api/estimates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editRow,
        wbs_name: WBS_CODES[editRow.wbs_code] || editRow.wbs_name,
        estimated_hrs: parseFloat(editRow.estimated_hrs),
        labor_rate: parseFloat(editRow.labor_rate),
      }),
    });
    if (res.ok) {
      setEditRow(null);
      fetchEstimates();
    }
  };

  const handleBulkImport = async () => {
    setBulkError('');
    setBulkSuccess('');
    const { data, errors } = Papa.parse<Record<string, string>>(bulkCsv.trim(), {
      header: true,
      skipEmptyLines: true,
    });
    if (errors.length > 0) {
      setBulkError('CSV parse error: ' + errors[0].message);
      return;
    }
    const rows = data.map((r) => ({
      job_number: r.job_number || r['Job Number'] || '',
      job_name: r.job_name || r['Job Name'] || '',
      wbs_code: r.wbs_code || r['WBS Code'] || '',
      estimated_hrs: parseFloat(r.estimated_hrs || r['Estimated Hrs'] || '0'),
      labor_rate: parseFloat(r.labor_rate || r['Labor Rate'] || '55'),
    })).filter((r) => r.job_number && r.wbs_code);

    if (rows.length === 0) {
      setBulkError('No valid rows found. Columns: job_number, wbs_code, estimated_hrs');
      return;
    }

    const res = await fetch('/api/estimates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    });
    if (res.ok) {
      const saved = await res.json();
      setBulkSuccess(`Imported ${saved.length} estimate(s).`);
      setBulkCsv('');
      fetchEstimates();
    } else {
      const d = await res.json();
      setBulkError(d.error || 'Import failed');
    }
  };

  // Group by job number
  const grouped = estimates.reduce<Record<string, Estimate[]>>((acc, e) => {
    if (!acc[e.job_number]) acc[e.job_number] = [];
    acc[e.job_number].push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Estimates</h1>
        <button
          onClick={() => setShowBulk(!showBulk)}
          className="text-sm text-[#185FA5] border border-[#185FA5] rounded px-3 py-1.5 hover:bg-blue-50"
        >
          {showBulk ? 'Hide' : 'Bulk CSV Import'}
        </button>
      </div>

      {/* Add Estimate Form */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Add Estimate</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Job Number *</label>
            <input
              type="text"
              value={form.job_number}
              onChange={(e) => setForm({ ...form, job_number: e.target.value })}
              placeholder="e.g. 12345"
              className="border border-slate-300 rounded px-2 py-1.5 text-sm w-32"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Job Name</label>
            <input
              type="text"
              value={form.job_name}
              onChange={(e) => setForm({ ...form, job_name: e.target.value })}
              placeholder="Job description"
              className="border border-slate-300 rounded px-2 py-1.5 text-sm w-44"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">WBS Code *</label>
            <select
              value={form.wbs_code}
              onChange={(e) => setForm({ ...form, wbs_code: e.target.value })}
              className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white"
            >
              {WBS_OPTIONS.map(([code, name]) => (
                <option key={code} value={code}>{code} – {name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Estimated Hrs *</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={form.estimated_hrs}
              onChange={(e) => setForm({ ...form, estimated_hrs: e.target.value })}
              placeholder="0"
              className="border border-slate-300 rounded px-2 py-1.5 text-sm w-24"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Labor Rate</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.labor_rate}
              onChange={(e) => setForm({ ...form, labor_rate: e.target.value })}
              className="border border-slate-300 rounded px-2 py-1.5 text-sm w-20"
            />
          </div>
          <button
            type="submit"
            className="bg-[#185FA5] text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700"
          >
            Add
          </button>
        </form>
        {formError && <p className="text-xs text-red-500 mt-2">{formError}</p>}
      </div>

      {/* Bulk Import */}
      {showBulk && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Bulk CSV Import</h2>
          <p className="text-xs text-slate-500">
            Paste CSV with columns: <code className="bg-slate-100 px-1 rounded">job_number, wbs_code, estimated_hrs</code>
            (optional: job_name, labor_rate)
          </p>
          <textarea
            value={bulkCsv}
            onChange={(e) => setBulkCsv(e.target.value)}
            placeholder="job_number,wbs_code,estimated_hrs&#10;12345,902003,40&#10;12345,902005,20"
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono h-32"
          />
          {bulkError && <p className="text-xs text-red-500">{bulkError}</p>}
          {bulkSuccess && <p className="text-xs text-green-600">{bulkSuccess}</p>}
          <button
            onClick={handleBulkImport}
            className="bg-[#185FA5] text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700"
          >
            Import CSV
          </button>
        </div>
      )}

      {/* Estimates Table */}
      {loading ? (
        <div className="text-slate-400 text-sm py-8 text-center">Loading...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-slate-400 text-sm py-8 text-center">No estimates yet. Add one above.</div>
      ) : (
        Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([jobNum, rows]) => (
          <div key={jobNum} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
              <span className="font-semibold text-slate-700 text-sm">{jobNum}</span>
              {rows[0]?.job_name && (
                <span className="text-slate-500 text-sm ml-2">– {rows[0].job_name}</span>
              )}
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium uppercase tracking-wide">WBS Code</th>
                  <th className="text-left px-4 py-2 text-xs font-medium uppercase tracking-wide">Activity</th>
                  <th className="text-right px-4 py-2 text-xs font-medium uppercase tracking-wide">Est. Hrs</th>
                  <th className="text-right px-4 py-2 text-xs font-medium uppercase tracking-wide">Rate</th>
                  <th className="text-right px-4 py-2 text-xs font-medium uppercase tracking-wide">Est. Cost</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((est) =>
                  editRow?.id === est.id ? (
                    <tr key={est.id} className="bg-blue-50">
                      <td className="px-4 py-2">
                        <select
                          value={editRow.wbs_code}
                          onChange={(e) => setEditRow({ ...editRow, wbs_code: e.target.value })}
                          className="border border-slate-300 rounded px-1 py-0.5 text-sm"
                        >
                          {WBS_OPTIONS.map(([code, name]) => (
                            <option key={code} value={code}>{code} – {name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2 text-slate-500">
                        {WBS_CODES[editRow.wbs_code] || editRow.wbs_code}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.5"
                          value={editRow.estimated_hrs}
                          onChange={(e) => setEditRow({ ...editRow, estimated_hrs: e.target.value })}
                          className="border border-slate-300 rounded px-1 py-0.5 text-sm w-20 text-right"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={editRow.labor_rate}
                          onChange={(e) => setEditRow({ ...editRow, labor_rate: e.target.value })}
                          className="border border-slate-300 rounded px-1 py-0.5 text-sm w-16 text-right"
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-slate-500">
                        ${(parseFloat(editRow.estimated_hrs) * parseFloat(editRow.labor_rate)).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right space-x-2">
                        <button onClick={handleEditSave} className="text-xs text-[#1D9E75] font-medium hover:underline">Save</button>
                        <button onClick={() => setEditRow(null)} className="text-xs text-slate-400 hover:underline">Cancel</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={est.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono text-xs">{est.wbs_code}</td>
                      <td className="px-4 py-2">{est.wbs_name}</td>
                      <td className="px-4 py-2 text-right">{parseFloat(est.estimated_hrs).toFixed(1)}</td>
                      <td className="px-4 py-2 text-right">${parseFloat(est.labor_rate).toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">
                        ${(parseFloat(est.estimated_hrs) * parseFloat(est.labor_rate)).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right space-x-3">
                        <button
                          onClick={() => setEditRow({ ...est })}
                          className="text-xs text-[#185FA5] hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(est.id)}
                          className="text-xs text-[#E24B4A] hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={2} className="px-4 py-2 text-xs font-medium text-slate-500">Total</td>
                  <td className="px-4 py-2 text-right text-xs font-semibold">
                    {rows.reduce((s, r) => s + parseFloat(r.estimated_hrs), 0).toFixed(1)}
                  </td>
                  <td />
                  <td className="px-4 py-2 text-right text-xs font-semibold">
                    ${rows.reduce((s, r) => s + parseFloat(r.estimated_hrs) * parseFloat(r.labor_rate), 0).toFixed(2)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
