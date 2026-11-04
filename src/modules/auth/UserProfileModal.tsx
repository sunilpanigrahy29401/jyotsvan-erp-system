import React from 'react';
import { Dialog } from '../../components/ui/dialog';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { User, Mail, Shield, Building, Clock, MapPin } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="User Profile & Identity"
      description="InsForge Authentication & Enterprise Identity Foundation"
      footer={
        <div className="flex justify-between w-full items-center">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onClose();
              logout();
            }}
          >
            Sign Out
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Profile Card Summary */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <div className="h-12 w-12 rounded-full bg-slate-900 text-white flex items-center justify-center text-lg font-semibold shrink-0">
            {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-slate-900 truncate">{user.full_name}</h4>
            <p className="text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3 h-3 text-slate-400" />
              {user.email}
            </p>
          </div>
          <Badge variant={user.is_super_admin ? 'default' : 'secondary'} className="shrink-0">
            {user.is_super_admin ? 'Super Admin' : 'Standard'}
          </Badge>
        </div>

        {/* Identity Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-md border border-slate-200 bg-white space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <Building className="w-3.5 h-3.5" />
              <span>Organization</span>
            </div>
            <p className="font-semibold text-slate-900">{user.organization?.name || 'Jyotsvan Enterprise'}</p>
            <p className="text-[11px] text-slate-500 font-mono">{user.organization?.code || 'JYOT-CORP'}</p>
          </div>

          <div className="p-3 rounded-md border border-slate-200 bg-white space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <MapPin className="w-3.5 h-3.5" />
              <span>Current Branch</span>
            </div>
            <p className="font-semibold text-slate-900">{user.currentBranch?.name || 'Headquarters'}</p>
            <p className="text-[11px] text-slate-500">{user.currentBranch?.city}, {user.currentBranch?.country}</p>
          </div>

          <div className="p-3 rounded-md border border-slate-200 bg-white space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <Shield className="w-3.5 h-3.5" />
              <span>Security Roles</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {user.roles?.map((r) => (
                <Badge key={r.id} variant="outline" className="text-[10px]">
                  {r.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-md border border-slate-200 bg-white space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Account Created</span>
            </div>
            <p className="font-semibold text-slate-900">{formatDate(user.created_at)}</p>
            <p className="text-[11px] text-slate-500 font-mono">ID: {user.id}</p>
          </div>
        </div>

        {/* Permissions Foundation Notice */}
        <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
          <span className="font-semibold text-slate-800 block mb-1">Assigned Capabilities (RBAC)</span>
          <div className="flex flex-wrap gap-1">
            {user.permissions?.map((perm) => (
              <span key={perm} className="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                {perm}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
