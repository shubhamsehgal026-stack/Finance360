
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { X, Lock, Save, Shield, Users, Download, Eye, EyeOff } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, userRole }) => {
  const [config, setConfig] = useState<any>({});
  
  // Local state for inputs
  const [adminPwd, setAdminPwd] = useState('');
  const [financePwd, setFinancePwd] = useState('');
  const [guestPwd, setGuestPwd] = useState('');
  const [guestDownload, setGuestDownload] = useState(true);

  // Toggle visibility
  const [showAdmin, setShowAdmin] = useState(false);
  const [showFinance, setShowFinance] = useState(false);
  const [showGuest, setShowGuest] = useState(false);

  useEffect(() => {
    if (isOpen) {
        const saved = localStorage.getItem('darshan_auth_config');
        if (saved) {
            const parsed = JSON.parse(saved);
            setConfig(parsed);
            setAdminPwd(parsed.adminPwd);
            setFinancePwd(parsed.financePwd);
            setGuestPwd(parsed.guestPwd || '');
            setGuestDownload(parsed.guestDownload);
        }
    }
  }, [isOpen]);

  const handleSave = () => {
    const newConfig = {
        ...config,
        adminPwd,
        financePwd,
        guestPwd,
        guestDownload
    };
    localStorage.setItem('darshan_auth_config', JSON.stringify(newConfig));
    // Also dispatch an event so App.tsx might pick up changes if it listened, 
    // but a reload is usually required or just next login. 
    // For download permission, we might need a way to propagate immediately.
    window.dispatchEvent(new Event('auth-config-changed'));
    onClose();
    alert("Settings saved successfully.");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
            <h2 className="text-lg font-bold flex items-center gap-2">
                <Shield size={18} className="text-blue-400" />
                Security Settings
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            
            {/* Admin Section - Only for Admin */}
            {userRole === 'admin' && (
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Admin Controls</h3>
                    <div className="space-y-3">
                         <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Admin Password</label>
                            <div className="relative">
                                <input 
                                    type={showAdmin ? "text" : "password"} 
                                    value={adminPwd}
                                    onChange={(e) => setAdminPwd(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                />
                                <button onClick={() => setShowAdmin(!showAdmin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    {showAdmin ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                         </div>
                    </div>
                </div>
            )}

            {/* Finance Section - Admin & Finance */}
            {(userRole === 'admin' || userRole === 'finance') && (
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Finance Team Controls</h3>
                    <div className="space-y-3">
                         <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Finance Team Password</label>
                            <div className="relative">
                                <input 
                                    type={showFinance ? "text" : "password"} 
                                    value={financePwd}
                                    onChange={(e) => setFinancePwd(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                />
                                <button onClick={() => setShowFinance(!showFinance)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    {showFinance ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                         </div>
                    </div>
                </div>
            )}

            {/* Guest Section - Admin & Finance */}
            {(userRole === 'admin' || userRole === 'finance') && (
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Guest Access Controls</h3>
                    
                    {/* Only Admin can set Guest Password */}
                    {userRole === 'admin' && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Guest Password (Optional)</label>
                            <div className="relative">
                                <input 
                                    type={showGuest ? "text" : "password"} 
                                    value={guestPwd}
                                    onChange={(e) => setGuestPwd(e.target.value)}
                                    placeholder="Leave empty for no password"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                />
                                <button onClick={() => setShowGuest(!showGuest)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    {showGuest ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">If set, guests must enter this password to login.</p>
                        </div>
                    )}

                    {/* Both can toggle download */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                <Download size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">Data Download</p>
                                <p className="text-xs text-slate-500">Allow guests to export Excel/Charts</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={guestDownload} 
                                onChange={(e) => setGuestDownload(e.target.checked)} 
                                className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>
            )}

        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                Cancel
            </button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                <Save size={16} /> Save Changes
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
