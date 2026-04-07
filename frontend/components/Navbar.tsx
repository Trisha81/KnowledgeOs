'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Search, Bell, Settings } from 'lucide-react';

const routeNames: Record<string, string> = {
  '/': 'Dashboard',
  '/documents': 'Knowledge Base',
  '/chat': 'AI Chat',
  '/gaps': 'Gap Analysis',
};

export default function Navbar() {
  const pathname = usePathname();
  const [searchValue, setSearchValue] = useState('');
  
  const routeName = routeNames[pathname] || 
    pathname.replace('/', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <nav className="navbar">
      <div className="navbar-breadcrumb">
        <div className="breadcrumb">
          <span>Pages</span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-current">{routeName}</span>
        </div>
        <h1 className="navbar-title">{routeName}</h1>
      </div>

      <div className="navbar-actions">
        <div className="navbar-search">
          <Search size={14} className="navbar-search-icon" />
          <input
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            aria-label="Global search"
          />
        </div>
        <button className="navbar-btn" aria-label="Notifications" id="navbar-notifications-btn">
          <Bell size={16} />
          <span className="badge">3</span>
        </button>
        <button className="navbar-btn" aria-label="Settings" id="navbar-settings-btn">
          <Settings size={16} />
        </button>
      </div>
    </nav>
  );
}
