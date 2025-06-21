
import type { User, NavItem, NotificationItem, SidebarNavConfig } from "@/types/platform";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Tags,
  Library,
  PlusCircle,
  UserCircle,
  BookOpenCheck, 
  Search as SearchIcon,
  Award,
  Settings,
  ShieldQuestion,
  GraduationCap,
  Sparkles,
  CheckSquare,
  MessageSquareHeart,
  CalendarDays,
  FileText,
  ShoppingCart,
  BarChartBig,
  Camera,
  Palette, Smartphone, Puzzle as PuzzleIcon, Cloud, Briefcase, Megaphone,
  Code2, 
  Brain, 
  Atom, 
  Landmark, 
  Film,
  LucideIcon,
  Zap, 
  Bell, 
  Mail 
} from "lucide-react";


export const userDropdownNavItems = (role: string | null): NavItem[] => {
  const items: NavItem[] = [];
  if (role) {
    if (role === "student") {
        items.push({ title: "My Profile", href: `/student/profile`, icon: UserCircle });
    }
  }
  return items;
}

export const placeholderUser: User = {
  id: "student123",
  name: "Alex Johnson",
  email: "alex.johnson@example.com",
  avatarUrl: "https://placehold.co/100x100.png?text=AJ",
  role: "student",
  joinedDate: "2023-06-16T10:00:00.000Z", 
  stats: {
    coursesEnrolled: 5,
    coursesCompleted: 2,
    certificatesEarned: 1,
  },
  dataAiHint: "student avatar"
};

export const placeholderCourseCategories: string[] = ["AI", "Web Development", "Machine Learning", "Data Science", "Cybersecurity", "Mobile Development", "Game Development", "Cloud Computing", "Business", "Design", "Photography", "Marketing", "Environmental Science", "History", "Media Production"];

export const getIconForCategory = (categoryName?: string): LucideIcon => {
  switch (categoryName?.toLowerCase()) {
    case 'ai':
    case 'artificial intelligence':
      return Brain;
    case 'web development': 
    case 'react':
      return Code2;
    case 'machine learning': return Sparkles; 
    case 'data science': return BarChartBig;
    case 'design':
    case 'art & design':
      return Palette;
    case 'cybersecurity': return ShieldQuestion;
    case 'mobile development': return Smartphone;
    case 'game development': return PuzzleIcon;
    case 'cloud computing': return Cloud;
    case 'business': return Briefcase;
    case 'photography': return Camera;
    case 'marketing': return Megaphone;
    case 'environmental science': return Atom;
    case 'history': return Landmark;
    case 'media production': return Film;
    default: return Tags;
  }
};

export const profileCardIcons = {
    MyLearning: BookOpenCheck,
    Badges: Award,
    Certificates: FileText,
    OrderHistory: ShoppingCart,
    Settings: Settings,
    AwardIcon: Award,
    CompletedLessonsIcon: CheckSquare,
    FeedbackIcon: MessageSquareHeart,
    JoinedDateIcon: CalendarDays,
    ContinueLearningIcon: BarChartBig,
};

const LOCALSTORAGE_READ_NOTIFICATION_IDS_KEY = "eduspace_readNotificationIds";

const getReadNotificationIdsFromStorage = (): string[] => {
  if (typeof window === "undefined") return [];
  const storedIds = localStorage.getItem(LOCALSTORAGE_READ_NOTIFICATION_IDS_KEY);
  return storedIds ? JSON.parse(storedIds) : [];
};

const setReadNotificationIdsInStorage = (ids: string[]): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCALSTORAGE_READ_NOTIFICATION_IDS_KEY, JSON.stringify(ids));
};

export let mockNotifications: NotificationItem[] = []; // Initialize as empty

const sortNotifications = () => {
  mockNotifications = [...mockNotifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};
sortNotifications(); 

let deletedNotificationsHistory: NotificationItem[] = [];

export function addNotification(
  newNotificationData: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>
): NotificationItem {
  const newNotification: NotificationItem = {
    ...newNotificationData,
    id: `notif${Date.now()}-${Math.random().toString(36).substring(2,9)}`,
    createdAt: new Date(),
    read: false, 
    icon: newNotificationData.icon || (newNotificationData.category === 'suggestion' ? MessageSquareHeart : Bell), 
  };
  mockNotifications = [newNotification, ...mockNotifications];
  sortNotifications();
  return newNotification;
}

export function deleteNotification(notificationId: string): void {
  const indexToDelete = mockNotifications.findIndex(notif => notif.id === notificationId);
  if (indexToDelete > -1) {
    const deletedItem = mockNotifications[indexToDelete];
    mockNotifications = mockNotifications.filter(notif => notif.id !== notificationId);
    if (deletedItem) {
      deletedNotificationsHistory.push(deletedItem); 
    }
  }
}

export function undoLastNotificationDeletion(): NotificationItem | undefined {
  if (deletedNotificationsHistory.length > 0) {
    const itemToRestore = deletedNotificationsHistory.pop();
    if (itemToRestore) {
      mockNotifications = [...mockNotifications, itemToRestore];
      sortNotifications(); 
      return itemToRestore;
    }
  }
  return undefined;
}

export function markNotificationAsRead(notificationId: string): void {
  const readIds = getReadNotificationIdsFromStorage();
  if (!readIds.includes(notificationId)) {
    setReadNotificationIdsInStorage([...readIds, notificationId]);
  }
  // The actual 'read' status on mockNotifications items will be set by consumers
  // based on localStorage. This function just ensures the ID is recorded.
}

export function markNotificationAsUnread(notificationId: string): void {
  const readIds = getReadNotificationIdsFromStorage();
  setReadNotificationIdsInStorage(readIds.filter(id => id !== notificationId));
  // Similar to markAsRead, consumers will update the 'read' status.
}

export function markAllNotificationsAsRead(): void {
  const allCurrentIds = mockNotifications.map(n => n.id);
  // To avoid duplicates and ensure all current are marked read, merge with existing.
  const existingReadIds = getReadNotificationIdsFromStorage();
  const newReadIds = Array.from(new Set([...existingReadIds, ...allCurrentIds]));
  setReadNotificationIdsInStorage(newReadIds);
}

export function markAllNotificationsAsUnread(): void {
   // If marking all *currently visible* unread, we'd remove their IDs from localStorage
   // For simplicity, let's assume this means clearing all *globally* stored read IDs.
   // A more nuanced approach might only remove IDs of notifications currently in mockNotifications.
  setReadNotificationIdsInStorage([]); 
}

export function getProcessedNotifications(): NotificationItem[] {
  const readIds = getReadNotificationIdsFromStorage();
  return [...mockNotifications]
    .map(n => ({ ...n, read: readIds.includes(n.id) }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}


export const sidebarNavConfig: SidebarNavConfig = {
  admin: [
    { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, activePaths: ['/admin/dashboard'] },
    { title: "Users", href: "/admin/users", icon: Users, activePaths: ['/admin/users', '/admin/users/add', '/admin/users/[userId]/edit'] },
    { title: "Courses", href: "/admin/courses", icon: BookOpen, activePaths: ['/admin/courses', '/admin/courses/[courseId]/edit', '/admin/courses/[courseId]/preview'] },
    { title: "Notifications Log", href: "/admin/notifications", icon: Bell, activePaths: ['/admin/notifications', '/admin/notifications/add'] }, 
    { title: "Announcements", href: "/admin/announcements/add", icon: Megaphone, activePaths: ['/admin/announcements/add'] },
  ],
  teacher: [
    { title: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard, activePaths: ['/teacher/dashboard'] },
    { title: "My Courses", href: "/teacher/courses", icon: Library, activePaths: ['/teacher/courses', '/teacher/courses/[courseId]', '/teacher/courses/[courseId]/edit'] },
    { title: "Add Course", href: "/teacher/courses/add", icon: PlusCircle, activePaths: ['/teacher/courses/add'] },
  ],
  student: [
    { title: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard, activePaths: ['/student/dashboard'] },
    { title: "My Learning", href: "/student/dashboard", icon: BookOpenCheck, activePaths: ['/student/dashboard', '/student/courses/[courseId]', '/student/courses/[courseId]/lessons/[lessonId]'] },
    { title: "Discover Courses", href: "/student/courses", icon: SearchIcon, activePaths: ['/student/courses'] },
    { title: "Profile", href: "/student/profile", icon: UserCircle, activePaths: ['/student/profile'] },
  ],
};
