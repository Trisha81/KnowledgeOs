'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  BarChart3,
  Settings,
  Zap,
  GitBranch,
  LogOut,
} from 'lucide-react';
import { useAuth } from './AuthProvider';

const navLinks = [
  { name: 'Dashboard',     href: '/',          icon: LayoutDashboard },
  { name: 'Knowledge Base', href: '/documents', icon: BookOpen },
  { name: 'AI Chat',       href: '/chat',       icon: MessageSquare },
  { name: 'Gap Analysis',  href: '/gaps',       icon: BarChart3 },
  { name: 'GitHub Nest',   href: '/github',     icon: GitBranch },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth(); // dynamically fetched from AuthContext

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <Link href="/" className="sidebar-brand">
          <div className="sidebar-logo">
            <Zap size={18} color="white" />
          </div>
          <span className="sidebar-brand-name">
            Knowledge<span>OS</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <p className="sidebar-section-label">Main Menu</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href ||
              (link.href !== '/' && pathname.startsWith(link.href));

            return (
              <li className="nav-item" key={link.href}>
                <Link
                  href={link.href}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">
                    <Icon size={18} />
                  </span>
                  {link.name}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="sidebar-section-label" style={{ marginTop: '24px' }}>Configuration</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li className="nav-item">
            <Link
              href="/settings"
              className={`nav-link ${pathname === '/settings' || pathname.startsWith('/settings/') ? 'active' : ''}`}
            >
              <span className="nav-icon"><Settings size={18} /></span>
              Settings
            </Link>
          </li>
        </ul>
      </nav>

      {/* User Footer */}
      <div className="sidebar-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="sidebar-user" style={{ flex: 1, minWidth: 0 }}>
          <div className="sidebar-user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
          <div className="sidebar-user-info" style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            <div className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'User'}</div>
            <div className="sidebar-user-role">{typeof user?.role === 'string' ? user.role.toUpperCase() : 'USER'}</div>
          </div>
        </div>
        
        <button 
          onClick={() => {
            if (window.confirm('Are you sure you want to log out?')) {
              logout();
            }
          }}
          className="sidebar-logout-btn"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s',
            flexShrink: 0
          }}
          title="Log Out"
          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
