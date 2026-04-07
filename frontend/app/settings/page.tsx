'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import {
  User, Bell, Shield, Key, Sliders, Moon, Sun, Monitor,
  Save, Loader2, CheckCircle2, Copy, LogOut
} from 'lucide-react';
import { updateProfile, updatePassword } from '../../lib/api';

type TabId = 'profile' | 'preferences' | 'api' | 'security';

export default function SettingsPage() {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    // Profile
    name: '',
    department: '',
    email: '',
    // Preferences
    theme: 'dark',
    notifications: true,
    compactMode: false,
    // API
    anthropicKey: '',
    openaiKey: '',
  });

  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passLoading, setPassLoading] = useState(false);

  // Load existing data on mount
  useEffect(() => {
    const saved = localStorage.getItem('kos_settings');
    if (saved) {
      setFormData(prev => ({ ...prev, ...JSON.parse(saved) }));
    } else if (user) {
      // Default to user details if no saved settings
      setFormData(prev => ({ 
        ...prev, 
        name: user.name, 
        email: user.email, 
        department: user.department || '' 
      }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Update backend profile
      await updateProfile({ name: formData.name, department: formData.department });
      
      // Save local preferences
      localStorage.setItem('kos_settings', JSON.stringify(formData));
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Settings save failed:', err);
      alert('Failed to save profile. ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passForm.currentPassword || !passForm.newPassword) return;
    if (passForm.newPassword !== passForm.confirmPassword) {
      return alert('Confirm password does not match new password.');
    }

    setPassLoading(true);
    try {
      await updatePassword({
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword
      });
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      alert('Password updated successfully.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'preferences', icon: Sliders, label: 'Preferences' },
    { id: 'api', icon: Key, label: 'API Keys' },
    { id: 'security', icon: Shield, label: 'Security' },
  ] as const;

  return (
    <div className="settings-layout">
      {/* Header */}
      <div className="settings-header">
        <div>
          <h1 className="settings-title">Settings</h1>
          <p className="settings-desc">Manage your account settings and preferences.</p>
        </div>
        <div className="settings-actions">
          {saveSuccess && (
            <span className="settings-success-toast">
              <CheckCircle2 size={16} /> Saved
            </span>
          )}
          <button 
            className="settings-save-btn" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <><Loader2 size={16} className="spinner" /> Saving...</>
            ) : (
              <><Save size={16} /> Save Changes</>
            )}
          </button>
        </div>
      </div>

      <div className="settings-content">
        {/* Sidebar Tabs */}
        <aside className="settings-sidebar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            )
          })}
          
          <hr className="settings-divider" style={{ margin: '16px 0', opacity: 0.5 }} />
          
          <button 
            className="settings-tab" 
            style={{ color: '#ef4444' }} 
            onClick={() => {
              if (window.confirm('Are you sure you want to log out?')) {
                useAuth().logout();
              }
            }}
          >
            <LogOut size={18} />
            Log Out
          </button>
        </aside>

        {/* Dynamic Panels */}
        <div className="settings-panel">
          
          {/* PROFILE */}
          {activeTab === 'profile' && (
            <div className="settings-section fadeIn">
              <h2 className="settings-section-title">Personal Information</h2>
              
              <div className="settings-avatar-group">
                <div className="settings-avatar-large">
                  {formData.name.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <button className="settings-btn-secondary">Upload new picture</button>
                  <p className="settings-hint mt-2">JPG, GIF or PNG. 1MB max.</p>
                </div>
              </div>

              <div className="settings-form-grid">
                <div className="settings-field">
                  <label>Full Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} />
                </div>
                <div className="settings-field">
                  <label>Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} disabled />
                  <span className="settings-hint">Email cannot be changed directly.</span>
                </div>
                <div className="settings-field">
                  <label>Role</label>
                  <input type="text" value={user?.role.toUpperCase() || 'VIEWER'} disabled />
                </div>
                <div className="settings-field">
                  <label>Department</label>
                  <input type="text" name="department" value={formData.department} onChange={handleChange} />
                </div>
              </div>
            </div>
          )}

          {/* PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="settings-section fadeIn">
              <h2 className="settings-section-title">App Preferences</h2>

              <div className="settings-field">
                <label>Appearance</label>
                <div className="settings-theme-selector">
                  <label className={`theme-card ${formData.theme === 'light' ? 'active' : ''}`}>
                    <input type="radio" name="theme" value="light" checked={formData.theme === 'light'} onChange={handleChange} className="hidden-radio" />
                    <div className="theme-preview light"><Sun size={24}/></div>
                    <span>Light</span>
                  </label>
                  <label className={`theme-card ${formData.theme === 'dark' ? 'active' : ''}`}>
                    <input type="radio" name="theme" value="dark" checked={formData.theme === 'dark'} onChange={handleChange} className="hidden-radio" />
                    <div className="theme-preview dark"><Moon size={24}/></div>
                    <span>Dark</span>
                  </label>
                  <label className={`theme-card ${formData.theme === 'system' ? 'active' : ''}`}>
                    <input type="radio" name="theme" value="system" checked={formData.theme === 'system'} onChange={handleChange} className="hidden-radio" />
                    <div className="theme-preview system"><Monitor size={24}/></div>
                    <span>System</span>
                  </label>
                </div>
              </div>

              <hr className="settings-divider" />

              <div className="settings-toggle-row">
                <div>
                  <strong>Email Notifications</strong>
                  <p>Receive updates about gap analysis reports and weekly summaries.</p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" name="notifications" checked={formData.notifications} onChange={handleChange} />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-toggle-row">
                <div>
                  <strong>Compact Mode</strong>
                  <p>Reduce padding and font sizes to fit more data on screen.</p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" name="compactMode" checked={formData.compactMode} onChange={handleChange} />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          )}

          {/* API KEYS */}
          {activeTab === 'api' && (
            <div className="settings-section fadeIn">
              <h2 className="settings-section-title">API Keys</h2>
              <p className="settings-desc mb-6">Connect your own API keys to bypass rate limits or use custom models for the RAG chat feature. These keys are stored safely.</p>

              <div className="settings-field">
                <label>Anthropic API Key</label>
                <div className="settings-input-group">
                  <input 
                    type="password" 
                    name="anthropicKey" 
                    value={formData.anthropicKey} 
                    onChange={handleChange} 
                    placeholder="sk-ant-api03-..." 
                  />
                  <button className="settings-icon-btn"><Copy size={16}/></button>
                </div>
                <span className="settings-hint">Used for Claude 3 chat and document summarization.</span>
              </div>

              <div className="settings-field mt-6">
                <label>OpenAI API Key</label>
                <div className="settings-input-group">
                  <input 
                    type="password" 
                    name="openaiKey" 
                    value={formData.openaiKey} 
                    onChange={handleChange} 
                    placeholder="sk-..." 
                  />
                  <button className="settings-icon-btn"><Copy size={16}/></button>
                </div>
                <span className="settings-hint">Used exclusively for generating text embeddings.</span>
              </div>
            </div>
          )}

          {/* SECURITY */}
          {activeTab === 'security' && (
            <div className="settings-section fadeIn">
              <h2 className="settings-section-title">Security & Passwords</h2>

              <form onSubmit={handleUpdatePassword}>
                <div className="settings-field">
                  <label>Current Password</label>
                  <input 
                    type="password" 
                    name="currentPassword"
                    value={passForm.currentPassword}
                    onChange={e => setPassForm(p => ({ ...p, currentPassword: e.target.value }))}
                    placeholder="••••••••" 
                    required
                  />
                </div>

                <div className="settings-form-grid" style={{ marginTop: 16 }}>
                  <div className="settings-field">
                    <label>New Password</label>
                    <input 
                      type="password" 
                      name="newPassword"
                      value={passForm.newPassword}
                      onChange={e => setPassForm(p => ({ ...p, newPassword: e.target.value }))}
                      placeholder="Min. 8 characters" 
                      required
                    />
                  </div>
                  <div className="settings-field">
                    <label>Confirm Password</label>
                    <input 
                      type="password" 
                      name="confirmPassword"
                      value={passForm.confirmPassword}
                      onChange={e => setPassForm(p => ({ ...p, confirmPassword: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="settings-btn-primary mt-4"
                  disabled={passLoading || !passForm.newPassword}
                >
                  {passLoading ? <><Loader2 size={14} className="spinner" /> Updating...</> : 'Update Password'}
                </button>
              </form>

              <hr className="settings-divider mt-8" />
              
              <h3 className="settings-subsection-title text-red">Danger Zone</h3>
              <div className="settings-danger-box">
                <div>
                  <strong>Deactivate Account</strong>
                  <p>Instantly revoke all access and pause your account. This action can be undone by an admin.</p>
                </div>
                <button className="settings-btn-danger">Deactivate</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
