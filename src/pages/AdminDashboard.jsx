import React, { useState, useEffect } from 'react';
import api, { getPlans, createPlan, updatePlan, deletePlan, getRazorpaySettings, saveRazorpaySettings } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatListingPrice } from './HomePage';

export default function AdminDashboard({ onNavigate }) {
  const { user } = useAuth();

  const [activeModule, setActiveModule] = useState('listings'); // 'listings' | 'locations' | 'categories' | 'users' | 'plans' | 'razorpay'
  const [toast, setToast] = useState(null);

  // === LISTINGS MODULE STATE ===
  const [listings, setListings] = useState([]);
  const [listingCounts, setListingCounts] = useState({
    pending: 0, approved: 0, sold: 0, rented: 0, suspended: 0, deleted: 0
  });
  const [listingTab, setListingTab] = useState('pending');
  const [listingSearch, setListingSearch] = useState('');
  const [listingsLoading, setListingsLoading] = useState(false);

  // === LOCATIONS MODULE STATE ===
  const [locations, setLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [newState, setNewState] = useState('Haryana');
  const [newLocCategory, setNewLocCategory] = useState('city');
  const [newLat, setNewLat] = useState('');
  const [newLng, setNewLng] = useState('');
  const [locSaving, setLocSaving] = useState(false);

  // === CATEGORIES MODULE STATE ===
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('fas fa-building');
  const [catSaving, setCatSaving] = useState(false);

  // === USERS MODULE STATE ===
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');

  // === PLANS MODULE STATE ===
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    price: '',
    listing_limit: 10,
    leads_count: 10,
    duration_days: 90,
    description: '',
    status: 'active'
  });
  const [planSaving, setPlanSaving] = useState(false);

  // === RAZORPAY SETTINGS STATE ===
  const [rzpSettings, setRzpSettings] = useState({
    key_id: '',
    key_secret: '',
    webhook_secret: '',
    test_mode: true,
    has_secret: false,
    has_webhook_secret: false
  });
  const [rzpLoading, setRzpLoading] = useState(false);
  const [rzpSaving, setRzpSaving] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // --- FETCH LISTINGS & COUNTS ---
  const fetchListingCounts = async () => {
    try {
      const res = await api.get('/api/v1/listings/counts');
      if (res.data?.status === 'success' && res.data?.data) {
        setListingCounts(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching listing counts:', err);
    }
  };

  const fetchAdminListings = async () => {
    setListingsLoading(true);
    try {
      const res = await api.get('/api/v1/listings', {
        params: {
          status: listingTab,
          search: listingSearch.trim() || undefined
        }
      });
      if (res.data?.status === 'success' && Array.isArray(res.data?.data)) {
        setListings(res.data.data);
      } else {
        setListings([]);
      }
    } catch (err) {
      showToast('Failed to fetch listings', 'error');
    } finally {
      setListingsLoading(false);
    }
  };

  const handleUpdateListingStatus = async (id, action) => {
    try {
      await api.post(`/api/v1/listings/${id}/status`, { action });
      showToast(`Listing #${id} updated: ${action}`);
      fetchAdminListings();
      fetchListingCounts();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Action failed', 'error');
    }
  };

  const handleDeleteListing = async (id) => {
    if (!window.confirm(`Permanently delete listing #${id}?`)) return;
    try {
      await api.delete(`/api/v1/listings/${id}`);
      showToast(`Listing #${id} deleted`);
      fetchAdminListings();
      fetchListingCounts();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to delete listing', 'error');
    }
  };

  // --- FETCH LOCATIONS ---
  const fetchLocations = async () => {
    setLocationsLoading(true);
    try {
      const res = await api.get('/api/v1/locations');
      if (res.data?.status === 'success' && Array.isArray(res.data?.data)) {
        setLocations(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load locations', 'error');
    } finally {
      setLocationsLoading(false);
    }
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!newCityName.trim()) return;
    setLocSaving(true);
    try {
      await api.post('/api/v1/locations', {
        city_name: newCityName.trim(),
        state: newState.trim(),
        category: newLocCategory,
        latitude: newLat ? parseFloat(newLat) : null,
        longitude: newLng ? parseFloat(newLng) : null
      });
      showToast(`Location '${newCityName}' added successfully!`);
      setNewCityName('');
      setNewLat('');
      setNewLng('');
      fetchLocations();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to add location', 'error');
    } finally {
      setLocSaving(false);
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this location?')) return;
    try {
      await api.delete(`/api/v1/locations/${id}`);
      showToast('Location deleted successfully');
      fetchLocations();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to delete location', 'error');
    }
  };

  // --- FETCH CATEGORIES ---
  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await api.get('/api/v1/categories');
      if (res.data?.status === 'success' && Array.isArray(res.data?.data)) {
        setCategories(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load categories', 'error');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim() || !newCatSlug.trim()) return;
    setCatSaving(true);
    try {
      await api.post('/api/v1/categories', {
        name: newCatName.trim(),
        slug: newCatSlug.trim(),
        description: newCatDesc.trim() || null,
        icon_class: newCatIcon.trim() || null
      });
      showToast(`Category '${newCatName}' created successfully!`);
      setNewCatName('');
      setNewCatSlug('');
      setNewCatDesc('');
      fetchCategories();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to add category', 'error');
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/api/v1/categories/${id}`);
      showToast('Category deleted successfully');
      fetchCategories();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to delete category', 'error');
    }
  };

  // --- FETCH USERS ---
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await api.get('/api/v1/admin/users', {
        params: {
          search: userSearch.trim() || undefined,
          role: userRoleFilter || undefined
        }
      });
      if (res.data?.status === 'success' && Array.isArray(res.data?.data)) {
        setUsersList(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load users', 'error');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUserRoleChange = async (userId, newRole) => {
    try {
      await api.post(`/api/v1/admin/users/${userId}/role`, { role: newRole });
      showToast(`User role updated to ${newRole}`);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update user role', 'error');
    }
  };

  const handleDeactivateUser = async (userId) => {
    if (!window.confirm('Deactivate this user account?')) return;
    try {
      await api.post(`/api/v1/admin/users/${userId}/delete`);
      showToast('User deactivated');
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to deactivate user', 'error');
    }
  };

  // --- PLANS HANDLERS ---
  const fetchPlans = async () => {
    setPlansLoading(true);
    try {
      const res = await getPlans(true);
      setPlans(res.data?.data || []);
    } catch (err) {
      showToast('Failed to fetch plans', 'error');
    } finally {
      setPlansLoading(false);
    }
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    setPlanSaving(true);
    try {
      const payload = {
        name: planForm.name.trim(),
        price: parseFloat(planForm.price) || 0,
        listing_limit: parseInt(planForm.listing_limit, 10) || 1,
        leads_count: parseInt(planForm.leads_count, 10) || 0,
        duration_days: parseInt(planForm.duration_days, 10) || 30,
        description: planForm.description.trim() || undefined,
        status: planForm.status
      };

      if (editingPlanId) {
        await updatePlan(editingPlanId, payload);
        showToast('Plan updated successfully!');
      } else {
        await createPlan(payload);
        showToast('New plan created successfully!');
      }

      setEditingPlanId(null);
      setPlanForm({
        name: '',
        price: '',
        listing_limit: 10,
        leads_count: 10,
        duration_days: 90,
        description: '',
        status: 'active'
      });
      fetchPlans();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to save plan', 'error');
    } finally {
      setPlanSaving(false);
    }
  };

  const handleEditPlan = (plan) => {
    setEditingPlanId(plan.id);
    setPlanForm({
      name: plan.name,
      price: plan.price,
      listing_limit: plan.listing_limit,
      leads_count: plan.leads_count,
      duration_days: plan.duration_days,
      description: plan.description || '',
      status: plan.status
    });
  };

  const handleDeletePlan = async (id) => {
    if (!window.confirm(`Are you sure you want to delete plan #${id}?`)) return;
    try {
      await deletePlan(id);
      showToast(`Plan #${id} deleted.`);
      fetchPlans();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to delete plan', 'error');
    }
  };

  // --- RAZORPAY SETTINGS HANDLERS ---
  const fetchRazorpaySettings = async () => {
    setRzpLoading(true);
    try {
      const res = await getRazorpaySettings();
      if (res.data?.data) {
        setRzpSettings({
          key_id: res.data.data.key_id || '',
          key_secret: '',
          webhook_secret: '',
          test_mode: res.data.data.test_mode !== false,
          has_secret: res.data.data.has_secret || false,
          has_webhook_secret: res.data.data.has_webhook_secret || false
        });
      }
    } catch (err) {
      showToast('Failed to fetch Razorpay settings', 'error');
    } finally {
      setRzpLoading(false);
    }
  };

  const handleSaveRazorpaySettings = async (e) => {
    e.preventDefault();
    setRzpSaving(true);
    try {
      const payload = {
        key_id: rzpSettings.key_id.trim() || undefined,
        key_secret: rzpSettings.key_secret.trim() || undefined,
        webhook_secret: rzpSettings.webhook_secret.trim() || undefined,
        test_mode: rzpSettings.test_mode
      };
      await saveRazorpaySettings(payload);
      showToast('Razorpay settings saved successfully!');
      fetchRazorpaySettings();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to save settings', 'error');
    } finally {
      setRzpSaving(false);
    }
  };

  useEffect(() => {
    if (activeModule === 'listings') {
      fetchListingCounts();
      fetchAdminListings();
    } else if (activeModule === 'locations') {
      fetchLocations();
    } else if (activeModule === 'categories') {
      fetchCategories();
    } else if (activeModule === 'users') {
      fetchUsers();
    } else if (activeModule === 'plans') {
      fetchPlans();
    } else if (activeModule === 'razorpay') {
      fetchRazorpaySettings();
    }
  }, [activeModule, listingTab]);

  // Auth gate: Admin only
  if (!user || user.role?.toLowerCase() !== 'admin') {
    return (
      <div style={{ background: '#f4f6f9', minHeight: '65vh', padding: '60px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ background: '#fff', borderRadius: '20px', padding: '48px 40px', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '56px', color: '#dc2626', marginBottom: '16px' }}>
            <i className="fas fa-shield-alt"></i>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '10px' }}>Access Restricted</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            You must be logged in as an Administrator to view the Admin Dashboard.
          </p>
          <button type="button" className="btn-primary" onClick={() => onNavigate('home')}>
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f4f6f9', minHeight: '85vh', padding: '30px 15px' }}>
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            background: toast.type === 'success' ? '#0c6253' : '#dc2626',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
          }}
        >
          {toast.msg}
        </div>
      )}

      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Admin Header */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '24px 28px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-shield-alt" style={{ color: '#0c6253', fontSize: '20px' }}></i>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>
                TradeCall Admin Center
              </h1>
            </div>
            <p style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0 0 0' }}>
              Logged in as: <strong>{user.name}</strong> ({user.email}) &bull; Phase 1 Operations
            </p>
          </div>

          <button
            type="button"
            className="btn-outline"
            onClick={() => onNavigate('post-listing')}
            style={{ fontSize: '13px', padding: '8px 16px' }}
          >
            <i className="fas fa-plus"></i> Post Property as Admin
          </button>
        </div>

        {/* Admin Navigation Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            type="button"
            className={`btn-outline ${activeModule === 'listings' ? 'active' : ''}`}
            onClick={() => setActiveModule('listings')}
            style={{
              background: activeModule === 'listings' ? '#0c6253' : '#fff',
              color: activeModule === 'listings' ? '#fff' : '#374151',
              borderColor: activeModule === 'listings' ? '#0c6253' : '#d1d5db'
            }}
          >
            <i className="fas fa-building"></i> Listings Management
          </button>

          <button
            type="button"
            className={`btn-outline ${activeModule === 'locations' ? 'active' : ''}`}
            onClick={() => setActiveModule('locations')}
            style={{
              background: activeModule === 'locations' ? '#0c6253' : '#fff',
              color: activeModule === 'locations' ? '#fff' : '#374151',
              borderColor: activeModule === 'locations' ? '#0c6253' : '#d1d5db'
            }}
          >
            <i className="fas fa-map-marker-alt"></i> Location Management
          </button>

          <button
            type="button"
            className={`btn-outline ${activeModule === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveModule('categories')}
            style={{
              background: activeModule === 'categories' ? '#0c6253' : '#fff',
              color: activeModule === 'categories' ? '#fff' : '#374151',
              borderColor: activeModule === 'categories' ? '#0c6253' : '#d1d5db'
            }}
          >
            <i className="fas fa-tags"></i> Category Management
          </button>

          <button
            type="button"
            className={`btn-outline ${activeModule === 'users' ? 'active' : ''}`}
            onClick={() => setActiveModule('users')}
            style={{
              background: activeModule === 'users' ? '#0c6253' : '#fff',
              color: activeModule === 'users' ? '#fff' : '#374151',
              borderColor: activeModule === 'users' ? '#0c6253' : '#d1d5db'
            }}
          >
            <i className="fas fa-users"></i> User Management
          </button>

          <button
            type="button"
            className={`btn-outline ${activeModule === 'plans' ? 'active' : ''}`}
            onClick={() => setActiveModule('plans')}
            style={{
              background: activeModule === 'plans' ? '#0c6253' : '#fff',
              color: activeModule === 'plans' ? '#fff' : '#374151',
              borderColor: activeModule === 'plans' ? '#0c6253' : '#d1d5db'
            }}
          >
            <i className="fas fa-gem"></i> Plans & Pricing
          </button>

          <button
            type="button"
            className={`btn-outline ${activeModule === 'razorpay' ? 'active' : ''}`}
            onClick={() => setActiveModule('razorpay')}
            style={{
              background: activeModule === 'razorpay' ? '#0c6253' : '#fff',
              color: activeModule === 'razorpay' ? '#fff' : '#374151',
              borderColor: activeModule === 'razorpay' ? '#0c6253' : '#d1d5db'
            }}
          >
            <i className="fas fa-credit-card"></i> Razorpay Settings
          </button>
        </div>

        {/* ======================================================== */}
        {/* MODULE 1: LISTINGS MANAGEMENT */}
        {/* ======================================================== */}
        {activeModule === 'listings' && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#111827' }}>
                Listings Moderation &amp; Control
              </h2>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search ID, title, owner..."
                  value={listingSearch}
                  onChange={(e) => setListingSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchAdminListings(); }}
                  style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', width: '220px' }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '8px 14px', fontSize: '13px' }}
                  onClick={fetchAdminListings}
                >
                  <i className="fas fa-search"></i>
                </button>
              </div>
            </div>

            {/* Status Tabs */}
            <div className="admin-tabs" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '20px', overflowX: 'auto' }}>
              {['pending', 'approved', 'sold', 'rented', 'suspended', 'deleted'].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`btn-outline ${listingTab === st ? 'active' : ''}`}
                  onClick={() => setListingTab(st)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    textTransform: 'capitalize',
                    background: listingTab === st ? '#0c6253' : '#f8fafc',
                    color: listingTab === st ? '#fff' : '#374151',
                    borderColor: listingTab === st ? '#0c6253' : '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{st}</span>
                  <span
                    style={{
                      background: listingTab === st ? '#08483d' : '#e2e8f0',
                      color: listingTab === st ? '#fff' : '#475569',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 700
                    }}
                  >
                    {listingCounts[st] || 0}
                  </span>
                </button>
              ))}
            </div>

            {/* Listings Table */}
            {listingsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0c6253', marginBottom: '10px' }}></i>
                <div>Loading listings...</div>
              </div>
            ) : listings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#6b7280' }}>
                No {listingTab} listings found.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '12px 14px' }}>ID</th>
                      <th style={{ padding: '12px 14px' }}>Title &amp; Location</th>
                      <th style={{ padding: '12px 14px' }}>Price</th>
                      <th style={{ padding: '12px 14px' }}>Owner</th>
                      <th style={{ padding: '12px 14px' }}>Status</th>
                      <th style={{ padding: '12px 14px' }}>Stamp</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((l) => (
                      <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#64748b' }}>
                          #{l.id}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#111827' }}>{l.title}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            <i className="fas fa-map-marker-alt"></i> {l.location}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0c6253' }}>
                          {formatListingPrice(l.price)}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600 }}>{l.owner_name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{l.owner_role}</div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: l.status === 'approved' ? '#dcfce7' : '#fef3c7',
                              color: l.status === 'approved' ? '#166534' : '#92400e'
                            }}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {l.verified === 1 ? (
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>
                              <i className="fas fa-check-circle"></i> Verified
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn-outline"
                              style={{ padding: '4px 8px', fontSize: '11px', borderColor: '#ea580c', color: '#ea580c' }}
                              onClick={() => handleUpdateListingStatus(l.id, 'stamp')}
                            >
                              <i className="fas fa-stamp"></i> Verify
                            </button>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn-outline"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => onNavigate('listing-detail', l.id)}
                            >
                              View
                            </button>
                            {l.status !== 'approved' && (
                              <button
                                type="button"
                                className="btn-primary"
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                onClick={() => handleUpdateListingStatus(l.id, 'approve')}
                              >
                                Approve
                              </button>
                            )}
                            {l.status !== 'suspended' && (
                              <button
                                type="button"
                                className="btn-outline"
                                style={{ padding: '4px 8px', fontSize: '11px', color: '#ea580c', borderColor: '#fed7aa' }}
                                onClick={() => handleUpdateListingStatus(l.id, 'suspended')}
                              >
                                Suspend
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn-outline"
                              style={{ padding: '4px 8px', fontSize: '11px', color: '#dc2626', borderColor: '#fca5a5' }}
                              onClick={() => handleDeleteListing(l.id)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* MODULE 2: LOCATION MANAGEMENT */}
        {/* ======================================================== */}
        {activeModule === 'locations' && (
          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px', alignItems: 'start' }}>
            {/* Add Location Form */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', color: '#111827' }}>
                Add New City / Location
              </h2>

              <form onSubmit={handleAddLocation}>
                <div className="form-group full">
                  <label>City Name <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Rohtak"
                    value={newCityName}
                    onChange={(e) => setNewCityName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group full">
                  <label>State</label>
                  <input
                    type="text"
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                  />
                </div>

                <div className="form-group full">
                  <label>Category</label>
                  <select value={newLocCategory} onChange={(e) => setNewLocCategory(e.target.value)}>
                    <option value="city">City</option>
                    <option value="suburb">Suburb / Sector</option>
                    <option value="town">Town</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Latitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 28.14"
                      value={newLat}
                      onChange={(e) => setNewLat(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Longitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 77.32"
                      value={newLng}
                      onChange={(e) => setNewLng(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '16px' }}
                  disabled={locSaving}
                >
                  {locSaving ? 'Adding Location...' : 'Add Location'}
                </button>
              </form>
            </div>

            {/* Locations List */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', color: '#111827' }}>
                Active Cities &amp; Regions ({locations.length})
              </h2>

              {locationsLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                  <i className="fas fa-spinner fa-spin"></i> Loading locations...
                </div>
              ) : locations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                  No locations configured yet.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '10px' }}>City Name</th>
                      <th style={{ padding: '10px' }}>State</th>
                      <th style={{ padding: '10px' }}>Category</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map((loc) => (
                      <tr key={loc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px', fontWeight: 700 }}>{loc.city_name}</td>
                        <td style={{ padding: '10px', color: '#6b7280' }}>{loc.state || 'Haryana'}</td>
                        <td style={{ padding: '10px', textTransform: 'capitalize' }}>{loc.category || 'city'}</td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn-outline"
                            style={{ padding: '4px 8px', fontSize: '11px', color: '#dc2626', borderColor: '#fca5a5' }}
                            onClick={() => handleDeleteLocation(loc.id)}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODULE 3: CATEGORY MANAGEMENT */}
        {/* ======================================================== */}
        {activeModule === 'categories' && (
          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px', alignItems: 'start' }}>
            {/* Add Category Form */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', color: '#111827' }}>
                Add New Category
              </h2>

              <form onSubmit={handleAddCategory}>
                <div className="form-group full">
                  <label>Category Name <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Warehouse / Godown"
                    value={newCatName}
                    onChange={(e) => {
                      setNewCatName(e.target.value);
                      setNewCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }}
                    required
                  />
                </div>

                <div className="form-group full">
                  <label>Slug <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. warehouse-godown"
                    value={newCatSlug}
                    onChange={(e) => setNewCatSlug(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group full">
                  <label>FontAwesome Icon Class</label>
                  <input
                    type="text"
                    placeholder="e.g. fas fa-warehouse"
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                  />
                </div>

                <div className="form-group full">
                  <label>Description</label>
                  <textarea
                    rows="3"
                    placeholder="Brief description of properties in this category"
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '16px' }}
                  disabled={catSaving}
                >
                  {catSaving ? 'Saving Category...' : 'Create Category'}
                </button>
              </form>
            </div>

            {/* Categories List */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', color: '#111827' }}>
                Existing Categories ({categories.length})
              </h2>

              {categoriesLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                  <i className="fas fa-spinner fa-spin"></i> Loading categories...
                </div>
              ) : categories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                  No categories found. Add your first category!
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '10px' }}>Icon</th>
                      <th style={{ padding: '10px' }}>Category Name</th>
                      <th style={{ padding: '10px' }}>Slug</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => (
                      <tr key={cat.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px', color: '#0c6253' }}>
                          <i className={cat.icon_class || 'fas fa-tag'}></i>
                        </td>
                        <td style={{ padding: '10px', fontWeight: 700 }}>{cat.name}</td>
                        <td style={{ padding: '10px', color: '#6b7280' }}>{cat.slug}</td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn-outline"
                            style={{ padding: '4px 8px', fontSize: '11px', color: '#dc2626', borderColor: '#fca5a5' }}
                            onClick={() => handleDeleteCategory(cat.id)}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODULE 4: USER MANAGEMENT */}
        {/* ======================================================== */}
        {activeModule === 'users' && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#111827' }}>
                User Accounts &amp; Role Management
              </h2>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px' }}
                >
                  <option value="">All Roles</option>
                  <option value="Owner">Owner</option>
                  <option value="Agent">Agent</option>
                  <option value="Builder">Builder</option>
                  <option value="Admin">Admin</option>
                </select>

                <input
                  type="text"
                  placeholder="Search name, email, phone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchUsers(); }}
                  style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', width: '220px' }}
                />

                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '8px 14px', fontSize: '13px' }}
                  onClick={fetchUsers}
                >
                  <i className="fas fa-search"></i>
                </button>
              </div>
            </div>

            {usersLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0c6253', marginBottom: '10px' }}></i>
                <div>Loading users...</div>
              </div>
            ) : usersList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                No users found.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '12px 14px' }}>ID</th>
                      <th style={{ padding: '12px 14px' }}>Name</th>
                      <th style={{ padding: '12px 14px' }}>Email &amp; Phone</th>
                      <th style={{ padding: '12px 14px' }}>Current Role</th>
                      <th style={{ padding: '12px 14px' }}>Status</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', color: '#64748b' }}>#{u.id}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#111827' }}>
                          {u.name}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div>{u.email}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{u.phone || 'No phone'}</div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <select
                            value={u.role}
                            onChange={(e) => handleUserRoleChange(u.id, e.target.value)}
                            style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px' }}
                          >
                            <option value="Owner">Owner</option>
                            <option value="Agent">Agent</option>
                            <option value="Builder">Builder</option>
                            <option value="Admin">Admin</option>
                          </select>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: u.status === 'active' ? '#dcfce7' : '#fee2e2',
                              color: u.status === 'active' ? '#166534' : '#b91c1c'
                            }}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          {u.id !== user.id && (
                            <button
                              type="button"
                              className="btn-outline"
                              style={{ padding: '4px 8px', fontSize: '11px', color: '#dc2626', borderColor: '#fca5a5' }}
                              onClick={() => handleDeactivateUser(u.id)}
                            >
                              Deactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* MODULE 5: PLANS & PRICING MANAGEMENT */}
        {/* ======================================================== */}
        {activeModule === 'plans' && (
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px', alignItems: 'start' }}>
            {/* Create / Edit Plan Form */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#111827' }}>
                  {editingPlanId ? `Edit Plan #${editingPlanId}` : 'Add New Membership Plan'}
                </h2>
                {editingPlanId && (
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ fontSize: '11px', padding: '2px 8px' }}
                    onClick={() => {
                      setEditingPlanId(null);
                      setPlanForm({
                        name: '',
                        price: '',
                        listing_limit: 10,
                        leads_count: 10,
                        duration_days: 90,
                        description: '',
                        status: 'active'
                      });
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>

              <form onSubmit={handleSavePlan}>
                <div className="form-group full" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Plan Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Gold Unlimited"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group full" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Price (₹ INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1999"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>Owner Leads *</label>
                    <input
                      type="number"
                      placeholder="10"
                      value={planForm.leads_count}
                      onChange={(e) => setPlanForm({ ...planForm, leads_count: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>Listing Limit *</label>
                    <input
                      type="number"
                      placeholder="5"
                      value={planForm.listing_limit}
                      onChange={(e) => setPlanForm({ ...planForm, listing_limit: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>Validity (Days) *</label>
                    <input
                      type="number"
                      placeholder="90"
                      value={planForm.duration_days}
                      onChange={(e) => setPlanForm({ ...planForm, duration_days: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>Status</label>
                    <select
                      value={planForm.status}
                      onChange={(e) => setPlanForm({ ...planForm, status: e.target.value })}
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', width: '100%', fontSize: '13px' }}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="form-group full" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Description</label>
                  <textarea
                    rows={3}
                    placeholder="Short description of plan features..."
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px' }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%' }}
                  disabled={planSaving}
                >
                  {planSaving ? 'Saving...' : editingPlanId ? 'Update Plan' : 'Create Plan'}
                </button>
              </form>
            </div>

            {/* Plans List Table */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', color: '#111827' }}>
                Existing Plans ({plans.length})
              </h2>

              {plansLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                  <i className="fas fa-spinner fa-spin"></i> Loading plans...
                </div>
              ) : plans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                  No plans configured. Create your first plan on the left!
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '10px' }}>ID</th>
                      <th style={{ padding: '10px' }}>Plan Name</th>
                      <th style={{ padding: '10px' }}>Price</th>
                      <th style={{ padding: '10px' }}>Leads</th>
                      <th style={{ padding: '10px' }}>Post Limit</th>
                      <th style={{ padding: '10px' }}>Duration</th>
                      <th style={{ padding: '10px' }}>Status</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px', color: '#64748b' }}>#{p.id}</td>
                        <td style={{ padding: '10px', fontWeight: 700, color: '#111827' }}>{p.name}</td>
                        <td style={{ padding: '10px', fontWeight: 700, color: '#0c6253' }}>
                          ₹{Number(p.price).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '10px' }}>{p.leads_count}</td>
                        <td style={{ padding: '10px' }}>{p.listing_limit}</td>
                        <td style={{ padding: '10px' }}>{p.duration_days} days</td>
                        <td style={{ padding: '10px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: p.status === 'active' ? '#dcfce7' : '#fee2e2',
                              color: p.status === 'active' ? '#166534' : '#b91c1c'
                            }}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn-outline"
                            style={{ padding: '4px 8px', fontSize: '11px', marginRight: '6px' }}
                            onClick={() => handleEditPlan(p)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-outline"
                            style={{ padding: '4px 8px', fontSize: '11px', color: '#dc2626', borderColor: '#fca5a5' }}
                            onClick={() => handleDeletePlan(p.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODULE 6: RAZORPAY GATEWAY CONFIGURATION */}
        {/* ======================================================== */}
        {activeModule === 'razorpay' && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <i className="fas fa-credit-card" style={{ color: '#0c6253', fontSize: '24px' }}></i>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#111827' }}>
                Razorpay Payment Gateway Settings
              </h2>
            </div>
            <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '24px' }}>
              Configure your API keys for payment processing and automated lead credit. Settings saved here dynamically override environment defaults with zero downtime.
            </p>

            {rzpLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0c6253', marginBottom: '10px' }}></i>
                <div>Loading Razorpay settings...</div>
              </div>
            ) : (
              <form onSubmit={handleSaveRazorpaySettings}>
                <div className="form-group full" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Razorpay Key ID</label>
                  <input
                    type="text"
                    placeholder="rzp_test_... or rzp_live_..."
                    value={rzpSettings.key_id}
                    onChange={(e) => setRzpSettings({ ...rzpSettings, key_id: e.target.value })}
                  />
                  <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    Publishable Key ID provided in your Razorpay Dashboard.
                  </small>
                </div>

                <div className="form-group full" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>
                    Razorpay Key Secret {rzpSettings.has_secret && <span style={{ color: '#16a34a', fontWeight: 600 }}>(Configured ✓)</span>}
                  </label>
                  <input
                    type="password"
                    placeholder={rzpSettings.has_secret ? '•••••••••••••••• (Leave blank to keep existing)' : 'Enter Razorpay Key Secret'}
                    value={rzpSettings.key_secret}
                    onChange={(e) => setRzpSettings({ ...rzpSettings, key_secret: e.target.value })}
                  />
                  <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    Used for HMAC-SHA256 server-side signature verification. Never revealed in the browser.
                  </small>
                </div>

                <div className="form-group full" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>
                    Razorpay Webhook Secret {rzpSettings.has_webhook_secret && <span style={{ color: '#16a34a', fontWeight: 600 }}>(Configured ✓)</span>}
                  </label>
                  <input
                    type="password"
                    placeholder={rzpSettings.has_webhook_secret ? '•••••••••••••••• (Leave blank to keep existing)' : 'Enter Webhook Secret'}
                    value={rzpSettings.webhook_secret}
                    onChange={(e) => setRzpSettings({ ...rzpSettings, webhook_secret: e.target.value })}
                  />
                  <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    Used for verifying asynchronous payment webhook events from Razorpay.
                  </small>
                </div>

                <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="rzpTestMode"
                    checked={rzpSettings.test_mode}
                    onChange={(e) => setRzpSettings({ ...rzpSettings, test_mode: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#0c6253' }}
                  />
                  <label htmlFor="rzpTestMode" style={{ fontSize: '14px', fontWeight: 600, color: '#111827', cursor: 'pointer' }}>
                    Enable Sandbox / Test Mode
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', padding: '12px' }}
                  disabled={rzpSaving}
                >
                  {rzpSaving ? (
                    <>
                      <i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Saving Settings...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save" style={{ marginRight: '6px' }}></i> Save Razorpay Settings
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
