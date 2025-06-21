
"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Trash2, Search, CheckCircle, XCircle, Send, UserCircle as UserCircleIcon, CornerDownLeft, Edit, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Course, CourseSuggestion, CourseSuggestionReply } from "@/types/platform";
import { getAllCourses, deleteCourseFromFirestore, updateCourseInFirestore, addCourseSuggestion, getCourseSuggestionThread, addReplyToSuggestion, getCourseSuggestionById } from "@/lib/mockCourses";
import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function AdminCoursesPage() {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [coursesToDisplay, setCoursesToDisplay] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user: adminUser, isLoading: authLoading } = useAuth();

  const [isSuggestionDialogOpen, setIsSuggestionDialogOpen] = useState(false);
  const [currentSuggestionCourse, setCurrentSuggestionCourse] = useState<Course | null>(null);
  const [activeSuggestionThread, setActiveSuggestionThread] = useState<CourseSuggestion | null>(null);
  const [newReplyMessage, setNewReplyMessage] = useState("");
  const [isSendingSuggestion, setIsSendingSuggestion] = useState(false);
  const [isLoadingSuggestionThread, setIsLoadingSuggestionThread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [activeSuggestionThread?.replies, activeSuggestionThread?.initialMessage]);


  const loadCourses = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedCourses = await getAllCourses(false); // Admin sees all courses
      setAllCourses(fetchedCourses.sort((a,b) => a.title.localeCompare(b.title)));
      setCoursesToDisplay(fetchedCourses.sort((a,b) => a.title.localeCompare(b.title)));
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast({ title: "Error", description: "Could not load courses from Firestore.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const toggleApproval = async (courseId: string) => {
    const course = allCourses.find(c => c.id === courseId);
    if (!course) return;

    const newApprovalStatus = !course.isApproved;
    try {
      await updateCourseInFirestore(courseId, { isApproved: newApprovalStatus });
      const updatedCourses = allCourses.map(c => c.id === courseId ? { ...c, isApproved: newApprovalStatus } : c);
      setAllCourses(updatedCourses);
      // Also update coursesToDisplay to reflect the change immediately
      setCoursesToDisplay(prevDisplayed => prevDisplayed.map(c => c.id === courseId ? { ...c, isApproved: newApprovalStatus } : c).sort((a,b) => a.title.localeCompare(b.title)));

      toast({
        title: `Course ${newApprovalStatus ? "Approved" : "Unapproved"}`,
        description: `"${course.title}" has been ${newApprovalStatus ? "approved" : "unapproved"}.`,
      });
    } catch (error) {
      console.error("Error toggling approval:", error);
      toast({ title: "Error", description: "Could not update approval status in Firestore.", variant: "destructive" });
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    const courseToDelete = allCourses.find(c => c.id === courseId);
    if (!courseToDelete) return;

    try {
      await deleteCourseFromFirestore(courseId);
      toast({
        title: "Course Deleted",
        description: `"${courseToDelete.title}" has been permanently removed from Firestore.`,
        variant: "default",
      });
      loadCourses();
    } catch (error) {
      console.error("Error deleting course:", error);
      toast({ title: "Error", description: "Could not delete course from Firestore.", variant: "destructive" });
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = event.target.value.toLowerCase();
    if (searchTerm === "") {
      setCoursesToDisplay([...allCourses].sort((a,b) => a.title.localeCompare(b.title)));
    } else {
      setCoursesToDisplay(
        allCourses.filter(course =>
          course.title.toLowerCase().includes(searchTerm) ||
          course.category.name.toLowerCase().includes(searchTerm) ||
          (course.teacherName && course.teacherName.toLowerCase().includes(searchTerm))
        ).sort((a,b) => a.title.localeCompare(b.title))
      );
    }
  };

  const handleOpenSuggestionDialog = async (course: Course) => {
    setCurrentSuggestionCourse(course);
    setIsLoadingSuggestionThread(true);
    setIsSuggestionDialogOpen(true);
    setNewReplyMessage("");
    setActiveSuggestionThread(null);

    if (adminUser?.uid) {
      try {
        const thread = await getCourseSuggestionThread(course.id, adminUser.uid);
        setActiveSuggestionThread(thread);
      } catch (error) {
        console.error("Error fetching suggestion thread:", error);
        toast({ title: "Error", description: "Could not load suggestion history.", variant: "destructive" });
        setActiveSuggestionThread(null);
      }
    } else {
      setActiveSuggestionThread(null);
    }
    setIsLoadingSuggestionThread(false);
  };

  const handleSendSuggestionOrReply = async () => {
    if (!currentSuggestionCourse || !adminUser || !adminUser.uid || !newReplyMessage.trim()) {
      toast({ title: "Error", description: "Cannot send message. User, course data, or message missing.", variant: "destructive" });
      return;
    }
    setIsSendingSuggestion(true);
    const messageToSend = newReplyMessage.trim();

    try {
      if (!activeSuggestionThread) {
        const newThreadId = await addCourseSuggestion({
          courseId: currentSuggestionCourse.id,
          courseTitle: currentSuggestionCourse.title,
          adminId: adminUser.uid,
          adminName: adminUser.displayName || "Admin",
          teacherId: currentSuggestionCourse.teacherId,
          teacherName: currentSuggestionCourse.teacherName,
          initialMessage: messageToSend,
        });
        const newThread = await getCourseSuggestionById(newThreadId);
        setActiveSuggestionThread(newThread);
        toast({
          title: "Suggestion Sent!",
          description: `Your suggestion for "${currentSuggestionCourse.title}" has been sent.`,
        });
        setNewReplyMessage("");
      } else {
        const optimisticReply: CourseSuggestionReply = {
          id: `temp-${Date.now()}`,
          senderId: adminUser.uid,
          senderName: adminUser.displayName || "Admin",
          message: messageToSend,
          createdAt: new Date(),
        };

        setActiveSuggestionThread(prevThread => {
          if (!prevThread) return null;
          return {
            ...prevThread,
            replies: [...(prevThread.replies || []), optimisticReply],
          };
        });
        setNewReplyMessage("");

        await addReplyToSuggestion(
          activeSuggestionThread.id,
          adminUser.uid,
          adminUser.displayName || "Admin",
          messageToSend,
          activeSuggestionThread.adminId,
          activeSuggestionThread.teacherId,
          activeSuggestionThread.courseTitle,
          activeSuggestionThread.courseId
        );
        const updatedThread = await getCourseSuggestionById(activeSuggestionThread.id);
        setActiveSuggestionThread(updatedThread);
        toast({
          title: "Reply Sent!",
          description: `Your reply regarding "${currentSuggestionCourse.title}" has been sent.`,
        });
      }
    } catch (error) {
      console.error("Error sending suggestion/reply:", error);
      toast({ title: "Error Sending Message", description: "Could not save message.", variant: "destructive" });
      if (activeSuggestionThread && currentSuggestionCourse?.id && adminUser?.uid) {
        const refreshedThread = await getCourseSuggestionThread(currentSuggestionCourse.id, adminUser.uid);
        setActiveSuggestionThread(refreshedThread);
      }
    } finally {
      setIsSendingSuggestion(false);
    }
  };


  if (isLoading || authLoading) {
    return (
      <DashboardLayout role="admin">
        <div className="animate-fade-in space-y-8">
          <header>
            <Skeleton className="h-8 w-1/3 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </header>
          <Card className="shadow-sm border-border/80 rounded-lg">
            <CardHeader className="p-4 sm:p-5 border-b border-border/70">
              <Skeleton className="h-6 w-1/4 mb-1" />
              <Skeleton className="h-4 w-1/2" />
              <div className="pt-3"><Skeleton className="h-9 w-full" /></div>
            </CardHeader>
            <CardContent className="p-0">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center p-4 border-b border-border/70 last:border-b-0">
                  <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                  <Skeleton className="h-7 w-20 ml-4" /> <Skeleton className="h-7 w-7 ml-2 rounded-full" /> <Skeleton className="h-7 w-7 ml-1 rounded-full" /> <Skeleton className="h-7 w-7 ml-1 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="animate-fade-in space-y-8">
        <header className="animate-slide-in-up" style={{ animationDelay: '50ms'}}>
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Course Management</h1>
            <p className="text-md text-muted-foreground mt-0.5">Review, approve, and manage all courses on EduSpace. Draft courses are also visible here.</p>
        </header>

        <Card className="shadow-sm border-border/80 rounded-lg animate-slide-in-up hover:shadow-md transition-all-smooth" style={{ animationDelay: '150ms'}}>
          <CardHeader className="p-4 sm:p-5 border-b border-border/70">
            <CardTitle className="text-lg font-semibold text-foreground">All Platform Courses</CardTitle>
            <CardDescription className="text-sm text-muted-foreground pt-0.5">
              An overview of all courses, including drafts and pending approvals.
            </CardDescription>
            <div className="pt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses by title, category, or teacher..."
                  className="pl-9 h-9 rounded-md text-sm"
                  onChange={handleSearch}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-medium text-muted-foreground">Title</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground hidden sm:table-cell">Category</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground hidden md:table-cell">Teacher</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Approval</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coursesToDisplay.map((course) => (
                  <TableRow key={course.id} className="hover:bg-muted/50 text-sm transition-colors duration-150 ease-in-out">
                    <TableCell className="font-medium text-foreground py-2.5 max-w-xs truncate">{course.title}</TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell py-2.5">{course.category.name}</TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell py-2.5">{course.teacherName}</TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant={course.isPublished ? "default" : "secondary"} className={`text-xs font-normal rounded-full py-0.5 px-2 ${course.isPublished ? "bg-green-100 text-green-700 border-green-300" : "bg-yellow-100 text-yellow-700 border-yellow-300"}`}>
                        {course.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant={course.isApproved ? "default" : "destructive"} className={`text-xs font-normal rounded-full py-0.5 px-2 ${course.isApproved ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-orange-100 text-orange-700 border-orange-300"}`}>
                        {course.isApproved ? "Approved" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-0.5 py-2.5">
                       <Link href={`/admin/courses/${course.id}/preview`} passHref>
                        <Button variant="ghost" size="icon" aria-label={`View ${course.title}`} className="text-muted-foreground hover:text-primary h-7 w-7 rounded-full">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`h-7 px-2 text-xs rounded-md ${course.isApproved ? "border-orange-500/50 text-orange-600 hover:bg-orange-500/10" : "border-green-500/50 text-green-600 hover:bg-green-500/10"}`}
                        onClick={() => toggleApproval(course.id)}
                      >
                        {course.isApproved ? <XCircle className="mr-1 h-3 w-3"/> : <CheckCircle className="mr-1 h-3 w-3"/>}
                        {course.isApproved ? "Unapprove" : "Approve"}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Send suggestion for ${course.title}`}
                        className="text-muted-foreground hover:text-primary h-7 w-7 rounded-full"
                        onClick={() => handleOpenSuggestionDialog(course)}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" aria-label={`Delete ${course.title}`} className="text-destructive/70 hover:text-destructive h-7 w-7 rounded-full">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action will permanently remove the course &quot;{course.title}&quot; from Firestore. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCourse(course.id)} className="bg-destructive hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
                {coursesToDisplay.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10 text-sm">
                      No courses found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      {currentSuggestionCourse && (
        <Dialog open={isSuggestionDialogOpen} onOpenChange={setIsSuggestionDialogOpen}>
          <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[80vh] flex flex-col p-0">
            <DialogHeader className="p-4 border-b">
              <DialogTitle className="text-lg">Suggestion for: {currentSuggestionCourse.title}</DialogTitle>
              <DialogDescription>
                Conversation with {currentSuggestionCourse.teacherName || 'Teacher'}.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-grow p-4 space-y-4 overflow-y-auto">
              {isLoadingSuggestionThread ? (
                <div className="flex justify-center items-center h-32">
                  <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeSuggestionThread?.initialMessage && (
                    <div className={cn(
                      "flex w-full max-w-xs md:max-w-md p-3 rounded-lg",
                      activeSuggestionThread.adminId === adminUser?.uid ? "ml-auto bg-primary text-primary-foreground" : "mr-auto bg-muted text-muted-foreground"
                    )}>
                      <div>
                        <p className="text-xs font-semibold mb-0.5">{activeSuggestionThread.adminName}</p>
                        <p className="text-sm">{activeSuggestionThread.initialMessage}</p>
                        <p className="text-xs opacity-70 mt-1 text-right">{format(new Date(activeSuggestionThread.createdAt), "MMM d, h:mm a")}</p>
                      </div>
                    </div>
                  )}
                  {activeSuggestionThread?.replies?.map((reply) => (
                     <div key={reply.id} className={cn(
                        "flex w-full max-w-xs md:max-w-md p-3 rounded-lg",
                        reply.senderId === adminUser?.uid ? "ml-auto bg-primary text-primary-foreground" : "mr-auto bg-muted text-muted-foreground"
                     )}>
                      <div>
                        <p className="text-xs font-semibold mb-0.5">{reply.senderName}</p>
                        <p className="text-sm">{reply.message}</p>
                        <p className="text-xs opacity-70 mt-1 text-right">{format(new Date(reply.createdAt), "MMM d, h:mm a")}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                   {(!activeSuggestionThread || (!activeSuggestionThread.initialMessage && (!activeSuggestionThread.replies || activeSuggestionThread.replies.length === 0))) && !isLoadingSuggestionThread && (
                    <p className="text-sm text-muted-foreground text-center py-4">No messages yet. Start the conversation.</p>
                  )}
                </div>
              )}
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex items-start space-x-2">
                <Avatar className="h-8 w-8 mt-0.5">
                    <AvatarImage src={adminUser?.photoURL || undefined} alt={adminUser?.displayName || "Admin"} />
                    <AvatarFallback>{adminUser?.displayName?.[0]?.toUpperCase() || "A"}</AvatarFallback>
                </Avatar>
                <Textarea
                  value={newReplyMessage}
                  onChange={(e) => setNewReplyMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="flex-grow rounded-md text-sm min-h-[60px] resize-none"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!isSendingSuggestion && newReplyMessage.trim()) {
                         handleSendSuggestionOrReply();
                      }
                    }
                  }}
                />
                <Button
                    type="button"
                    onClick={handleSendSuggestionOrReply}
                    disabled={isSendingSuggestion || !newReplyMessage.trim()}
                    className="h-auto py-2 px-3 self-end"
                    size="sm"
                >
                  {isSendingSuggestion ? (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
