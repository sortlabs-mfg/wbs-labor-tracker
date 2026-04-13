'use client';

import { useEffect, useState } from 'react';

interface Job {
  job_number: string;
  job_name: string;
  status: string;
  created_at: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ job_number: '', job_name: '', status: 'active' });
  const [formError, setFormError] = useState('');
  const [editRow, setEditRow] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState('active');
  const [editName, setEditName] = useState('');

  const fetchJobs = async () => {
    setLoading(true);
    const res = await fetch('/api/jobs');
    if (res.ok) setJobs(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.job_number || !form.job_name) {
      setFormError('Job number and name are required.');
      return;
    }
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ job_number: '', job_name: '', status: 'active' });
      fetchJobs();
    } else {
      const d = await res.json();
      setFormError(d.error || 'Failed to add job');
    }
  };

  const startEdit = (job: Job) => {
    setEditRow(job.job_number);
    setEditStatus(job.status);
    setEditName(job.job_name);
  };

  const saveEdit = async (job_number: string) => {
    await fetch('/api/jobs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_number, status: editStatus, job_name: editName }),
    });
    setEditRow(null);
    fetchJobs();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Jobs</h1>

      {/* Add Job Form */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Add Job</h2>
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
            <label className="block text-xs font-medium text-slate-600 mb-1">Job Name *</label>
            <input
              type="text"
              value={form.job_name}
              onChange={(e) => setForm({ ...form, job_name: e.target.value })}
              placeholder="Job description"
              className="border border-slate-300 rounded px-2 py-1.5 text-sm w-56"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white"
            >
              <option value="active">Active</option>
              <option value="complete">Complete</option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-[#185FA5] text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700"
          >
            Add Job
          </button>
        </form>
        {formError && <p className="text-xs text-red-500 mt-2">{formError}</p>}
      </div>

      {/* Jobs Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : jobs.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">No jobs yet. Import time data or add manually.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium uppercase tracking-wide">Job #</th>
                <th className="text-left px-4 py-2 text-xs font-medium uppercase tracking-wide">Job Name</th>
                <th className="text-left px-4 py-2 text-xs font-medium uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-2 text-xs font-medium uppercase tracking-wide">Created</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) =>
                editRow === job.job_number ? (
                  <tr key={job.job_number} className="bg-blue-50">
                    <td className="px-4 py-2 font-mono text-xs">{job.job_number}</td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="border border-slate-300 rounded px-2 py-1 text-sm w-48"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="border border-slate-300 rounded px-2 py-1 text-sm bg-white"
                      >
                        <option value="active">Active</option>
                        <option value="complete">Complete</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-slate-400 text-xs">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <button
                        onClick={() => saveEdit(job.job_number)}
                        className="text-xs text-[#1D9E75] font-medium hover:underline"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditRow(null)}
                        className="text-xs text-slate-400 hover:underline"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={job.job_number} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-xs font-semibold">{job.job_number}</td>
                    <td className="px-4 py-2">{job.job_name}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          job.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-400 text-xs">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => startEdit(job)}
                        className="text-xs text-[#185FA5] hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-slate-400">
        Jobs are also automatically created when you import time data via CSV.
      </p>
    </div>
  );
}
