import React, { useState, useEffect } from 'react';
import api, {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getCashfreeSettings,
  saveCashfreeSettings,
  API_BASE_URL,
  getRoleLimits,
  saveRoleLimits,
  getEmployees,
  saveEmployee,
  deleteEmployee,
  getAdminBlogs,
  saveAdminBlog,
  deleteAdminBlog,
  getMailSettings,
  saveMailSettings,
  sendTestMail,
  getAdminSignupGuide,
  saveSignupGuide,
  getApiErrorMessage,
  getEnquiryCounts
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import LocationMapPreview, { type MapPlace } from '../components/LocationMapPreview';
import AdminLocationsByState from '../components/AdminLocationsByState';
import { getListingCity } from '../utils/listingKind';
import { StateOptions } from '../utils/indianStates';
import AdminEnquiries from '../components/AdminEnquiries';
import AdminEditListingModal, { LISTING_STATUSES, STATUS_COLORS, statusAction } from '../components/AdminEditListingModal';
import { formatListingPrice } from './HomePage';
import { normalizeExternalUrl } from '../utils/url';
import {
  Listing,
  ListingCounts,
  Location,
  Category,
  User,
  RoleLimitsMap,
  RoleLimit,
  Plan,
  PlanType,
  Employee,
  Blog,
  NavigateFunction
} from '../types';

interface AdminDashboardProps {
  onNavigate: NavigateFunction;
}

interface ToastState {
  msg: string;
  type: 'success' | 'error';
}

interface PlanFormState {
  name: string;
  price: string | number;
  listing_limit: number | string;
  leads_count: number | string;
  duration_days: number | string;
  description: string;
  status: string;
}

const EMPTY_PLAN_FORM: PlanFormState = {
  name: '',
  price: '',
  listing_limit: 10,
  leads_count: 10,
  duration_days: 90,
  description: '',
  status: 'active'
};

interface UserFormState {
  id: number | null; // null = creating a new user
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'Owner' | 'Agent' | 'Builder' | 'Admin';
  status: string;
  business_name: string;
  whatsapp: string;
  whatsappSameAsPhone: boolean;
  website_url: string;
  facebook_url: string;
  x_url: string;
  youtube_url: string;
}

const EMPTY_USER_FORM: UserFormState = {
  id: null, name: '', email: '', phone: '', password: '', role: 'Owner', status: 'active',
  business_name: '', whatsapp: '', whatsappSameAsPhone: true,
  website_url: '', facebook_url: '', x_url: '', youtube_url: ''
};

type UserLinkKey = 'website_url' | 'facebook_url' | 'x_url' | 'youtube_url';

const USER_LINK_FIELDS: Array<{ key: UserLinkKey; label: string; icon: string; color: string; placeholder: string }> = [
  { key: 'website_url', label: 'Website', icon: 'fas fa-globe', color: '#0c6253', placeholder: 'yourwebsite.com' },
  { key: 'facebook_url', label: 'Facebook', icon: 'fab fa-facebook-f', color: '#1877f2', placeholder: 'facebook.com/yourpage' },
  { key: 'x_url', label: 'X (Twitter)', icon: 'fab fa-x-twitter', color: '#111827', placeholder: 'x.com/yourhandle' },
  { key: 'youtube_url', label: 'YouTube', icon: 'fab fa-youtube', color: '#ff0000', placeholder: 'youtube.com/@yourchannel' }
];

const USER_FIELD_LABEL: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' };
const USER_FIELD_INPUT: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' };

interface EmployeeFormState {
  id: number;
  reference_code: string;
  name: string;
  status: string;
}

interface BlogFormState {
  id: number;
  title: string;
  category: string;
  content: string;
  permalink: string;
  tags: string;
  status: string;
  featured_image: File | null;
}

interface SmtpSettingsState {
  host: string;
  port: number;
  email: string;
  password: string;
  encryption: string;
  from_name: string;
  has_password: boolean;
}

interface CredFormState {
  newUsername: string;
  currPassword: string;
  newPassword: string;
}

interface CashfreeSettingsState {
  app_id: string;
  secret_key: string;
  sandbox: boolean;
  has_secret: boolean;
}

type AdminModule =
  | 'listings'
  | 'locations'
  | 'categories'
  | 'users'
  | 'plans'
  | 'featured-plans'
  | 'tracker'
  | 'blogs'
  | 'enquiries'
  | 'settings'
  | 'cashfree';

const ADMIN_NAV: Array<{ key: AdminModule; label: string; icon: string }> = [
  { key: 'listings', label: 'Listings Management', icon: 'fas fa-building' },
  { key: 'locations', label: 'Location Management', icon: 'fas fa-map-marker-alt' },
  { key: 'categories', label: 'Category Management', icon: 'fas fa-tags' },
  { key: 'users', label: 'User Management', icon: 'fas fa-users' },
  { key: 'plans', label: 'Plans & Pricing', icon: 'fas fa-gem' },
  { key: 'featured-plans', label: 'Featured Listing Plans', icon: 'fas fa-star' },
  { key: 'tracker', label: 'Business Associates', icon: 'fas fa-chart-line' },
  { key: 'blogs', label: 'Blog Management', icon: 'fas fa-blog' },
  { key: 'enquiries', label: 'Enquiry Management', icon: 'fas fa-envelope-open-text' },
  { key: 'settings', label: 'Settings', icon: 'fas fa-cog' },
  { key: 'cashfree', label: 'Cashfree Settings', icon: 'fas fa-credit-card' }
];

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { user, loading: authLoading } = useAuth();

  const [activeModule, setActiveModule] = useState<AdminModule>('listings');
  const [toast, setToast] = useState<ToastState | null>(null);

  // === LISTINGS MODULE STATE ===
  const [listings, setListings] = useState<Listing[]>([]);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  // Listing being featured from the admin, with the number of days typed in ('' = no expiry)
  const [featuringListing, setFeaturingListing] = useState<Listing | null>(null);
  const [featureDays, setFeatureDays] = useState<string>('7');
  const [newEnquiryCount, setNewEnquiryCount] = useState(0);
  const [listingCounts, setListingCounts] = useState<ListingCounts>({
    pending: 0,
    approved: 0,
    sold: 0,
    rented: 0,
    suspended: 0,
    deleted: 0
  });
  const [listingTab, setListingTab] = useState<string>('pending');
  const [listingSearch, setListingSearch] = useState<string>('');
  const [listingsLoading, setListingsLoading] = useState<boolean>(false);

  // === LOCATIONS MODULE STATE ===
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState<boolean>(false);
  const [cityListingCounts, setCityListingCounts] = useState<Map<string, number>>(new Map());
  const [newCityName, setNewCityName] = useState<string>('');
  const [newState, setNewState] = useState<string>('Haryana');
  const [newLocCategory, setNewLocCategory] = useState<string>('city');
  const [newLat, setNewLat] = useState<string>('');
  const [newLng, setNewLng] = useState<string>('');
  const [locSaving, setLocSaving] = useState<boolean>(false);

  // === CATEGORIES MODULE STATE ===
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDesc, setNewCatDesc] = useState<string>('');
  const [catSaving, setCatSaving] = useState<boolean>(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState<boolean>(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryListings, setEditingCategoryListings] = useState<number>(0);

  // === USERS MODULE STATE ===
  const [usersList, setUsersList] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(false);
  const [userSearch, setUserSearch] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('');
  const [userModalOpen, setUserModalOpen] = useState<boolean>(false);
  const [userForm, setUserForm] = useState<UserFormState>(EMPTY_USER_FORM);
  const [showUserPassword, setShowUserPassword] = useState<boolean>(false);
  const [userSaving, setUserSaving] = useState<boolean>(false);

  // === ROLE LIMITS STATE ===
  const [roleLimits, setRoleLimits] = useState<RoleLimitsMap>({ Owner: 0, Agent: 0, Builder: 0 });
  const [roleLimitsSaving, setRoleLimitsSaving] = useState<boolean>(false);

  // === PLANS MODULE STATE ===
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState<boolean>(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [planForm, setPlanForm] = useState<PlanFormState>(EMPTY_PLAN_FORM);
  // Plans & Pricing and Featured Listing Plans share one form/table, filtered by plan type.
  const planType: PlanType = activeModule === 'featured-plans' ? 'featured' : 'leads';
  const [planSaving, setPlanSaving] = useState<boolean>(false);

  // === TRACKER / BUSINESS ASSOCIATES STATE ===
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState<boolean>(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState<boolean>(false);
  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>({
    id: 0,
    reference_code: '',
    name: '',
    status: 'active'
  });
  const [employeeSaving, setEmployeeSaving] = useState<boolean>(false);

  // === BLOGS MODULE STATE ===
  const [adminBlogs, setAdminBlogs] = useState<Blog[]>([]);
  const [blogsLoading, setBlogsLoading] = useState<boolean>(false);
  const [blogModalOpen, setBlogModalOpen] = useState<boolean>(false);
  const [blogForm, setBlogForm] = useState<BlogFormState>({
    id: 0,
    title: '',
    category: 'Buy',
    content: '',
    permalink: '',
    tags: '',
    status: 'publish',
    featured_image: null
  });
  const [blogSaving, setBlogSaving] = useState<boolean>(false);

  // === SETTINGS (SMTP & CREDENTIALS) STATE ===
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettingsState>({
    host: '',
    port: 465,
    email: '',
    password: '',
    encryption: 'ssl',
    from_name: 'TradeCall India',
    has_password: false
  });
  const [smtpLoading, setSmtpLoading] = useState<boolean>(false);
  const [smtpSaving, setSmtpSaving] = useState<boolean>(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState<boolean>(false);
  const [signupGuide, setSignupGuide] = useState<{ blog_url: string; video_url: string }>({ blog_url: '', video_url: '' });
  const [signupGuideSaving, setSignupGuideSaving] = useState<boolean>(false);
  const [credForm, setCredForm] = useState<CredFormState>({
    newUsername: '',
    currPassword: '',
    newPassword: ''
  });
  const [credSaving, setCredSaving] = useState<boolean>(false);

  // === CASHFREE SETTINGS STATE ===
  const [cfSettings, setCfSettings] = useState<CashfreeSettingsState>({
    app_id: '',
    secret_key: '',
    sandbox: true,
    has_secret: false
  });
  const [cfLoading, setCfLoading] = useState<boolean>(false);
  const [cfSaving, setCfSaving] = useState<boolean>(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Sidebar badge: how many Contact Us enquiries are still new
  useEffect(() => {
    getEnquiryCounts()
      .then((res) => setNewEnquiryCount(res.data?.data?.new ?? 0))
      .catch(() => {/* badge is optional */});
  }, []);

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
    } catch {
      showToast('Failed to fetch listings', 'error');
    } finally {
      setListingsLoading(false);
    }
  };

  const handleUpdateListingStatus = async (id: number, action: string) => {
    try {
      await api.post(`/api/v1/listings/${id}/status`, { action });
      showToast(`Listing #${id} updated: ${action}`);
      fetchAdminListings();
      fetchListingCounts();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err) || 'Action failed', 'error');
    }
  };

  const handleSetFeatured = async (id: number, featured: boolean, days?: number) => {
    try {
      await api.post(`/api/v1/listings/${id}/feature`, { featured, days });
      showToast(
        featured
          ? `Listing #${id} featured ${days ? `for ${days} day${days === 1 ? '' : 's'}` : 'with no expiry'}`
          : `Listing #${id} is no longer featured`
      );
      setFeaturingListing(null);
      fetchAdminListings();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err) || 'Action failed', 'error');
    }
  };

  const handleSubmitFeature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!featuringListing) return;
    const trimmed = featureDays.trim();
    const days = trimmed ? parseInt(trimmed, 10) : undefined;
    if (days !== undefined && (!Number.isInteger(days) || days < 1 || days > 3650)) {
      showToast('Enter a number of days between 1 and 3650, or leave it empty for no expiry', 'error');
      return;
    }
    void handleSetFeatured(featuringListing.id, true, days);
  };

  const handleDeleteListing = async (id: number) => {
    if (!window.confirm(`Permanently delete listing #${id}?`)) return;
    try {
      await api.delete(`/api/v1/listings/${id}`);
      showToast(`Listing #${id} deleted`);
      fetchAdminListings();
      fetchListingCounts();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err) || 'Failed to delete listing', 'error');
    }
  };

  // --- FETCH LOCATIONS ---
  const fetchLocations = async () => {
    setLocationsLoading(true);
    try {
      const [res, live] = await Promise.all([
        api.get('/api/v1/locations'),
        // Live (approved) listings, counted per city for the state-wise list
        api.get('/api/v1/listings', { params: { status: 'approved' } }).catch(() => null)
      ]);
      if (res.data?.status === 'success' && Array.isArray(res.data?.data)) {
        setLocations(res.data.data);
      }
      const counts = new Map<string, number>();
      const liveListings: Listing[] = Array.isArray(live?.data?.data) ? live.data.data : [];
      liveListings.forEach((l) => {
        const city = getListingCity(l).toLowerCase();
        if (city) counts.set(city, (counts.get(city) ?? 0) + 1);
      });
      setCityListingCounts(counts);
    } catch {
      showToast('Failed to load locations', 'error');
    } finally {
      setLocationsLoading(false);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
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
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err) || 'Failed to add location', 'error');
    } finally {
      setLocSaving(false);
    }
  };

  const handleAddFromMap = async (place: MapPlace): Promise<void> => {
    const alreadyListed = locations.some(
      (item) => item.city_name.trim().toLowerCase() === place.cityName.trim().toLowerCase()
    );
    setNewCityName(place.cityName);
    setNewState(place.stateName || newState);
    setNewLat(String(place.latitude));
    setNewLng(String(place.longitude));
    if (alreadyListed) {
      showToast(`${place.cityName} is already in the city list`, 'error');
      return;
    }
    setLocSaving(true);
    try {
      await api.post('/api/v1/locations', {
        city_name: place.cityName,
        state: place.stateName || newState.trim(),
        category: newLocCategory,
        latitude: place.latitude,
        longitude: place.longitude
      });
      showToast(`${place.cityName} added to the city list`);
      fetchLocations();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err) || 'Failed to add location', 'error');
    } finally {
      setLocSaving(false);
    }
  };

  const handleDeleteLocation = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this location?')) return;
    try {
      await api.delete(`/api/v1/locations/${id}`);
      showToast('Location deleted successfully');
      fetchLocations();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err) || 'Failed to delete location', 'error');
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
    } catch {
      showToast('Failed to load categories', 'error');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const openCategoryModal = (category?: Category): void => {
    if (category) {
      setEditingCategoryId(category.id);
      setNewCatName(category.name);
      setNewCatDesc(category.description || '');
      setEditingCategoryListings(category.total_listings ?? 0);
    } else {
      setEditingCategoryId(null);
      setNewCatName('');
      setNewCatDesc('');
      setEditingCategoryListings(0);
    }
    setCategoryModalOpen(true);
  };

  const closeCategoryModal = (): void => {
    setCategoryModalOpen(false);
    setEditingCategoryId(null);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatSaving(true);
    try {
      const payload = {
        name: newCatName.trim(),
        description: newCatDesc.trim() || null
      };
      if (editingCategoryId) {
        await api.put(`/api/v1/categories/${editingCategoryId}`, payload);
        showToast(`Category '${newCatName}' updated`);
      } else {
        await api.post('/api/v1/categories', payload);
        showToast(`Category '${newCatName}' created successfully!`);
      }
      closeCategoryModal();
      setNewCatName('');
      setNewCatDesc('');
      fetchCategories();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err) || 'Failed to save category', 'error');
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/api/v1/categories/${id}`);
      showToast('Category deleted successfully');
      fetchCategories();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err) || 'Failed to delete category', 'error');
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
    } catch {
      showToast('Failed to load users', 'error');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUserRoleChange = async (userId: number, newRole: string) => {
    try {
      await api.post(`/api/v1/admin/users/${userId}/role`, { role: newRole });
      showToast(`User role updated to ${newRole}`);
      fetchUsers();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err) || 'Failed to update user role', 'error');
    }
  };

  const openUserModal = (target?: User) => {
    setUserForm(target ? {
      id: target.id,
      name: target.name,
      email: target.email,
      phone: target.phone || '',
      password: '',
      role: target.role as UserFormState['role'],
      status: target.status,
      business_name: target.business_name || '',
      whatsapp: target.whatsapp || '',
      whatsappSameAsPhone: !target.whatsapp || target.whatsapp === target.phone,
      website_url: target.website_url || '',
      facebook_url: target.facebook_url || '',
      x_url: target.x_url || '',
      youtube_url: target.youtube_url || ''
    } : EMPTY_USER_FORM);
    setShowUserPassword(false);
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = userForm.id !== null;
    // Password is required for new users; when editing, blank keeps the current one.
    if ((!isEdit || userForm.password) && userForm.password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    const whatsapp = userForm.whatsappSameAsPhone ? userForm.phone.trim() : userForm.whatsapp.trim();
    if (whatsapp && !/^\+?\d{10,13}$/.test(whatsapp)) {
      showToast('Enter a valid WhatsApp number', 'error');
      return;
    }
    const links: Partial<Record<UserLinkKey, string>> = {};
    for (const { key, label } of USER_LINK_FIELDS) {
      const url = normalizeExternalUrl(userForm[key]);
      if (url === null) {
        showToast(`Enter a valid ${label} link`, 'error');
        return;
      }
      links[key] = url;
    }
    const payload = {
      name: userForm.name.trim(),
      email: userForm.email.trim(),
      phone: userForm.phone.trim(),
      role: userForm.role,
      status: userForm.status,
      business_name: userForm.business_name.trim(),
      whatsapp,
      ...links,
      ...(userForm.password ? { password: userForm.password } : {})
    };
    setUserSaving(true);
    try {
      if (isEdit) {
        await api.put(`/api/v1/admin/users/${userForm.id}`, payload);
        showToast(`User '${payload.name}' updated`);
      } else {
        await api.post('/api/v1/admin/users', payload);
        showToast(`User '${payload.name}' created`);
      }
      setUserModalOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, isEdit ? 'Failed to update user' : 'Failed to create user'), 'error');
    } finally {
      setUserSaving(false);
    }
  };

  const handleToggleUserStatus = async (target: User) => {
    const activate = target.status !== 'active';
    if (!window.confirm(activate
      ? `Activate ${target.name}? They will be able to sign in again.`
      : `Deactivate ${target.name}? They will not be able to sign in until reactivated.`
    )) return;
    try {
      await api.put(`/api/v1/admin/users/${target.id}`, { status: activate ? 'active' : 'deleted' });
      showToast(`User '${target.name}' ${activate ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, activate ? 'Failed to activate user' : 'Failed to deactivate user'), 'error');
    }
  };

  const handleDeleteUser = async (target: User) => {
    if (!window.confirm(
      `Permanently delete ${target.name} (${target.email})?\n\nTheir listings and wishlist will also be deleted. This cannot be undone.`
    )) return;
    try {
      await api.delete(`/api/v1/admin/users/${target.id}`);
      showToast(`User '${target.name}' deleted`);
      fetchUsers();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, 'Failed to delete user'), 'error');
    }
  };

  // --- PLANS HANDLERS ---
  const fetchPlans = async () => {
    setPlansLoading(true);
    try {
      const res = await getPlans(true, planType);
      // Cheapest first, the same order the plans popup shows them in
      setPlans([...(res.data?.data || [])].sort((a, b) => Number(a.price) - Number(b.price)));
    } catch {
      showToast('Failed to fetch plans', 'error');
    } finally {
      setPlansLoading(false);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanSaving(true);
    try {
      const isFeatured = planType === 'featured';
      const payload = {
        name: planForm.name.trim(),
        plan_type: planType,
        price: parseFloat(String(planForm.price)) || 0,
        listing_limit: isFeatured ? 0 : parseInt(String(planForm.listing_limit), 10) || 1,
        leads_count: isFeatured ? 0 : parseInt(String(planForm.leads_count), 10) || 0,
        duration_days: parseInt(String(planForm.duration_days), 10) || 30,
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
      setPlanForm(EMPTY_PLAN_FORM);
      fetchPlans();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err) || 'Failed to save plan', 'error');
    } finally {
      setPlanSaving(false);
    }
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlanId(plan.id);
    setPlanForm({
      name: plan.name,
      price: plan.price,
      listing_limit: plan.listing_limit,
      leads_count: plan.leads_count,
      duration_days: plan.duration_days,
      description: plan.description || '',
      status: plan.status || 'active'
    });
  };

  const handleDeletePlan = async (id: number) => {
    if (!window.confirm(`Are you sure you want to delete plan #${id}?`)) return;
    try {
      await deletePlan(id);
      showToast(`Plan #${id} deleted.`);
      fetchPlans();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err) || 'Failed to delete plan', 'error');
    }
  };

  // --- CASHFREE SETTINGS HANDLERS ---
  const fetchCashfreeSettings = async () => {
    setCfLoading(true);
    try {
      const res = await getCashfreeSettings();
      if (res.data?.data) {
        setCfSettings({
          app_id: res.data.data.app_id || '',
          secret_key: '',
          sandbox: res.data.data.environment !== 'production',
          has_secret: res.data.data.has_secret || false
        });
      }
    } catch {
      showToast('Failed to fetch Cashfree settings', 'error');
    } finally {
      setCfLoading(false);
    }
  };

  const handleSaveCashfreeSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setCfSaving(true);
    try {
      await saveCashfreeSettings({
        app_id: cfSettings.app_id.trim() || undefined,
        secret_key: cfSettings.secret_key.trim() || undefined,
        environment: cfSettings.sandbox ? 'sandbox' : 'production'
      });
      showToast('Cashfree settings saved successfully!');
      fetchCashfreeSettings();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err) || 'Failed to save settings', 'error');
    } finally {
      setCfSaving(false);
    }
  };

  // --- ROLE LIMITS HANDLERS ---
  const fetchRoleLimits = async () => {
    try {
      const res = await getRoleLimits();
      if (res.data?.data) {
        const data = res.data.data;
        if (Array.isArray(data)) {
          const map: RoleLimitsMap = { Owner: 0, Agent: 0, Builder: 0 };
          data.forEach((item: RoleLimit) => {
            if (item.role in map) map[item.role] = item.max_listings;
          });
          setRoleLimits(map);
        } else {
          setRoleLimits({
            Owner: data.Owner ?? 0,
            Agent: data.Agent ?? 0,
            Builder: data.Builder ?? 0
          });
        }
      }
    } catch (err) {
      console.error('Failed to load role limits', err);
    }
  };

  const handleSaveRoleLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleLimitsSaving(true);
    try {
      await saveRoleLimits(roleLimits);
      showToast('Role limits saved successfully!');
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err) || 'Failed to save role limits', 'error');
    } finally {
      setRoleLimitsSaving(false);
    }
  };

  // --- BUSINESS ASSOCIATES (TRACKER) HANDLERS ---
  const fetchEmployees = async () => {
    setEmployeesLoading(true);
    try {
      const res = await getEmployees();
      if (res.data?.status === 'success' && Array.isArray(res.data?.data)) {
        setEmployees(res.data.data);
      }
    } catch {
      showToast('Failed to load business associates', 'error');
    } finally {
      setEmployeesLoading(false);
    }
  };

  const generateRefCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEmployeeForm(prev => ({ ...prev, reference_code: code }));
  };

  const handleOpenEmployeeModal = (emp: Employee | null = null) => {
    if (emp) {
      setEmployeeForm({
        id: emp.id,
        reference_code: emp.reference_code,
        name: emp.name,
        status: emp.status || 'active'
      });
    } else {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      setEmployeeForm({
        id: 0,
        reference_code: code,
        name: '',
        status: 'active'
      });
    }
    setEmployeeModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmployeeSaving(true);
    try {
      await saveEmployee(employeeForm);
      showToast(employeeForm.id ? 'Business associate updated!' : 'Business associate created!');
      setEmployeeModalOpen(false);
      fetchEmployees();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err) || 'Failed to save business associate', 'error');
    } finally {
      setEmployeeSaving(false);
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this business associate?')) return;
    try {
      await deleteEmployee(id);
      showToast('Business associate deleted');
      fetchEmployees();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err) || 'Failed to delete business associate', 'error');
    }
  };

  // --- BLOGS HANDLERS ---
  const fetchBlogs = async () => {
    setBlogsLoading(true);
    try {
      const res = await getAdminBlogs();
      if (res.data?.status === 'success' && Array.isArray(res.data?.data)) {
        setAdminBlogs(res.data.data);
      }
    } catch {
      showToast('Failed to load blogs', 'error');
    } finally {
      setBlogsLoading(false);
    }
  };

  const handleOpenBlogModal = (blog: Blog | null = null) => {
    if (blog) {
      setBlogForm({
        id: blog.id,
        title: blog.title,
        category: blog.category || 'Buy',
        content: blog.content,
        permalink: blog.slug || blog.permalink || '',
        tags: blog.tags || '',
        status: blog.status || 'publish',
        featured_image: null
      });
    } else {
      setBlogForm({
        id: 0,
        title: '',
        category: 'Buy',
        content: '',
        permalink: '',
        tags: '',
        status: 'publish',
        featured_image: null
      });
    }
    setBlogModalOpen(true);
  };

  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlogSaving(true);
    try {
      await saveAdminBlog({
        id: blogForm.id || undefined,
        title: blogForm.title,
        category: blogForm.category,
        content: blogForm.content,
        permalink: blogForm.permalink || undefined,
        tags: blogForm.tags || undefined,
        status: blogForm.status
      });
      showToast(blogForm.id ? 'Blog updated successfully!' : 'Blog created successfully!');
      setBlogModalOpen(false);
      fetchBlogs();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err) || 'Failed to save blog', 'error');
    } finally {
      setBlogSaving(false);
    }
  };

  const handleDeleteBlog = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this blog?')) return;
    try {
      await deleteAdminBlog(id);
      showToast('Blog deleted successfully');
      fetchBlogs();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err) || 'Failed to delete blog', 'error');
    }
  };

  // --- MAIL & CREDENTIALS SETTINGS HANDLERS ---
  const fetchMailSettings = async () => {
    setSmtpLoading(true);
    try {
      const res = await getMailSettings();
      if (res.data?.status === 'success' && res.data?.data) {
        setSmtpSettings({
          host: res.data.data.smtp_host || res.data.data.host || '',
          port: res.data.data.smtp_port || res.data.data.port || 465,
          email: res.data.data.smtp_email || res.data.data.email || '',
          password: '',
          encryption: res.data.data.smtp_encryption || res.data.data.encryption || 'ssl',
          from_name: res.data.data.from_name || 'TradeCall India',
          has_password: res.data.data.has_password || false
        });
      }
    } catch (err) {
      console.error('Failed to load mail settings', err);
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleSaveMailSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpSaving(true);
    try {
      await saveMailSettings({
        smtp_host: smtpSettings.host,
        smtp_email: smtpSettings.email,
        smtp_port: smtpSettings.port,
        smtp_encryption: smtpSettings.encryption,
        from_name: smtpSettings.from_name,
        smtp_password: smtpSettings.password || undefined
      });
      showToast('Mail settings saved successfully!');
      setSmtpSettings(prev => ({ ...prev, password: '' }));
      fetchMailSettings();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err) || 'Failed to save mail settings', 'error');
    } finally {
      setSmtpSaving(false);
    }
  };

  const fetchSignupGuide = async () => {
    try {
      const res = await getAdminSignupGuide();
      if (res.data?.data) {
        setSignupGuide({ blog_url: res.data.data.blog_url || '', video_url: res.data.data.video_url || '' });
      }
    } catch (err) {
      console.error('Failed to load sign-up guide links', err);
    }
  };

  const handleSaveSignupGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupGuideSaving(true);
    try {
      await saveSignupGuide({ blog_url: signupGuide.blog_url.trim(), video_url: signupGuide.video_url.trim() });
      showToast('Sign-up guide links saved!');
      fetchSignupGuide();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err) || 'Failed to save sign-up guide links', 'error');
    } finally {
      setSignupGuideSaving(false);
    }
  };

  const handleSendTestMail = async () => {
    const testEmail = window.prompt('Where should the test email be sent?', smtpSettings.email || user?.email || '');
    if (!testEmail) return;
    try {
      showToast('Sending test email...');
      const res = await sendTestMail(testEmail);
      if (res.data?.status === 'success') {
        showToast(res.data?.message || 'Test email sent successfully!');
      } else {
        showToast(res.data?.message || 'Failed to send test email', 'error');
      }
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err) || 'Failed to send test email', 'error');
    }
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredSaving(true);
    try {
      await api.post('/api/v1/auth/change-password', {
        current_password: credForm.currPassword,
        new_password: credForm.newPassword
      });
      showToast('Credentials updated successfully!');
      setCredForm({ newUsername: '', currPassword: '', newPassword: '' });
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err) || 'Failed to update credentials', 'error');
    } finally {
      setCredSaving(false);
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
      fetchRoleLimits();
    } else if (activeModule === 'plans' || activeModule === 'featured-plans') {
      setEditingPlanId(null);
      setPlanForm(EMPTY_PLAN_FORM);
      fetchPlans();
    } else if (activeModule === 'tracker') {
      fetchEmployees();
    } else if (activeModule === 'blogs') {
      fetchBlogs();
    } else if (activeModule === 'settings') {
      fetchMailSettings();
      fetchSignupGuide();
      fetchCashfreeSettings();
    } else if (activeModule === 'cashfree') {
      fetchCashfreeSettings();
    }
  }, [activeModule, listingTab]);

  useEffect(() => {
    if (!authLoading && !user) {
      onNavigate('admin-login');
    }
  }, [authLoading, user, onNavigate]);

  if (authLoading || !user) {
    return null;
  }

  if (user.role?.toLowerCase() !== 'admin') {
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

      <div className="container" style={{ maxWidth: '1360px', margin: '0 auto' }}>
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

          {activeModule === 'listings' && (
            <button
              type="button"
              className="btn-outline"
              onClick={() => onNavigate('post-listing')}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              <i className="fas fa-plus"></i> Post Property as Admin
            </button>
          )}
        </div>

        <div className="admin-layout">
          {/* Admin Navigation Sidebar */}
          <aside className="admin-sidebar">
            <div className="admin-sidebar-title">Admin Menu</div>
            <nav>
              {ADMIN_NAV.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`admin-nav-item${activeModule === item.key ? ' active' : ''}`}
                  onClick={() => setActiveModule(item.key)}
                  aria-current={activeModule === item.key ? 'page' : undefined}
                >
                  <i className={item.icon}></i>
                  <span>{item.label}</span>
                  {item.key === 'enquiries' && newEnquiryCount > 0 ? (
                    <span className="admin-nav-badge" title={`${newEnquiryCount} new`}>{newEnquiryCount}</span>
                  ) : null}
                </button>
              ))}
            </nav>
          </aside>

          <div className="admin-main">
        {activeModule === 'enquiries' && (
          <AdminEnquiries
            showToast={showToast}
            onCountsChange={(counts) => setNewEnquiryCount(counts.new)}
          />
        )}

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
                <table className="admin-table admin-listings-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '12px 14px' }}>ID</th>
                      <th style={{ padding: '12px 14px' }}>Title &amp; Location</th>
                      <th style={{ padding: '12px 14px' }}>Price</th>
                      <th style={{ padding: '12px 14px' }}>Owner</th>
                      <th style={{ padding: '12px 14px' }}>Status</th>
                      <th style={{ padding: '12px 14px' }}>Stamp</th>
                      <th style={{ padding: '12px 14px' }}>Featured</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((l) => (
                      <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td data-label="ID" style={{ padding: '12px 14px', fontWeight: 700, color: '#64748b' }}>
                          #{l.id}
                        </td>
                        <td data-label="Listing" style={{ padding: '12px 14px' }}>
                          <button
                            type="button"
                            className="admin-listing-title"
                            title="Open listing page"
                            onClick={() => onNavigate('listing-detail', l)}
                          >
                            {l.title}
                          </button>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            <i className="fas fa-map-marker-alt"></i> {l.location}
                          </div>
                        </td>
                        <td data-label="Price" style={{ padding: '12px 14px', fontWeight: 700, color: '#0c6253' }}>
                          {formatListingPrice(l.price)}
                        </td>
                        <td data-label="Owner" style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600 }}>{l.owner_name}</div>
                          {l.assigned_email && (
                            <div style={{ fontSize: 11, color: '#b45309' }} title="Moves to this user when they sign up">
                              <i className="fas fa-clock"></i> For {l.assigned_email}
                            </div>
                          )}
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{l.owner_role}</div>
                        </td>
                        <td data-label="Status" style={{ padding: '12px 14px' }}>
<select
                            className="admin-status-select"
                            value={l.status}
                            onChange={(e) => {
                              const next = e.target.value;
                              if (next === 'deleted' && !window.confirm(`Mark listing #${l.id} as deleted?`)) return;
                              void handleUpdateListingStatus(l.id, statusAction(next));
                            }}
                            style={{ background: STATUS_COLORS[l.status]?.bg || '#f1f5f9', color: STATUS_COLORS[l.status]?.fg || '#334155' }}
                            aria-label={`Status of listing #${l.id}`}
                          >
                            {LISTING_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                          </select>
                        </td>
                        <td data-label="Stamp" style={{ padding: '12px 14px' }}>
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
                        <td data-label="Featured" style={{ padding: '12px 14px' }}>
                          {l.is_featured ? (
                            <div>
                              <span style={{ color: '#b45309', fontWeight: 700 }}>
                                <i className="fas fa-star"></i> Featured
                              </span>
                              <div style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 4px' }}>
                                {l.featured_until
                                  ? `Until ${new Date(l.featured_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                  : 'No expiry'}
                              </div>
                              <div style={{ display: 'inline-flex', gap: '4px' }}>
                                <button
                                  type="button"
                                  className="btn-outline"
                                  style={{ padding: '2px 6px', fontSize: '10px' }}
                                  onClick={() => { setFeatureDays('7'); setFeaturingListing(l); }}
                                >
                                  Change
                                </button>
                                <button
                                  type="button"
                                  className="btn-outline"
                                  style={{ padding: '2px 6px', fontSize: '10px', color: '#dc2626', borderColor: '#fca5a5' }}
                                  onClick={() => {
                                    if (window.confirm(`Remove featured from listing #${l.id}?`)) void handleSetFeatured(l.id, false);
                                  }}
                                >
                                  Unfeature
                                </button>
                              </div>
                            </div>
                          ) : l.status === 'approved' ? (
                            <button
                              type="button"
                              className="btn-outline"
                              style={{ padding: '4px 8px', fontSize: '11px', borderColor: '#d97706', color: '#b45309' }}
                              onClick={() => { setFeatureDays('7'); setFeaturingListing(l); }}
                            >
                              <i className="far fa-star"></i> Feature
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Approve first</span>
                          )}
                        </td>
                        <td data-label="Actions" style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn-outline"
                              style={{ padding: '4px 10px', fontSize: '11px' }}
                              onClick={() => setEditingListing(l)}
                            >
                              <i className="fas fa-pen"></i> Edit
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
                  <label>State / Union Territory</label>
                  <select value={newState} onChange={(e) => setNewState(e.target.value)}>
                    <option value="">Select state</option>
                    <StateOptions current={newState} />
                  </select>
                </div>

                <div className="form-group full">
                  <label>Category</label>
                  <select value={newLocCategory} onChange={(e) => setNewLocCategory(e.target.value)}>
                    <option value="city">City</option>
                    <option value="suburb">Suburb / Sector</option>
                    <option value="town">Town</option>
                  </select>
                </div>

                <div className="form-row coord-row">
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
              <LocationMapPreview
                cityName={newCityName}
                stateName={newState}
                latitude={newLat}
                longitude={newLng}
                adding={locSaving}
                onAddPlace={(place) => void handleAddFromMap(place)}
              />

            <AdminLocationsByState
              locations={locations}
              listingCounts={cityListingCounts}
              loading={locationsLoading}
              onDelete={(id) => void handleDeleteLocation(id)}
            />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODULE 3: CATEGORY MANAGEMENT */}
        {/* ======================================================== */}
        {activeModule === 'categories' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#111827' }}>
                Category Management
              </h2>
              <button
                type="button"
                onClick={() => openCategoryModal()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <i className="fas fa-plus"></i> Add New Category
              </button>
            </div>

            <div style={{ background: '#fff', borderRadius: '16px', padding: '8px 8px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#6b7280', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700 }}>CATEGORY ID</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700 }}>CATEGORY NAME</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700 }}>DESCRIPTION</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>TOTAL LISTINGS</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700 }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {categoriesLoading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>
                        <i className="fas fa-spinner fa-spin"></i> Loading categories...
                      </td>
                    </tr>
                  ) : categories.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>
                        No categories found. Add your first category.
                      </td>
                    </tr>
                  ) : (
                    categories.map((cat) => (
                      <tr key={cat.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                          #CAT-{String(cat.id).padStart(2, '0')}
                        </td>
                        <td style={{ padding: '16px', fontWeight: 700, color: '#0c6253', maxWidth: '220px' }}>{cat.name}</td>
                        <td style={{ padding: '16px', color: '#4b5563', maxWidth: '360px' }}>{cat.description || '-'}</td>
                        <td style={{ padding: '16px', textAlign: 'center', color: '#111827' }}>{cat.total_listings ?? 0}</td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                            <button
                              type="button"
                              onClick={() => openCategoryModal(cat)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                background: '#fff',
                                color: '#374151',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              <i className="fas fa-pen"></i> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: '1px solid #fecaca',
                                background: '#fef2f2',
                                color: '#dc2626',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              <i className="fas fa-trash"></i> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {categoryModalOpen && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(17, 24, 39, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 80,
                  padding: '20px'
                }}
                onClick={closeCategoryModal}
              >
                <div
                  style={{
                    background: '#fff',
                    width: '100%',
                    maxWidth: '460px',
                    borderRadius: '16px',
                    padding: '28px 24px 24px',
                    position: 'relative',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.18)'
                  }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={closeCategoryModal}
                    aria-label="Close"
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      border: 'none',
                      background: 'transparent',
                      color: '#6b7280',
                      fontSize: '18px',
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                  <h2 style={{ margin: '0 0 18px', fontSize: '22px', fontWeight: 800, color: '#111827' }}>
                    {editingCategoryId ? 'Edit Category' : 'Add Category'}
                  </h2>
                  <form onSubmit={handleAddCategory}>
                    <div className="form-group full">
                      <label>Category Name <span className="req">*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. Interior Designer"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group full">
                      <label>Description</label>
                      <textarea
                        rows={3}
                        placeholder="Category description..."
                        value={newCatDesc}
                        onChange={(e) => setNewCatDesc(e.target.value)}
                      ></textarea>
                    </div>
                    <div className="form-group full">
                      <label>Total Listings</label>
                      <input type="number" value={editingCategoryListings} readOnly style={{ background: '#f3f4f6' }} />
                    </div>
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ width: '100%', marginTop: '8px' }}
                      disabled={catSaving}
                    >
                      {catSaving ? 'Saving Category...' : 'Save Category'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* MODULE 4: USER MANAGEMENT */}
        {/* ======================================================== */}
        {activeModule === 'users' && (
          <div>
            {/* Role-Based Listing Limits Card */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px 28px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: '#111827' }}>
                <i className="fas fa-sliders-h" style={{ color: '#0c6253', marginRight: '8px' }}></i>
                Role-Based Listing Limits
              </h2>
              <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '20px' }}>
                Set max active listings allowed without a paid subscription plan. Set <strong>0</strong> for unlimited listings.
              </p>
              <form onSubmit={handleSaveRoleLimits}>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Owner Limit (Max Listings)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={roleLimits.Owner}
                      onChange={(e) => setRoleLimits({ ...roleLimits, Owner: parseInt(e.target.value, 10) || 0 })}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                      required
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Agent Limit (Max Listings)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={roleLimits.Agent}
                      onChange={(e) => setRoleLimits({ ...roleLimits, Agent: parseInt(e.target.value, 10) || 0 })}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                      required
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Builder Limit (Max Listings)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={roleLimits.Builder}
                      onChange={(e) => setRoleLimits({ ...roleLimits, Builder: parseInt(e.target.value, 10) || 0 })}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '10px 22px', fontSize: '14px' }}
                  disabled={roleLimitsSaving}
                >
                  {roleLimitsSaving ? <><i className="fas fa-spinner fa-spin"></i> Saving Limits...</> : 'Save Limits'}
                </button>
              </form>
            </div>

            <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#111827' }}>
                  User Accounts &amp; Role Management
                </h2>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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

                  <button
                    type="button"
                    className="btn-primary"
                    style={{ padding: '8px 14px', fontSize: '13px', whiteSpace: 'nowrap' }}
                    onClick={() => openUserModal()}
                  >
                    <i className="fas fa-user-plus"></i> Create User
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
                              {u.status === 'active' ? 'Active' : u.status === 'deleted' ? 'Deactivated' : u.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="btn-outline"
                                style={{ padding: '4px 10px', fontSize: '11px' }}
                                onClick={() => openUserModal(u)}
                              >
                                <i className="fas fa-pen"></i> Edit
                              </button>
                              {u.id !== user.id && (
                                <>
                                  <button
                                    type="button"
                                    className="btn-outline"
                                    style={u.status === 'active'
                                      ? { padding: '4px 10px', fontSize: '11px', color: '#b45309', borderColor: '#fcd34d' }
                                      : { padding: '4px 10px', fontSize: '11px', color: '#166534', borderColor: '#86efac' }}
                                    onClick={() => handleToggleUserStatus(u)}
                                  >
                                    {u.status === 'active'
                                      ? <><i className="fas fa-ban"></i> Deactivate</>
                                      : <><i className="fas fa-check"></i> Activate</>}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-outline"
                                    style={{ padding: '4px 10px', fontSize: '11px', color: '#dc2626', borderColor: '#fca5a5' }}
                                    onClick={() => handleDeleteUser(u)}
                                  >
                                    <i className="fas fa-trash"></i> Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODULE 5: PLANS & PRICING MANAGEMENT */}
        {/* ======================================================== */}
        {(activeModule === 'plans' || activeModule === 'featured-plans') && (
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px', alignItems: 'start' }}>
            {/* Create / Edit Plan Form */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#111827' }}>
                  {editingPlanId
                    ? `Edit Plan #${editingPlanId}`
                    : planType === 'featured' ? 'Add Featured Listing Plan' : 'Add New Membership Plan'}
                </h2>
                {editingPlanId && (
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ fontSize: '11px', padding: '2px 8px' }}
                    onClick={() => {
                      setEditingPlanId(null);
                      setPlanForm(EMPTY_PLAN_FORM);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>

              <form onSubmit={handleSavePlan} className="plan-form">
                <div className="form-group full" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Plan Name *</label>
                  <input
                    type="text"
                    placeholder={planType === 'featured' ? 'e.g. Featured 15 Days' : 'e.g. Gold Unlimited'}
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

                {planType === 'leads' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px', marginBottom: '12px' }}>
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
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px', marginBottom: '12px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>
                      {planType === 'featured' ? 'Featured For (Days) *' : 'Validity (Days) *'}
                    </label>
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
                {planType === 'featured' ? 'Featured Listing Plans' : 'Existing Plans'} ({plans.length})
              </h2>

              {plansLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                  <i className="fas fa-spinner fa-spin"></i> Loading plans...
                </div>
              ) : plans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                  {planType === 'featured'
                    ? 'No featured listing plans yet. Create your first one on the left!'
                    : 'No plans configured. Create your first plan on the left!'}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '10px' }}>ID</th>
                      <th style={{ padding: '10px' }}>Plan Name</th>
                      <th style={{ padding: '10px' }}>Price</th>
                      {planType === 'leads' && (
                        <>
                          <th style={{ padding: '10px' }}>Leads</th>
                          <th style={{ padding: '10px' }}>Post Limit</th>
                        </>
                      )}
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
                        {planType === 'leads' && (
                          <>
                            <td style={{ padding: '10px' }}>{p.leads_count}</td>
                            <td style={{ padding: '10px' }}>{p.listing_limit}</td>
                          </>
                        )}
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
        {/* MODULE 6: CASHFREE GATEWAY CONFIGURATION */}
        {/* ======================================================== */}
        {activeModule === 'cashfree' && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <i className="fas fa-credit-card" style={{ color: '#0c6253', fontSize: '24px' }}></i>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#111827' }}>
                Cashfree Payment Gateway Settings
              </h2>
            </div>
            <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '24px' }}>
              Configure your API keys for payment processing and automated lead credit. Settings saved here dynamically override environment defaults with zero downtime.
            </p>

            {cfLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0c6253', marginBottom: '10px' }}></i>
                <div>Loading Cashfree settings...</div>
              </div>
            ) : (
              <form onSubmit={handleSaveCashfreeSettings}>
                <div className="form-group full" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Cashfree App ID</label>
                  <input
                    type="text"
                    placeholder="Client ID / App ID"
                    value={cfSettings.app_id}
                    onChange={(e) => setCfSettings({ ...cfSettings, app_id: e.target.value })}
                  />
                  <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    From Cashfree Merchant Dashboard → Developers → API Keys.
                  </small>
                </div>

                <div className="form-group full" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>
                    Cashfree Secret Key {cfSettings.has_secret && <span style={{ color: '#16a34a', fontWeight: 600 }}>(Configured ✓)</span>}
                  </label>
                  <input
                    type="password"
                    placeholder={cfSettings.has_secret ? '•••••••••••••••• (Leave blank to keep existing)' : 'Enter Cashfree Secret Key'}
                    value={cfSettings.secret_key}
                    onChange={(e) => setCfSettings({ ...cfSettings, secret_key: e.target.value })}
                  />
                  <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    Used server-side to create orders and verify webhook signatures. Stored encrypted and never revealed in the browser.
                  </small>
                </div>

                <div style={{ marginBottom: '16px', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#475569' }}>
                  <strong>Webhook URL</strong> (add in Cashfree Dashboard → Developers → Webhooks, Payment events):
                  <code style={{ display: 'block', marginTop: '6px', wordBreak: 'break-all' }}>
                    {`${API_BASE_URL || window.location.origin}/api/v1/payments/webhook`}
                  </code>
                </div>

                <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="cfSandboxMode"
                    checked={cfSettings.sandbox}
                    onChange={(e) => setCfSettings({ ...cfSettings, sandbox: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#0c6253' }}
                  />
                  <label htmlFor="cfSandboxMode" style={{ fontSize: '14px', fontWeight: 600, color: '#111827', cursor: 'pointer' }}>
                    Enable Sandbox / Test Mode
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', padding: '12px' }}
                  disabled={cfSaving}
                >
                  {cfSaving ? (
                    <>
                      <i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Saving Settings...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save" style={{ marginRight: '6px' }}></i> Save Cashfree Settings
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* MODULE 7: BUSINESS ASSOCIATES (TRACKER) */}
        {/* ======================================================== */}
        {activeModule === 'tracker' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Business Associates
                </h1>
                <p style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0 0 0' }}>
                  Track field agent performance and listings attributed to unique reference codes.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '10px 20px' }}
                onClick={() => handleOpenEmployeeModal()}
              >
                <i className="fas fa-plus"></i> Add Business Associate
              </button>
            </div>

            {/* KPI Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '36px', fontWeight: 800, color: '#0c6253' }}>
                  {employees.reduce((acc, emp) => acc + (emp.listings_created || 0), 0)}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginTop: '6px' }}>
                  Total Listings Tracked
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '36px', fontWeight: 800, color: '#1d4ed8' }}>
                  {employees.filter(emp => emp.status === 'active').length}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginTop: '6px' }}>
                  Active Reference Codes
                </div>
              </div>
            </div>

            {/* Associates Table Card */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px 28px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>
                Listing Count by Reference Code
              </div>

              {employeesLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0c6253', marginBottom: '10px' }}></i>
                  <div>Loading business associates...</div>
                </div>
              ) : employees.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  No business associates found. Click &quot;Add Business Associate&quot; to create one.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '12px 14px' }}>Reference Code</th>
                        <th style={{ padding: '12px 14px' }}>Associate Name</th>
                        <th style={{ padding: '12px 14px' }}>Listings Created</th>
                        <th style={{ padding: '12px 14px' }}>Status</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map(emp => (
                        <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <strong style={{ letterSpacing: '1px', color: '#111827' }}>
                              <i className="fas fa-id-badge" style={{ color: '#9ca3af', marginRight: '6px' }}></i>
                              {emp.reference_code}
                            </strong>
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: '#374151' }}>
                            {emp.name}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <strong style={{ color: '#0c6253', fontSize: '16px' }}>
                              {emp.listings_created || 0}
                            </strong>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: emp.status === 'active' ? '#dcfce7' : '#fee2e2',
                              color: emp.status === 'active' ? '#15803d' : '#b91c1c'
                            }}>
                              {emp.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn-outline"
                              style={{ padding: '4px 8px', fontSize: '12px', marginRight: '8px' }}
                              onClick={() => handleOpenEmployeeModal(emp)}
                            >
                              <i className="fas fa-edit"></i> Edit
                            </button>
                            <button
                              type="button"
                              className="btn-outline"
                              style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5' }}
                              onClick={() => handleDeleteEmployee(emp.id)}
                            >
                              <i className="fas fa-trash"></i> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODULE 8: BLOG MANAGEMENT */}
        {/* ======================================================== */}
        {activeModule === 'blogs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Blog Management
                </h1>
                <p style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0 0 0' }}>
                  Create and manage news, market updates, and property guides.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '10px 20px' }}
                onClick={() => handleOpenBlogModal()}
              >
                <i className="fas fa-pen"></i> Write New Blog
              </button>
            </div>

            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px 28px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              {blogsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0c6253', marginBottom: '10px' }}></i>
                  <div>Loading blogs...</div>
                </div>
              ) : adminBlogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  No blogs published yet. Click &quot;Write New Blog&quot; to post an article.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '12px 14px' }}>Blog Title</th>
                        <th style={{ padding: '12px 14px' }}>Category</th>
                        <th style={{ padding: '12px 14px' }}>Author</th>
                        <th style={{ padding: '12px 14px' }}>Publish Date</th>
                        <th style={{ padding: '12px 14px' }}>Tags</th>
                        <th style={{ padding: '12px 14px' }}>Status</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminBlogs.map(blog => {
                        const dateStr = blog.created_at
                          ? new Date(blog.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '-';
                        return (
                          <tr key={blog.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <strong style={{ color: '#111827' }}>{blog.title}</strong>
                              <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '2px' }}>
                                <i className="fas fa-eye" style={{ marginRight: '4px' }}></i> Views: {blog.views || 0}
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', color: '#0c6253', fontWeight: 600 }}>
                              {blog.category || 'General'}
                            </td>
                            <td style={{ padding: '12px 14px', color: '#374151' }}>
                              {blog.author || 'Admin'}
                            </td>
                            <td style={{ padding: '12px 14px', color: '#64748b' }}>
                              {dateStr}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ fontSize: '11px', background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px', color: '#4b5563' }}>
                                {blog.tags || 'none'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: blog.status === 'publish' ? '#dcfce7' : '#fef3c7',
                                color: blog.status === 'publish' ? '#15803d' : '#b45309'
                              }}>
                                {blog.status === 'publish' ? 'Published' : 'Draft'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                              <button
                                type="button"
                                className="btn-outline"
                                style={{ padding: '4px 8px', fontSize: '12px', marginRight: '8px' }}
                                onClick={() => handleOpenBlogModal(blog)}
                              >
                                <i className="fas fa-edit"></i> Edit
                              </button>
                              <button
                                type="button"
                                className="btn-outline"
                                style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5' }}
                                onClick={() => handleDeleteBlog(blog.id)}
                              >
                                <i className="fas fa-trash"></i> Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODULE 9: SETTINGS (CREDENTIALS, SMTP & PAYMENTS) */}
        {/* ======================================================== */}
        {activeModule === 'settings' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', alignItems: 'start' }}>
            {/* Update Credentials Card */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: '#111827' }}>
                <i className="fas fa-user-lock" style={{ color: '#0c6253', marginRight: '8px' }}></i>
                Update Credentials
              </h2>
              <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '20px' }}>
                Change your administrative password.
              </p>
              <form onSubmit={handleUpdateCredentials}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    value={credForm.currPassword}
                    onChange={(e) => setCredForm({ ...credForm, currPassword: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                    required
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password (min 6 characters)"
                    value={credForm.newPassword}
                    onChange={(e) => setCredForm({ ...credForm, newPassword: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', padding: '12px' }}
                  disabled={credSaving}
                >
                  {credSaving ? <><i className="fas fa-spinner fa-spin"></i> Updating...</> : 'Update Credentials'}
                </button>
              </form>
            </div>

            {/* Sign-up Guide Links Card */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <i className="fas fa-circle-question" style={{ color: '#0c6253', fontSize: '20px' }}></i>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#111827' }}>
                  Sign-up Guide Links
                </h2>
              </div>
              <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '20px' }}>
                Shown as "Need help signing up?" below the Create Account button (sign-up page and popup). YouTube links play right on the page. Without a guide link, "Blog guide" opens the Blog page; without a video link, "Video tutorial" shows as coming soon.
              </p>
              <form onSubmit={handleSaveSignupGuide}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    <i className="fas fa-book-open" style={{ marginRight: '6px', color: '#0c6253' }}></i>Blog / Guide Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://tradecall.in/blog/how-to-create-account"
                    value={signupGuide.blog_url}
                    onChange={(e) => setSignupGuide({ ...signupGuide, blog_url: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    <i className="fab fa-youtube" style={{ marginRight: '6px', color: '#dc2626' }}></i>Video Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://youtu.be/..."
                    value={signupGuide.video_url}
                    onChange={(e) => setSignupGuide({ ...signupGuide, video_url: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', padding: '11px', fontSize: '13px' }}
                  disabled={signupGuideSaving}
                >
                  {signupGuideSaving ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : 'Save Guide Links'}
                </button>
              </form>
            </div>

            {/* SMTP Mail Configuration Card */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <i className="fas fa-envelope" style={{ color: '#0c6253', fontSize: '20px' }}></i>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#111827' }}>
                  Mail Configuration (SMTP)
                </h2>
              </div>
              <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '20px' }}>
                Registration and Forgot Password OTP emails are dispatched using these SMTP settings.
              </p>

              {smtpLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                  <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0c6253', marginBottom: '8px' }}></i>
                  <div>Loading mail settings...</div>
                </div>
              ) : (
                <form onSubmit={handleSaveMailSettings}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. smtp.gmail.com"
                      value={smtpSettings.host}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      SMTP Mail ID / Username
                    </label>
                    <input
                      type="email"
                      placeholder="youremail@domain.com"
                      value={smtpSettings.email}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, email: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      SMTP Password / App Password {smtpSettings.has_password && <span style={{ color: '#16a34a', fontWeight: 600 }}>(Configured ✓)</span>}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showSmtpPassword ? 'text' : 'password'}
                        placeholder={smtpSettings.has_password ? '•••••••••••••••• (Leave blank to keep existing)' : 'Enter SMTP password'}
                        value={smtpSettings.password}
                        onChange={(e) => setSmtpSettings({ ...smtpSettings, password: e.target.value })}
                        style={{ width: '100%', padding: '9px 36px 9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
                      />
                      <i
                        className={`fas ${showSmtpPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#6b7280' }}
                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      ></i>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                        SMTP Port
                      </label>
                      <input
                        type="number"
                        placeholder="465"
                        value={smtpSettings.port}
                        onChange={(e) => setSmtpSettings({ ...smtpSettings, port: parseInt(e.target.value, 10) || 465 })}
                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                        Encryption
                      </label>
                      <select
                        value={smtpSettings.encryption}
                        onChange={(e) => setSmtpSettings({ ...smtpSettings, encryption: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
                      >
                        <option value="ssl">SSL (port 465)</option>
                        <option value="tls">TLS (port 587)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      From Name
                    </label>
                    <input
                      type="text"
                      placeholder="TradeCall India"
                      value={smtpSettings.from_name}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, from_name: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ flex: 1, padding: '11px', fontSize: '13px' }}
                      disabled={smtpSaving}
                    >
                      {smtpSaving ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : 'Save Mail Settings'}
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ padding: '11px 16px', fontSize: '13px' }}
                      onClick={handleSendTestMail}
                    >
                      <i className="fas fa-paper-plane" style={{ marginRight: '6px' }}></i> Send Test Email
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Modal: Create / Edit User */}
        {userModalOpen && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}>
            <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '28px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#111827' }}>
                  {userForm.id ? `Edit User #${userForm.id}` : 'Create New User'}
                </h3>
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#6b7280' }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <form onSubmit={handleSaveUser}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                    required
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={USER_FIELD_LABEL}>Business Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sharma Properties"
                    maxLength={150}
                    value={userForm.business_name}
                    onChange={(e) => setUserForm({ ...userForm, business_name: e.target.value })}
                    style={USER_FIELD_INPUT}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                    autoComplete="off"
                    required
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value.replace(/[^\d+]/g, '') })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                    minLength={10}
                    maxLength={13}
                    required
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={USER_FIELD_LABEL}>
                    <i className="fab fa-whatsapp" style={{ color: '#25d366', marginRight: '6px' }}></i>WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit WhatsApp number"
                    value={userForm.whatsappSameAsPhone ? userForm.phone : userForm.whatsapp}
                    onChange={(e) => setUserForm({ ...userForm, whatsapp: e.target.value.replace(/[^\d+]/g, '') })}
                    disabled={userForm.whatsappSameAsPhone}
                    maxLength={13}
                    style={{ ...USER_FIELD_INPUT, ...(userForm.whatsappSameAsPhone ? { background: '#f8fafc' } : {}) }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', marginTop: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={userForm.whatsappSameAsPhone}
                      onChange={(e) => setUserForm({ ...userForm, whatsappSameAsPhone: e.target.checked })}
                    />
                    Same as mobile number
                  </label>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    {userForm.id ? 'New Password' : 'Password'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showUserPassword ? 'text' : 'password'}
                      placeholder={userForm.id ? 'Leave blank to keep current password' : 'At least 6 characters'}
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      style={{ width: '100%', padding: '10px 40px 10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                      autoComplete="new-password"
                      minLength={6}
                      required={!userForm.id}
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserPassword(!showUserPassword)}
                      aria-label={showUserPassword ? 'Hide password' : 'Show password'}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                    >
                      <i className={showUserPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                    </button>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                    {userForm.id
                      ? 'Only fill this to reset the user\'s password.'
                      : 'Share this password with the user. They can change it from their account.'}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Role
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserFormState['role'] })}
                    disabled={userForm.id === user.id}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                  >
                    <option value="Owner">Owner</option>
                    <option value="Agent">Agent</option>
                    <option value="Builder">Builder</option>
                    <option value="Admin">Admin</option>
                  </select>
                  {userForm.role === 'Admin' && (
                    <div style={{ fontSize: '12px', color: '#b45309', marginTop: '6px' }}>
                      <i className="fas fa-exclamation-triangle"></i> Admins get full access to this Admin Center.
                    </div>
                  )}
                </div>

                {userForm.id !== null && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Status
                    </label>
                    <select
                      value={userForm.status}
                      onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
                      disabled={userForm.id === user.id}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                    >
                      <option value="active">Active</option>
                      <option value="deleted">Deactivated (cannot sign in)</option>
                    </select>
                    {userForm.id === user.id && (
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                        You can't change the role or status of your own account.
                      </div>
                    )}
                  </div>
                )}

                <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: '4px 0 12px' }}>
                  <i className="fas fa-share-alt" style={{ color: '#0c6253', marginRight: '6px' }}></i>Website &amp; Social Links
                </div>
                {USER_LINK_FIELDS.map(({ key, label, icon, color, placeholder }, i) => (
                  <div key={key} style={{ marginBottom: i === USER_LINK_FIELDS.length - 1 ? '24px' : '16px' }}>
                    <label style={USER_FIELD_LABEL}>
                      <i className={icon} style={{ color, marginRight: '6px', width: '14px', textAlign: 'center' }}></i>{label}
                    </label>
                    <input
                      type="text"
                      inputMode="url"
                      placeholder={placeholder}
                      value={userForm[key]}
                      onChange={(e) => setUserForm({ ...userForm, [key]: e.target.value })}
                      style={USER_FIELD_INPUT}
                    />
                  </div>
                ))}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ flex: 1, padding: '12px' }}
                    onClick={() => setUserModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1, padding: '12px' }}
                    disabled={userSaving}
                  >
                    {userSaving
                      ? <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                      : (userForm.id ? 'Save Changes' : 'Create User')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Feature a listing for N days */}
        {featuringListing && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}>
            <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '420px', width: '100%', padding: '28px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#111827' }}>
                  {featuringListing.is_featured ? 'Change Featured Period' : 'Feature Listing'}
                </h3>
                <button
                  type="button"
                  onClick={() => setFeaturingListing(null)}
                  style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#6b7280' }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 16px' }}>
                #{featuringListing.id} · {featuringListing.title}
              </p>

              <form onSubmit={handleSubmitFeature}>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Feature For (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    placeholder="Leave empty for no expiry"
                    value={featureDays}
                    onChange={(e) => setFeatureDays(e.target.value)}
                    autoFocus
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>
                  Counted from today. Leave empty to keep it featured until you remove it.
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-outline" onClick={() => setFeaturingListing(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    <i className="fas fa-star"></i> {featuringListing.is_featured ? 'Update' : 'Feature'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add/Edit Business Associate */}
        {employeeModalOpen && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}>
            <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '28px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#111827' }}>
                  {employeeForm.id ? 'Edit Business Associate' : 'Add New Business Associate'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEmployeeModalOpen(false)}
                  style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#6b7280' }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <form onSubmit={handleSaveEmployee}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Reference Code
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={employeeForm.reference_code}
                      readOnly
                      style={{ flex: 1, padding: '10px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', fontWeight: 700, letterSpacing: '1px' }}
                      required
                    />
                    {!employeeForm.id && (
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ padding: '10px 14px', fontSize: '12px' }}
                        onClick={generateRefCode}
                      >
                        <i className="fas fa-sync-alt"></i> Auto
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Associate Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter associate name"
                    value={employeeForm.name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                    required
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Status
                  </label>
                  <select
                    value={employeeForm.status}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ flex: 1, padding: '12px' }}
                    onClick={() => setEmployeeModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1, padding: '12px' }}
                    disabled={employeeSaving}
                  >
                    {employeeSaving ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : (employeeForm.id ? 'Update Associate' : 'Add Associate')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Write / Edit Blog */}
        {blogModalOpen && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}>
            <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '28px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#111827' }}>
                  {blogForm.id ? 'Edit Blog' : 'Write New Blog'}
                </h3>
                <button
                  type="button"
                  onClick={() => setBlogModalOpen(false)}
                  style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#6b7280' }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <form onSubmit={handleSaveBlog}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Blog Title
                  </label>
                  <input
                    type="text"
                    placeholder="Enter blog title"
                    value={blogForm.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                      setBlogForm({ ...blogForm, title, permalink: blogForm.permalink || slug });
                    }}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Category
                    </label>
                    <select
                      value={blogForm.category}
                      onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
                      required
                    >
                      <option value="Buy">Buy</option>
                      <option value="Rent">Rent</option>
                      <option value="Invest">Invest</option>
                      <option value="Real Estate">Real Estate</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Status
                    </label>
                    <select
                      value={blogForm.status}
                      onChange={(e) => setBlogForm({ ...blogForm, status: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
                      required
                    >
                      <option value="publish">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Permalink (Slug)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. my-first-blog"
                    value={blogForm.permalink}
                    onChange={(e) => setBlogForm({ ...blogForm, permalink: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Tags / Labels (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. real estate, palwal, investment"
                    value={blogForm.tags}
                    onChange={(e) => setBlogForm({ ...blogForm, tags: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Featured Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setBlogForm({ ...blogForm, featured_image: e.target.files[0] });
                      }
                    }}
                    style={{ width: '100%', padding: '8px 0', fontSize: '13px' }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Blog Content
                  </label>
                  <textarea
                    rows={8}
                    placeholder="Write your article content here..."
                    value={blogForm.content}
                    onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }}
                    required
                  ></textarea>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ flex: 1, padding: '12px' }}
                    onClick={() => setBlogModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1, padding: '12px' }}
                    disabled={blogSaving}
                  >
                    {blogSaving ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : (blogForm.id ? 'Update Blog' : 'Publish Blog')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>

      <AdminEditListingModal
        listing={editingListing}
        onClose={() => setEditingListing(null)}
        onSaved={(message) => {
          showToast(message);
          fetchAdminListings();
          fetchListingCounts();
        }}
        onViewPage={(l) => onNavigate('listing-detail', l)}
      />
    </div>
  );
}
