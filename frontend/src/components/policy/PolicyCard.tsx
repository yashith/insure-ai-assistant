import React, { useState, useEffect } from 'react';
import { Policy } from '../../types/policy';
import { policyApi } from '../../services/api';
import './PolicyCard.css';

interface PolicyCardProps {
  className?: string;
}

const PolicyCard: React.FC<PolicyCardProps> = ({ className = '' }) => {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        setLoading(true);
        const policyData = await policyApi.getUserPolicy();
        setPolicy(policyData);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load policy information');
        setPolicy(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, []);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusClass = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      case 'pending':
        return 'status-pending';
      default:
        return 'status-pending';
    }
  };

  const isDueSoon = (dueDateString: string): boolean => {
    const dueDate = new Date(dueDateString);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  };

  if (loading) {
    return (
      <div className={`loading-card ${className}`}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`error-card ${className}`}>
        <div className="error-title">Unable to Load Policy</div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className={`error-card ${className}`}>
        <div className="error-title">No Policy Found</div>
        <div className="error-message">You don't have an active insurance policy.</div>
      </div>
    );
  }

  return (
    <div className={`policy-card ${className}`}>
      <div className="policy-header">
        <h2 className="policy-title">{policy.policyName}</h2>
        <span className={`policy-status ${getStatusClass(policy.status)}`}>
          {policy.status}
        </span>
      </div>

      <div className="policy-details">
        <div className="detail-row">
          <span className="detail-label">Outstanding Balance</span>
          <span className={`detail-value outstanding-amount`}>
            {formatCurrency(policy.outstanding)}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Policy Term</span>
          <span className="detail-value">{policy.policyTerm} months</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Payment Due Date</span>
          <span className={`detail-value ${isDueSoon(policy.paymentDueDate) ? 'due-date' : ''}`}>
            {formatDate(policy.paymentDueDate)}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Policy Start Date</span>
          <span className="detail-value">{formatDate(policy.createdAt)}</span>
        </div>
      </div>

      <div className="policy-id">
        Policy ID: {policy.id}
      </div>
    </div>
  );
};

export default PolicyCard;