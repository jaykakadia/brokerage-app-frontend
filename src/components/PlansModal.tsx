import { useState, useEffect } from 'react';
import { getPlans, createPaymentOrder, verifyPayment, getApiErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Listing, Plan, PlanType } from '../types';

export interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** 'featured' shows Featured Listing plans and features `listing` on payment. */
  planType?: PlanType;
  listing?: Pick<Listing, 'id' | 'title'> | null;
  /** Opened because the user ran out of leads while unlocking a contact. */
  noLeads?: boolean;
}

export default function PlansModal({ isOpen, onClose, onSuccess, planType = 'leads', listing = null, noLeads = false }: PlansModalProps) {
  const isFeatured = planType === 'featured';
  const { refreshUser } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      void loadPlans();
    }
  }, [isOpen, planType]);

  const loadPlans = async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await getPlans(false, planType);
      const list = [...(res.data?.data || [])].sort((a, b) => Number(a.price) - Number(b.price));
      setPlans(list);
      if (list.length > 0) {
        setSelectedPlanId(list[0].id);
      }
    } catch (err: unknown) {
      console.error('Failed to load plans:', err);
      setErrorMsg('Failed to load available plans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAndPay = async (): Promise<void> => {
    if (!selectedPlanId) return;
    setErrorMsg(null);
    setProcessing(true);

    try {
      const res = await createPaymentOrder(selectedPlanId, isFeatured ? listing?.id : undefined);
      const { order_id, payment_session_id, environment } = res.data;

      // In mock mode (local dev / tests) the backend treats the order as paid, so skip checkout.
      if (environment !== 'mock') {
        if (typeof window.Cashfree !== 'function') {
          throw new Error('Payment gateway failed to load. Please refresh the page and try again.');
        }
        const cashfree = window.Cashfree({ mode: environment });
        const result = await cashfree.checkout({ paymentSessionId: payment_session_id, redirectTarget: '_modal' });
        if (result.error) {
          // Closing the checkout popup also lands here
          setErrorMsg(result.error.message || 'Payment was not completed.');
          setProcessing(false);
          return;
        }
      }

      // The backend confirms the payment with Cashfree before crediting anything.
      await verifyPayment({ order_id });
      setSuccessMsg(isFeatured
        ? 'Payment successful! Your listing is now featured.'
        : 'Payment successful! Your leads balance and plan have been credited.');
      await refreshUser();
      if (onSuccess) onSuccess();
      setProcessing(false);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: unknown) {
      console.error('Order creation error:', err);
      setErrorMsg(getApiErrorMessage(err, 'Unable to initiate payment.'));
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !processing) onClose();
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#111827' }}>
              {isFeatured ? 'Feature Your Listing' : 'Select a Membership Plan'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
              {isFeatured
                ? <>Show <strong>{listing?.title || 'your listing'}</strong> in Featured Listings on the home page.</>
                : 'Unlock direct contact details of genuine property owners with Zero Brokerage.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            style={{
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4b5563',
              fontSize: '16px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 28px' }}>
          {noLeads && !successMsg && (
            <div
              style={{
                background: '#fff7ed',
                color: '#9a3412',
                border: '1px solid #fed7aa',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '18px'
              }}
            >
              <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
              You have no leads left. Buy a plan below to keep viewing owner contacts.
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fee2e2',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '13px',
                marginBottom: '18px'
              }}
            >
              <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                background: '#f0fdf4',
                color: '#16a34a',
                border: '1px solid #dcfce7',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '18px'
              }}
            >
              <i className="fas fa-check-circle" style={{ marginRight: '6px' }}></i>
              {successMsg}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0c6253', marginBottom: '10px' }}></i>
              <div>{isFeatured ? 'Loading featured plans...' : 'Loading membership plans...'}</div>
            </div>
          ) : plans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
              <i className="fas fa-box-open fa-2x" style={{ color: '#9ca3af', marginBottom: '10px' }}></i>
              <div>{isFeatured ? 'No featured listing plans' : 'No subscription plans'} currently available. Please contact support.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {plans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                return (
                  <div
                    key={plan.id}
                    onClick={() => !processing && setSelectedPlanId(plan.id)}
                    style={{
                      border: isSelected ? '2px solid #0c6253' : '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '20px 16px',
                      cursor: 'pointer',
                      background: isSelected ? '#f0faf6' : '#fff',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    {isSelected && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '-10px',
                          right: '12px',
                          background: '#0c6253',
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          textTransform: 'uppercase'
                        }}
                      >
                        Selected
                      </span>
                    )}
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
                        {plan.name}
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#0c6253', marginBottom: '12px' }}>
                        ₹{Number(plan.price).toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.6' }}>
                        {isFeatured ? (
                          <>
                            <div><i className="fas fa-star" style={{ color: '#0c6253', width: '18px' }}></i> <strong>1</strong> Featured Listing</div>
                            <div><i className="fas fa-clock" style={{ color: '#0c6253', width: '18px' }}></i> <strong>{plan.duration_days}</strong> Days Featured</div>
                          </>
                        ) : (
                          <>
                            <div><i className="fas fa-phone-alt" style={{ color: '#0c6253', width: '18px' }}></i> <strong>{plan.leads_count}</strong> Owner Contacts</div>
                            <div><i className="fas fa-home" style={{ color: '#0c6253', width: '18px' }}></i> <strong>{plan.listing_limit}</strong> Property Posts</div>
                            <div><i className="fas fa-clock" style={{ color: '#0c6253', width: '18px' }}></i> <strong>{plan.duration_days}</strong> Days Validity</div>
                          </>
                        )}
                      </div>
                      {plan.description && (
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: '10px 0 0' }}>
                          {plan.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Secure Payment Note */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#475569' }}>
              <i className="fas fa-shield-alt" style={{ color: '#0c6253', fontSize: '20px' }}></i>
              <span>100% Secure Payments via Cashfree (UPI, Cards, NetBanking)</span>
            </div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Zero Brokerage</span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn-outline"
              onClick={onClose}
              disabled={processing}
              style={{ padding: '10px 20px', fontSize: '14px' }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void handleSelectAndPay()}
              disabled={processing || !selectedPlanId || plans.length === 0}
              style={{ padding: '10px 24px', fontSize: '14px', minWidth: '150px' }}
            >
              {processing ? (
                <>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Processing...
                </>
              ) : (
                <>
                  <i className="fas fa-lock" style={{ marginRight: '6px' }}></i> Pay & Activate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
