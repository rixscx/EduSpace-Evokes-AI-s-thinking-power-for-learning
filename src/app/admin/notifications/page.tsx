
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Bell, Eye, Check, Layers, ArchiveRestore } from "lucide-react";
import { 
  deleteNotification, 
  undoLastNotificationDeletion, 
  markNotificationAsRead, 
  markNotificationAsUnread, 
  markAllNotificationsAsRead,
  markAllNotificationsAsUnread,
  getProcessedNotifications
} from "@/config/nav";
import type { NotificationItem } from "@/types/platform";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type NotificationFilter = "all" | "unread" | "read";

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const { toast } = useToast();

  const loadNotifications = useCallback(() => {
    const processed = getProcessedNotifications();
    setNotifications(processed);
  }, []);

  useEffect(() => {
    loadNotifications();
     // Refresh from localStorage periodically as other components (header) might change read status
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const filteredNotifications = notifications.filter(n => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });


  const handleDelete = (notificationId: string, notificationTitle: string) => {
    deleteNotification(notificationId);
    loadNotifications(); 
    toast({
      title: "Notification Deleted",
      description: `"${notificationTitle}" has been removed. Press Ctrl+Z (or Cmd+Z) to undo.`,
      variant: "destructive",
    });
  };

  const handleToggleReadStatus = (notificationId: string, currentStatus: boolean) => {
    if (currentStatus) {
      markNotificationAsUnread(notificationId);
    } else {
      markNotificationAsRead(notificationId);
    }
    loadNotifications(); 
  };

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead();
    loadNotifications(); 
    toast({ title: "All notifications marked as read." });
  };
  
  const handleMarkAllUnread = () => {
    markAllNotificationsAsUnread();
    loadNotifications(); 
    toast({ title: "All notifications marked as unread." });
  };

  const handleUndo = useCallback(() => {
    const restoredNotification = undoLastNotificationDeletion();
    if (restoredNotification) {
      loadNotifications(); 
      toast({
        title: "Notification Restored",
        description: `"${restoredNotification.title}" has been restored.`,
      });
    } else {
      toast({
        title: "Nothing to Undo",
        description: "No recent notification deletions to undo.",
        variant: "default"
      });
    }
  }, [loadNotifications, toast]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo]);

  const hasUnreadNotifications = notifications.some(n => !n.read);
  const allNotificationsRead = notifications.length > 0 && !hasUnreadNotifications;

  return (
    <DashboardLayout role="admin">
      <div className="animate-fade-in space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-slide-in-up" style={{ animationDelay: '50ms'}}>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground flex items-center">
              <Bell className="mr-3 h-7 w-7 text-primary" /> Notification Management
            </h1>
            <p className="text-md text-muted-foreground mt-0.5">View and manage all platform notifications.</p>
          </div>
        </header>

        <Card className="shadow-sm border-border/80 rounded-lg animate-slide-in-up hover:shadow-md transition-all-smooth" style={{ animationDelay: '150ms'}}>
          <CardHeader className="p-4 sm:p-5 border-b border-border/70">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <CardTitle className="text-lg font-semibold text-foreground">All Notifications Log</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground pt-0.5">
                    Overview of all notifications sent on EduSpace. Read status persists in your browser.
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                    <Tabs value={filter} onValueChange={(value) => setFilter(value as NotificationFilter)} className="w-auto">
                        <TabsList className="h-8 text-xs px-0.5 bg-muted rounded-md">
                            <TabsTrigger value="all" className="h-7 px-2.5 text-xs rounded-[0.2rem]">All</TabsTrigger>
                            <TabsTrigger value="unread" className="h-7 px-2.5 text-xs rounded-[0.2rem]">Unread</TabsTrigger>
                            <TabsTrigger value="read" className="h-7 px-2.5 text-xs rounded-[0.2rem]">Read</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    {hasUnreadNotifications && (
                      <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="h-8 text-xs" disabled={!hasUnreadNotifications}>
                          <Check className="mr-1.5 h-3.5 w-3.5"/> Mark All Read
                      </Button>
                    )}
                    {allNotificationsRead && notifications.length > 0 && (
                      <Button variant="outline" size="sm" onClick={handleMarkAllUnread} className="h-8 text-xs">
                          <ArchiveRestore className="mr-1.5 h-3.5 w-3.5"/> Mark All Unread
                      </Button>
                    )}
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-medium text-muted-foreground w-[50px] text-center">Status</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Title</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground hidden sm:table-cell">Description</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Category</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground hidden md:table-cell">Created At</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotifications.map((notification) => {
                  const NotificationIcon = notification.icon || Bell;
                  return (
                  <TableRow key={notification.id} className={`hover:bg-muted/50 text-sm transition-colors duration-150 ease-in-out ${!notification.read ? 'bg-primary/5' : ''}`}>
                    <TableCell className="text-center py-2.5">
                      <Button variant="ghost" size="icon" onClick={() => handleToggleReadStatus(notification.id, notification.read)} className="h-7 w-7 rounded-full">
                        {notification.read ? <Layers className="h-4 w-4 text-muted-foreground" title="Mark as Unread"/> : <Check className="h-4 w-4 text-primary" title="Mark as Read"/>}
                      </Button>
                    </TableCell>
                    <TableCell className="py-2.5">
                        <div className="flex items-center gap-2">
                            <NotificationIcon className={`h-4 w-4 shrink-0 ${
                                notification.category === 'course' ? 'text-blue-500' :
                                notification.category === 'system' ? 'text-orange-500' :
                                notification.category === 'community' ? 'text-green-500' :
                                'text-muted-foreground'
                            }`} />
                            <span className={`font-medium max-w-xs truncate ${!notification.read ? 'text-foreground' : 'text-foreground/80'}`}>{notification.title}</span>
                        </div>
                    </TableCell>
                    <TableCell className={`text-muted-foreground hidden sm:table-cell py-2.5 max-w-sm truncate ${!notification.read ? 'text-foreground/70' : ''}`}>{notification.description}</TableCell>
                    <TableCell className="py-2.5">
                      <Badge
                        variant={notification.category === 'system' ? 'destructive' : notification.category === 'course' ? 'default' : 'secondary'}
                        className="capitalize text-xs font-normal rounded-full py-0.5 px-2"
                      >
                        {notification.category || "General"}
                      </Badge>
                    </TableCell>
                    <TableCell className={`hidden md:table-cell py-2.5 text-xs ${!notification.read ? 'text-foreground/70 font-medium' : 'text-muted-foreground'}`}>
                      {format(new Date(notification.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </TableCell>
                    <TableCell className="text-right space-x-0.5 py-2.5">
                      {notification.link ? (
                        <Button asChild variant="ghost" size="icon" aria-label={`View ${notification.title}`} className="text-muted-foreground hover:text-primary h-7 w-7 rounded-full">
                           <Link href={notification.link} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4" /></Link>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" aria-label={`View ${notification.title}`} className="text-muted-foreground h-7 w-7 rounded-full opacity-50 cursor-not-allowed" disabled>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Delete ${notification.title}`} className="text-destructive/70 hover:text-destructive h-7 w-7 rounded-full">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone by other means after leaving this page. This will remove the notification titled &quot;{notification.title}&quot;.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(notification.id, notification.title)} className="bg-destructive hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                )})}
                {filteredNotifications.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10 text-sm">
                      No notifications found matching &quot;{filter}&quot; criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
