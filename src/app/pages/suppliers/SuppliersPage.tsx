import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { SupplierListPage } from './SupplierListPage';
import { SupplierDetailsPage } from './SupplierDetailsPage';
import { SupplierFormModal } from './SupplierFormModal';
import { SupplierContactModal } from './SupplierContactModal';
import { SupplierAddressModal } from './SupplierAddressModal';
import { SupplierSkuModal } from './SupplierSkuModal';
import { SupplierPriceModal } from './SupplierPriceModal';
import { SupplierDocumentModal } from './SupplierDocumentModal';
import { SupplierStatusModal } from './SupplierStatusModal';
import {
  Supplier,
  SupplierContact,
  SupplierAddress,
  SupplierSKU,
  SupplierStatus
} from '../../../types/suppliers';
import { supplierService } from '../../../services/supplierService';

interface SuppliersPageProps {
  onNavigate?: (path: string) => void;
}

export const SuppliersPage: React.FC<SuppliersPageProps> = ({ onNavigate }) => {
  const { user, hasPermission } = useAuth();
  const { showToast } = useToast();

  const showSuccess = (msg: string) => showToast(msg, { variant: 'success' });
  const showError = (msg: string) => showToast(msg, { variant: 'destructive' });

  const organizationId = user?.organization_id || 'org-jyotsvan-corp';
  const hasCreatePermission = Boolean(user?.is_super_admin || hasPermission('suppliers.create'));
  const hasEditPermission = Boolean(user?.is_super_admin || hasPermission('suppliers.edit'));

  // Active View State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  // Modal Visibility States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<SupplierContact | null>(null);

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  const [isSkuModalOpen, setIsSkuModalOpen] = useState(false);
  const [editingSkuMapping, setEditingSkuMapping] = useState<SupplierSKU | null>(null);

  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [mappedSkusForPricing, setMappedSkusForPricing] = useState<SupplierSKU[]>([]);

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusTargetSupplier, setStatusTargetSupplier] = useState<Supplier | null>(null);

  // Refresh trigger counter for child components
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey(k => k + 1);

  // 1. Create or Edit Supplier Handler
  const handleSaveSupplier = async (data: Partial<Supplier>) => {
    try {
      if (editingSupplier) {
        await supplierService.updateSupplier(editingSupplier.id, {
          ...data,
          organization_id: organizationId,
          actor_id: user?.id,
          actor_email: user?.email
        });
        showSuccess('Supplier profile updated successfully');
      } else {
        const res = await supplierService.createSupplier({
          ...data,
          organization_id: organizationId,
          actor_id: user?.id,
          actor_email: user?.email
        });
        showSuccess(`Vendor registered successfully (${res.supplier_code})`);
        setSelectedSupplierId(res.supplier_id);
      }
      setIsFormModalOpen(false);
      setEditingSupplier(null);
      triggerRefresh();
    } catch (err: any) {
      showError(err.message || 'Failed to save supplier details');
      throw err;
    }
  };

  // 2. Status Change Handler
  const handleConfirmStatusChange = async (newStatus: SupplierStatus, reason?: string) => {
    if (!statusTargetSupplier) return;
    try {
      await supplierService.updateStatus(
        statusTargetSupplier.id,
        newStatus,
        reason,
        organizationId,
        user?.id,
        user?.email
      );
      showSuccess(`Vendor status changed to ${newStatus.toUpperCase()}`);
      setIsStatusModalOpen(false);
      setStatusTargetSupplier(null);
      triggerRefresh();
    } catch (err: any) {
      showError(err.message || 'Failed to update vendor status');
      throw err;
    }
  };

  // 3. Contact Handlers
  const handleSaveContact = async (data: Partial<SupplierContact>) => {
    if (!selectedSupplierId) return;
    try {
      if (editingContact) {
        await supplierService.updateContact(selectedSupplierId, editingContact.id, {
          ...data,
          actor_id: user?.id,
          actor_email: user?.email
        });
        showSuccess('Contact representative updated');
      } else {
        await supplierService.addContact(selectedSupplierId, {
          ...data,
          actor_id: user?.id,
          actor_email: user?.email
        });
        showSuccess('Contact representative added');
      }
      setIsContactModalOpen(false);
      setEditingContact(null);
      triggerRefresh();
    } catch (err: any) {
      showError(err.message || 'Failed to save contact person');
      throw err;
    }
  };

  // 4. Address Handler
  const handleSaveAddress = async (data: Partial<SupplierAddress>) => {
    if (!selectedSupplierId) return;
    try {
      await supplierService.addAddress(selectedSupplierId, {
        ...data,
        supplier_id: selectedSupplierId
      });
      showSuccess('Facility location added');
      setIsAddressModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      showError(err.message || 'Failed to add address');
      throw err;
    }
  };

  // 5. SKU Mapping Handler
  const handleSaveSkuMapping = async (data: any) => {
    if (!selectedSupplierId) return;
    try {
      if (editingSkuMapping) {
        await supplierService.updateSkuMapping(selectedSupplierId, editingSkuMapping.id, {
          ...data,
          actor_id: user?.id,
          actor_email: user?.email
        });
        showSuccess('SKU mapping parameters updated');
      } else {
        await supplierService.linkSku(selectedSupplierId, {
          ...data,
          actor_id: user?.id,
          actor_email: user?.email
        });
        showSuccess('Canonical SKU mapped to supplier');
      }
      setIsSkuModalOpen(false);
      setEditingSkuMapping(null);
      triggerRefresh();
    } catch (err: any) {
      showError(err.message || 'Failed to map SKU');
      throw err;
    }
  };

  // 6. Price Quote Handler
  const handleSavePriceQuote = async (data: any) => {
    if (!selectedSupplierId) return;
    try {
      await supplierService.addPriceQuote(selectedSupplierId, {
        ...data,
        actor_id: user?.id,
        actor_email: user?.email
      });
      showSuccess('Price quote logged successfully');
      setIsPriceModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      showError(err.message || 'Failed to add price quote');
      throw err;
    }
  };

  // 7. Document Handler
  const handleSaveDocument = async (data: any) => {
    if (!selectedSupplierId) return;
    try {
      await supplierService.addDocument(selectedSupplierId, {
        ...data,
        actor_id: user?.id,
        actor_email: user?.email
      });
      showSuccess('Compliance document attached');
      setIsDocModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      showError(err.message || 'Failed to attach document');
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* View Switcher: List Directory vs. 360 Profile */}
      {!selectedSupplierId ? (
        <SupplierListPage
          key={refreshKey}
          organizationId={organizationId}
          hasCreatePermission={hasCreatePermission}
          onSelectSupplier={(id) => setSelectedSupplierId(id)}
          onOpenCreateModal={() => {
            setEditingSupplier(null);
            setIsFormModalOpen(true);
          }}
          onOpenStatusModal={(sup) => {
            setStatusTargetSupplier(sup);
            setIsStatusModalOpen(true);
          }}
        />
      ) : (
        <SupplierDetailsPage
          key={`${selectedSupplierId}-${refreshKey}`}
          supplierId={selectedSupplierId}
          organizationId={organizationId}
          hasEditPermission={hasEditPermission}
          onBack={() => setSelectedSupplierId(null)}
          onEditSupplier={(sup) => {
            setEditingSupplier(sup);
            setIsFormModalOpen(true);
          }}
          onOpenStatusModal={(sup) => {
            setStatusTargetSupplier(sup);
            setIsStatusModalOpen(true);
          }}
          onAddContact={() => {
            setEditingContact(null);
            setIsContactModalOpen(true);
          }}
          onEditContact={(contact) => {
            setEditingContact(contact);
            setIsContactModalOpen(true);
          }}
          onAddAddress={() => {
            setIsAddressModalOpen(true);
          }}
          onLinkSku={() => {
            setEditingSkuMapping(null);
            setIsSkuModalOpen(true);
          }}
          onEditSku={(mapping) => {
            setEditingSkuMapping(mapping);
            setIsSkuModalOpen(true);
          }}
          onAddPriceQuote={async () => {
            // Fetch mapped SKUs for pricing quote selection
            try {
              const currentSup = await supplierService.getSupplierById(selectedSupplierId, organizationId);
              setMappedSkusForPricing(currentSup.skus || []);
              setIsPriceModalOpen(true);
            } catch (err) {
              showError('Failed to load mapped SKUs');
            }
          }}
          onAddDocument={() => {
            setIsDocModalOpen(true);
          }}
        />
      )}

      {/* MODAL DIALOGS */}

      {/* 1. Register / Edit Supplier Modal */}
      <SupplierFormModal
        isOpen={isFormModalOpen}
        supplier={editingSupplier}
        organizationId={organizationId}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingSupplier(null);
        }}
        onSave={handleSaveSupplier}
      />

      {/* 2. Contact Management Modal */}
      <SupplierContactModal
        isOpen={isContactModalOpen}
        contact={editingContact}
        onClose={() => {
          setIsContactModalOpen(false);
          setEditingContact(null);
        }}
        onSave={handleSaveContact}
      />

      {/* 3. Address Management Modal */}
      <SupplierAddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={handleSaveAddress}
      />

      {/* 4. SKU Mapping Modal */}
      {selectedSupplierId && (
        <SupplierSkuModal
          isOpen={isSkuModalOpen}
          supplierId={selectedSupplierId}
          mapping={editingSkuMapping}
          organizationId={organizationId}
          onClose={() => {
            setIsSkuModalOpen(false);
            setEditingSkuMapping(null);
          }}
          onSave={handleSaveSkuMapping}
        />
      )}

      {/* 5. Pricing Quote Modal */}
      {selectedSupplierId && (
        <SupplierPriceModal
          isOpen={isPriceModalOpen}
          supplierId={selectedSupplierId}
          mappedSkus={mappedSkusForPricing}
          organizationId={organizationId}
          onClose={() => setIsPriceModalOpen(false)}
          onSave={handleSavePriceQuote}
        />
      )}

      {/* 6. Document Upload Modal */}
      {selectedSupplierId && (
        <SupplierDocumentModal
          isOpen={isDocModalOpen}
          supplierId={selectedSupplierId}
          organizationId={organizationId}
          onClose={() => setIsDocModalOpen(false)}
          onSave={handleSaveDocument}
        />
      )}

      {/* 7. Status Lifecycle Transition Modal */}
      {statusTargetSupplier && (
        <SupplierStatusModal
          isOpen={isStatusModalOpen}
          supplierName={statusTargetSupplier.supplier_name}
          currentStatus={statusTargetSupplier.status}
          onClose={() => {
            setIsStatusModalOpen(false);
            setStatusTargetSupplier(null);
          }}
          onConfirm={handleConfirmStatusChange}
        />
      )}
    </div>
  );
};
