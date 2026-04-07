'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  getDocuments, deleteDocument, getDocument, DocumentItem 
} from '../../lib/api';
import UploadModal from '../../components/UploadModal';
import { useAuth } from '../../components/AuthProvider';
import { 
  Trash2, Eye, ShieldAlert, Key, Info, 
  Search, Loader2, Plus, FileText, Database, 
  Tag, Calendar, X, Sparkles, Brain 
} from 'lucide-react';

const CATEGORIES = ['All', 'Engineering', 'HR & People', 'Finance', 'Product', 'Legal', 'Operations'];

export default function Documents() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [detailDoc, setDetailDoc] = useState<DocumentItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const { user } = useAuth();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDocuments({
        search: search || undefined,
        category: category !== 'All' ? category : undefined,
      });
      setDocs(res.docs || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    const timer = setTimeout(loadData, 400);
    return () => clearTimeout(timer);
  }, [loadData]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently delete this document?')) return;
    try {
      await deleteDocument(id);
      loadData();
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  const openDetail = async (id: string) => {
    setSelectedDocId(id);
    setDetailLoading(true);
    try {
      const res = await getDocument(id);
      setDetailDoc(res);
    } catch (err) {
      console.error('Failed to load document details', err);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header flex items-center justify-between" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={26} style={{ color: 'var(--color-primary-light)' }} />
            Knowledge Base
          </h1>
          <p>Manage and search across all enterprise knowledge context.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setModalOpen(true)}
          id="add-document-btn"
        >
          <Plus size={16} /> Add Document
        </button>
      </div>

      {/* Search + Filters */}
      <div className="search-bar">
        <Search size={16} className="search-bar-icon" />
        <input
          type="text"
          placeholder="Search by keyword, topic, or content..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search documents"
          id="document-search-input"
        />
      </div>

      {/* Category Filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`btn btn-sm ${category === cat ? 'btn-primary' : 'btn-ghost'}`}
            id={`category-filter-${cat.toLowerCase().replace(/[^a-z]/g, '-')}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      {!loading && docs.length > 0 && (
        <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Showing <strong style={{ color: 'var(--color-text)' }}>{docs.length}</strong> of{' '}
          <strong style={{ color: 'var(--color-text)' }}>{total}</strong> documents
        </div>
      )}

      {/* Document List */}
      {loading ? (
        <div className="loading-center">
          <Loader2 size={24} className="spinner" style={{ color: 'var(--color-primary)' }} />
          <span>Loading documents...</span>
        </div>
      ) : docs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Database size={52} /></div>
          <h3>No Documents Found</h3>
          <p>
            {search || category !== 'All'
              ? 'No documents match your current filters. Try adjusting your search.'
              : 'Your knowledge base is empty. Add your first document to get started.'}
          </p>
          {!search && category === 'All' && (
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Add First Document
            </button>
          )}
        </div>
      ) : (
        <div className="doc-grid">
          {docs.map((doc) => {
            if (!doc) return null;
            const title = doc.title || 'Untitled Document';
            return (
              <div key={doc._id} className="doc-card animate-in" onClick={() => openDetail(doc._id)} style={{ cursor: 'pointer' }}>
                <div className="doc-card-left">
                  <div className="doc-icon">
                    <FileText size={20} />
                  </div>
                  <div className="doc-info">
                    <div className="doc-title">{title}</div>
                    <div className="doc-excerpt">
                      {doc.summary || doc.content?.substring(0, 80) + '...'}
                    </div>
                  </div>
                </div>
                <div className="doc-meta">
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {doc.category && (
                      <span className="badge badge-primary">
                        <Tag size={9} /> {doc.category}
                      </span>
                    )}
                    {user?.role === 'admin' && (
                      <button 
                        className="btn-icon-danger" 
                        onClick={(e) => handleDelete(e, doc._id)}
                        title="Delete Document"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    <Calendar size={11} /> {formatDate(doc.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <UploadModal
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={loadData}
        />
      )}

      {/* Document Detail Modal */}
      {(selectedDocId || detailLoading) && (
        <div className="modal-overlay" onClick={() => setSelectedDocId(null)}>
          <div className="modal" style={{ maxWidth: '800px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <FileText size={18} style={{ display: 'inline', marginRight: '8px', color: 'var(--color-primary-light)' }} />
                Document Intel
              </h2>
              <button className="modal-close" onClick={() => setSelectedDocId(null)}>
                <X size={16} />
              </button>
            </div>
            
            {detailLoading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <Loader2 size={32} className="spinner" style={{ margin: '0 auto 16px', color: 'var(--color-primary)' }} />
                <p>Decoding knowledge context...</p>
              </div>
            ) : detailDoc ? (
              <div className="modal-body doc-detail-body">
                <div className="doc-detail-header-main">
                  <h1>{detailDoc.title}</h1>
                  <div className="doc-detail-badges">
                    <span className="badge badge-primary">{detailDoc.category}</span>
                    <span className="badge badge-secondary">{detailDoc.type || 'Document'}</span>
                  </div>
                </div>

                <div className="doc-detail-section">
                  <h3><Sparkles size={14} /> AI Executive Summary</h3>
                  <p className="doc-detail-summary">{detailDoc.summary || 'No summary available.'}</p>
                </div>

                {detailDoc.keyInsights && detailDoc.keyInsights.length > 0 && (
                  <div className="doc-detail-section">
                    <h3><Brain size={14} /> Key Insights</h3>
                    <ul className="doc-detail-list">
                      {detailDoc.keyInsights.map((insight: any, i: number) => (
                        <li key={i}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="doc-detail-grid">
                  <div className="doc-detail-col">
                    <h3><Info size={14} /> Full Content</h3>
                    <div className="doc-detail-content-box">
                      {detailDoc.content}
                    </div>
                  </div>
                  
                  <div className="doc-detail-col">
                    {detailDoc.tags && detailDoc.tags.length > 0 && (
                      <div className="doc-detail-sub">
                        <h3><Tag size={14} /> Context Tags</h3>
                        <div className="doc-detail-tags">
                          {detailDoc.tags.map((tag: any) => (
                            <span key={tag} className="tag-pill">#{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="doc-detail-sub" style={{ marginTop: '20px' }}>
                      <h3><ShieldAlert size={14} /> RBAC & Meta</h3>
                      <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                        <p><strong>Created:</strong> {formatDate(detailDoc.createdAt)}</p>
                        <p><strong>Visibility:</strong> Internal Only (Zero Trust)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <p>Document not found or access denied.</p>
              </div>
            )}

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelectedDocId(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => {
                alert('Downloading protected PDF...');
              }}>Download Source</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
