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
    fetchUsers(); // Refresh list
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-white">Users Management</h2>
        </div>

        {/* Search */}
        <div className="card">
          <input
            type="text"
            placeholder="Search by name or email..."
            className="input"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Users Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table">
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
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-white">{user.name}</span>
                          </div>
                        </td>
                        <td className="text-slate-300">{user.email}</td>
                        <td>
                          {user.assignedOfficeId ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-600/20 text-primary-400">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              {user.assignedOfficeId.name || 'Assigned'}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-sm">Not assigned</span>
                          )}
                        </td>
                        <td>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${user.isActive
                              ? 'bg-green-600/20 text-green-400'
                              : 'bg-red-600/20 text-red-400'
                            }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleAssignOffice(user)}
                            className="btn btn-secondary text-sm"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Assign Office
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
                  <p className="text-slate-400 text-sm">
                    Showing {users.length} of {pagination.totalUsers} users
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-white">
                      Page {pagination.current} of {pagination.total}
                    </span>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page === pagination.total}
                      className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Assign Office Modal */}
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
