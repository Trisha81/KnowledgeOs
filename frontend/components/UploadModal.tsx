'use client';

import React, { useState } from 'react';
import { X, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { uploadDocument } from '../lib/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = ['Engineering', 'HR & People', 'Finance', 'Product', 'Legal', 'Operations', 'General'];

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [form, setForm] = useState({ title: '', category: 'General', content: '' });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!form.title) {
        setForm(prev => ({ ...prev, title: selected.name.replace(/\.[^/.]+$/, "") }));
      }
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result && typeof evt.target.result === 'string') {
          setForm(prev => ({ ...prev, content: evt.target!.result as string }));
        }
      };
      
      if (selected.name.match(/\.(txt|md|csv|json)$/i) || selected.type.startsWith('text/')) {
        reader.readAsText(selected);
      } else {
        setForm(prev => ({ ...prev, content: `[Binary content automatically loaded from: ${selected.name}]` }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || (!form.content.trim() && !file)) return;

    setLoading(true);
    setStatus('idle');
    setErrorMsg('');

    try {
      await uploadDocument({ title: form.title, category: form.category, content: form.content, file: file || undefined });
      setStatus('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Upload failed. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick} role="dialog" aria-modal="true">
      <div className="modal">
        {/* Modal Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            <Upload size={18} style={{ display: 'inline', marginRight: '8px', color: 'var(--color-primary-light)' }} />
            Add Document
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close modal" id="modal-close-btn">
            <X size={16} />
          </button>
        </div>

        {/* Success State */}
        {status === 'success' && (
          <div className="alert alert-info" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: '#34d399' }}>
            <CheckCircle size={16} />
            <span>Document uploaded successfully! Closing...</span>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="alert alert-danger">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="doc-title">Document Title *</label>
            <input
              id="doc-title"
              name="title"
              type="text"
              className="form-input"
              placeholder="e.g. Q3 Engineering Runbook"
              value={form.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="doc-category">Category</label>
            <select
              id="doc-category"
              name="category"
              className="form-input form-select"
              value={form.category}
              onChange={handleChange}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" htmlFor="doc-file">Upload from Device</label>
            <div className="file-upload-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                id="doc-file"
                type="file"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept=".txt,.md,.json,.csv,.pdf,.docx"
              />
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => document.getElementById('doc-file')?.click()}
              >
                Choose File
              </button>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                {file ? file.name : 'No file chosen'}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="doc-content">Content *</label>
            <textarea
              id="doc-content"
              name="content"
              className="form-input form-textarea"
              placeholder="Paste the document content here, or upload a file above. The AI will extract key insights and generate a summary."
              value={form.content}
              onChange={handleChange}
              required={!file}
              rows={6}
            />
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '5px' }}>
              AI will automatically categorize, tag, and generate a summary.
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} id="modal-cancel-btn">
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !form.title.trim() || (!form.content.trim() && !file) || status === 'success'}
              id="modal-submit-btn"
            >
              {loading ? (
                <><Loader2 size={15} className="spinner" /> Processing...</>
              ) : (
                <><Upload size={15} /> Upload Document</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
