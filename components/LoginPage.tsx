
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { School, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLogin: (role: UserRole) => void;
}

const DEFAULT_AUTH = {
  adminPwd: 'Def@123',
  financePwd: 'Finance@123',
  guestPwd: '', // Empty means no password required
  guestDownload: true
};

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [role, setRole] = useState<string>('Guest');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Load config to ensure it exists or use defaults
  useEffect(() => {
    const savedConfig = localStorage.getItem('darshan_auth_config');
    if (!savedConfig) {
      localStorage.setItem('darshan_auth_config', JSON.stringify(DEFAULT_AUTH));
    } else {
        // Optional: Update existing config if it has the old default password (for dev convenience)
        const config = JSON.parse(savedConfig);
        if (config.financePwd === 'Finance@124') {
            config.financePwd = 'Finance@123';
            localStorage.setItem('darshan_auth_config', JSON.stringify(config));
        }
    }
  }, []);

  // Auto-fill password when role changes
  useEffect(() => {
    const config = JSON.parse(localStorage.getItem('darshan_auth_config') || JSON.stringify(DEFAULT_AUTH));
    
    switch (role) {
        case 'Admin':
            setPassword(config.adminPwd);
            break;
        case 'Finance Team':
            setPassword(config.financePwd);
            break;
        case 'Guest':
            setPassword(config.guestPwd || '');
            break;
        default:
            setPassword('');
    }
    setError(''); // Clear errors when switching roles
  }, [role]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const config = JSON.parse(localStorage.getItem('darshan_auth_config') || JSON.stringify(DEFAULT_AUTH));

    // Simulate delay
    setTimeout(() => {
        let success = false;
        let userRole: UserRole = 'guest';

        if (role === 'Admin') {
            if (password === config.adminPwd) {
                success = true;
                userRole = 'admin';
            }
        } else if (role === 'Finance Team') {
            if (password === config.financePwd) {
                success = true;
                userRole = 'finance';
            }
        } else if (role === 'Guest') {
            if (!config.guestPwd || password === config.guestPwd) {
                success = true;
                userRole = 'guest';
            }
        }

        if (success) {
            onLogin(userRole);
        } else {
            setError('Invalid credentials. Please try again.');
            setLoading(false);
        }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[100px]"></div>
         <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="p-8 pb-6 border-b border-slate-100 bg-slate-50/50">
           <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-xl text-blue-700">
                 <School size={32} />
              </div>
           </div>
           <h1 className="text-2xl font-bold text-center text-slate-900">Darshan Insight360</h1>
           <p className="text-center text-slate-500 text-sm mt-1">Institutional Intelligence Engine</p>
        </div>
        
        <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-sm text-red-600 animate-in slide-in-from-top-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}
                
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">User Role</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select 
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-10 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none"
                        >
                            <option value="Admin">Admin</option>
                            <option value="Finance Team">Finance Team</option>
                            <option value="Guest">Guest</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                {role !== 'Guest' && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-10 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                placeholder="Enter password"
                            />
                        </div>
                    </div>
                )}
                
                {role === 'Guest' && (
                     <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg flex gap-2">
                        <AlertCircle size={16} className="shrink-0" />
                        Guests do not require a password by default.
                     </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            Sign In <ArrowRight size={18} />
                        </>
                    )}
                </button>
            </form>
        </div>
      </div>
      
      <div className="absolute bottom-4 text-center w-full">
         <p className="text-slate-600 text-xs">© 2024 Darshan Education Foundation. All rights reserved.</p>
      </div>
    </div>
  );
};

export default LoginPage;
