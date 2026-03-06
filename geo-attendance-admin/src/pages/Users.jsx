import { useState, useEffect } from 'react';
import { api } from '../api/client';
import Layout from '../components/layout/Layout';
import AssignOfficeModal from '../components/users/AssignOfficeModal';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.getUsers({ page, limit: 10, search });
      setUsers(response.data.data.users);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignOffice = (user) => {
    setSelectedUser(user);
    setShowAssignModal(true);
  };

  const handleAssignSuccess = () => {
    setShowAssignModal(false);
    setSelectedUser(null);
    fetchUsers();
  };

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.04em', margin: 0, color: 'var(--text-primary)' }}>Users Management</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>View and manage staff accounts and access levels.</p>
          </div>
          {/* <button className="v-btn v-btn-primary" style={{ background: '#fff', color: '#000' }}>Add User</button> */}
        </div>

        {/* Search Bar */}
        <div className="v-card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <svg width="16" height="16" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{
              flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)',
              fontSize: '0.875rem', outline: 'none'
            }}
          />
        </div>

        {/* Users Table */}
        <div className="v-card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 0' }}>
              <div style={{ width: '24px', height: '24px', border: '3px solid var(--accents-2)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              No users found matching your search.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="v-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Assigned Office</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: 'var(--accents-2)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)'
                          }}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 500 }}>{user.name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                      <td>
                        {user.assignedOfficeId ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-primary)' }} />
                            <span>{user.assignedOfficeId.name || 'Assigned'}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>Not assigned</span>
                        )}
                      </td>
                      <td>
                        {user.isActive ? (
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: '99px',
                            background: 'rgba(0,112,243,0.1)', color: 'var(--geist-success)', fontSize: '0.75rem', fontWeight: 500
                          }}>Active</span>
                        ) : (
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: '99px',
                            background: 'rgba(255,0,0,0.1)', color: 'var(--geist-error)', fontSize: '0.75rem', fontWeight: 500
                          }}>Inactive</span>
                        )}
                      </td>
                      <td>
                        <button onClick={() => handleAssignOffice(user)} className="v-btn">
                          Assign Office
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination && pagination.total > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Showing {users.length} of {pagination.totalUsers} users
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setPage(page - 1)} disabled={page === 1} className="v-btn" style={{ opacity: page === 1 ? 0.5 : 1 }}>Previous</button>
                    <button onClick={() => setPage(page + 1)} disabled={page === pagination.total} className="v-btn" style={{ opacity: page === pagination.total ? 0.5 : 1 }}>Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showAssignModal && (
        <AssignOfficeModal
          user={selectedUser}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedUser(null);
          }}
          onSuccess={handleAssignSuccess}
        />
      )}
    </Layout>
  );
}
