import React from 'react';
import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Zap size={14} style={{ color: 'var(--color-primary-light)' }} />
        <span>KnowledgeOS &copy; {new Date().getFullYear()} — AI-Powered Knowledge Management</span>
      </div>
      <div style={{ display: 'flex', gap: '20px' }}>
        <a href="#" style={{ color: 'var(--color-text-muted)', fontSize: '12px', transition: 'color 0.2s' }}>
          Documentation
        </a>
        <a href="#" style={{ color: 'var(--color-text-muted)', fontSize: '12px', transition: 'color 0.2s' }}>
          Support
        </a>
        <a href="#" style={{ color: 'var(--color-text-muted)', fontSize: '12px', transition: 'color 0.2s' }}>
          Privacy
        </a>
      </div>
    </footer>
  );
}
