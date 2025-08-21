import React, { useState, useEffect } from 'react';
import { Claim } from '../../types/claim';
import { claimApi } from '../../services/api';
import './ClaimStatus.css';

const ClaimStatus: React.FC = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingClaim, setRefreshingClaim] = useState<number | null>(null);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      setError(null);
      const claimsData = await claimApi.getAllClaims();
      setClaims(claimsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch claims');
    } finally {
      setLoading(false);
    }
  };


  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'completed':
        return '#4CAF50';
      case 'pending':
      case 'in review':
        return '#FF9800';
      case 'rejected':
      case 'denied':
        return '#f44336';
      case 'created':
        return '#2196F3';
      default:
        return '#757575';
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  };

  if (loading) {
    return (
      <div className="claim-status-container">
        <div className="claim-status-header">
          <h2>My Claims</h2>
        </div>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading claims...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="claim-status-container">
      <div className="claim-status-header">
        <h2>My Claims</h2>
        <button onClick={fetchClaims} className="refresh-all-button">
          Refresh All
        </button>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {claims.length === 0 ? (
        <div className="no-claims">
          <p>No claims found. You haven't submitted any claims yet.</p>
        </div>
      ) : (
        <div className="claims-table-container">
          <div className="table-wrapper">
            <table className="claims-table">
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Status</th>
                  <th>Description</th>
                  <th>Vehicle</th>
                  <th>Submitted</th>
                  <th>Last Updated</th>
                  <th>Photos</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.id}>
                    <td className="claim-id">#{claim.id}</td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(claim.status) }}
                      >
                        {claim.status}
                      </span>
                    </td>
                    <td className="description-cell">
                      <div className="description-text">
                        {claim.damage}
                      </div>
                    </td>
                    <td className="vehicle-cell">
                      {claim.vehicle || 'N/A'}
                    </td>
                    <td className="date-cell">
                      {formatDate(claim.createdAt)}
                    </td>
                    <td className="date-cell">
                      {formatDate(claim.updatedAt)}
                    </td>
                    <td className="photos-cell">
                      {claim.photos && claim.photos.length > 0 ? (
                        <div className="photo-count">
                          {claim.photos.length} file{claim.photos.length > 1 ? 's' : ''}
                        </div>
                      ) : (
                        <span className="no-photos">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimStatus;