'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Box, Plus, Search, Trash2, Edit2, X, Clock, DollarSign, Loader2, 
  Calendar, Users, ShieldAlert, Check, RefreshCw, ChevronLeft, ChevronRight, 
  List, LayoutGrid, CalendarRange, UserCheck, AlertTriangle, AlertCircle
} from 'lucide-react';
import { 
  upsertService, deleteService, toggleServiceActive,
  upsertResource, deleteResource, saveAvailabilityRules,
  addAvailabilityException, deleteAvailabilityException,
  createBooking, cancelBooking, rescheduleBooking, updateBookingStatus,
  getAvailableSlots, joinQueueAction, callNextInQueueAction, getTodayQueueAction
} from './actions';

interface Service {
  id: string;
  shop_id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  active: boolean;
  buffer_minutes: number;
  requires_resource_type: string;
  deposit_required: boolean;
  deposit_amount: number;
  created_at: string;
}

interface Resource {
  id: string;
  shop_id: string;
  name: string;
  resource_type: string;
  capacity: number;
  active: boolean;
}

interface AvailabilityRule {
  id: string;
  resource_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface AvailabilityException {
  id: string;
  resource_id: string;
  date: string;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
}

interface Booking {
  id: string;
  shop_id: string;
  resource_id: string;
  service_id: string;
  customer_phone: string;
  customer_name: string;
  party_size: number;
  starts_at: string;
  ends_at: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  created_at: string;
  services?: { name: string } | null;
  resources?: { name: string } | null;
}

interface Props {
  shopId: string;
  initialServices: Service[];
  initialResources: Resource[];
  initialAvailabilityRules: AvailabilityRule[];
  initialAvailabilityExceptions: AvailabilityException[];
  initialBookings: Booking[];
}

type Tab = 'services' | 'resources' | 'bookings';

export default function ServicesClient({
  shopId,
  initialServices,
  initialResources,
  initialAvailabilityRules,
  initialAvailabilityExceptions,
  initialBookings
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('services');
  const [services, setServices] = useState<Service[]>(initialServices);
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>(initialAvailabilityRules);
  const [availabilityExceptions, setAvailabilityExceptions] = useState<AvailabilityException[]>(initialAvailabilityExceptions);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);

  // Waitlist States
  const [queueEntries, setQueueEntries] = useState<any[]>([]);
  const [queueResourceFilter, setQueueResourceFilter] = useState<string>('all');
  const [isAddingQueueGuest, setIsAddingQueueGuest] = useState(false);
  const [newQueuePhone, setNewQueuePhone] = useState('');
  const [newQueueName, setNewQueueName] = useState('');
  const [isCallingNext, setIsCallingNext] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  // ─── Service Form Slide-over ───────────────────────────────────────────────
  const [serviceSlideOpen, setServiceSlideOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState('60');
  const [serviceBuffer, setServiceBuffer] = useState('0');
  const [serviceResourceType, setServiceResourceType] = useState('staff');
  const [serviceActive, setServiceActive] = useState(true);
  const [serviceDepositRequired, setServiceDepositRequired] = useState(false);
  const [serviceDepositAmount, setServiceDepositAmount] = useState('0');
  const [serviceError, setServiceError] = useState('');
  const [isSavingService, setIsSavingService] = useState(false);

  // Waitlist Handlers
  const fetchQueue = useCallback(async () => {
    const res = await getTodayQueueAction(shopId, queueResourceFilter === 'all' ? null : queueResourceFilter);
    if (res.success && res.data) {
      setQueueEntries(res.data);
    }
  }, [shopId, queueResourceFilter]);

  useEffect(() => {
    if (activeTab === 'bookings') {
      fetchQueue();
      const interval = setInterval(fetchQueue, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchQueue]);

  const handleCallNext = async () => {
    setIsCallingNext(true);
    const res = await callNextInQueueAction(shopId, queueResourceFilter === 'all' ? null : queueResourceFilter);
    setIsCallingNext(false);
    if (res.success) {
      fetchQueue();
    }
  };

  const handleAddQueueGuest = async () => {
    if (!newQueueName.trim() || !newQueuePhone.trim()) return;
    const res = await joinQueueAction(
      shopId,
      queueResourceFilter === 'all' ? null : queueResourceFilter,
      newQueuePhone.trim(),
      newQueueName.trim()
    );
    if (res.success) {
      setNewQueueName('');
      setNewQueuePhone('');
      setIsAddingQueueGuest(false);
      fetchQueue();
    }
  };

  // ─── Resource Form Dialog/Slide-over ─────────────────────────────────────────
  const [resourceSlideOpen, setResourceSlideOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [resourceName, setResourceName] = useState('');
  const [resourceType, setResourceType] = useState('staff');
  const [resourceCapacity, setResourceCapacity] = useState('1');
  const [resourceActive, setResourceActive] = useState(true);
  const [resourceError, setResourceError] = useState('');
  const [isSavingResource, setIsSavingResource] = useState(false);

  // ─── Resource Availability Editor ───────────────────────────────────────────
  const [selectedResourceForRule, setSelectedResourceForRule] = useState<Resource | null>(null);
  const [ruleSlideOpen, setRuleSlideOpen] = useState(false);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<number, { checked: boolean; start: string; end: string }>>({
    0: { checked: false, start: '09:00', end: '17:00' },
    1: { checked: true, start: '09:00', end: '17:00' },
    2: { checked: true, start: '09:00', end: '17:00' },
    3: { checked: true, start: '09:00', end: '17:00' },
    4: { checked: true, start: '09:00', end: '17:00' },
    5: { checked: true, start: '09:00', end: '17:00' },
    6: { checked: false, start: '09:00', end: '17:00' },
  });
  const [isSavingRules, setIsSavingRules] = useState(false);

  // ─── Resource Exceptions Editor ──────────────────────────────────────────────
  const [exceptionSlideOpen, setExceptionSlideOpen] = useState(false);
  const [selectedResourceForException, setSelectedResourceForException] = useState<Resource | null>(null);
  const [exceptionDate, setExceptionDate] = useState('');
  const [exceptionIsAvailable, setExceptionIsAvailable] = useState(false);
  const [exceptionStart, setExceptionStart] = useState('09:00');
  const [exceptionEnd, setExceptionEnd] = useState('17:00');
  const [exceptionError, setExceptionError] = useState('');
  const [isSavingException, setIsSavingException] = useState(false);

  // ─── Bookings Calendar view states ───────────────────────────────────────────
  const [calendarDate, setCalendarDate] = useState(new Date().toISOString().split('T')[0]);
  const [calendarView, setCalendarView] = useState<'grid' | 'list'>('grid');
  
  // Booking creation modal
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedResourceForBooking, setSelectedResourceForBooking] = useState<Resource | null>(null);
  const [bookingTime, setBookingTime] = useState('');
  const [bookingCustomerName, setBookingCustomerName] = useState('');
  const [bookingCustomerPhone, setBookingCustomerPhone] = useState('');
  const [bookingServiceId, setBookingServiceId] = useState('');
  const [bookingPartySize, setBookingPartySize] = useState('1');
  const [bookingError, setBookingError] = useState('');
  const [isSavingBooking, setIsSavingBooking] = useState(false);

  // Booking detail view modal
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');

  // Auto-fill form details for Reschedule
  useEffect(() => {
    if (detailBooking) {
      const dt = new Date(detailBooking.starts_at);
      setRescheduleDate(detailBooking.starts_at.split('T')[0]);
      const hours = dt.getHours().toString().padStart(2, '0');
      const mins = dt.getMinutes().toString().padStart(2, '0');
      setRescheduleTime(`${hours}:${mins}`);
      setRescheduleError('');
    }
  }, [detailBooking]);

  // Load rules when editing rules slideover opens
  useEffect(() => {
    if (selectedResourceForRule) {
      const resourceRules = availabilityRules.filter(r => r.resource_id === selectedResourceForRule.id);
      const scheduleCopy: Record<number, { checked: boolean; start: string; end: string }> = {
        0: { checked: false, start: '09:00', end: '17:00' },
        1: { checked: false, start: '09:00', end: '17:00' },
        2: { checked: false, start: '09:00', end: '17:00' },
        3: { checked: false, start: '09:00', end: '17:00' },
        4: { checked: false, start: '09:00', end: '17:00' },
        5: { checked: false, start: '09:00', end: '17:00' },
        6: { checked: false, start: '09:00', end: '17:00' },
      };
      
      resourceRules.forEach(r => {
        scheduleCopy[r.day_of_week as number] = {
          checked: true,
          start: r.start_time.substring(0, 5),
          end: r.end_time.substring(0, 5)
        };
      });
      setWeeklySchedule(scheduleCopy);
    }
  }, [selectedResourceForRule, availabilityRules]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  // Service CRUD
  const openAddService = () => {
    setEditingService(null);
    setServiceName('');
    setServiceDescription('');
    setServicePrice('');
    setServiceDuration('60');
    setServiceBuffer('0');
    setServiceResourceType('staff');
    setServiceActive(true);
    setServiceDepositRequired(false);
    setServiceDepositAmount('0');
    setServiceError('');
    setServiceSlideOpen(true);
  };

  const openEditService = (service: Service) => {
    setEditingService(service);
    setServiceName(service.name);
    setServiceDescription(service.description || '');
    setServicePrice(service.price.toString());
    setServiceDuration(service.duration_minutes.toString());
    setServiceBuffer((service.buffer_minutes || 0).toString());
    setServiceResourceType(service.requires_resource_type || 'staff');
    setServiceActive(service.active);
    setServiceDepositRequired(service.deposit_required || false);
    setServiceDepositAmount((service.deposit_amount || 0).toString());
    setServiceError('');
    setServiceSlideOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) return setServiceError('Service name is required.');
    if (!servicePrice.trim() || isNaN(Number(servicePrice))) return setServiceError('Valid price is required.');
    
    setIsSavingService(true);
    setServiceError('');

    const res = await upsertService(shopId, {
      id: editingService?.id,
      name: serviceName,
      description: serviceDescription,
      price: Number(servicePrice),
      duration_minutes: Number(serviceDuration),
      buffer_minutes: Number(serviceBuffer),
      requires_resource_type: serviceResourceType,
      active: serviceActive,
      deposit_required: serviceDepositRequired,
      deposit_amount: Number(serviceDepositAmount),
    });

    setIsSavingService(false);
    if (res.success && res.data) {
      const saved = res.data as Service;
      if (editingService) {
        setServices(prev => prev.map(s => s.id === saved.id ? saved : s));
      } else {
        setServices(prev => [saved, ...prev]);
      }
      setServiceSlideOpen(false);
    } else {
      setServiceError(res.error || 'Failed to save service.');
    }
  };

  const handleDeleteService = (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    startTransition(async () => {
      const res = await deleteService(shopId, id);
      if (res.success) {
        setServices(prev => prev.filter(s => s.id !== id));
      } else {
        alert(res.error || 'Failed to delete service.');
      }
    });
  };

  const handleToggleServiceActive = (id: string, currentActive: boolean) => {
    startTransition(async () => {
      const nextActive = !currentActive;
      const res = await toggleServiceActive(shopId, id, nextActive);
      if (res.success) {
        setServices(prev => prev.map(s => s.id === id ? { ...s, active: nextActive } : s));
      } else {
        alert(res.error || 'Failed to toggle status.');
      }
    });
  };

  // Resource CRUD
  const openAddResource = () => {
    setEditingResource(null);
    setResourceName('');
    setResourceType('staff');
    setResourceCapacity('1');
    setResourceActive(true);
    setResourceError('');
    setResourceSlideOpen(true);
  };

  const openEditResource = (res: Resource) => {
    setEditingResource(res);
    setResourceName(res.name);
    setResourceType(res.resource_type);
    setResourceCapacity(res.capacity.toString());
    setResourceActive(res.active);
    setResourceError('');
    setResourceSlideOpen(true);
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceName.trim()) return setResourceError('Resource name is required.');
    
    setIsSavingResource(true);
    setResourceError('');

    const res = await upsertResource(shopId, {
      id: editingResource?.id,
      name: resourceName,
      resource_type: resourceType,
      capacity: Number(resourceCapacity),
      active: resourceActive
    });

    setIsSavingResource(false);
    if (res.success && res.data) {
      const saved = res.data as Resource;
      if (editingResource) {
        setResources(prev => prev.map(r => r.id === saved.id ? saved : r));
      } else {
        setResources(prev => [...prev, saved]);
      }
      setResourceSlideOpen(false);
    } else {
      setResourceError(res.error || 'Failed to save resource.');
    }
  };

  const handleDeleteResource = (id: string) => {
    if (!confirm('Are you sure you want to delete this resource? All schedule rules, exception overrides, and historical bookings associated with it will also be deleted.')) return;
    startTransition(async () => {
      const res = await deleteResource(shopId, id);
      if (res.success) {
        setResources(prev => prev.filter(r => r.id !== id));
      } else {
        alert(res.error || 'Failed to delete resource.');
      }
    });
  };

  // Availability Weekly Rules
  const handleSaveRules = async () => {
    if (!selectedResourceForRule) return;
    
    setIsSavingRules(true);
    const rulesToSave = Object.entries(weeklySchedule)
      .filter(([_, data]) => data.checked)
      .map(([day, data]) => ({
        day_of_week: Number(day),
        start_time: `${data.start}:00`,
        end_time: `${data.end}:00`
      }));

    const res = await saveAvailabilityRules(selectedResourceForRule.id, rulesToSave);
    setIsSavingRules(false);
    
    if (res.success) {
      // Re-fetch all rules (since rules has been deleted/reinserted)
      // For simplicity, let's update state manually
      const newRules = rulesToSave.map(r => ({
        id: Math.random().toString(), // temp id, revalidates on reload anyway
        resource_id: selectedResourceForRule.id,
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time
      }));

      setAvailabilityRules(prev => [
        ...prev.filter(r => r.resource_id !== selectedResourceForRule.id),
        ...newRules
      ]);
      setRuleSlideOpen(false);
    } else {
      alert(res.error || 'Failed to save rules');
    }
  };

  // Exceptions management
  const handleAddException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResourceForException) return;
    if (!exceptionDate) return setExceptionError('Please select a date.');

    setIsSavingException(true);
    setExceptionError('');

    const res = await addAvailabilityException(selectedResourceForException.id, {
      date: exceptionDate,
      is_available: exceptionIsAvailable,
      start_time: exceptionIsAvailable ? `${exceptionStart}:00` : undefined,
      end_time: exceptionIsAvailable ? `${exceptionEnd}:00` : undefined
    });

    setIsSavingException(false);
    if (res.success && res.data) {
      const saved = res.data as AvailabilityException;
      setAvailabilityExceptions(prev => [
        ...prev.filter(x => !(x.resource_id === selectedResourceForException.id && x.date === exceptionDate)),
        saved
      ]);
      setExceptionDate('');
    } else {
      setExceptionError(res.error || 'Failed to save exception override.');
    }
  };

  const handleDeleteException = async (id: string) => {
    const res = await deleteAvailabilityException(id);
    if (res.success) {
      setAvailabilityExceptions(prev => prev.filter(x => x.id !== id));
    } else {
      alert(res.error || 'Failed to delete exception.');
    }
  };

  // Manual bookings creation
  const handleManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResourceForBooking) return;
    if (!bookingCustomerName.trim()) return setBookingError('Customer name is required.');
    if (!bookingCustomerPhone.trim()) return setBookingError('Customer phone is required.');
    if (!bookingServiceId) return setBookingError('Please select a service.');
    if (!bookingTime) return setBookingError('Please select a slot.');

    setIsSavingBooking(true);
    setBookingError('');

    // Combine calendarDate + bookingTime into ISO start string
    const startsAt = new Date(`${calendarDate}T${bookingTime}:00+06:00`).toISOString();

    const res = await createBooking(shopId, {
      resource_id: selectedResourceForBooking.id,
      service_id: bookingServiceId,
      customer_phone: bookingCustomerPhone,
      customer_name: bookingCustomerName,
      party_size: Number(bookingPartySize),
      starts_at: startsAt
    });

    setIsSavingBooking(false);
    if (res.success && res.data) {
      const saved = res.data as Booking;
      // Inject services & resources labels
      const sName = services.find(s => s.id === saved.service_id)?.name || 'Service';
      const rName = resources.find(r => r.id === saved.resource_id)?.name || 'Resource';
      
      const hydrated: Booking = {
        ...saved,
        services: { name: sName },
        resources: { name: rName }
      };

      setBookings(prev => [...prev, hydrated]);
      setBookingModalOpen(false);
      setBookingCustomerName('');
      setBookingCustomerPhone('');
      setBookingTime('');
    } else {
      setBookingError(res.error || 'Failed to create booking.');
    }
  };

  // Booking details actions
  const handleCancelBooking = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking? This will clear the slot for other bookings.')) return;
    const res = await cancelBooking(shopId, id);
    if (res.success) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' as const } : b));
      setDetailBooking(null);
    } else {
      alert(res.error || 'Failed to cancel booking.');
    }
  };

  const handleRescheduleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailBooking) return;
    if (!rescheduleDate || !rescheduleTime) return setRescheduleError('Please set date and time.');

    setIsRescheduling(true);
    setRescheduleError('');

    const newStart = new Date(`${rescheduleDate}T${rescheduleTime}:00+06:00`).toISOString();
    const res = await rescheduleBooking(shopId, detailBooking.id, newStart);
    setIsRescheduling(false);

    if (res.success) {
      // Re-fetch service to calculate duration offset correctly
      const service = services.find(s => s.id === detailBooking.service_id);
      const duration = (service?.duration_minutes || 60) + (service?.buffer_minutes || 0);
      const endsAt = new Date(new Date(newStart).getTime() + duration * 60 * 1000).toISOString();

      setBookings(prev => prev.map(b => b.id === detailBooking.id ? { 
        ...b, 
        starts_at: newStart, 
        ends_at: endsAt,
        status: 'confirmed' as const // auto-confirm on manual reschedule
      } : b));
      setDetailBooking(null);
    } else {
      setRescheduleError(res.error || 'Failed to reschedule booking.');
    }
  };

  const handleStatusChange = async (id: string, status: 'completed' | 'no_show') => {
    const res = await updateBookingStatus(shopId, id, status);
    if (res.success) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
      setDetailBooking(null);
    } else {
      alert(res.error || 'Failed to update status.');
    }
  };

  // ─── Calendar calculations ────────────────────────────────────────────────

  // Filter confirmed bookings for current calendarDate
  const dayStart = `${calendarDate}T00:00:00+06:00`;
  const dayEnd = `${calendarDate}T23:59:59+06:00`;
  const todaysBookings = bookings.filter(b => {
    return b.status === 'confirmed' && 
           b.starts_at >= new Date(dayStart).toISOString() && 
           b.starts_at <= new Date(dayEnd).toISOString();
  });

  // Calculate layout percentage position for calendar block
  const getBookingLayout = (startIso: string, endIso: string) => {
    const start = new Date(startIso);
    const end = new Date(endIso);
    
    // Day starts at 08:00 (480 mins) and ends at 22:00 (1320 mins)
    const dayStartMin = 8 * 60;
    const totalDayMin = 14 * 60; // 14 hours total duration

    // Convert booking to local time minutes
    const startMin = start.getHours() * 60 + start.getMinutes();
    const endMin = end.getHours() * 60 + end.getMinutes();

    const topOffsetMin = Math.max(0, startMin - dayStartMin);
    const durationMin = Math.max(30, endMin - startMin);

    const topPct = (topOffsetMin / totalDayMin) * 100;
    const heightPct = (durationMin / totalDayMin) * 100;

    return {
      top: `${topPct}%`,
      height: `${heightPct}%`,
      minHeight: '28px'
    };
  };

  // Navigate calendar days
  const handlePrevDay = () => {
    const d = new Date(calendarDate);
    d.setDate(d.getDate() - 1);
    setCalendarDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(calendarDate);
    d.setDate(d.getDate() + 1);
    setCalendarDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setCalendarDate(new Date().toISOString().split('T')[0]);
  };

  // Format date readable
  const getFormattedDateLabel = () => {
    const d = new Date(calendarDate);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Render availability indicators
  const getDayName = (dayNum: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum];
  };

  // ─── Filter variables ─────────────────────────────────────────────────────
  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredResources = resources.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-[1200px] mx-auto py-8 px-4 sm:px-6 lg:px-8 relative min-h-screen select-none">
      
      {/* HEADER SECTION */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex justify-between items-start flex-wrap gap-4"
      >
        <div>
          <h1 className="text-4xl font-serif text-ink tracking-tight mb-2">Service Setup & Scheduling</h1>
          <p className="text-ash text-sm">
            Manage your service list, bookable staff/resources, and availability calendar.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-fog p-1 rounded-lg border border-dove/20">
          {(['services', 'resources', 'bookings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearchQuery('');
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                activeTab === tab 
                  ? 'bg-white text-ink shadow-sm' 
                  : 'text-ash hover:text-ink'
              }`}
            >
              {tab === 'services' ? 'Services' : tab === 'resources' ? 'Resources' : 'Bookings Calendar'}
            </button>
          ))}
        </div>
      </motion.div>

      {/* SEARCH AND ADD BAR */}
      <div className="mb-6 flex justify-between items-center gap-4 flex-wrap">
        {activeTab !== 'bookings' ? (
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-ash absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === 'services' ? 'Search services...' : 'Search resources...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-fog border border-transparent rounded-inputs text-sm text-ink placeholder:text-dove/70 focus:border-ink focus:ring-0 focus:outline-none transition-colors"
            />
          </div>
        ) : (
          /* Calendar day controller */
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrevDay}
              className="p-2 bg-fog border border-dove/10 rounded-lg hover:bg-dove/10 transition-colors flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4 text-graphite" />
            </button>
            <span className="text-sm font-semibold text-ink px-2 tabular-nums">
              {getFormattedDateLabel()}
            </span>
            <button 
              onClick={handleNextDay}
              className="p-2 bg-fog border border-dove/10 rounded-lg hover:bg-dove/10 transition-colors flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4 text-graphite" />
            </button>
            <button 
              onClick={handleToday}
              className="ml-3 px-3 py-1.5 bg-fog border border-dove/25 hover:bg-dove/10 text-graphite text-xs font-semibold rounded-lg transition-colors"
            >
              Today
            </button>
          </div>
        )}

        {/* Add triggers */}
        {activeTab === 'services' && (
          <button
            onClick={openAddService}
            className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white hover:bg-black rounded-buttons text-xs font-semibold shadow-subtle transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Service
          </button>
        )}
        {activeTab === 'resources' && (
          <button
            onClick={openAddResource}
            className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white hover:bg-black rounded-buttons text-xs font-semibold shadow-subtle transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Resource
          </button>
        )}
        {activeTab === 'bookings' && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (resources.length === 0) return alert('Add at least one resource first!');
                setSelectedResourceForBooking(resources[0]);
                setBookingServiceId(services[0]?.id || '');
                setBookingModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white hover:bg-black rounded-buttons text-xs font-semibold shadow-subtle transition-colors"
            >
              <Plus className="w-4 h-4" /> Book Appointment
            </button>
            <div className="flex border border-dove/20 bg-fog rounded-lg p-0.5">
              <button 
                onClick={() => setCalendarView('grid')}
                className={`p-1.5 rounded ${calendarView === 'grid' ? 'bg-white text-ink shadow-sm' : 'text-ash hover:text-ink'}`}
                title="Grid calendar"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setCalendarView('list')}
                className={`p-1.5 rounded ${calendarView === 'list' ? 'bg-white text-ink shadow-sm' : 'text-ash hover:text-ink'}`}
                title="Agenda list"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. SERVICES TAB */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map(service => (
            <motion.div
              layout
              key={service.id}
              className={`bg-white border rounded-cards p-6 shadow-subtle transition-all duration-300 relative group flex flex-col justify-between h-48 ${
                service.active ? 'border-dove/20 hover:border-graphite' : 'border-dove/10 opacity-60'
              }`}
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-serif text-lg text-ink font-semibold tracking-tight truncate max-w-[70%]">
                    {service.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-graphite font-mono">
                      ৳{service.price.toLocaleString('en-BD')}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-ash line-clamp-2 leading-relaxed">
                  {service.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-4 border-t border-dove/5 flex items-center justify-between mt-auto">
                <div className="flex gap-4 items-center">
                  <div className="flex items-center gap-1 text-xs text-graphite">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{service.duration_minutes}m</span>
                    {service.buffer_minutes > 0 && (
                      <span className="text-ash font-medium">(+{service.buffer_minutes}m buffer)</span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ash bg-fog px-2 py-0.5 rounded-full border border-dove/10">
                    {service.requires_resource_type}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditService(service)}
                    className="p-1.5 rounded-lg border border-dove/10 text-graphite hover:bg-fog transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteService(service.id)}
                    className="p-1.5 rounded-lg border border-dove/10 text-rust hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleServiceActive(service.id, service.active)}
                    className={`text-[10px] font-semibold px-2 py-1 rounded transition-colors ${
                      service.active 
                        ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-150' 
                        : 'bg-dove/10 text-ash hover:bg-dove/20'
                    }`}
                  >
                    {service.active ? 'Active' : 'Draft'}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {filteredServices.length === 0 && (
            <div className="col-span-full py-16 text-center text-ash text-sm border border-dashed border-dove/30 rounded-cards bg-fog/20">
              No services found. Click &quot;Add Service&quot; above to list your first bookable service.
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. RESOURCES TAB */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'resources' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map(res => {
            const rulesCount = availabilityRules.filter(r => r.resource_id === res.id).length;
            const exceptionsCount = availabilityExceptions.filter(x => x.resource_id === res.id).length;
            
            return (
              <motion.div
                layout
                key={res.id}
                className={`bg-white border rounded-cards p-6 shadow-subtle transition-all duration-300 relative group flex flex-col justify-between h-48 ${
                  res.active ? 'border-dove/20 hover:border-graphite' : 'border-dove/10 opacity-60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-base text-ink truncate max-w-[180px]">
                        {res.name}
                      </h3>
                      <p className="text-[10px] font-bold text-ash uppercase tracking-wider mt-0.5">
                        Type: {res.resource_type} {res.resource_type === 'table' ? `(Capacity: ${res.capacity})` : ''}
                      </p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      res.active ? 'bg-green-50 text-green-700 border-green-150' : 'bg-dove/10 text-ash border-dove/20'
                    }`}>
                      {res.active ? 'Available' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex gap-4 pt-2">
                    <button 
                      onClick={() => {
                        setSelectedResourceForRule(res);
                        setRuleSlideOpen(true);
                      }}
                      className="text-xs text-graphite hover:text-ink font-semibold flex items-center gap-1 underline decoration-dove/50 hover:decoration-ink"
                    >
                      <CalendarRange className="w-3.5 h-3.5" />
                      {rulesCount > 0 ? `${rulesCount} Days Open` : 'Set Hours'}
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedResourceForException(res);
                        setExceptionSlideOpen(true);
                      }}
                      className="text-xs text-graphite hover:text-ink font-semibold flex items-center gap-1 underline decoration-dove/50 hover:decoration-ink"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {exceptionsCount > 0 ? `${exceptionsCount} Exceptions` : 'Block Dates'}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-dove/5 flex items-center justify-end mt-auto gap-2">
                  <button
                    onClick={() => openEditResource(res)}
                    className="p-1.5 rounded-lg border border-dove/10 text-graphite hover:bg-fog transition-colors text-xs font-semibold"
                  >
                    Edit Detail
                  </button>
                  <button
                    onClick={() => handleDeleteResource(res.id)}
                    className="p-1.5 rounded-lg border border-dove/10 text-rust hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}

          {filteredResources.length === 0 && (
            <div className="col-span-full py-16 text-center text-ash text-sm border border-dashed border-dove/30 rounded-cards bg-fog/20">
              No resources found. Click &quot;Add Resource&quot; to setup your bookable staff, tables, or rooms.
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. BOOKINGS TAB (CALENDAR VIEW) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'bookings' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-white rounded-cards border border-dove/20 shadow-subtle overflow-hidden">
            
            {calendarView === 'grid' ? (
              /* Google Calendar style side-by-side columns view */
              <div className="flex flex-col h-[650px] relative overflow-hidden">
                
                {/* Columns Header (Resource Names) */}
                <div className="flex bg-fog border-b border-dove/20 shrink-0 select-none">
                  {/* Time ruler placeholder column */}
                  <div className="w-16 border-r border-dove/20 shrink-0"></div>
                  {/* Active resources columns */}
                  <div className="flex-1 flex min-w-0 divide-x divide-dove/20">
                    {resources.filter(r => r.active).map(res => (
                      <div key={res.id} className="flex-1 min-w-[140px] py-3 text-center flex flex-col justify-center items-center">
                        <span className="text-xs font-bold text-ink truncate max-w-[90%]">{res.name}</span>
                        <span className="text-[9px] font-semibold text-ash uppercase tracking-wider mt-0.5">{res.resource_type}</span>
                      </div>
                    ))}
                    {resources.filter(r => r.active).length === 0 && (
                      <div className="flex-1 py-3 text-center text-xs text-ash italic">No active resources to display.</div>
                    )}
                  </div>
                </div>

                {/* Scrollable Hours Ruler & Columns Content */}
                <div className="flex-1 flex overflow-y-auto relative min-h-0">
                  
                  {/* Left Time ruler (8 AM to 10 PM) */}
                  <div className="w-16 bg-fog border-r border-dove/20 shrink-0 select-none flex flex-col pt-2 text-[10px] text-ash/80 font-mono text-center divide-y divide-transparent">
                    {Array.from({ length: 15 }).map((_, idx) => {
                      const hour = 8 + idx;
                      const label = hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`;
                      return (
                        <div key={idx} className="h-16 flex items-start justify-center pr-1 -mt-2">
                          <span>{label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Day Columns containing timeline grids and booking cards */}
                  <div className="flex-1 flex min-w-0 divide-x divide-dove/20 relative">
                    
                    {/* Background hour lines */}
                    <div className="absolute inset-y-0 left-0 right-0 flex flex-col pointer-events-none divide-y divide-dove/10 z-0">
                      {Array.from({ length: 15 }).map((_, idx) => (
                        <div key={idx} className="h-16 w-full"></div>
                      ))}
                    </div>

                    {resources.filter(r => r.active).map(res => {
                      const resBookings = todaysBookings.filter(b => b.resource_id === res.id);
                      
                      return (
                        <div key={res.id} className="flex-1 min-w-[140px] relative h-[960px] z-10">
                          
                          {/* Invisible clickable rows for adding new bookings */}
                          <div className="absolute inset-0 flex flex-col z-0">
                            {Array.from({ length: 28 }).map((_, halfHourIdx) => {
                              const totalMins = 8 * 60 + halfHourIdx * 30;
                              const h = Math.floor(totalMins / 60);
                              const m = totalMins % 60;
                              const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                              
                              return (
                                <div
                                  key={halfHourIdx}
                                  onClick={() => {
                                    setSelectedResourceForBooking(res);
                                    setBookingTime(timeString);
                                    setBookingServiceId(services[0]?.id || '');
                                    setBookingModalOpen(true);
                                  }}
                                  className="h-8 w-full hover:bg-sky-wash/30 cursor-crosshair border-b border-dashed border-dove/5 transition-colors"
                                  title={`Book ${res.name} at ${timeString}`}
                                />
                              );
                            })}
                          </div>

                          {/* Positioned Booking Cards */}
                          {resBookings.map(booking => {
                            const layout = getBookingLayout(booking.starts_at, booking.ends_at);
                            const serviceName = booking.services?.name || 'Service';
                            
                            return (
                              <div
                                key={booking.id}
                                style={layout}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailBooking(booking);
                                }}
                                className="absolute left-1 right-1 px-3 py-1.5 rounded-lg border bg-ink text-white hover:bg-black/95 transition-all shadow-sm cursor-pointer z-10 flex flex-col justify-center select-none"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[10px] font-bold truncate leading-tight">
                                    {booking.customer_name}
                                  </span>
                                  <span className="text-[8px] font-mono shrink-0 font-medium tracking-tight bg-white/10 px-1 rounded">
                                    {new Date(booking.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <span className="text-[9px] text-white/70 truncate mt-0.5">
                                  {serviceName} {booking.party_size > 1 ? `(Qty: ${booking.party_size})` : ''}
                                </span>
                              </div>
                            );
                          })}

                        </div>
                      );
                    })}
                  </div>

                </div>

              </div>
            ) : (
              /* Agenda List View fallback for mobile */
              <div className="p-6 divide-y divide-dove/10 max-h-[650px] overflow-y-auto">
                {todaysBookings.map(b => (
                  <div key={b.id} className="py-4 flex justify-between items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-ink">{b.customer_name}</span>
                        <span className="text-xs text-ash">({b.customer_phone})</span>
                      </div>
                      <p className="text-xs text-graphite font-semibold">
                        {b.services?.name} with {b.resources?.name}
                      </p>
                      <p className="text-[10px] text-ash font-mono">
                        {new Date(b.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(b.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDetailBooking(b)}
                        className="px-3 py-1.5 rounded-lg border border-dove/25 hover:bg-fog text-xs font-semibold text-ink transition-colors"
                      >
                        Reschedule / Edit
                      </button>
                    </div>
                  </div>
                ))}

                {todaysBookings.length === 0 && (
                  <div className="py-16 text-center text-ash text-sm">
                    No appointments confirmed for this date.
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Waitlist Section */}
          <div className="lg:col-span-1 bg-white rounded-cards border border-dove/20 shadow-subtle p-5 flex flex-col space-y-4 h-[650px]">
            <div className="flex justify-between items-center pb-2 border-b border-dove/10">
              <div>
                <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-graphite" />
                  Live Waitlist
                </h3>
                <p className="text-[10px] text-ash">Today&apos;s active serial queue</p>
              </div>
              <button 
                onClick={fetchQueue}
                className="p-1.5 hover:bg-fog text-graphite hover:text-ink rounded-lg transition-colors"
                title="Refresh Queue"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Filter by Resource */}
            <div>
              <label className="text-[10px] font-bold text-ink uppercase tracking-wider block mb-1">Queue Resource</label>
              <select
                value={queueResourceFilter}
                onChange={(e) => setQueueResourceFilter(e.target.value)}
                className="w-full bg-fog border border-transparent rounded-inputs py-2 px-3 text-ink text-xs focus:border-ink focus:ring-0 focus:outline-none"
              >
                <option value="all">All Resources</option>
                {resources.filter(r => r.active).map(res => (
                  <option key={res.id} value={res.id}>{res.name}</option>
                ))}
              </select>
            </div>

            {/* Active Serving Status Card */}
            <div className="bg-fog/50 rounded-lg p-4 border border-dove/10 text-center space-y-2">
              <span className="text-[9px] font-bold text-ash uppercase tracking-wider block">Currently Serving</span>
              {queueEntries.some(e => e.status === 'being_served') ? (
                (() => {
                  const serving = queueEntries.find(e => e.status === 'being_served');
                  return (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-ink">{serving.customer_name}</p>
                      <p className="text-xs text-graphite">Serial #{serving.serial_number}</p>
                      <p className="text-[10px] text-ash">({serving.customer_phone})</p>
                    </div>
                  );
                })()
              ) : (
                <p className="text-xs text-ash italic py-1">No active customer being served</p>
              )}

              <button
                onClick={handleCallNext}
                disabled={isCallingNext}
                className="w-full mt-2 py-2 px-3 bg-ink hover:bg-black disabled:bg-dove/40 text-white rounded-buttons text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                {isCallingNext ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                Call Next Guest
              </button>
            </div>

            {/* Queue List */}
            <div className="flex-1 flex flex-col min-h-0 space-y-2">
              <span className="text-[9px] font-bold text-ash uppercase tracking-wider block">Waiting List</span>
              <div className="flex-1 overflow-y-auto divide-y divide-dove/5 border border-dove/10 rounded-lg bg-fog/20 px-3">
                {queueEntries.filter(e => e.status === 'waiting').length > 0 ? (
                  queueEntries.filter(e => e.status === 'waiting').map((entry) => (
                    <div key={entry.id} className="py-2.5 flex justify-between items-center text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-ink">#{entry.serial_number}</span>
                          <span className="font-semibold text-graphite truncate max-w-[100px]">{entry.customer_name}</span>
                        </div>
                        <span className="text-[10px] text-ash block">{entry.customer_phone}</span>
                      </div>
                      <span className="text-[9px] text-ash font-mono">
                        {new Date(entry.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-ash italic text-center py-8">No guests currently waiting</p>
                )}
              </div>
            </div>

            {/* Manual Add Form Toggle */}
            <div className="pt-2 border-t border-dove/10">
              {isAddingQueueGuest ? (
                <div className="space-y-3 bg-fog p-3 rounded-lg border border-dove/10">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-ink uppercase tracking-wider">Add Queue Guest</span>
                    <button onClick={() => setIsAddingQueueGuest(false)} className="text-ash hover:text-rust text-xs">Cancel</button>
                  </div>
                  <input
                    type="text"
                    placeholder="Guest Name"
                    value={newQueueName}
                    onChange={e => setNewQueueName(e.target.value)}
                    className="w-full bg-white border border-dove/20 rounded-inputs px-2.5 py-1.5 text-xs text-ink focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Phone (e.g. 01712345678)"
                    value={newQueuePhone}
                    onChange={e => setNewQueuePhone(e.target.value)}
                    className="w-full bg-white border border-dove/20 rounded-inputs px-2.5 py-1.5 text-xs text-ink focus:outline-none"
                  />
                  <button
                    onClick={handleAddQueueGuest}
                    className="w-full py-1.5 bg-ink text-white hover:bg-black text-xs font-semibold rounded-buttons transition-colors"
                  >
                    Confirm Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingQueueGuest(true)}
                  className="w-full py-2 bg-fog hover:bg-dove/10 text-graphite rounded-buttons text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Walk-in Guest
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODALS & SLIDEOVERS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        
        {/* A. Service Slideover */}
        {serviceSlideOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setServiceSlideOpen(false)} className="fixed inset-0 bg-black z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween' }} className="fixed inset-y-0 right-0 max-w-md w-full bg-white z-50 shadow-2xl flex flex-col justify-between">
              
              <div className="p-6 overflow-y-auto flex-1">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-serif text-ink font-semibold">{editingService ? 'Edit Service' : 'Add New Service'}</h2>
                  <button onClick={() => setServiceSlideOpen(false)} className="p-1 rounded-full hover:bg-fog"><X className="w-5 h-5 text-ash" /></button>
                </div>

                <form onSubmit={handleSaveService} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1">Service Name</label>
                    <input type="text" value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="e.g. Classic Haircut" className="w-full bg-fog border border-transparent rounded-inputs py-2.5 px-3.5 text-ink text-sm focus:border-ink focus:ring-0 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1">Description</label>
                    <textarea value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} placeholder="Service scope description..." rows={3} className="w-full bg-fog border border-transparent rounded-inputs py-2.5 px-3.5 text-ink text-sm focus:border-ink focus:ring-0 focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1">Price (BDT)</label>
                      <input type="text" value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} placeholder="1200" className="w-full bg-fog border border-transparent rounded-inputs py-2.5 px-3.5 text-ink text-sm focus:border-ink focus:ring-0 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1">Duration (Mins)</label>
                      <select value={serviceDuration} onChange={(e) => setServiceDuration(e.target.value)} className="w-full bg-fog border border-transparent rounded-inputs py-2.5 px-3.5 text-ink text-sm focus:border-ink focus:ring-0 focus:outline-none">
                        <option value="15">15 mins</option>
                        <option value="30">30 mins</option>
                        <option value="45">45 mins</option>
                        <option value="60">1 hour</option>
                        <option value="90">1.5 hours</option>
                        <option value="120">2 hours</option>
                        <option value="180">3 hours</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1">Post-Buffer (Mins)</label>
                      <input type="number" value={serviceBuffer} onChange={(e) => setServiceBuffer(e.target.value)} className="w-full bg-fog border border-transparent rounded-inputs py-2.5 px-3.5 text-ink text-sm focus:border-ink focus:ring-0 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1">Requires Resource</label>
                      <select value={serviceResourceType} onChange={(e) => setServiceResourceType(e.target.value)} className="w-full bg-fog border border-transparent rounded-inputs py-2.5 px-3.5 text-ink text-sm focus:border-ink focus:ring-0 focus:outline-none">
                        <option value="staff">Staff / Employee</option>
                        <option value="table">Table / Dining Slot</option>
                        <option value="room">Room / Cabin</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-fog rounded-inputs">
                      <span className="text-xs font-bold text-ink uppercase tracking-wider">Require Deposit</span>
                      <button
                        type="button"
                        onClick={() => setServiceDepositRequired(!serviceDepositRequired)}
                        className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${serviceDepositRequired ? 'bg-ink' : 'bg-dove/40'}`}
                      >
                        <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${serviceDepositRequired ? 'translate-x-5 left-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    {serviceDepositRequired && (
                      <div>
                        <label className="text-[10px] font-bold text-ink uppercase tracking-wider block mb-1">Deposit Amount (BDT)</label>
                        <input type="text" value={serviceDepositAmount} onChange={(e) => setServiceDepositAmount(e.target.value)} placeholder="500" className="w-full bg-fog border border-transparent rounded-inputs py-2.5 px-3.5 text-ink text-sm focus:border-ink focus:ring-0 focus:outline-none" />
                      </div>
                    )}
                  </div>

                  {serviceError && <p className="text-xs text-rust font-semibold">{serviceError}</p>}
                </form>
              </div>

              <div className="p-6 border-t border-dove/25 flex gap-3">
                <button type="button" onClick={() => setServiceSlideOpen(false)} className="flex-1 py-3 text-xs font-semibold bg-fog hover:bg-dove/10 text-graphite rounded-buttons transition-colors">Cancel</button>
                <button type="submit" onClick={handleSaveService} disabled={isSavingService} className="flex-1 py-3 text-xs font-semibold bg-ink text-white hover:bg-black rounded-buttons transition-colors flex items-center justify-center gap-1.5">
                  {isSavingService ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Save Service
                </button>
              </div>

            </motion.div>
          </>
        )}

        {/* B. Resource Slideover */}
        {resourceSlideOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setResourceSlideOpen(false)} className="fixed inset-0 bg-black z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween' }} className="fixed inset-y-0 right-0 max-w-md w-full bg-white z-50 shadow-2xl flex flex-col justify-between">
              
              <div className="p-6 overflow-y-auto flex-1">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-serif text-ink font-semibold">{editingResource ? 'Edit Resource' : 'Add Bookable Resource'}</h2>
                  <button onClick={() => setResourceSlideOpen(false)} className="p-1 rounded-full hover:bg-fog"><X className="w-5 h-5 text-ash" /></button>
                </div>

                <form onSubmit={handleSaveResource} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1">Resource Name</label>
                    <input type="text" value={resourceName} onChange={(e) => setResourceName(e.target.value)} placeholder="e.g. Dr. Rahman, Table 4" className="w-full bg-fog border border-transparent rounded-inputs py-2.5 px-3.5 text-ink text-sm focus:border-ink focus:ring-0 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1">Resource Type</label>
                    <select value={resourceType} onChange={(e) => setResourceType(e.target.value)} className="w-full bg-fog border border-transparent rounded-inputs py-2.5 px-3.5 text-ink text-sm focus:border-ink focus:ring-0 focus:outline-none">
                      <option value="staff">Staff</option>
                      <option value="table">Table</option>
                      <option value="room">Room</option>
                    </select>
                  </div>
                  
                  {resourceType === 'table' && (
                    <div>
                      <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1">Maximum Party Capacity</label>
                      <input type="number" value={resourceCapacity} onChange={(e) => setResourceCapacity(e.target.value)} min={1} className="w-full bg-fog border border-transparent rounded-inputs py-2.5 px-3.5 text-ink text-sm focus:border-ink focus:ring-0 focus:outline-none" />
                    </div>
                  )}

                  {resourceError && <p className="text-xs text-rust font-semibold">{resourceError}</p>}
                </form>
              </div>

              <div className="p-6 border-t border-dove/25 flex gap-3">
                <button type="button" onClick={() => setResourceSlideOpen(false)} className="flex-1 py-3 text-xs font-semibold bg-fog hover:bg-dove/10 text-graphite rounded-buttons transition-colors">Cancel</button>
                <button type="submit" onClick={handleSaveResource} disabled={isSavingResource} className="flex-1 py-3 text-xs font-semibold bg-ink text-white hover:bg-black rounded-buttons transition-colors flex items-center justify-center gap-1.5">
                  {isSavingResource ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Save Resource
                </button>
              </div>

            </motion.div>
          </>
        )}

        {/* C. Weekly Availability Editor */}
        {ruleSlideOpen && selectedResourceForRule && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setRuleSlideOpen(false)} className="fixed inset-0 bg-black z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween' }} className="fixed inset-y-0 right-0 max-w-md w-full bg-white z-50 shadow-2xl flex flex-col justify-between">
              
              <div className="p-6 overflow-y-auto flex-1">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-lg font-serif text-ink font-semibold">Weekly Availability</h2>
                    <p className="text-xs text-ash mt-0.5">Recurring active slots for {selectedResourceForRule.name}</p>
                  </div>
                  <button onClick={() => setRuleSlideOpen(false)} className="p-1 rounded-full hover:bg-fog"><X className="w-5 h-5 text-ash" /></button>
                </div>

                <div className="space-y-4 pt-4 border-t border-dove/10">
                  {Array.from({ length: 7 }).map((_, day) => {
                    const sched = weeklySchedule[day] || { checked: false, start: '09:00', end: '17:00' };
                    return (
                      <div key={day} className="flex items-center justify-between gap-4 p-3 bg-fog rounded-lg border border-dove/5">
                        <div className="flex items-center gap-2 shrink-0 w-24">
                          <input 
                            type="checkbox" 
                            checked={sched.checked} 
                            onChange={(e) => setWeeklySchedule(prev => ({
                              ...prev,
                              [day]: { ...sched, checked: e.target.checked }
                            }))}
                            className="rounded text-ink border-dove/30 focus:ring-0 focus:outline-none"
                          />
                          <span className="text-xs font-semibold text-graphite">{getDayName(day)}</span>
                        </div>
                        {sched.checked ? (
                          <div className="flex items-center gap-2">
                            <input 
                              type="time" 
                              value={sched.start}
                              onChange={(e) => setWeeklySchedule(prev => ({
                                ...prev,
                                [day]: { ...sched, start: e.target.value }
                              }))}
                              className="bg-white border border-dove/20 text-xs font-semibold px-2 py-1.5 rounded-lg focus:outline-none" 
                            />
                            <span className="text-xs text-ash">to</span>
                            <input 
                              type="time" 
                              value={sched.end}
                              onChange={(e) => setWeeklySchedule(prev => ({
                                ...prev,
                                [day]: { ...sched, end: e.target.value }
                              }))}
                              className="bg-white border border-dove/20 text-xs font-semibold px-2 py-1.5 rounded-lg focus:outline-none" 
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-ash italic">Closed</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-6 border-t border-dove/25 flex gap-3">
                <button type="button" onClick={() => setRuleSlideOpen(false)} className="flex-1 py-3 text-xs font-semibold bg-fog hover:bg-dove/10 text-graphite rounded-buttons transition-colors">Cancel</button>
                <button type="button" onClick={handleSaveRules} disabled={isSavingRules} className="flex-1 py-3 text-xs font-semibold bg-ink text-white hover:bg-black rounded-buttons transition-colors flex items-center justify-center gap-1.5">
                  {isSavingRules ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Save Schedule
                </button>
              </div>

            </motion.div>
          </>
        )}

        {/* D. Resource Exceptions Editor */}
        {exceptionSlideOpen && selectedResourceForException && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setExceptionSlideOpen(false)} className="fixed inset-0 bg-black z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween' }} className="fixed inset-y-0 right-0 max-w-md w-full bg-white z-50 shadow-2xl flex flex-col justify-between">
              
              <div className="p-6 overflow-y-auto flex-1">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-lg font-serif text-ink font-semibold">Exceptions & Overrides</h2>
                    <p className="text-xs text-ash mt-0.5">Block dates or set special hours for {selectedResourceForException.name}</p>
                  </div>
                  <button onClick={() => setExceptionSlideOpen(false)} className="p-1 rounded-full hover:bg-fog"><X className="w-5 h-5 text-ash" /></button>
                </div>

                {/* Add override form */}
                <form onSubmit={handleAddException} className="p-4 bg-fog rounded-lg border border-dove/20 space-y-4">
                  <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Add Special Date Override</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-ash uppercase tracking-wider block mb-1">Date</label>
                      <input type="date" value={exceptionDate} onChange={(e) => setExceptionDate(e.target.value)} className="w-full bg-white border border-dove/25 text-xs font-semibold px-2.5 py-1.5 rounded-lg focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-ash uppercase tracking-wider block mb-1">Availability</label>
                      <select value={exceptionIsAvailable ? 'open' : 'closed'} onChange={(e) => setExceptionIsAvailable(e.target.value === 'open')} className="w-full bg-white border border-dove/25 text-xs font-semibold px-2.5 py-1.5 rounded-lg focus:outline-none">
                        <option value="closed">Closed / Blocked</option>
                        <option value="open">Special Open Hours</option>
                      </select>
                    </div>
                  </div>

                  {exceptionIsAvailable && (
                    <div className="flex gap-2 items-center">
                      <input type="time" value={exceptionStart} onChange={(e) => setExceptionStart(e.target.value)} className="bg-white border border-dove/20 text-xs font-semibold px-2.5 py-1.5 rounded-lg focus:outline-none" />
                      <span className="text-xs text-ash">to</span>
                      <input type="time" value={exceptionEnd} onChange={(e) => setExceptionEnd(e.target.value)} className="bg-white border border-dove/20 text-xs font-semibold px-2.5 py-1.5 rounded-lg focus:outline-none" />
                    </div>
                  )}

                  {exceptionError && <p className="text-xs text-rust font-semibold">{exceptionError}</p>}
                  
                  <button type="submit" disabled={isSavingException} className="w-full py-2 bg-ink text-white font-semibold rounded-lg text-xs hover:bg-black transition-colors flex items-center justify-center gap-1.5">
                    {isSavingException ? <Loader2 className="w-3 animate-spin" /> : null}
                    Save Override
                  </button>
                </form>

                {/* Exclusions List */}
                <div className="mt-6">
                  <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-3">Active Overrides</h3>
                  <div className="space-y-2">
                    {availabilityExceptions.filter(x => x.resource_id === selectedResourceForException.id).map(x => (
                      <div key={x.id} className="flex justify-between items-center p-3 bg-white border border-dove/20 rounded-lg text-xs shadow-sm">
                        <div>
                          <span className="font-semibold text-ink">{new Date(x.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span className={`ml-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            x.is_available ? 'bg-green-50 text-green-700 border border-green-150' : 'bg-red-50 text-rust border border-red-150'
                          }`}>
                            {x.is_available ? `Open: ${x.start_time?.substring(0, 5)} - ${x.end_time?.substring(0, 5)}` : 'Blocked'}
                          </span>
                        </div>
                        <button onClick={() => handleDeleteException(x.id)} className="p-1 rounded text-ash hover:text-rust hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {availabilityExceptions.filter(x => x.resource_id === selectedResourceForException.id).length === 0 && (
                      <p className="text-xs text-ash italic text-center py-4">No date overrides configured.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-dove/25">
                <button type="button" onClick={() => setExceptionSlideOpen(false)} className="w-full py-3 text-xs font-semibold bg-fog hover:bg-dove/10 text-graphite rounded-buttons transition-colors">Close panel</button>
              </div>

            </motion.div>
          </>
        )}

        {/* E. Book appointment modal */}
        {bookingModalOpen && selectedResourceForBooking && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setBookingModalOpen(false)} className="fixed inset-0 bg-black z-40" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="fixed inset-0 m-auto max-w-md h-[480px] bg-white rounded-cards shadow-2xl z-50 p-6 flex flex-col justify-between">
              
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-lg font-serif text-ink font-semibold">Book Appointment</h2>
                    <p className="text-xs text-ash mt-0.5">Scheduling manual booking with {selectedResourceForBooking.name}</p>
                  </div>
                  <button onClick={() => setBookingModalOpen(false)} className="p-1 rounded-full hover:bg-fog"><X className="w-5 h-5 text-ash" /></button>
                </div>

                <form onSubmit={handleManualBooking} className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-ash uppercase tracking-wider block mb-1">Customer Name</label>
                      <input type="text" value={bookingCustomerName} onChange={(e) => setBookingCustomerName(e.target.value)} placeholder="Siam" className="w-full bg-fog border border-transparent rounded-inputs py-2 px-3 text-ink text-xs focus:border-ink focus:ring-0 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-ash uppercase tracking-wider block mb-1">Customer Phone</label>
                      <input type="text" value={bookingCustomerPhone} onChange={(e) => setBookingCustomerPhone(e.target.value)} placeholder="01330337043" className="w-full bg-fog border border-transparent rounded-inputs py-2 px-3 text-ink text-xs focus:border-ink focus:ring-0 focus:outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-ash uppercase tracking-wider block mb-1">Select Service</label>
                      <select value={bookingServiceId} onChange={(e) => setBookingServiceId(e.target.value)} className="w-full bg-fog border border-transparent rounded-inputs py-2 px-3 text-ink text-xs focus:border-ink focus:ring-0 focus:outline-none">
                        {services.filter(s => s.active && s.requires_resource_type === selectedResourceForBooking.resource_type).map(s => (
                          <option key={s.id} value={s.id}>{s.name} (৳{s.price})</option>
                        ))}
                        {services.filter(s => s.active && s.requires_resource_type === selectedResourceForBooking.resource_type).length === 0 && (
                          <option value="">No services matching type</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-ash uppercase tracking-wider block mb-1">Start Time Slot</label>
                      {/* Simple select or input time */}
                      <input type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} className="w-full bg-fog border border-transparent rounded-inputs py-2 px-3 text-ink text-xs focus:border-ink focus:ring-0 focus:outline-none" />
                    </div>
                  </div>

                  {selectedResourceForBooking.resource_type === 'table' && (
                    <div>
                      <label className="text-[10px] font-bold text-ash uppercase tracking-wider block mb-1">Party Size / Qty (Max: {selectedResourceForBooking.capacity})</label>
                      <input type="number" value={bookingPartySize} min={1} max={selectedResourceForBooking.capacity} onChange={(e) => setBookingPartySize(e.target.value)} className="w-full bg-fog border border-transparent rounded-inputs py-2 px-3 text-ink text-xs focus:border-ink focus:ring-0 focus:outline-none" />
                    </div>
                  )}

                  {bookingError && <p className="text-xs text-rust font-semibold pt-1">{bookingError}</p>}
                </form>
              </div>

              <div className="border-t border-dove/25 pt-4 flex gap-3 mt-4">
                <button type="button" onClick={() => setBookingModalOpen(false)} className="flex-1 py-2.5 text-xs font-semibold bg-fog hover:bg-dove/10 text-graphite rounded-buttons transition-colors">Cancel</button>
                <button type="submit" onClick={handleManualBooking} disabled={isSavingBooking || !bookingServiceId} className="flex-1 py-2.5 text-xs font-semibold bg-ink text-white hover:bg-black rounded-buttons transition-colors flex items-center justify-center gap-1.5">
                  {isSavingBooking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Confirm Booking
                </button>
              </div>

            </motion.div>
          </>
        )}

        {/* F. Booking Detail View & Reschedule Modal */}
        {detailBooking && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setDetailBooking(null)} className="fixed inset-0 bg-black z-40" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="fixed inset-0 m-auto max-w-lg h-[500px] bg-white rounded-cards shadow-2xl z-50 p-6 flex flex-col justify-between">
              
              <div className="overflow-y-auto flex-1">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-serif text-ink font-semibold">Appointment Details</h2>
                  <button onClick={() => setDetailBooking(null)} className="p-1 rounded-full hover:bg-fog"><X className="w-5 h-5 text-ash" /></button>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-dove/15 mb-4">
                  <div>
                    <span className="text-[10px] font-bold text-ash uppercase tracking-wider block">Customer</span>
                    <p className="text-sm font-semibold text-ink">{detailBooking.customer_name}</p>
                    <p className="text-xs text-graphite font-mono mt-0.5">{detailBooking.customer_phone}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-ash uppercase tracking-wider block">Fulfillment Slot</span>
                    <p className="text-sm font-semibold text-ink">{detailBooking.services?.name || 'Service'}</p>
                    <p className="text-xs text-graphite font-semibold mt-0.5">with {detailBooking.resources?.name || 'Staff'}</p>
                    <p className="text-[10px] text-ash font-mono mt-0.5">
                      {new Date(detailBooking.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(detailBooking.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Reschedule module */}
                <form onSubmit={handleRescheduleBooking} className="bg-fog p-4 rounded-lg border border-dove/20 space-y-3">
                  <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Reschedule Appointment</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-ash uppercase tracking-wider block">Date</label>
                      <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="w-full bg-white border border-dove/25 text-xs font-semibold px-2 py-1 rounded-lg focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-ash uppercase tracking-wider block">Starts At Time</label>
                      <input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} className="w-full bg-white border border-dove/25 text-xs font-semibold px-2 py-1 rounded-lg focus:outline-none" />
                    </div>
                  </div>
                  
                  {rescheduleError && <p className="text-xs text-rust font-semibold">{rescheduleError}</p>}

                  <button type="submit" disabled={isRescheduling} className="w-full py-2 bg-ink text-white font-semibold rounded-lg text-xs hover:bg-black transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                    {isRescheduling ? <Loader2 className="w-3 animate-spin" /> : null}
                    Confirm Reschedule
                  </button>
                </form>
              </div>

              <div className="border-t border-dove/25 pt-4 flex gap-2.5 mt-4 justify-between flex-wrap">
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleStatusChange(detailBooking.id, 'completed')}
                    className="px-3 py-2 bg-green-150 text-green-700 hover:bg-green-200 text-xs font-semibold rounded-buttons transition-all border border-green-200"
                  >
                    Mark Completed
                  </button>
                  <button 
                    onClick={() => handleStatusChange(detailBooking.id, 'no_show')}
                    className="px-3 py-2 bg-yellow-100 text-yellow-750 hover:bg-yellow-150 text-xs font-semibold rounded-buttons transition-all border border-yellow-250"
                  >
                    Mark No-Show
                  </button>
                </div>
                <button 
                  onClick={() => handleCancelBooking(detailBooking.id)}
                  className="px-4 py-2 bg-rust hover:bg-red-800 text-white text-xs font-semibold rounded-buttons transition-all shrink-0 shadow-sm"
                >
                  Cancel Booking
                </button>
              </div>

            </motion.div>
          </>
        )}

      </AnimatePresence>

    </div>
  );
}
