import React, { useState, useEffect } from 'react';
import { Search, Plus, User, LogIn, LogOut, ChevronRight, MapPin, Clock, Phone, Camera, X, Filter, ChevronLeft, Trash2, Wrench, PhoneCall, Star, Check, Shield, AlertCircle, Menu, Info, Mail, Eye, EyeOff, Globe, Edit, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import BottomNav from './components/BottomNav';
import { Category, Service, UserProfile, Sponsor } from './types';
import { CATEGORIES, STATES, MALAYSIA_STATES } from './constants';
import { version } from '../package.json';

// Local assets
const chromeIcon = "/chromeicon.png";

export default function App() {
  const [activeTab, setActiveTab] = useState<'find' | 'home' | 'profile'>('home');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [topCategories, setTopCategories] = useState<{ category: string; count: number; thumbnails: string[] }[]>([]);
  const [homeSponsors, setHomeSponsors] = useState<Sponsor[]>([]);
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);
  const [userServices, setUserServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [isNewServiceOpen, setIsNewServiceOpen] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<'pending' | 'approved'>('pending');
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [serviceIdToReject, setServiceIdToReject] = useState<string | null>(null);
  const [adminSearch, setAdminSearch] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [serviceForRatingMgmt, setServiceForRatingMgmt] = useState<Service | null>(null);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [findTotal, setFindTotal] = useState(0);
  const [findPages, setFindPages] = useState(1);
  const [findCurrentPage, setFindCurrentPage] = useState(1);

  // Admin Management States
  const [adminMainTab, setAdminMainTab] = useState<'users' | 'services' | 'sponsors'>('services');
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [adminUsersTotal, setAdminUsersTotal] = useState(0);
  const [adminUsersPages, setAdminUsersPages] = useState(1);
  const [adminUsersCurrentPage, setAdminUsersCurrentPage] = useState(1);
  const [adminUsersSearch, setAdminUsersSearch] = useState('');
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [adminServicesPage, setAdminServicesPage] = useState(1);
  const [adminServicesTotal, setAdminServicesTotal] = useState(0);
  const [adminServicesPages, setAdminServicesPages] = useState(1);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [sponsorTab, setSponsorTab] = useState<'new' | 'old'>('new');
  const [sponsorToEdit, setSponsorToEdit] = useState<Sponsor | null>(null);

  // Onboarding Guides
  const [showPostRegistrationGuide, setShowPostRegistrationGuide] = useState(false);
  const [showGuestFindGuide, setShowGuestFindGuide] = useState(false);
  const [showUserRatingGuide, setShowUserRatingGuide] = useState(false);

  const isAdmin = user?.email === 'servicecalladmin@gmail.com' || user?.email === 'viknes1985@gmail.com' || user?.email === 'jomproadmin@gmail.com';

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(isDarkMode));
  }, [isDarkMode]);

  // Find Tab Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterTown, setFilterTown] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [maxRating, setMaxRating] = useState(5);

  useEffect(() => {
    fetchServices();
    fetchTopCategories();
    fetchSponsors();
    // Check local storage for user session
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      const welcomeShown = localStorage.getItem('welcomeShown');
      if (!welcomeShown) {
        setShowWelcomeOverlay(true);
      }
    }
  }, []);

  useEffect(() => {
    if (user && activeTab === 'profile') {
      fetchUserServices(1);
    }
  }, [user, activeTab, adminTab, adminMainTab]);

  useEffect(() => {
    if (activeTab === 'find') {
      if (!user) {
        const hasSeenGuestGuide = localStorage.getItem('hasSeenGuestGuide');
        if (!hasSeenGuestGuide) {
          setShowGuestFindGuide(true);
        }
      } else {
        const hasSeenUserGuide = localStorage.getItem(`hasSeenUserGuide_${user.id}`);
        if (!hasSeenUserGuide) {
          setShowUserRatingGuide(true);
        }
      }
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (isAdmin && user && activeTab === 'profile' && adminMainTab === 'users') {
      fetchAdminUsers(1, adminUsersSearch);
    }
  }, [isAdmin, user, activeTab, adminMainTab]);

  const fetchServices = async (filters: any = {}) => {
    setIsLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.append(key, String(val));
      }
    });
    if (isAdmin) {
      params.append('isAdmin', 'true');
    }
    const res = await fetch(`/api/services?${params.toString()}`);
    const data = await res.json();
    if (data.services) {
      setServices(data.services);
      setFindTotal(data.total);
      setFindPages(data.pages);
      setFindCurrentPage(Number(filters.page) || 1);
    } else {
      setServices([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isAdmin && activeTab === 'profile' && adminMainTab === 'services') {
      const timer = setTimeout(() => {
        fetchUserServices(1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [adminSearch]);

  const fetchUserServices = async (page = 1) => {
    if (!user?.id) return;
    try {
      let url = `/api/services?createdBy=${String(user.id)}&limit=100`;
      if (isAdmin) {
        url = `/api/services?isAdmin=true&status=${adminTab}&limit=10&page=${page}&search=${adminSearch}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.services) {
        setUserServices(data.services);
        if (isAdmin) {
          setAdminServicesTotal(data.total);
          setAdminServicesPages(data.pages);
          setAdminServicesPage(page);
        }
      }
    } catch (err) {
      console.error("Error fetching user services:", err);
    }
  };

  const fetchTopCategories = async () => {
    try {
      const response = await fetch('/api/top-categories');
      const data = await response.json();
      if (data.categories) {
        setTopCategories(data.categories);
        setHomeSponsors(data.sponsors || []);
      } else if (Array.isArray(data)) {
        setTopCategories(data);
      }
    } catch (error) {
      console.error("Error fetching top categories:", error);
    }
  };

  const fetchAdminUsers = async (page = 1, search = '') => {
    if (!isAdmin || !user) return;
    try {
      const res = await fetch(`/api/admin/users?adminEmail=${user.email}&page=${page}&search=${search}&limit=40`);
      const data = await res.json();
      if (res.ok) {
        setAdminUsers(data.users);
        setAdminUsersTotal(data.total);
        setAdminUsersPages(data.pages);
        setAdminUsersCurrentPage(page);
      }
    } catch (err) {
      console.error("Error fetching admin users:", err);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit || !isAdmin || !user) return;
    try {
      const res = await fetch(`/api/admin/users/${userToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: user.email,
          firstName: userToEdit.firstName,
          lastName: userToEdit.lastName,
          mobileNumber: userToEdit.mobileNumber,
          email: userToEdit.email
        })
      });
      if (res.ok) {
        alert('User updated successfully!');
        setIsEditUserModalOpen(false);
        setUserToEdit(null);
        fetchAdminUsers(adminUsersCurrentPage, adminUsersSearch);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update user');
      }
    } catch (err) {
      console.error('Edit user error:', err);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !isAdmin || !user) return;
    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}?adminEmail=${user.email}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('User deleted successfully!');
        setUserToDelete(null);
        fetchAdminUsers(adminUsersCurrentPage, adminUsersSearch);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Delete user error:', err);
    }
  };

  const fetchSponsors = async () => {
    try {
      const res = await fetch('/api/sponsors');
      const data = await res.json();
      if (res.ok) {
        setSponsors(data);
      }
    } catch (err) {
      console.error("Error fetching sponsors:", err);
    }
  };

  const handleSearch = (page = 1, overrideFilters?: any) => {
    const filters = {
      state: overrideFilters?.state !== undefined ? overrideFilters.state : filterState,
      town: overrideFilters?.town !== undefined ? overrideFilters.town : filterTown,
      category: overrideFilters?.category !== undefined ? overrideFilters.category : filterCategory,
      search: overrideFilters?.search !== undefined ? overrideFilters.search : searchQuery,
      currentUserId: user?.id,
      minRating: overrideFilters?.minRating !== undefined ? overrideFilters.minRating : minRating,
      maxRating: overrideFilters?.maxRating !== undefined ? overrideFilters.maxRating : maxRating,
      page,
      limit: 10
    };
    fetchServices(filters);
  };

  const handleSaveRating = async (serviceId: string, rating: number, comment?: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/services/${serviceId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, rating, comment })
      });
      if (res.ok) {
        fetchServices({
          state: filterState,
          town: filterTown,
          category: filterCategory,
          search: searchQuery,
          currentUserId: user.id,
          page: findCurrentPage
        });
        fetchTopCategories();
        // Update selected service if it's the one being rated
        if (selectedService?.id === serviceId) {
          const updatedRes = await fetch(`/api/services?id=${serviceId}`);
          const updatedData = await updatedRes.json();
          if (updatedData && updatedData.length > 0) {
            setSelectedService(updatedData[0]);
          }
        }
      }
    } catch (err) {
      console.error('Rating error:', err);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setActiveTab('home');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!user) return;
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          oldPassword,
          newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Password changed successfully!');
        setShowChangePassword(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setPasswordError('An error occurred. Please try again.');
    }
  };

  const handleUpdateSponsored = async (serviceId: string, isSponsored: boolean) => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`/api/services/${serviceId}/sponsored`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSponsored, adminEmail: user?.email })
      });
      if (res.ok) {
        fetchUserServices(adminServicesPage);
      }
    } catch (err) {
      console.error('Sponsored update error:', err);
    }
  };

  const handleToggleVerify = async (serviceId: string, isVerified: boolean) => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`/api/services/${serviceId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified, adminEmail: user?.email })
      });
      if (res.ok) {
        fetchUserServices(adminServicesPage);
      }
    } catch (err) {
      console.error('Verification update error:', err);
    }
  };

  const handleToggleRatingVisibility = async (serviceId: string, ratingId: string, isHidden: boolean) => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`/api/services/${serviceId}/ratings/${ratingId}/hide`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHidden, adminEmail: user?.email })
      });
      if (res.ok) {
        fetchUserServices(adminServicesPage);
      }
    } catch (err) {
      console.error('Rating visibility update error:', err);
    }
  };

  const handleUpdateStatus = async (serviceId: string, status: 'approved' | 'rejected', reason?: string) => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`/api/services/${serviceId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminEmail: user?.email, rejectionReason: reason })
      });
      if (res.ok) {
        fetchUserServices(adminServicesPage);
        fetchServices();
      }
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  const handleNudge = async (serviceId: string) => {
    const service = userServices.find(s => s.id === serviceId);
    if (service) {
      const createdDate = new Date(service.createdAt);
      const now = new Date();
      const diffDays = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diffDays < 3) {
        const remainingDays = Math.ceil(3 - diffDays);
        alert(`Nudge will be available after 3 days of registration. Please wait ${remainingDays} more day(s).`);
        return;
      }
    }

    try {
      const res = await fetch(`/api/services/${serviceId}/nudge`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        alert('Admin nudged successfully!');
        fetchUserServices(adminServicesPage);
      } else {
        alert(data.error || 'Failed to nudge admin');
      }
    } catch (err) {
      console.error('Nudge error:', err);
    }
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete || !user) return;
    
    try {
      const res = await fetch(`/api/services/${serviceToDelete.id}?userId=${user.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setServiceToDelete(null);
        fetchServices();
        fetchTopCategories();
        if (activeTab === 'profile') fetchUserServices(adminServicesPage);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete service');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete service');
    }
  };

  return (
    <div className={`min-h-screen pb-20 font-sans transition-colors duration-300 ${isDarkMode ? 'dark bg-black text-white' : 'bg-white text-gray-950'}`}>
      {/* Header */}
      <header className={`${isDarkMode ? 'bg-gray-900' : 'bg-blue-700'} text-white p-4 sticky top-0 z-40 shadow-md flex items-center justify-center relative transition-colors duration-300`}>
        <div className="absolute left-4 flex items-center gap-2">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 flex items-center px-1 ${isDarkMode ? 'bg-slate-700' : 'bg-blue-400'}`}
          >
            <motion.div
              animate={{ x: isDarkMode ? 28 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`w-5 h-5 rounded-full flex items-center justify-center shadow-sm ${isDarkMode ? 'bg-gray-200' : 'bg-yellow-400'}`}
            >
              {isDarkMode ? (
                <div className="relative w-full h-full rounded-full bg-gray-200 overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full bg-gray-200" />
                  <div className="absolute -top-1 -left-1 w-3 h-3 bg-gray-400 rounded-full opacity-20" />
                  <div className="absolute top-2 left-2 w-2 h-2 bg-gray-400 rounded-full opacity-20" />
                </div>
              ) : (
                <div className="w-3 h-3 bg-yellow-200 rounded-full blur-[1px]" />
              )}
            </motion.div>
            <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-2 overflow-hidden">
              {!isDarkMode && (
                <div className="ml-auto flex gap-0.5 opacity-60 scale-75">
                  <div className="w-2 h-1 bg-white rounded-full" />
                  <div className="w-3 h-1.5 bg-white rounded-full -mt-1" />
                  <div className="w-2 h-1 bg-white rounded-full" />
                </div>
              )}
              {isDarkMode && (
                <div className="mr-auto flex gap-1 opacity-40 scale-50">
                  <div className="w-1 h-1 bg-white rounded-full" />
                  <div className="w-0.5 h-0.5 bg-white rounded-full mt-2" />
                  <div className="w-1 h-1 bg-white rounded-full -mt-1" />
                </div>
              )}
            </div>
          </button>
          {user && (
            <span className="text-[10px] font-bold truncate max-w-[70px] leading-tight">
              Hi {isAdmin ? 'Admin' : user.firstName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <img src="/chromeicon.png" alt="Logo" className="w-8 h-8 object-contain" />
          <h1 className="text-xl font-black tracking-tighter italic">JomPro</h1>
        </div>
        <div className="absolute right-4 flex items-center">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-blue-700 rounded-full transition-colors"
            title="Menu"
          >
            <Menu size={24} />
          </button>

          <AnimatePresence>
            {isMenuOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMenuOpen(false)}
                  className="fixed inset-0 z-40"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10, x: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10, x: 10 }}
                  className={`absolute top-full right-0 mt-2 w-48 rounded-2xl shadow-xl border py-2 z-50 overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
                >
                  <button
                    onClick={() => {
                      setShowAbout(true);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-sm font-medium ${isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <Info size={18} className="text-blue-600" />
                    About us
                  </button>
                  <button
                    onClick={() => {
                      setShowContact(true);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-sm font-medium ${isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <Mail size={18} className="text-blue-600" />
                    Contact us
                  </button>
                  
                  {user ? (
                    <>
                      <div className="h-px bg-gray-100 my-1 mx-4" />
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors text-sm font-medium"
                      >
                        <LogOut size={18} />
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="h-px bg-gray-100 my-1 mx-4" />
                      <button
                        onClick={() => {
                          setActiveTab('profile');
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-blue-600 hover:bg-blue-50 transition-colors text-sm font-medium"
                      >
                        <LogIn size={18} />
                        Login
                      </button>
                    </>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center w-full">
                <p className={`text-xs sm:text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                  Your Local Services, One Simple Search
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('find')}
                  className={`${isDarkMode ? 'bg-gray-900 border-gray-800 hover:bg-gray-800' : 'bg-white border-blue-100 hover:bg-blue-50'} p-6 rounded-2xl shadow-sm border flex flex-col items-center gap-3 transition-colors text-center`}
                >
                  <div className={`${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'} p-3 rounded-full`}>
                    <Search size={28} />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Find Service</span>
                    <span className={`text-[8px] mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Find trusted services near you</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    if (!user) {
                      setShowLoginPrompt(true);
                    } else {
                      setIsNewServiceOpen(true);
                    }
                  }}
                  className={`${isDarkMode ? 'bg-gray-900 border-gray-800 hover:bg-gray-800' : 'bg-white border-blue-100 hover:bg-blue-50'} p-6 rounded-2xl shadow-sm border flex flex-col items-center gap-3 transition-colors text-center`}
                >
                  <div className={`${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'} p-3 rounded-full`}>
                    <Plus size={28} />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>New Service</span>
                    <span className={`text-[8px] mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Register your service</span>
                  </div>
                </button>
              </div>

              {/* Top Categories Section */}
              <section>
                <h2 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Top Categories</h2>
                <div className="grid grid-cols-2 gap-4">
                  {topCategories.length > 0 ? (
                    (() => {
                      const items = [...topCategories.map(cat => ({ type: 'category', data: cat }))];
                      if (homeSponsors.length > 0) {
                        if (homeSponsors[0]) items.splice(1, 0, { type: 'sponsor', data: homeSponsors[0] });
                        if (homeSponsors[1]) items.splice(4, 0, { type: 'sponsor', data: homeSponsors[1] });
                      }
                      return items.map((item, idx) => (
                        item.type === 'category' ? (
                          <div
                            key={`cat-${idx}`}
                            onClick={() => {
                              setFilterCategory(item.data.category);
                              setActiveTab('find');
                              fetchServices({ category: item.data.category });
                            }}
                            className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border overflow-hidden cursor-pointer hover:shadow-md transition-all group`}
                          >
                            {/* Large Thumbnail */}
                            <div className={`aspect-video ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} overflow-hidden`}>
                              {item.data.thumbnails && item.data.thumbnails[0] ? (
                                <img 
                                  src={item.data.thumbnails[0]} 
                                  className="w-full h-full object-cover" 
                                  alt="" 
                                />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                                  <img 
                                    src={CATEGORY_ICONS[item.data.category] || '/category-defaults/others.png'} 
                                    className="w-full h-full object-cover opacity-90" 
                                    alt={item.data.category}
                                  />
                                </div>
                              )}
                            </div>
                            {/* Category Info */}
                            <div className="p-3 flex justify-between items-center">
                              <div className="flex flex-col overflow-hidden">
                                <span className={`font-bold text-sm truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.data.category}</span>
                                <span className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.data.count} services</span>
                              </div>
                              <ChevronRight size={16} className={`${isDarkMode ? 'text-gray-600 group-hover:text-blue-400' : 'text-gray-300 group-hover:text-blue-600'} transition-colors flex-shrink-0`} />
                            </div>
                          </div>
                        ) : (
                          <div key={`sponsor-${idx}`} className="h-full">
                            <SponsoredCard sponsor={item.data} isDarkMode={isDarkMode} onClick={() => setSelectedSponsor(item.data)} />
                          </div>
                        )
                      ));
                    })()
                  ) : (
                    <div className="col-span-2 text-center py-8 text-gray-400 dark:text-gray-500 italic">No services added yet</div>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'find' && (
            <motion.div
              key="find"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="text-center w-full">
                <p className={`text-xs sm:text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis ${isDarkMode ? 'text-gray-200' : 'text-gray-500'}`}>
                  Need a Service? Find It Here Fast
                </p>
              </div>
              
              <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} p-3 rounded-2xl shadow-sm space-y-2 border transition-colors`}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search services..."
                      className={`w-full pl-10 pr-4 py-2.5 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${isDarkMode ? 'bg-gray-800 text-white placeholder-gray-500' : 'bg-gray-50 text-gray-900'}`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterState('');
                      setFilterTown('');
                      setFilterCategory('');
                      setMinRating(0);
                      setMaxRating(5);
                      handleSearch(1, { search: '', state: '', town: '', category: '', minRating: 0, maxRating: 5 });
                    }}
                    className={`px-3 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}
                  >
                    Clear/Reset
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    className={`p-1.5 rounded-lg text-sm outline-none border-none focus:ring-1 focus:ring-blue-500 transition-colors ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'}`}
                    value={filterState}
                    onChange={(e) => {
                      setFilterState(e.target.value);
                      setFilterTown('');
                    }}
                  >
                    <option value="">All States</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select
                    className={`p-1.5 rounded-lg text-sm outline-none border-none focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'}`}
                    value={filterTown}
                    onChange={(e) => setFilterTown(e.target.value)}
                    disabled={!filterState}
                  >
                    <option value="">All Towns</option>
                    {filterState && MALAYSIA_STATES[filterState].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <select
                  className={`w-full p-1.5 rounded-lg text-sm outline-none border-none focus:ring-1 focus:ring-blue-500 transition-colors ${isDarkMode ? 'bg-gray-200 text-gray-900' : 'bg-gray-50 text-gray-900'}`}
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                {/* Rating Range Slider */}
                <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} p-2 rounded-2xl shadow-sm space-y-1 border transition-colors`}>
                  <div className="flex justify-between items-center">
                    <label className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Rating Range</label>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDarkMode ? 'text-blue-400 bg-blue-900/30' : 'text-blue-600 bg-blue-50'}`}>
                      {minRating} - {maxRating} Stars
                    </span>
                  </div>
                  <div className="relative h-4 flex items-center">
                    <div className={`absolute w-full h-1 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`} />
                    <div 
                      className="absolute h-1 bg-blue-600 rounded-full" 
                      style={{ 
                        left: `${(minRating / 5) * 100}%`, 
                        right: `${100 - (maxRating / 5) * 100}%` 
                      }} 
                    />
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="1"
                      value={minRating}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val < maxRating) setMinRating(val);
                      }}
                      className="absolute w-full h-1 appearance-none bg-transparent pointer-events-none z-20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
                    />
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="1"
                      value={maxRating}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val > minRating) setMaxRating(val);
                      }}
                      className="absolute w-full h-1 appearance-none bg-transparent pointer-events-none z-20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
                    />
                  </div>
                  <div className="flex justify-between px-1">
                    {[0, 1, 2, 3, 4, 5].map(tick => (
                      <span key={tick} className={`text-[8px] font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{tick}</span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleSearch(1)}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-[0.98]"
                >
                  Search Services
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-20">
                {isLoading ? (
                  Array(6).fill(0).map((_, i) => (
                    <div key={i} className="bg-gray-200 dark:bg-gray-700 animate-pulse h-32 rounded-xl"></div>
                  ))
                ) : services.length > 0 ? (
                  <>
                    {services.map((item, idx) => (
                      item.type === 'service' ? (
                        <div
                          key={`service-${item.data.id}-${idx}`}
                          onClick={() => setSelectedService(item.data)}
                          className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-2 cursor-pointer hover:shadow-md transition-all relative overflow-hidden"
                        >
                            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                              {item.data.isSponsored && (
                                <span className="text-[8px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100/80 dark:bg-gray-700/80 px-1.5 py-0.5 rounded uppercase tracking-wider w-fit">Sponsored</span>
                              )}
                            </div>
                            {item.data.ratingCount > 0 && (
                              <div className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-1.5 py-0.5 rounded-lg shadow-sm flex items-center gap-1 z-10 border border-gray-100 dark:border-gray-700">
                                <Star size={10} className="text-yellow-400 fill-yellow-400" />
                                <span className="text-[10px] font-bold text-gray-700 dark:text-white">{(item.data.avgRating || 0).toFixed(1)}</span>
                                <span className="text-[8px] text-gray-400 dark:text-gray-500">({item.data.ratingCount})</span>
                              </div>
                            )}

                            <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                              {((item.data.photoUrls && item.data.photoUrls.length > 0) || item.data.photoUrl || item.data.image) ? (
                                <img 
                                  src={(item.data.photoUrls && item.data.photoUrls[0]) || item.data.photoUrl || item.data.image} 
                                  alt={item.data.providerName} 
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-white dark:bg-gray-800 p-0">
                                  <img 
                                    src={CATEGORY_ICONS[item.data.category] || '/category-defaults/others.png'} 
                                    className="w-full h-full object-cover" 
                                    alt={item.data.category}
                                  />
                                </div>
                              )}
                            </div>

                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{item.data.category}</span>
                              <div className="flex items-center gap-1 overflow-hidden">
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {item.data.type === 'Admin' ? (
                                    <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm" title="Admin">A</div>
                                  ) : item.data.type === 'Referral' ? (
                                    <div className="w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center text-[10px] font-bold text-white shadow-sm" title="Referral">R</div>
                                  ) : (
                                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm" title="Provider">P</div>
                                  )}
                                </div>
                                <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.data.providerName}</span>
                                {item.data.isVerified && (
                                  <div className="bg-blue-500 text-white p-0.5 rounded-full flex-shrink-0" title="Verified Service">
                                    <Check size={8} strokeWidth={4} />
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 text-[10px]">
                                <Clock size={10} />
                                <span>{item.data.operatingHours}</span>
                              </div>
                              <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 text-[10px]">
                                <Phone size={10} />
                                <span>{formatPhoneForDisplay(item.data.contactNumber)}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                        <div key={`sponsor-${item.data.id}-${idx}`} className="h-full">
                          <SponsoredCard sponsor={item.data} isDarkMode={isDarkMode} onClick={() => setSelectedSponsor(item.data)} />
                        </div>
                      )
                    ))}

                    {findPages > 1 && (
                      <div className="col-span-2 flex justify-center items-center gap-4 mt-8 py-4">
                        <button
                          disabled={findCurrentPage === 1}
                          onClick={() => handleSearch(findCurrentPage - 1)}
                          className={`flex items-center gap-1 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                            findCurrentPage === 1 
                              ? 'opacity-30 cursor-not-allowed' 
                              : isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-900 hover:bg-gray-50 shadow-sm'
                          }`}
                        >
                          <ChevronLeft size={18} />
                          Previous
                        </button>
                        
                        <div className="flex items-center gap-2">
                          {Array.from({ length: findPages }, (_, i) => i + 1).map(p => (
                            <button
                              key={p}
                              onClick={() => handleSearch(p)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                findCurrentPage === p
                                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                                  : isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-white text-gray-500 hover:text-gray-900 shadow-sm'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>

                        <button
                          disabled={findCurrentPage === findPages}
                          onClick={() => handleSearch(findCurrentPage + 1)}
                          className={`flex items-center gap-1 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                            findCurrentPage === findPages 
                              ? 'opacity-30 cursor-not-allowed' 
                              : isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-900 hover:bg-gray-50 shadow-sm'
                          }`}
                        >
                          Next
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="col-span-2 text-center py-12 text-gray-400 dark:text-gray-500">
                    No services found matching your criteria.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {user ? (
                <div className="space-y-6">
                  <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} p-6 rounded-2xl shadow-sm text-center space-y-4 border`}>
                    <div className={`${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'} w-20 h-20 rounded-full flex items-center justify-center mx-auto`}>
                      <User size={40} />
                    </div>
                    <div>
                      <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.firstName} {user.lastName}</h2>
                      <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user.email}</p>
                      <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user.mobileNumber}</p>
                      {isAdmin && <span className="inline-block mt-2 px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-full uppercase tracking-widest">Admin</span>}
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        onClick={() => setShowChangePassword(true)}
                        className="text-blue-600 text-sm font-semibold hover:underline"
                      >
                        Change Password
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 text-red-500 font-semibold py-2"
                      >
                        <LogOut size={18} />
                        Logout
                      </button>
                      <div className="pt-4 text-center">
                        <p className="text-[10px] text-gray-400 dark:text-gray-600 font-mono">v{version}</p>
                      </div>
                    </div>
                  </div>

                  <section className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {isAdmin && <Shield size={18} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />}
                        {isAdmin ? 'Admin Management' : 'My Services'}
                      </h3>
                      {isAdmin && (
                        <div className={`flex ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} p-1 rounded-xl`}>
                          <button
                            onClick={() => setAdminMainTab('users')}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${adminMainTab === 'users' ? (isDarkMode ? 'bg-gray-800 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm') : 'text-gray-400'}`}
                          >
                            Users
                          </button>
                          <button
                            onClick={() => setAdminMainTab('services')}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${adminMainTab === 'services' ? (isDarkMode ? 'bg-gray-800 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm') : 'text-gray-400'}`}
                          >
                            Services
                          </button>
                          <button
                            onClick={() => setAdminMainTab('sponsors')}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${adminMainTab === 'sponsors' ? (isDarkMode ? 'bg-gray-800 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm') : 'text-gray-400'}`}
                          >
                            Sponsor
                          </button>
                        </div>
                      )}
                    </div>

                    {isAdmin && adminMainTab === 'users' && (
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input
                            type="text"
                            placeholder="Search by Name, Phone, Email..."
                            className={`w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
                            value={adminUsersSearch}
                            onChange={(e) => {
                              setAdminUsersSearch(e.target.value);
                              fetchAdminUsers(1, e.target.value);
                            }}
                          />
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                          <div className="max-h-[400px] overflow-y-auto">
                            {adminUsers.length > 0 ? (
                              <table className="w-full text-left text-[11px]">
                                <thead className={`sticky top-0 z-10 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                  <tr>
                                    <th className={`p-3 font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>#</th>
                                    <th className={`p-3 font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Name</th>
                                    <th className={`p-3 font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Phone</th>
                                    <th className={`p-3 font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Email</th>
                                    <th className={`p-3 font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Actions</th>
                                  </tr>
                                </thead>
                                <tbody className={`divide-y divide-gray-100 dark:divide-gray-700 ${isDarkMode ? '' : 'bg-white'}`}>
                                  {adminUsers.map((u, i) => (
                                    <tr key={u.id} className={`${isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50 bg-white'} transition-colors`}>
                                      <td className="p-3 text-gray-400">{(adminUsersCurrentPage - 1) * 40 + i + 1}</td>
                                      <td className={`p-3 font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{u.firstName} {u.lastName}</td>
                                      <td className={`p-3 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>{u.mobileNumber}</td>
                                      <td className={`p-3 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>{u.email}</td>
                                      <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => {
                                                setUserToEdit(u);
                                                setIsEditUserModalOpen(true);
                                              }}
                                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                              title="Edit User"
                                            >
                                              <Edit size={14} />
                                            </button>
                                          <button
                                            onClick={() => setUserToDelete(u)}
                                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            title="Delete User"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div className="p-8 text-center text-gray-400">No users found.</div>
                            )}
                          </div>
                          {adminUsersPages > 1 && (
                            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-center items-center gap-4 bg-gray-50/50 dark:bg-gray-700/30">
                              <button
                                disabled={adminUsersCurrentPage === 1}
                                onClick={() => fetchAdminUsers(adminUsersCurrentPage - 1, adminUsersSearch)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all ${
                                  adminUsersCurrentPage === 1 
                                    ? 'opacity-30 cursor-not-allowed' 
                                    : isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-900 hover:bg-gray-50 shadow-sm'
                                }`}
                              >
                                <ChevronLeft size={14} />
                                Previous
                              </button>
                              
                              <div className="flex items-center gap-1.5">
                                {Array.from({ length: adminUsersPages }, (_, i) => i + 1).map(p => (
                                  <button
                                    key={p}
                                    onClick={() => fetchAdminUsers(p, adminUsersSearch)}
                                    className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all ${
                                      adminUsersCurrentPage === p
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-white text-gray-500 hover:text-gray-900 shadow-sm'
                                    }`}
                                  >
                                    {p}
                                  </button>
                                ))}
                              </div>

                              <button
                                disabled={adminUsersCurrentPage === adminUsersPages}
                                onClick={() => fetchAdminUsers(adminUsersCurrentPage + 1, adminUsersSearch)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all ${
                                  adminUsersCurrentPage === adminUsersPages 
                                    ? 'opacity-30 cursor-not-allowed' 
                                    : isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-900 hover:bg-gray-50 shadow-sm'
                                }`}
                              >
                                Next
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {isAdmin && adminMainTab === 'services' && (
                      <div className="space-y-4">
                        <div className={`flex ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} p-1 rounded-xl w-fit`}>
                          <button
                            onClick={() => setAdminTab('pending')}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${adminTab === 'pending' ? (isDarkMode ? 'bg-gray-800 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm') : 'text-gray-400'}`}
                          >
                            New
                          </button>
                          <button
                            onClick={() => setAdminTab('approved')}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${adminTab === 'approved' ? (isDarkMode ? 'bg-gray-800 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm') : 'text-gray-400'}`}
                          >
                            Approved
                          </button>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input
                            type="text"
                            placeholder="Filter by Provider Name..."
                            className={`w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
                            value={adminSearch}
                            onChange={(e) => setAdminSearch(e.target.value)}
                          />
                        </div>
                        <div className="space-y-3">
                          {userServices.length > 0 ? (
                            userServices.map((serviceWrapper, index) => {
                              const service = serviceWrapper.data;
                              return (
                                <div key={service.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-3">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-6">
                                        {(adminServicesPage - 1) * 10 + index + 1}.
                                      </span>
                                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                                        {(service.photoUrls && service.photoUrls.length > 0) ? (
                                          <img 
                                            src={service.photoUrls[0]} 
                                            className="w-full h-full object-cover" 
                                            alt={service.providerName} 
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                            <img 
                                              src={CATEGORY_ICONS[service.category] || '/category-defaults/others.png'} 
                                              className="w-full h-full object-cover" 
                                              alt={service.category}
                                            />
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{service.providerName}</h4>
                                        <p className="text-xs text-blue-600 font-medium">{service.category}</p>
                                        <div className="mt-1 space-y-0.5">
                                          <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <MapPin size={10} /> {service.town}, {service.state}
                                          </p>
                                          <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <Phone size={10} /> {formatPhoneForDisplay(service.contactNumber)}
                                          </p>
                                          <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <Clock size={10} /> {service.operatingHours}
                                          </p>
                                          <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <Calendar size={10} /> {new Date(service.createdAt).toLocaleDateString()}
                                          </p>
                                        </div>
                                        {service.status === 'approved' && (
                                          <div className="mt-2 flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Sponsored:</label>
                                              <button
                                                onClick={() => handleUpdateSponsored(service.id, !service.isSponsored)}
                                                className={`w-8 h-4 rounded-full transition-colors relative ${service.isSponsored ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                                              >
                                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${service.isSponsored ? 'left-4.5' : 'left-0.5'}`} />
                                              </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Verified:</label>
                                              <button
                                                onClick={() => handleToggleVerify(service.id, !service.isVerified)}
                                                className={`w-8 h-4 rounded-full transition-colors relative ${service.isVerified ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                                              >
                                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${service.isVerified ? 'left-4.5' : 'left-0.5'}`} />
                                              </button>
                                            </div>
                                            <button
                                              onClick={() => setServiceForRatingMgmt(service)}
                                              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline text-left w-fit"
                                            >
                                              Manage Ratings ({service.ratingCount})
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      {service.status === 'pending' && (
                                        <>
                                          <button
                                            onClick={() => handleUpdateStatus(service.id, 'approved')}
                                            className="bg-green-50 text-green-600 p-2 rounded-lg hover:bg-green-100 transition-colors"
                                            title="Approve"
                                          >
                                            <Check size={16} />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setServiceIdToReject(service.id);
                                              setRejectionModalOpen(true);
                                            }}
                                            className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition-colors"
                                            title="Reject"
                                          >
                                            <X size={16} />
                                          </button>
                                        </>
                                      )}
                                      <button
                                        onClick={() => {
                                          setServiceToEdit(service);
                                          setIsNewServiceOpen(true);
                                        }}
                                        className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => setServiceToDelete(service)}
                                        className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="text-[10px] text-gray-400 dark:text-gray-500 border-t dark:border-gray-700 pt-2 flex justify-between">
                                    <span>Submitted by: {service.creatorName}</span>
                                    <span>Nudges: {service.nudgeCount || 0}</span>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-8 text-gray-400">No services found.</div>
                          )}
                        </div>

                        {isAdmin && adminServicesPages > 1 && (
                          <div className="flex justify-center items-center gap-4 py-4">
                            <button
                              disabled={adminServicesPage === 1}
                              onClick={() => fetchUserServices(adminServicesPage - 1)}
                              className={`flex items-center gap-1 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                adminServicesPage === 1 
                                  ? 'opacity-30 cursor-not-allowed' 
                                  : isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-900 hover:bg-gray-50 shadow-sm'
                              }`}
                            >
                              <ChevronLeft size={18} />
                              Previous
                            </button>
                            
                            <div className="flex items-center gap-2">
                              {Array.from({ length: adminServicesPages }, (_, i) => i + 1).map(p => (
                                <button
                                  key={p}
                                  onClick={() => fetchUserServices(p)}
                                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                    adminServicesPage === p
                                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                                      : isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-white text-gray-500 hover:text-gray-900 shadow-sm'
                                  }`}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>

                            <button
                              disabled={adminServicesPage === adminServicesPages}
                              onClick={() => fetchUserServices(adminServicesPage + 1)}
                              className={`flex items-center gap-1 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                adminServicesPage === adminServicesPages 
                                  ? 'opacity-30 cursor-not-allowed' 
                                  : isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-900 hover:bg-gray-50 shadow-sm'
                              }`}
                            >
                              Next
                              <ChevronRight size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {isAdmin && adminMainTab === 'sponsors' && (
                      <div className="space-y-4">
                        <div className={`flex ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} p-1 rounded-xl w-fit`}>
                          <button
                            onClick={() => {
                              setSponsorTab('new');
                              if (sponsorTab === 'old') setSponsorToEdit(null);
                            }}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${sponsorTab === 'new' ? (isDarkMode ? 'bg-gray-800 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm') : 'text-gray-400'}`}
                          >
                            {sponsorToEdit ? 'Edit' : 'New'}
                          </button>
                          <button
                            onClick={() => setSponsorTab('old')}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${sponsorTab === 'old' ? (isDarkMode ? 'bg-gray-800 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm') : 'text-gray-400'}`}
                          >
                            Old
                          </button>
                        </div>
                        {sponsorTab === 'new' ? (
                          <SponsorForm 
                            isDarkMode={isDarkMode} 
                            onSuccess={() => {
                              fetchSponsors();
                              setSponsorToEdit(null);
                            }} 
                            user={user} 
                            sponsorToEdit={sponsorToEdit}
                            onCancel={sponsorToEdit ? () => setSponsorToEdit(null) : undefined}
                          />
                        ) : (
                          <SponsorList 
                            sponsors={sponsors} 
                            isDarkMode={isDarkMode} 
                            onUpdate={fetchSponsors} 
                            user={user} 
                            onEdit={(s) => {
                              setSponsorToEdit(s);
                              setSponsorTab('new');
                            }}
                          />
                        )}
                      </div>
                    )}

                    {!isAdmin && (
                      <div className="space-y-3">
                        {userServices.length > 0 ? (
                          userServices.map((serviceWrapper) => {
                            const service = serviceWrapper.data;
                            return (
                              <div key={service.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-3">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                                    {(service.photoUrls && service.photoUrls.length > 0) ? (
                                      <img 
                                        src={service.photoUrls[0]} 
                                        className="w-full h-full object-cover" 
                                        alt={service.providerName} 
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                        <img 
                                          src={CATEGORY_ICONS[service.category] || '/category-defaults/others.png'} 
                                          className="w-full h-full object-cover" 
                                          alt={service.category}
                                        />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">{service.providerName}</h4>
                                    <p className="text-xs text-blue-600 font-medium">{service.category}</p>
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                      service.status === 'approved' ? 'bg-green-100 text-green-600' : 
                                      service.status === 'rejected' ? 'bg-red-100 text-red-600' : 
                                      'bg-amber-100 text-amber-600'
                                    }`}>
                                      {service.status}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {service.status === 'pending' && (
                                    (() => {
                                      const createdDate = new Date(service.createdAt);
                                      const now = new Date();
                                      const diffDays = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
                                      return diffDays >= 3;
                                    })()
                                  ) && (
                                    <button
                                      onClick={() => handleNudge(service.id)}
                                      className="bg-amber-50 text-amber-600 px-3 py-2 rounded-lg text-[10px] font-bold hover:bg-amber-100 transition-colors flex items-center gap-1"
                                    >
                                      <Clock size={12} />
                                      Nudge ({service.nudgeCount || 0}/3)
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setServiceToEdit(service);
                                      setIsNewServiceOpen(true);
                                    }}
                                    className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                  >
                                    {service.status === 'rejected' ? 'Edit & Resubmit' : 'Edit'}
                                  </button>
                                  <button
                                    onClick={() => setServiceToDelete(service)}
                                    className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                              {service.status === 'rejected' && service.rejectionReason && (
                                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30">
                                  <p className="text-[10px] text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                                    <AlertCircle size={10} />
                                    Rejection Reason:
                                  </p>
                                  <p className="text-[10px] text-red-500 dark:text-red-300 mt-0.5">{service.rejectionReason}</p>
                                </div>
                              )}
                            </div>
                          );
                        })
                    ) : (
                      <div className="text-center py-8 text-gray-400">You haven't added any services yet.</div>
                        )}
                      </div>
                    )}
                  </section>
                </div>
              ) : (
                <AuthScreen 
                  isDarkMode={isDarkMode}
                  onLogin={(u) => {
                    setUser(u);
                    localStorage.setItem('user', JSON.stringify(u));
                  }} 
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showWelcomeOverlay && (
          <WelcomeOverlay 
            isDarkMode={isDarkMode} 
            onClose={() => {
              setShowWelcomeOverlay(false);
              localStorage.setItem('welcomeShown', 'true');
            }} 
          />
        )}
      </AnimatePresence>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} isDarkMode={isDarkMode} />

      {/* Change Password Modal */}
      <AnimatePresence>
        {showChangePassword && user && (
          <ChangePasswordModal
            userId={user.id}
            isDarkMode={isDarkMode}
            onClose={() => setShowChangePassword(false)}
          />
        )}
      </AnimatePresence>

      {/* New Service Modal */}
      <AnimatePresence>
        {showLoginPrompt && (
          <LoginPromptOverlay 
            onClose={() => setShowLoginPrompt(false)} 
            onLogin={() => {
              setShowLoginPrompt(false);
              setActiveTab('profile');
            }} 
          />
        )}
        {isNewServiceOpen && (
          <NewServiceModal
            isDarkMode={isDarkMode}
            user={user}
            serviceToEdit={serviceToEdit}
            onClose={() => {
              setIsNewServiceOpen(false);
              setServiceToEdit(null);
            }}
            onSuccess={(isNew) => {
              setIsNewServiceOpen(false);
              setServiceToEdit(null);
              fetchServices();
              fetchTopCategories();
              if (activeTab === 'profile') fetchUserServices(adminServicesPage);
              if (isNew) {
                setShowPostRegistrationGuide(true);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Post Registration Guide */}
      <AnimatePresence>
        {showPostRegistrationGuide && (
          <PostRegistrationGuide onClose={() => setShowPostRegistrationGuide(false)} />
        )}
      </AnimatePresence>

      {/* Guest Find Guide */}
      <AnimatePresence>
        {showGuestFindGuide && (
          <GuestFindGuide onClose={() => {
            setShowGuestFindGuide(false);
            localStorage.setItem('hasSeenGuestGuide', 'true');
          }} />
        )}
      </AnimatePresence>

      {/* User Rating Guide */}
      <AnimatePresence>
        {showUserRatingGuide && (
          <UserRatingGuide onClose={() => {
            setShowUserRatingGuide(false);
            if (user) localStorage.setItem(`hasSeenUserGuide_${user.id}`, 'true');
          }} />
        )}
      </AnimatePresence>

      {/* Rejection Reason Modal */}
      <AnimatePresence>
        {rejectionModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <div className="bg-white p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-2xl">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">Reason for Rejection</h2>
                <button onClick={() => setRejectionModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <textarea
                placeholder="Enter reason for rejection..."
                className="w-full bg-gray-50 p-3 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-500 min-h-[100px]"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setRejectionModalOpen(false)}
                  className="w-full bg-gray-100 text-gray-600 py-2 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (serviceIdToReject) {
                      handleUpdateStatus(serviceIdToReject, 'rejected', rejectionReason);
                      setRejectionModalOpen(false);
                      setRejectionReason('');
                      setServiceIdToReject(null);
                    }
                  }}
                  className="w-full bg-red-600 text-white py-2 rounded-xl font-bold"
                  disabled={!rejectionReason.trim()}
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {selectedSponsor && (
          <SponsorModal 
            sponsor={selectedSponsor} 
            isDarkMode={isDarkMode} 
            onClose={() => setSelectedSponsor(null)} 
          />
        )}
        {showAbout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} w-full max-w-md rounded-3xl p-8 shadow-2xl relative transition-colors`}
            >
              <button 
                onClick={() => setShowAbout(false)}
                className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X size={20} />
              </button>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'} p-4 rounded-2xl`}>
                  <Info size={40} />
                </div>
                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>About Us</h2>
                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} leading-relaxed`}>
                  JomPro is your premier local service discovery platform. We connect skilled service providers with community members in need of reliable help. Our mission is to simplify the way you find and book local services while empowering small businesses to grow.
                </p>
                <div className="pt-4 w-full">
                  <button
                    onClick={() => setShowAbout(false)}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} w-full max-w-md rounded-3xl p-8 shadow-2xl relative transition-colors`}
            >
              <button 
                onClick={() => setShowContact(false)}
                className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X size={20} />
              </button>
              <div className="flex flex-col items-center text-center space-y-6">
                <div className={`${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'} p-4 rounded-2xl`}>
                  <Mail size={40} />
                </div>
                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Contact Us</h2>
                <div className="space-y-4 w-full">
                  <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                    <div className={`${isDarkMode ? 'bg-gray-800 text-blue-400' : 'bg-white text-blue-600'} p-2 rounded-lg shadow-sm`}>
                      <Mail size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-gray-400 uppercase">Email</p>
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>admin@jompro.com</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                    <div className={`${isDarkMode ? 'bg-gray-800 text-blue-400' : 'bg-white text-blue-600'} p-2 rounded-lg shadow-sm`}>
                      <MapPin size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-gray-400 uppercase">Office</p>
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Kuala Lumpur, Malaysia</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowContact(false)}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mt-4"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedService && (
          <ServiceDetailModal
            service={selectedService}
            user={user}
            onClose={() => setSelectedService(null)}
            onRate={(rating, comment) => handleSaveRating(selectedService.id, rating, comment)}
          />
        )}

        {showChangePassword && user && (
          <ChangePasswordModal 
            userId={user.id} 
            isDarkMode={isDarkMode} 
            onClose={() => setShowChangePassword(false)} 
          />
        )}

        {serviceForRatingMgmt && (
          <RatingManagementModal
            service={serviceForRatingMgmt}
            isDarkMode={isDarkMode}
            onClose={() => setServiceForRatingMgmt(null)}
            onToggleVisibility={handleToggleRatingVisibility}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {serviceToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <div className={`p-6 rounded-2xl w-full max-w-sm text-center space-y-4 shadow-2xl ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
              <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full text-red-600 dark:text-red-400 w-fit mx-auto">
                <Trash2 size={24} />
              </div>
              <h2 className="text-lg font-bold">Delete Service?</h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Are you sure you want to remove "{serviceToDelete.providerName}"? This action cannot be undone.</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setServiceToDelete(null)}
                  className={`w-full py-2 rounded-xl font-bold ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
                >
                  No, Cancel
                </button>
                <button
                  onClick={handleDeleteService}
                  className="w-full bg-red-600 text-white py-2 rounded-xl font-bold shadow-lg shadow-red-200 dark:shadow-none"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Admin User Delete Confirmation */}
        {userToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <div className={`p-6 rounded-2xl w-full max-w-sm text-center space-y-4 shadow-2xl ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
              <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full text-red-600 dark:text-red-400 w-fit mx-auto">
                <Trash2 size={24} />
              </div>
              <h2 className="text-lg font-bold">Delete User?</h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Are you sure you want to delete {userToDelete.firstName} {userToDelete.lastName}? This will also remove all their services. This action cannot be undone.</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setUserToDelete(null)}
                  className={`w-full py-2 rounded-xl font-bold ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="w-full bg-red-600 text-white py-2 rounded-xl font-bold shadow-lg shadow-red-200 dark:shadow-none"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Admin User Edit Modal */}
        {isEditUserModalOpen && userToEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <div className={`p-6 rounded-3xl w-full max-w-md space-y-6 shadow-2xl relative ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
              <button 
                onClick={() => setIsEditUserModalOpen(false)}
                className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X size={20} />
              </button>
              
              <div className="text-center space-y-2">
                <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                  <User size={32} />
                </div>
                <h2 className="text-xl font-bold">Edit User Details</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Update information for {userToEdit.firstName}</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">First Name</label>
                    <input
                      type="text"
                      className={`w-full px-4 py-2.5 rounded-xl border outline-none transition-all text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-blue-500'}`}
                      value={userToEdit.firstName}
                      onChange={(e) => setUserToEdit({...userToEdit, firstName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Last Name</label>
                    <input
                      type="text"
                      className={`w-full px-4 py-2.5 rounded-xl border outline-none transition-all text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-blue-500'}`}
                      value={userToEdit.lastName}
                      onChange={(e) => setUserToEdit({...userToEdit, lastName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Mobile Number</label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2.5 rounded-xl border outline-none transition-all text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-blue-500'}`}
                    value={userToEdit.mobileNumber}
                    onChange={(e) => setUserToEdit({...userToEdit, mobileNumber: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Email Address</label>
                  <input
                    type="email"
                    className={`w-full px-4 py-2.5 rounded-xl border outline-none transition-all text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-blue-500'}`}
                    value={userToEdit.email}
                    onChange={(e) => setUserToEdit({...userToEdit, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsEditUserModalOpen(false)}
                  className={`flex-1 py-3 rounded-xl font-bold transition-colors ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditUser}
                  className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 transition-transform"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SponsoredCard({ sponsor, isDarkMode, onClick }: { sponsor: Sponsor, isDarkMode: boolean, onClick?: () => void }) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    if (sponsor.photoUrls.length > 1) {
      const interval = setInterval(() => {
        setCurrentPhotoIndex((prev) => (prev + 1) % sponsor.photoUrls.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [sponsor.photoUrls.length]);

  return (
    <div 
      onClick={onClick}
      className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-2 relative overflow-hidden h-full min-h-[160px] cursor-pointer group"
    >
      <div className="absolute top-2 left-2 z-10">
        <span className="text-[8px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100/80 dark:bg-gray-700/80 px-1.5 py-0.5 rounded uppercase tracking-wider">Sponsored</span>
      </div>
      <div className="absolute inset-0">
        <img 
          src={sponsor.photoUrls[currentPhotoIndex]} 
          alt={sponsor.name} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      </div>
      <div className="mt-auto relative z-10 p-1">
        <h3 className="text-xs font-bold text-white truncate">{sponsor.name}</h3>
      </div>
    </div>
  );
}

function SponsorModal({ sponsor, isDarkMode, onClose }: { sponsor: Sponsor, isDarkMode: boolean, onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => setCurrentIndex((prev) => (prev + 1) % sponsor.photoUrls.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + sponsor.photoUrls.length) % sponsor.photoUrls.length);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative max-w-lg w-full aspect-[4/5] bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="relative h-full w-full">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentIndex}
              src={sponsor.photoUrls[currentIndex]}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="w-full h-full object-cover"
            />
          </AnimatePresence>

          {sponsor.photoUrls.length > 1 && (
            <>
              <button 
                onClick={prev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <ChevronRight size={24} />
              </button>
              
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {sponsor.photoUrls.map((_, i) => (
                  <div 
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 to-transparent">
          <h2 className="text-2xl font-bold text-white">{sponsor.name}</h2>
          <p className="text-gray-300 text-sm mt-1">Sponsored Advertisement</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SponsorForm({ isDarkMode, onSuccess, user, sponsorToEdit, onCancel }: { 
  isDarkMode: boolean, 
  onSuccess: () => void, 
  user: UserProfile | null,
  sponsorToEdit?: Sponsor | null,
  onCancel?: () => void
}) {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', durationDays: 30 });
  const [countryCode, setCountryCode] = useState('60');
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (sponsorToEdit) {
      let phone = sponsorToEdit.phone;
      let code = '60';
      if (phone.startsWith('+')) {
        if (phone.startsWith('+60')) {
          code = '60';
          phone = phone.substring(3);
        } else if (phone.startsWith('+65')) {
          code = '65';
          phone = phone.substring(3);
        } else if (phone.startsWith('+62')) {
          code = '62';
          phone = phone.substring(3);
        }
      }
      setFormData({
        name: sponsorToEdit.name,
        phone: phone,
        email: sponsorToEdit.email,
        durationDays: sponsorToEdit.durationDays
      });
      setCountryCode(code);
      setExistingPhotos(sponsorToEdit.photoUrls || []);
      setPhotos([]);
    } else {
      setFormData({ name: '', phone: '', email: '', durationDays: 30 });
      setCountryCode('60');
      setPhotos([]);
      setExistingPhotos([]);
    }
  }, [sponsorToEdit]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files).slice(0, 2);
      setPhotos(newPhotos);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photos.length === 0 && existingPhotos.length === 0) {
      alert('Please upload at least one photo');
      return;
    }
    setIsSubmitting(true);

    try {
      // Combine country code and phone number
      let phone = formData.phone.replace(/\D/g, '');
      if (phone.startsWith('0')) {
        phone = phone.substring(1);
      }
      const combinedPhone = `+${countryCode}${phone}`;

      const newPhotoUrls = await Promise.all(photos.map(async p => {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(p);
        });
        return compressImage(base64);
      }));

      const res = await fetch(sponsorToEdit ? `/api/sponsors/${sponsorToEdit.id}` : '/api/sponsors', {
        method: sponsorToEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData, 
          phone: combinedPhone, 
          photoUrls: [...existingPhotos, ...newPhotoUrls], 
          adminEmail: user?.email 
        })
      });
      if (res.ok) {
        if (!sponsorToEdit) {
          setFormData({ name: '', phone: '', email: '', durationDays: 30 });
          setPhotos([]);
          setExistingPhotos([]);
        }
        onSuccess();
        alert(sponsorToEdit ? 'Sponsor updated successfully!' : 'Sponsor added successfully!');
      } else {
        const data = await res.json();
        alert(data.error || `Failed to ${sponsorToEdit ? 'update' : 'add'} sponsor`);
      }
    } catch (err) {
      console.error(err);
      alert(`Failed to ${sponsorToEdit ? 'update' : 'add'} sponsor`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 p-4 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
      <div className="grid grid-cols-1 gap-3">
        <input
          placeholder="Sponsor Name"
          required
          className={`w-full p-3 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'}`}
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
        />
        <PhoneInput
          value={formData.phone}
          onChange={(val) => setFormData({ ...formData, phone: val })}
          countryCode={countryCode}
          setCountryCode={setCountryCode}
          isDarkMode={isDarkMode}
        />
        <input
          type="email"
          placeholder="Email Address"
          required
          className={`w-full p-3 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'}`}
          value={formData.email}
          onChange={e => setFormData({ ...formData, email: e.target.value })}
        />
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Duration (Days)</label>
          <input
            type="number"
            required
            min="1"
            className={`w-full p-3 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'}`}
            value={formData.durationDays}
            onChange={e => setFormData({ ...formData, durationDays: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-gray-400 uppercase">Photos (Max 2)</label>
        <div className="flex items-center gap-4">
          <label className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-4 cursor-pointer transition-colors ${isDarkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'}`}>
            <Camera className="text-gray-400 mb-2" />
            <span className="text-xs text-gray-500">Click to upload photos</span>
            <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </label>
        </div>
        {(photos.length > 0 || existingPhotos.length > 0) && (
          <div className="flex gap-2">
            {existingPhotos.map((url, i) => (
              <div key={`existing-${i}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                <img src={url} className="w-full h-full object-cover" />
                <button type="button" onClick={() => setExistingPhotos(existingPhotos.filter((_, idx) => idx !== i))} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5">
                  <X size={10} />
                </button>
              </div>
            ))}
            {photos.map((p, i) => (
              <div key={`new-${i}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                <img src={URL.createObjectURL(p)} className="w-full h-full object-cover" />
                <button type="button" onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={`flex-1 py-3 rounded-xl font-bold active:scale-95 transition-transform ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'}`}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold active:scale-95 transition-transform disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : sponsorToEdit ? 'Update Sponsor' : 'Save Sponsor'}
        </button>
      </div>
    </form>
  );
}

function SponsorList({ sponsors, isDarkMode, onUpdate, user, onEdit }: { 
  sponsors: Sponsor[], 
  isDarkMode: boolean, 
  onUpdate: () => void, 
  user: UserProfile | null,
  onEdit: (s: Sponsor) => void
}) {
  const [editingDuration, setEditingDuration] = useState<string | null>(null);
  const [newDuration, setNewDuration] = useState<number>(30);

  const toggleSponsor = async (id: string, isEnabled: boolean) => {
    try {
      const res = await fetch(`/api/sponsors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled, adminEmail: user?.email })
      });
      if (res.ok) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const updateDuration = async (id: string) => {
    try {
      const res = await fetch(`/api/sponsors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationDays: newDuration, adminEmail: user?.email })
      });
      if (res.ok) {
        setEditingDuration(null);
        onUpdate();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteSponsor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sponsor?')) return;
    try {
      const res = await fetch(`/api/sponsors/${id}?adminEmail=${user?.email}`, { method: 'DELETE' });
      if (res.ok) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const getFormattedDuration = (expiresAt: number) => {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return "Expired";
    
    const totalHours = Math.floor(diff / (1000 * 60 * 60));
    const totalDays = Math.floor(totalHours / 24);
    
    const months = Math.floor(totalDays / 30);
    const days = totalDays % 30;
    const hours = totalHours % 24;
    
    return `${months}:${days}:${hours}`;
  };

  const getDaysLeft = (expiresAt: number) => {
    const diff = expiresAt - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-3">
      {sponsors.length > 0 ? (
        sponsors.map(s => {
          const daysLeft = getDaysLeft(s.expiresAt);
          const formattedDuration = getFormattedDuration(s.expiresAt);
          return (
            <div key={s.id} className={`p-4 rounded-2xl border shadow-sm space-y-3 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{s.name}</h4>
                    {daysLeft > 0 ? (
                      <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded font-bold">{formattedDuration} left</span>
                    ) : (
                      <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">Expired</span>
                    )}
                  </div>
                  <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{s.email} | {s.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(s)}
                    className="text-blue-600 dark:text-blue-400 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                    title="Edit Sponsor"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => toggleSponsor(s.id, !s.isEnabled)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${s.isEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${s.isEnabled ? 'left-5.5' : 'left-0.5'}`} />
                  </button>
                  <button onClick={() => deleteSponsor(s.id)} className="text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                {editingDuration === s.id ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="number"
                      className={`flex-1 p-2 rounded-lg text-xs outline-none ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'}`}
                      value={newDuration}
                      onChange={e => setNewDuration(parseInt(e.target.value) || 0)}
                    />
                    <button onClick={() => updateDuration(s.id)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold">Save</button>
                    <button onClick={() => setEditingDuration(null)} className="text-xs text-gray-500 px-2 py-1.5">Cancel</button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setEditingDuration(s.id);
                      setNewDuration(s.durationDays);
                    }}
                    className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    Update Duration ({s.durationDays} days)
                  </button>
                )}
              </div>

              {s.isEnabled && s.photoUrls.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {s.photoUrls.map((url, i) => (
                    <img key={i} src={url} className={`w-20 h-20 rounded-xl object-cover border ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`} />
                  ))}
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className="text-center py-8 text-gray-400">No sponsors found.</div>
      )}
    </div>
  );
}
function AuthScreen({ onLogin, isDarkMode }: { onLogin: (user: UserProfile) => void, isDarkMode: boolean }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'verify' | 'reset' | 'signup-verify'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countryCode, setCountryCode] = useState('60');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    mobileNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    code: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const COUNTRY_CODES = [
    { code: '60', name: 'Malaysia' },
    { code: '65', name: 'Singapore' },
    { code: '62', name: 'Indonesia' },
    { code: '66', name: 'Thailand' },
    { code: '63', name: 'Philippines' },
    { code: '84', name: 'Vietnam' },
    { code: '91', name: 'India' },
    { code: '1', name: 'USA/Canada' },
    { code: '44', name: 'UK' },
    { code: '86', name: 'China' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (mode === 'login' || mode === 'signup' || mode === 'signup-verify') {
      if (mode === 'signup' && formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (mode === 'signup') {
        // Phone number processing
        let phone = formData.mobileNumber.replace(/-/g, '').replace(/\s/g, '');
        if (phone.startsWith('0')) {
          phone = phone.substring(1);
        }
        
        // Basic validation: Malaysia mobile numbers are usually 9-10 digits after stripping 0
        if (!/^\d+$/.test(phone) || phone.length < 7 || phone.length > 12) {
          setError('Invalid phone number. Please enter a valid mobile number.');
          return;
        }

        const fullMobile = '+' + countryCode + phone;
        
        // Prepare signup (send verification code)
        const res = await fetch('/api/auth/prepare-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            mobileNumber: fullMobile,
            password: formData.password
          })
        });
        const data = await res.json();
        if (res.ok) {
          setMessage('Verification code sent to your email. Please check your inbox.');
          setMode('signup-verify');
        } else {
          setError(data.error || 'Failed to prepare signup');
        }
        return;
      }

      if (mode === 'signup-verify') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: formData.email,
            code: formData.code
          })
        });
        const data = await res.json();
        if (res.ok) {
          onLogin(data);
        } else {
          setError(data.error || 'Verification failed');
        }
        return;
      }

      const payload = { email: formData.email, password: formData.password };
      const endpoint = '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data);
      } else {
        if (data.unverified) {
          setError('Email not verified. Sending new code...');
          await fetch('/api/auth/send-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.email })
          });
          setMode('signup-verify');
          return;
        }
        console.error('Auth error:', data);
        setError(data.error || 'Something went wrong');
      }
    } else if (mode === 'forgot') {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setMode('verify');
      } else {
        setError(data.error || 'Failed to send reset code');
      }
    } else if (mode === 'verify') {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, code: formData.code })
      });
      const data = await res.json();
      if (res.ok) {
        setMode('reset');
      } else {
        setError(data.error || 'Invalid code');
      }
    } else if (mode === 'reset') {
      if (formData.newPassword !== formData.confirmNewPassword) {
        setError('Passwords do not match');
        return;
      }
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email, 
          code: formData.code, 
          newPassword: formData.newPassword 
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Password reset successful! Please login.');
        setMode('login');
      } else {
        setError(data.error || 'Failed to reset password');
      }
    }
  };

  return (
    <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} p-6 rounded-2xl shadow-sm space-y-6 border transition-colors`}>
      {(mode === 'login' || mode === 'signup') && (
        <div className={`flex border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === 'login' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 dark:text-gray-500'}`}
          >
            Login
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); }}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === 'signup' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 dark:text-gray-500'}`}
          >
            Sign Up
          </button>
        </div>
      )}

      {mode === 'forgot' && <h2 className="text-lg font-bold text-center text-gray-900 dark:text-white">Forgot Password</h2>}
      {mode === 'verify' && <h2 className="text-lg font-bold text-center text-gray-900 dark:text-white">Verify Code</h2>}
      {mode === 'reset' && <h2 className="text-lg font-bold text-center text-gray-900 dark:text-white">Reset Password</h2>}
      {mode === 'signup-verify' && <h2 className="text-lg font-bold text-center text-gray-900 dark:text-white">Verify Your Email</h2>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="First Name"
              required
              className={`w-full p-3 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${isDarkMode ? 'bg-gray-800 text-white placeholder-gray-500' : 'bg-gray-50 text-gray-900'}`}
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            <input
              type="text"
              placeholder="Last Name"
              required
              className={`w-full p-3 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${isDarkMode ? 'bg-gray-800 text-white placeholder-gray-500' : 'bg-gray-50 text-gray-900'}`}
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
        )}

        {(mode === 'login' || mode === 'signup' || mode === 'forgot' || mode === 'verify' || mode === 'reset' || mode === 'signup-verify') && (
          <input
            type="email"
            placeholder="Email Address"
            required
            disabled={mode === 'verify' || mode === 'reset' || mode === 'signup-verify'}
            className={`w-full p-3 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 transition-colors ${isDarkMode ? 'bg-gray-200 text-gray-900 placeholder-gray-500' : 'bg-gray-50 text-gray-900'}`}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        )}

        {mode === 'signup' && (
          <div className="flex flex-col gap-1">
            <PhoneInput
              value={formData.mobileNumber}
              onChange={(val) => setFormData({ ...formData, mobileNumber: val })}
              countryCode={countryCode}
              setCountryCode={setCountryCode}
              isDarkMode={isDarkMode}
            />
            <p className="text-[10px] text-gray-400 px-1">e.g. 012-3456789 / 0123456789</p>
          </div>
        )}

        {(mode === 'login' || mode === 'signup') && (
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              required
              className={`w-full p-3 pr-10 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${isDarkMode ? 'bg-gray-200 text-gray-900 placeholder-gray-500' : 'bg-gray-50 text-gray-900'}`}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        )}

        {mode === 'signup' && (
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              required
              className={`w-full p-3 pr-10 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${isDarkMode ? 'bg-gray-200 text-gray-900 placeholder-gray-500' : 'bg-gray-50 text-gray-900'}`}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        )}

        {(mode === 'verify' || mode === 'reset' || mode === 'signup-verify') && (
          <input
            type="text"
            placeholder="6-Digit Code"
            required
            maxLength={6}
            disabled={mode === 'reset'}
            className={`w-full p-3 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-500 text-center font-mono tracking-widest disabled:opacity-50 transition-colors ${isDarkMode ? 'bg-gray-200 text-gray-900 placeholder-gray-500' : 'bg-gray-50 text-gray-900'}`}
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          />
        )}

        {mode === 'reset' && (
          <>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                required
                className={`w-full p-3 pr-10 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${isDarkMode ? 'bg-gray-200 text-gray-900 placeholder-gray-500' : 'bg-gray-50 text-gray-900'}`}
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm New Password"
                required
                className={`w-full p-3 pr-10 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${isDarkMode ? 'bg-gray-200 text-gray-900 placeholder-gray-500' : 'bg-gray-50 text-gray-900'}`}
                value={formData.confirmNewPassword}
                onChange={(e) => setFormData({ ...formData, confirmNewPassword: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </>
        )}

        {error && <p className="text-red-500 text-xs text-center">{error}</p>}
        {message && <p className="text-blue-600 dark:text-blue-400 text-xs text-center">{message}</p>}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 transition-all"
        >
          {mode === 'login' ? 'Login' : mode === 'signup' ? 'Sign Up' : mode === 'forgot' ? 'Send Code' : mode === 'verify' ? 'Verify Code' : mode === 'signup-verify' ? 'Verify & Sign Up' : 'Reset Password'}
        </button>

        {mode === 'login' && (
          <button
            type="button"
            onClick={() => setMode('forgot')}
            className="w-full text-center text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
          >
            Forgot Password?
          </button>
        )}

        {(mode === 'forgot' || mode === 'verify' || mode === 'reset' || mode === 'signup-verify') && (
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setMessage(''); }}
            className="w-full text-center text-xs text-gray-400 dark:text-gray-500 font-medium hover:underline"
          >
            Back to Login
          </button>
        )}
      </form>
    </div>
  );
}

const CATEGORY_ICONS: Record<string, string> = {
  'Welding': '/category-defaults/welding.png',
  'Others': '/category-defaults/others.png',
  'Plumber': '/category-defaults/plumber.png',
  'Electrical related': '/category-defaults/electrical-related.png',
  'Painting': '/category-defaults/painting.png',
  'Construction': '/category-defaults/construction.png',
  'Cleaning': '/category-defaults/cleaning.png',
  'Carpentering': '/category-defaults/carpentering.png',
  'Planting': '/category-defaults/planting.png',
  'Roof Cleaning': '/category-defaults/roof-cleaning.png',
  'Air Conditioner': '/category-defaults/air-conditioner.png',
  'Locksmith': '/category-defaults/locksmith.png',
  'Tailoring': '/category-defaults/tailoring.png',
};

const TIMES = [
  "12:00 AM", "12:30 AM", "1:00 AM", "1:30 AM", "2:00 AM", "2:30 AM", "3:00 AM", "3:30 AM",
  "4:00 AM", "4:30 AM", "5:00 AM", "5:30 AM", "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM",
  "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
  "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM",
  "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM"
];

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const compressImage = (base64Str: string, targetSize = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > targetSize) {
          height *= targetSize / width;
          width = targetSize;
        }
      } else {
        if (height > targetSize) {
          width *= targetSize / height;
          height = targetSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
};

function WelcomeOverlay({ isDarkMode, onClose }: { isDarkMode: boolean, onClose: () => void }) {
  const sections = [
    {
      icon: <Wrench className="text-blue-500" size={32} />,
      title: "What is JomPro?",
      subtitle: "Expert On-Site Help",
      desc: "A professional technician visits your home to provide expert repairs"
    },
    {
      icon: <Shield className="text-emerald-500" size={32} />,
      title: "Why use it?",
      subtitle: "Professional Quality",
      desc: "Access vetted experts and guaranteed high-quality service results"
    },
    {
      icon: <Clock className="text-amber-500" size={32} />,
      title: "What problem does it solve?",
      subtitle: "No More Waiting",
      desc: "Eliminate unreliable contractors"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} w-full max-w-sm rounded-3xl p-8 border shadow-2xl space-y-8 relative`}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10"
        >
          <X size={20} />
        </button>
        <div className="text-center space-y-2">
          <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Welcome to JomPro</h2>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Your local service companion</p>
        </div>

        <div className="space-y-6">
          {sections.map((s, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-3 rounded-2xl`}>
                {s.icon}
              </div>
              <div className="space-y-1">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{s.title}</h3>
                <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{s.subtitle}</p>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} leading-relaxed`}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
        >
          Get Started
        </button>
      </motion.div>
    </motion.div>
  );
}

function PhoneInput({ 
  value, 
  onChange, 
  countryCode, 
  setCountryCode, 
  isDarkMode, 
  placeholder = "012-3456789/0123456789" 
}: { 
  value: string, 
  onChange: (val: string) => void, 
  countryCode: string, 
  setCountryCode: (val: string) => void, 
  isDarkMode: boolean,
  placeholder?: string
}) {
  const COUNTRY_CODES = [
    { code: '60', name: 'Malaysia' },
    { code: '65', name: 'Singapore' },
    { code: '62', name: 'Indonesia' },
    { code: '66', name: 'Thailand' },
    { code: '63', name: 'Philippines' },
    { code: '84', name: 'Vietnam' },
    { code: '91', name: 'India' },
    { code: '1', name: 'USA/Canada' },
    { code: '44', name: 'UK' },
    { code: '86', name: 'China' },
  ];

  return (
    <div className="flex gap-2">
      <div className="relative w-20">
        <select
          className={`w-full p-3 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-500 appearance-none transition-colors ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'}`}
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
        >
          {COUNTRY_CODES.map(c => (
            <option key={c.code} value={c.code}>+{c.code}</option>
          ))}
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <ChevronRight size={12} className="rotate-90" />
        </div>
      </div>
      <input
        type="tel"
        placeholder={placeholder}
        required
        className={`flex-1 p-3 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${isDarkMode ? 'bg-gray-800 text-white placeholder-gray-500' : 'bg-gray-50 text-gray-900'}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function NewServiceModal({ user, serviceToEdit, onClose, onSuccess, isDarkMode }: { user: UserProfile | null, serviceToEdit?: Service | null, onClose: () => void, onSuccess: (isNew: boolean) => void, isDarkMode: boolean }) {
  const isAdmin = user?.email === 'servicecalladmin@gmail.com' || user?.email === 'viknes1985@gmail.com' || user?.email === 'jomproadmin@gmail.com';
  
  const [formData, setFormData] = useState({
    state: serviceToEdit?.state || '',
    town: serviceToEdit?.town || '',
    category: serviceToEdit?.category || '',
    providerName: serviceToEdit?.providerName || '',
    description: serviceToEdit?.description || '',
    contactNumber: '',
    type: serviceToEdit?.type || (isAdmin ? 'Admin' : 'Provider')
  });
  const [countryCode, setCountryCode] = useState('60');

  useEffect(() => {
    if (serviceToEdit) {
      let contact = serviceToEdit.contactNumber;
      if (contact.startsWith('+')) {
        const codes = ['60', '65', '62', '66', '63', '84', '91', '1', '44', '86'];
        for (const code of codes) {
          if (contact.startsWith(`+${code}`)) {
            setCountryCode(code);
            setFormData(prev => ({ ...prev, contactNumber: contact.substring(code.length + 1) }));
            return;
          }
        }
      }
      setFormData(prev => ({ ...prev, contactNumber: contact }));
    }
  }, [serviceToEdit]);
  
  const [photoUrls, setPhotoUrls] = useState<string[]>(serviceToEdit?.photoUrls || []);
  const [timeFrom, setTimeFrom] = useState('9:00 AM');
  const [timeTo, setTimeTo] = useState('6:00 PM');
  const [selectedDays, setSelectedDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (serviceToEdit?.operatingHours) {
      const match = serviceToEdit.operatingHours.match(/(.*) - (.*) \((.*)\)/);
      if (match) {
        setTimeFrom(match[1]);
        setTimeTo(match[2]);
        setSelectedDays(match[3].split(', '));
      }
    }
  }, [serviceToEdit]);

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      >
        <div className={`${isDarkMode ? 'bg-gray-900' : 'bg-white'} p-6 rounded-2xl w-full max-w-sm text-center space-y-4 transition-colors`}>
          <div className={`${isDarkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-600'} p-3 rounded-full w-fit mx-auto`}>
            <LogIn size={24} />
          </div>
          <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Login Required</h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm`}>Please login to your account to register a new service.</p>
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-2 rounded-xl font-bold"
          >
            Got it
          </button>
        </div>
      </motion.div>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (photoUrls.length + files.length > 4) {
      setError('You can only upload up to 4 photos');
      return;
    }

    setIsCompressing(true);
    setError('');
    
    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      const compressed = await compressImage(base64);
      newUrls.push(compressed);
    }

    setPhotoUrls(prev => [...prev, ...newUrls]);
    setIsCompressing(false);
  };

  const removePhoto = (index: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const isEveryday = selectedDays.length === 7;
  const toggleEveryday = () => {
    if (isEveryday) {
      setSelectedDays([]);
    } else {
      setSelectedDays(DAYS);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDays.length === 0) {
      setError('Please select at least one day');
      return;
    }

    setIsUploading(true);
    setError('');

    const operatingHours = `${timeFrom} - ${timeTo} (${selectedDays.join(', ')})`;
    const method = serviceToEdit ? 'PUT' : 'POST';
    const url = serviceToEdit ? `/api/services/${serviceToEdit.id}` : '/api/services';
    
    try {
      // Combine country code and phone number
      let phone = formData.contactNumber.replace(/\D/g, '');
      if (phone.startsWith('0')) {
        phone = phone.substring(1);
      }
      const combinedPhone = `+${countryCode}${phone}`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData, 
          contactNumber: combinedPhone,
          operatingHours, 
          photoUrls, 
          createdBy: String(user.id) 
        })
      });
      
      const data = await res.json();

      if (res.ok) {
        setIsUploading(false);
        setShowSuccess(true);
        setTimeout(() => {
          onSuccess(!serviceToEdit);
        }, 2000);
      } else {
        setIsUploading(false);
        setError(data.error || 'Failed to save service');
      }
    } catch (err) {
      setIsUploading(false);
      setError('Network error: Could not reach server');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto transition-colors"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{serviceToEdit ? 'Edit Service' : 'Register New Service'}</h2>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <X size={20} className={isDarkMode ? 'text-white' : 'text-gray-500'} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Service Type</label>
              <div className="flex gap-2">
                {(isAdmin ? ['Provider', 'Referral', 'Admin'] : ['Provider', 'Referral']).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: t as any })}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                      formData.type === t
                        ? 'bg-blue-600 text-white shadow-md'
                        : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">State</label>
              <select
                required
                className={`w-full p-3 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${isDarkMode ? 'bg-gray-200 text-gray-900' : 'bg-gray-50 text-gray-900'}`}
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value, town: '' })}
              >
                <option value="">Select State</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Town</label>
              <select
                required
                className={`w-full p-3 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${isDarkMode ? 'bg-gray-200 text-gray-900' : 'bg-gray-50 text-gray-900'}`}
                value={formData.town}
                onChange={e => setFormData({ ...formData, town: e.target.value })}
                disabled={!formData.state}
              >
                <option value="">Select Town</option>
                {formData.state && MALAYSIA_STATES[formData.state].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Category</label>
            <select
              required
              className={`w-full p-3 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${isDarkMode ? 'bg-gray-200 text-gray-900' : 'bg-gray-50 text-gray-900'}`}
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="">Select Category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Provider Name</label>
            <input
              type="text"
              required
              placeholder="Company or Personal Name"
              className={`w-full p-3 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${isDarkMode ? 'bg-gray-200 text-gray-900 placeholder-gray-500' : 'bg-gray-50 text-gray-900'}`}
              value={formData.providerName}
              onChange={e => setFormData({ ...formData, providerName: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
            <textarea
              required
              maxLength={500}
              placeholder="Describe your services (max 500 characters)"
              className={`w-full p-3 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 min-h-[100px] resize-none transition-colors ${isDarkMode ? 'bg-gray-200 text-gray-900 placeholder-gray-500' : 'bg-gray-50 text-gray-900'}`}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
            <div className="text-[10px] text-right text-gray-400">
              {formData.description.length}/500
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Contact Number</label>
            <PhoneInput
              value={formData.contactNumber}
              onChange={(val) => setFormData({ ...formData, contactNumber: val })}
              countryCode={countryCode}
              setCountryCode={setCountryCode}
              isDarkMode={isDarkMode}
            />
            <p className="text-[10px] text-gray-400 px-1">e.g. 012-3456789 / 0123456789</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Operating Hours</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400">From</span>
                <select
                  className={`w-full p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${isDarkMode ? 'bg-gray-200 text-gray-900' : 'bg-gray-50 text-gray-900'}`}
                  value={timeFrom}
                  onChange={e => setTimeFrom(e.target.value)}
                >
                  {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400">To</span>
                <select
                  className={`w-full p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${isDarkMode ? 'bg-gray-200 text-gray-900' : 'bg-gray-50 text-gray-900'}`}
                  value={timeTo}
                  onChange={e => setTimeTo(e.target.value)}
                >
                  {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Days Available</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEveryday}
                    onChange={toggleEveryday}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-xs font-medium text-gray-600">Everyday</span>
                </label>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {DAYS.map(day => (
                  <label
                    key={day}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                      selectedDays.includes(day)
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDays.includes(day)}
                      onChange={() => toggleDay(day)}
                      className="w-3 h-3 accent-blue-600"
                    />
                    <span className="text-[10px] font-bold">{day}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Photos (Max 4)</label>
            <div className="grid grid-cols-4 gap-2">
              {photoUrls.map((url, idx) => (
                <div key={idx} className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden group">
                  <img src={url} className="w-full h-full object-cover" alt="" />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {photoUrls.length < 4 && (
                <label className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 transition-colors">
                  <Plus size={20} />
                  <span className="text-[8px] font-bold uppercase mt-1">Add</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isCompressing}
                  />
                </label>
              )}
            </div>
            {isCompressing && <p className="text-[10px] text-blue-600 animate-pulse">Compressing photos...</p>}
          </div>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          {showSuccess && <p className="text-blue-600 text-xs text-center font-bold">Service successfully added to the system</p>}

          <button
            type="submit"
            disabled={isUploading || showSuccess}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 mt-4 disabled:opacity-50"
          >
            {isUploading ? 'Uploading to server...' : 'Save Service'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

const formatPhoneForDisplay = (phone: string) => {
  if (!phone) return '';
  let clean = phone.replace(/[-\s]/g, '');
  if (clean.startsWith('+')) {
    const codes = ['60', '65', '62', '66', '63', '84', '91', '1', '44', '86'];
    for (const code of codes) {
      if (clean.startsWith(`+${code}`)) {
        clean = clean.substring(code.length + 1);
        break;
      }
    }
  }
  if (!clean.startsWith('0')) {
    clean = '0' + clean;
  }
  return clean;
};

function ServiceDetailModal({ service, user, onClose, onRate }: { service: Service, user: UserProfile | null, onClose: () => void, onRate: (rating: number, comment?: string) => Promise<void> | void }) {
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);
  const [rating, setRating] = useState(service.userRating || 0);
  const [comment, setComment] = useState('');
  const [hasChanged, setHasChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    // Find user's existing comment if any
    if (service.allRatings && user) {
      const userRating = service.allRatings.find(r => r.userId === user.id);
      if (userRating) {
        setComment(userRating.comment || '');
      }
    }
  }, [service, user]);
  
  const uploadedPhotos = service.photoUrls && service.photoUrls.length > 0 ? service.photoUrls : [];
  const formattedCategory = (service.category || 'others').toLowerCase().replace(/\s+/g, '-');
  const defaultPhotoPath = `/category-defaults/${formattedCategory}.png`;
  const photos = uploadedPhotos.length > 0 ? uploadedPhotos : [defaultPhotoPath];

  const handleClose = () => {
    if (hasChanged) {
      if (window.confirm("Do you want to save your rating before closing?")) {
        onRate(rating, comment);
      }
    }
    onClose();
  };

  const handleRate = (val: number) => {
    setRating(val);
    setHasChanged(true);
    setShowSuccess(false);
  };

  const handleSaveRating = async () => {
    if (rating > 0 && !comment.trim()) {
      alert("Please provide a short comment before saving your rating.");
      return;
    }
    if (comment.split(/\s+/).length > 20) {
      alert("Comment must be under 20 words.");
      return;
    }
    setIsSaving(true);
    await onRate(rating, comment);
    setIsSaving(false);
    setHasChanged(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const nextPhoto = () => {
    if (photos.length > 1) {
      setCurrentPhotoIdx((prev) => (prev + 1) % photos.length);
    }
  };

  const prevPhoto = () => {
    if (photos.length > 1) {
      setCurrentPhotoIdx((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto transition-colors"
      >
        <div className="relative h-64 bg-gray-100 dark:bg-gray-900 group flex-shrink-0 transition-colors">
          {photos.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.img
                key={currentPhotoIdx}
                src={photos[currentPhotoIdx]}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full object-cover"
                alt=""
              />
            </AnimatePresence>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <img 
                src={service.photoUrls?.[0] || '/category-defaults/others.png'} 
                alt={service.providerName} 
                className="w-full h-full object-cover" 
              />
            </div>
          )}

          {photos.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/50 dark:bg-black/50 hover:bg-white/80 dark:hover:bg-black/80 rounded-full text-gray-800 dark:text-white transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/50 dark:bg-black/50 hover:bg-white/80 dark:hover:bg-black/80 rounded-full text-gray-800 dark:text-white transition-colors"
              >
                <ChevronRight size={20} />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {photos.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPhotoIdx(idx)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      idx === currentPhotoIdx ? 'bg-blue-600 w-4' : 'bg-white/60'
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-full text-gray-800 dark:text-white shadow-sm transition-colors"
          >
            <X size={20} />
          </button>
          <div className="absolute bottom-4 left-4">
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
              {service.category}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{service.providerName}</h2>
              <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 mt-1">
                <MapPin size={14} />
                <span className="text-sm">{service.town}, {service.state}</span>
              </div>
            </div>
            {service.ratingCount > 0 && (
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <Star size={16} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-lg font-bold dark:text-white">{(service.avgRating || 0).toFixed(1)}</span>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">{service.ratingCount} ratings</span>
              </div>
            )}
          </div>

          {user && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl space-y-3 transition-colors">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                  {service.userRating ? 'Your Rating' : 'Rate this service'}
                </h3>
              </div>
              
              {service.userRating ? (
                <div className="text-center space-y-2 py-2">
                  <div className="flex gap-2 justify-center">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <Star 
                        key={val}
                        size={32} 
                        className={`${val <= service.userRating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} 
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">You have already rated this service.</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 justify-center">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        onClick={() => handleRate(val)}
                        className="transition-transform active:scale-90"
                      >
                        <Star 
                          size={32} 
                          className={`${val <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} 
                        />
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <textarea
                        placeholder="What do you think about this service? (Max 20 words)"
                        className={`w-full p-3 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 min-h-[60px] resize-none transition-colors ${isDarkMode ? 'bg-gray-800 text-white placeholder-gray-500' : 'bg-white text-gray-900 shadow-inner'}`}
                        value={comment}
                        onChange={(e) => {
                          setComment(e.target.value);
                          setHasChanged(true);
                        }}
                      />
                      <div className="flex justify-between items-center px-1">
                        <span className={`text-[9px] ${comment.split(/\s+/).filter(Boolean).length > 20 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                          {comment.split(/\s+/).filter(Boolean).length}/20 words
                        </span>
                        <button 
                          onClick={handleSaveRating}
                          disabled={isSaving || !comment.trim() || comment.split(/\s+/).filter(Boolean).length > 20}
                          className="text-[10px] bg-blue-600 text-white px-3 py-1 rounded-full font-bold disabled:opacity-50 shadow-sm"
                        >
                          {isSaving ? 'Saving...' : 'Save rating'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {showSuccess && (
                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold text-center mt-2">
                  Rating successfully captured. Thanks.
                </p>
              )}
            </div>
          )}

          {service.description && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {service.description}
              </p>
            </div>
          )}

          {/* User Reviews Section */}
          {service.allRatings && service.allRatings.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">User Reviews</h3>
              <div className="space-y-3">
                {service.allRatings.filter(r => !r.isHidden && r.comment).map((r) => (
                  <div key={r.id} className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{r.raterName}</span>
                      <div className="flex items-center gap-0.5">
                        <Star size={8} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-[10px] font-bold dark:text-white">{r.rating}</span>
                      </div>
                    </div>
                    <p className={`text-xs italic ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>"{r.comment}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl space-y-1 transition-colors">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Clock size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Hours</span>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-white">{service.operatingHours}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl space-y-1 transition-colors">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Phone size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Contact</span>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-white">{formatPhoneForDisplay(service.contactNumber)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <a
              href={`tel:${service.contactNumber}`}
              className="bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 transition-transform text-sm"
            >
              <Phone size={18} />
              Call
            </a>
            <a
              href={`https://wa.me/${service.contactNumber.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200 dark:shadow-none active:scale-95 transition-transform text-sm"
            >
              <PhoneCall size={18} />
              Whatsapp
            </a>
          </div>

          <div className="pt-4 flex flex-col items-center gap-1 opacity-50">
            <p className="text-[8px] text-gray-400 dark:text-gray-500 font-medium">Created: {new Date(service.createdAt).toLocaleDateString()}</p>
            {service.updatedAt && (
              <p className="text-[8px] text-gray-400 dark:text-gray-500 font-medium">Modified: {new Date(service.updatedAt).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ChangePasswordModal({ userId, isDarkMode, onClose }: { userId: string, isDarkMode: boolean, onClose: () => void }) {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(onClose, 2000);
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} w-full max-w-sm rounded-3xl p-6 space-y-6 shadow-2xl relative`}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
          <X size={20} />
        </button>
        
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">Change Password</h2>
          <p className="text-xs text-gray-500">Enter your current password and a new one.</p>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="bg-green-100 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <Check size={32} />
            </div>
            <p className="text-green-600 font-bold">Password updated successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Old Password</label>
              <div className="relative">
                <input
                  type={showOldPassword ? "text" : "password"}
                  required
                  className={`w-full p-3 pr-10 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-900'}`}
                  value={formData.oldPassword}
                  onChange={e => setFormData({ ...formData, oldPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  className={`w-full p-3 pr-10 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-900'}`}
                  value={formData.newPassword}
                  onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className={`w-full p-3 pr-10 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-900'}`}
                  value={formData.confirmPassword}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p className="text-red-500 text-xs text-center font-medium">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

function LoginPromptOverlay({ onClose, onLogin }: { onClose: () => void, onLogin: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl p-6 space-y-6 shadow-2xl text-center"
      >
        <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
          <LogIn size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Login Required</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Please login to register your service and access more features.</p>
        </div>
        <button
          onClick={onLogin}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform"
        >
          Got it
        </button>
      </motion.div>
    </motion.div>
  );
}

function PostRegistrationGuide({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl p-6 space-y-6 shadow-2xl relative overflow-hidden transition-colors"
      >
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10"
        >
          <X size={20} />
        </button>
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
        
        <div className="text-center space-y-2">
          <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 mb-2">
            <Check size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Service Registered!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Your added service notified our admin for approval. Please wait for the approval.</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">What's Next?</h3>
          
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-2xl transition-colors">
              <div className="bg-blue-600 text-white p-2 rounded-xl shrink-0">
                <Shield size={16} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-white">Status of Register</h4>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Check if your service is Pending, Approved, or Rejected in your profile.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-2xl transition-colors">
              <div className="bg-amber-500 text-white p-2 rounded-xl shrink-0">
                <Clock size={16} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-white">Nudge Function</h4>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">If approval takes more than 3 days, use the Nudge button to remind the admin. This button appears automatically after 3 days.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-2xl transition-colors">
              <div className="bg-blue-500 text-white p-2 rounded-xl shrink-0">
                <Plus size={16} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-white">Edit and Resubmit</h4>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Need to change details? Edit anytime. If rejected, fix and resubmit!</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-2xl transition-colors">
              <div className="bg-red-500 text-white p-2 rounded-xl shrink-0">
                <Trash2 size={16} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-white">Delete Function</h4>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">No longer providing the service? Delete it permanently from your profile.</p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform"
        >
          Got it, thanks!
        </button>
      </motion.div>
    </motion.div>
  );
}

function GuestFindGuide({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    {
      title: "How to Search?",
      desc: "Type keywords like 'Plumber' or 'Welding' in the search box to find specific services instantly.",
      icon: <Search size={32} />,
      color: "bg-blue-100 text-blue-600"
    },
    {
      title: "Choose State & Town",
      desc: "Narrow down results by selecting your State first, then pick your Town for local providers.",
      icon: <MapPin size={32} />,
      color: "bg-green-100 text-green-600"
    },
    {
      title: "Search by Categories",
      desc: "Browse through our curated categories like Painting, Cleaning, or Electrical to find what you need.",
      icon: <Filter size={32} />,
      color: "bg-purple-100 text-purple-600"
    },
    {
      title: "Rating Range Slider",
      desc: "Use the double-ended slider to filter services by rating. Drag the left handle for minimum stars and the right handle for maximum stars.",
      icon: <Star size={32} />,
      color: "bg-yellow-100 text-yellow-600"
    },
    {
      title: "How to Use Slider?",
      desc: "Slide the handles to set your preferred rating range. Only services within this range will be shown in your search results.",
      icon: <Filter size={32} />,
      color: "bg-blue-100 text-blue-600"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl p-6 space-y-6 shadow-2xl transition-colors relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10"
        >
          <X size={20} />
        </button>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">How to Find Services</h2>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">
            {step + 1} / {steps.length}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center space-y-4 py-4"
          >
            <div className={`${steps[step].color} w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-sm`}>
              {steps[step].icon}
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{steps[step].title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{steps[step].desc}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (step < steps.length - 1) setStep(s => s + 1);
              else onClose();
            }}
            className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-transform active:scale-95"
          >
            {step < steps.length - 1 ? "Next" : "Start Searching"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function UserRatingGuide({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    {
      title: "How to Select Stars?",
      desc: "Found a great service? Tap on the stars (1-5) to give your feedback. 5 stars means excellent!",
      icon: <Star size={32} />,
      color: "bg-yellow-100 text-yellow-600"
    },
    {
      title: "How to Save?",
      desc: "After selecting stars, click the 'Save Now' button that appears to submit your rating.",
      icon: <Check size={32} />,
      color: "bg-green-100 text-green-600"
    },
    {
      title: "What Happens Next?",
      desc: "Your rating will be averaged and shown on the service card, helping others choose the best providers!",
      icon: <Search size={32} />,
      color: "bg-blue-100 text-blue-600"
    },
    {
      title: "Rating Range Slider",
      desc: "On the Find page, you can use the rating slider to filter services. Drag the handles to set the minimum and maximum stars you want to see.",
      icon: <Filter size={32} />,
      color: "bg-amber-100 text-amber-600"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl p-6 space-y-6 shadow-2xl transition-colors relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10"
        >
          <X size={20} />
        </button>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">How to Rate Services</h2>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">
            {step + 1} / {steps.length}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center space-y-4 py-4"
          >
            <div className={`${steps[step].color} w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-sm`}>
              {steps[step].icon}
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{steps[step].title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{steps[step].desc}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (step < steps.length - 1) setStep(s => s + 1);
              else onClose();
            }}
            className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-transform active:scale-95"
          >
            {step < steps.length - 1 ? "Next" : "Got it!"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RatingManagementModal({ service, isDarkMode, onClose, onToggleVisibility }: { service: Service, isDarkMode: boolean, onClose: () => void, onToggleVisibility: (serviceId: string, ratingId: string, isHidden: boolean) => Promise<void> }) {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleToggle = async (ratingId: string, currentHidden: boolean) => {
    setIsUpdating(ratingId);
    await onToggleVisibility(service.id, ratingId, !currentHidden);
    setIsUpdating(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`${isDarkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900'} w-full max-w-lg rounded-3xl p-6 space-y-6 shadow-2xl relative max-h-[80vh] flex flex-col`}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
          <X size={20} />
        </button>
        
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Manage Ratings</h2>
          <p className="text-xs text-gray-500">{service.providerName}</p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {service.allRatings && service.allRatings.length > 0 ? (
            service.allRatings.map((r) => (
              <div key={r.id} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-100'} flex justify-between items-start gap-4`}>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">{r.raterName}</span>
                    <div className="flex items-center gap-0.5">
                      <Star size={10} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-bold">{r.rating}</span>
                    </div>
                    <span className="text-[9px] text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  {r.comment && <p className="text-xs text-gray-500 italic">"{r.comment}"</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${r.isHidden ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {r.isHidden ? 'Hidden' : 'Visible'}
                  </span>
                  <button
                    onClick={() => handleToggle(r.id, r.isHidden)}
                    disabled={isUpdating === r.id}
                    className={`text-[10px] font-bold px-3 py-1 rounded-lg transition-colors ${r.isHidden ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'} disabled:opacity-50`}
                  >
                    {isUpdating === r.id ? '...' : r.isHidden ? 'Un-count' : 'Hide'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400">No ratings yet.</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
