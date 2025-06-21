
"use client";

import Link from "next/link";
import {
  Settings,
  UserCircle,
  LogOut,
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  Search as SearchIcon, 
  BookOpenCheck,
  Library,
  PlusCircle,
  Users as UsersIcon,
  BookOpen,
  Bell, 
  Check, 
  Mail,
  Megaphone
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { userDropdownNavItems, markNotificationAsRead, markAllNotificationsAsRead, getProcessedNotifications } from "@/config/nav"; 
import type { NotificationItem } from "@/types/platform"; 
import { Badge } from "@/components/ui/badge";
import { cn, formatRelativeTime } from "@/lib/utils"; 
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { User as FirebaseUser } from "firebase/auth"; 
import type { UserRole } from "@/types/platform";

const getUserDetails = (firebaseUser: FirebaseUser | null, currentRole: UserRole | null) => {
  const displayName = currentRole === 'admin'
    ? "Admin"
    : firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || "User";

  const nameInitial = displayName[0].toUpperCase();
  const defaultAvatar = `https://placehold.co/100x100.png?text=${nameInitial}`;
  const defaultHint = currentRole ? `${currentRole} avatar` : "user avatar";

  if (firebaseUser) {
    return {
      name: displayName,
      email: firebaseUser.email || "No email",
      avatarUrl: firebaseUser.photoURL || defaultAvatar,
      dataAiHint: firebaseUser.photoURL ? (currentRole ? `${currentRole} avatar` : "user avatar") : defaultHint 
    };
  }
  return { 
    name: "Guest User",
    email: "guest@example.com",
    avatarUrl: defaultAvatar,
    dataAiHint: defaultHint
  };
};


export function DashboardHeader() {
  const { user: firebaseUser, role, logout } = useAuth(); 
  const pathname = usePathname();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]); 
  const [hasUnread, setHasUnread] = useState(false);

  const userDetails = getUserDetails(firebaseUser, role);

  const refreshNotifications = useCallback(() => {
    const processed = getProcessedNotifications();
    setNotifications(processed);
    setHasUnread(processed.some(n => !n.read));
  }, []);


  useEffect(() => {
    refreshNotifications();
    // Consider a more sophisticated real-time update mechanism if needed (e.g., WebSocket, Firestore listeners)
    // For now, a polling interval or manual refresh might be sufficient for this mock.
    const interval = setInterval(refreshNotifications, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, [refreshNotifications]); 

  const handleMarkAllReadInDropdown = () => {
    markAllNotificationsAsRead(); 
    refreshNotifications(); 
  };
  
  const handleNotificationClick = (notificationId: string, link?: string) => {
    markNotificationAsRead(notificationId); 
    refreshNotifications(); 
    if (link) {
      router.push(link);
    }
  };


  const getNavLinks = () => {    
    if (role === "student") {
      return [
        { title: "My Dashboard", href: "/student/dashboard", icon: LayoutDashboard, activePaths: ['/student/dashboard'] },
        { title: "My Learning", href: "/student/dashboard", icon: BookOpenCheck, activePaths: ['/student/courses/[courseId]', '/student/courses/[courseId]/lessons/[lessonId]'] },
        { title: "Discover Courses", href: "/student/courses", icon: SearchIcon, activePaths: ['/student/courses'] },
        { title: "Profile", href: "/student/profile", icon: UserCircle, activePaths: ['/student/profile'] },
      ];
    }
    if (role === "teacher") {
      return [
        { title: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard, activePaths: ['/teacher/dashboard'] },
        { title: "My Courses", href: "/teacher/courses", icon: Library, activePaths: ['/teacher/courses', '/teacher/courses/[courseId]', '/teacher/courses/[courseId]/edit'] },
        { title: "Create Course", href: "/teacher/courses/add", icon: PlusCircle, activePaths: ['/teacher/courses/add'] },
      ];
    }
    if (role === "admin") {
      return [
        { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, activePaths: ['/admin/dashboard'] },
        { title: "Users", href: "/admin/users", icon: UsersIcon, activePaths: ['/admin/users', '/admin/users/add', '/admin/users/[userId]/edit'] },
        { title: "Courses", href: "/admin/courses", icon: BookOpen, activePaths: ['/admin/courses', '/admin/courses/[courseId]/edit', '/admin/courses/[courseId]/preview'] },
        { title: "Notifications", href: "/admin/notifications", icon: Bell, activePaths: ['/admin/notifications', '/admin/notifications/add'] },
        { title: "Announcements", href: "/admin/announcements/add", icon: Megaphone, activePaths: ['/admin/announcements/add'] },
      ];
    }
    return []; 
  };

  const navLinks = getNavLinks();
  const dropdownNavItems = userDropdownNavItems(role); 

  const isActive = (item: { activePaths?: string[], href: string }) => {
    if (item.activePaths) {
      return item.activePaths.some(p => {
        const regex = new RegExp(`^\${p.replace(/\[.*?\]/g, '[^/]+')}\$`);
        return regex.test(pathname);
      });
    }
    return pathname === item.href;
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-x-6 border-b border-border bg-card px-4 md:px-6 shadow-sm">
      <Link href={role ? `/${role}/dashboard` : "/"} className="flex items-center gap-2 text-lg font-semibold transition-all-smooth hover:opacity-80 hover:scale-105">
        <GraduationCap className="h-7 w-7 text-primary" />
        <span className="font-headline text-xl text-foreground hidden sm:inline">EduSpace</span>
      </Link>
      
      <nav className="hidden md:flex items-center gap-1 mx-auto">
        {navLinks.map((link) => (
          <Button 
            key={link.title}
            variant="ghost" 
            asChild 
            className={cn(
              "text-muted-foreground hover:text-primary hover:bg-primary/10 px-3 py-2 h-auto text-sm font-medium rounded-md",
              isActive(link) && "text-primary bg-primary/10"
            )}
          >
            <Link href={link.href}> 
              {link.icon && <link.icon className="mr-1.5 h-4 w-4" />} {link.title}
            </Link>
          </Button>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary h-9 w-9 rounded-full transition-all-smooth hover:bg-accent">
              <Bell className="h-5 w-5" />
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                </span>
              )}
              <span className="sr-only">View notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 md:w-96 mt-2 shadow-lg border-border bg-card rounded-lg">
            <DropdownMenuLabel className="flex justify-between items-center px-3 py-2.5">
              <span className="text-md font-semibold text-card-foreground">Notifications</span>
              {notifications.length > 0 && hasUnread && (
                <Button variant="link" size="sm" onClick={handleMarkAllReadInDropdown} className="text-xs p-0 h-auto text-primary hover:text-primary/80">
                  Mark all as read
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="max-h-[350px]">
              {notifications.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 px-4 text-sm">
                  <Bell className="mx-auto h-10 w-10 opacity-40 mb-2"/>
                  No new notifications.
                </div>
              ) : (
                <DropdownMenuGroup>
                  {notifications.map((notification) => {
                    const NotificationIcon = notification.icon || Bell;
                    return (
                      <DropdownMenuItem key={notification.id} asChild className={cn("p-0 hover:bg-muted/70 focus:bg-muted/70 cursor-default transition-colors duration-150 ease-in-out", !notification.read && "bg-primary/5")}>
                        <div 
                          className={cn(
                            "flex items-start gap-3 px-3 py-2.5 w-full text-card-foreground",
                            notification.link && "cursor-pointer"
                          )}
                           onClick={() => handleNotificationClick(notification.id, notification.link)}
                        >
                          <NotificationIcon className={cn("h-5 w-5 mt-0.5 shrink-0", 
                            notification.category === "course" ? "text-primary" : 
                            notification.category === "system" ? "text-orange-500" :
                            notification.category === "community" ? "text-green-500" : 
                            "text-muted-foreground"
                          )} />
                          <div className="flex-grow">
                            <p className={cn("text-sm font-medium", !notification.read && "text-foreground")}>{notification.title}</p>
                            <p className={cn("text-xs text-muted-foreground line-clamp-2", !notification.read && "text-foreground/80")}>{notification.description}</p>
                            <p className="text-xs text-muted-foreground/80 mt-1">{formatRelativeTime(new Date(notification.createdAt))}</p>
                          </div>
                          {!notification.read && (
                            <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5 self-center"></div>
                          )}
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              )}
            </ScrollArea>
             {notifications.length > 0 && role === 'admin' && (
                <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="text-card-foreground hover:bg-muted cursor-pointer text-sm py-2.5 px-3 justify-center">
                    <Link href="/admin/notifications" className="flex items-center gap-2"> 
                        <Mail className="h-4 w-4 text-muted-foreground" /> View All Notifications
                    </Link>
                    </DropdownMenuItem>
                </>
             )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 p-1 rounded-full h-auto text-foreground hover:bg-muted focus-visible:ring-ring focus-visible:ring-offset-background transition-all-smooth hover:opacity-90">
              <Avatar className="h-9 w-9 border-2 border-border">
                <AvatarImage src={userDetails.avatarUrl} alt={userDetails.name} data-ai-hint={userDetails.dataAiHint}/>
                <AvatarFallback className="bg-muted text-muted-foreground">{userDetails.name.split(" ").map(n => n[0]).join("").toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="hidden lg:inline font-medium text-sm text-foreground">{userDetails.name}</span>
              <ChevronDown className="hidden lg:inline h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 mt-2 shadow-lg border-border bg-card rounded-lg">
            <DropdownMenuLabel className="font-normal text-card-foreground px-3 py-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none">{userDetails.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {userDetails.email}
                </p>
                {role && <Badge variant="outline" className="mt-1.5 w-fit capitalize text-xs font-normal">{role}</Badge>}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="md:hidden"> 
              {navLinks.map((link) => (
                   <DropdownMenuItem key={`${link.title}-mobile`} asChild className="text-card-foreground hover:bg-muted cursor-pointer text-sm py-2 px-3">
                      <Link href={link.href} className="flex items-center gap-2.5">
                          {link.icon && <link.icon className="h-4 w-4 text-muted-foreground" />} {link.title}
                      </Link>
                   </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="md:hidden"/>
            </div>
            
            {dropdownNavItems.map((item) => (
              <DropdownMenuItem key={item.title} asChild className="text-card-foreground hover:bg-muted cursor-pointer text-sm py-2 px-3">
                <Link href={item.href} className="flex items-center gap-2.5">
                  {item.icon && <item.icon className="h-4 w-4 text-muted-foreground" />}
                  <span>{item.title}</span>
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10 focus:text-destructive flex items-center gap-2.5 cursor-pointer text-sm py-2 px-3">
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
