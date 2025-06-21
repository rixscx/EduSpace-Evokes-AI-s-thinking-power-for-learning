
"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User as AppUser, Course, UserRole as AppUserRole, BadgeAward, CertificateRecord } from "@/types/platform";
import {
  Mail,
  Edit,
  Settings,
  ShoppingCart,
  BarChartBig,
  BookOpen as BookOpenIcon,
  Award as AwardIcon,
  FileText as FileTextIcon,
  CalendarDays,
  RotateCcw,
  BadgeCheck,
  ExternalLink,
  Share2
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LessonCard } from "@/components/course/LessonCard";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import Link from "next/link";
import { getAllCourses, getEarnedBadgesForUser, getCertificatesForUser } from "@/lib/mockCourses";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from 'next/navigation'
import { cn } from "@/lib/utils";


interface ProfileUser extends AppUser {
  joinedDate?: string;
  stats?: {
    coursesEnrolled: number;
    coursesCompleted: number;
    certificatesEarned: number;
  }
}

function ProfilePageSkeleton() {
  return (
    <div className="animate-fade-in space-y-8 p-4 md:p-6">
        <Skeleton className="h-10 w-1/3 mb-4" />
        <Card className="shadow-lg border-border/70 rounded-xl bg-card">
            <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <Skeleton className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-muted" />
                    <div className="flex-grow space-y-3 w-full md:w-auto">
                        <Skeleton className="h-7 w-3/4 bg-muted rounded-md" />
                        <Skeleton className="h-5 w-full bg-muted rounded-sm" />
                        <Skeleton className="h-5 w-2/3 bg-muted rounded-sm" />
                        <Skeleton className="h-9 w-1/3 bg-muted rounded-md mt-3" />
                    </div>
                    <div className="grid grid-cols-3 gap-x-6 gap-y-3 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-border/60 md:pl-6 mt-4 md:mt-0 text-center w-full md:w-auto">
                        {[1,2,3].map(i => <div key={i} className="space-y-1.5"><Skeleton className="h-7 w-10 bg-muted rounded-sm mx-auto" /><Skeleton className="h-4 w-20 bg-muted rounded-sm mx-auto" /></div>)}
                    </div>
                </div>
            </CardContent>
        </Card>
        <Skeleton className="h-12 w-full bg-muted rounded-md my-6" />
        <Card className="shadow-lg border-border/70 bg-card"><CardContent className="p-6"><Skeleton className="h-72 bg-muted rounded-lg" /></CardContent></Card>
    </div>
  );
}

function StudentProfilePageContent() {
  const { user: firebaseUser, role, isLoading: authIsLoading } = useAuth();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [profileData, setProfileData] = useState<ProfileUser | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [learningCourses, setLearningCourses] = useState<(Course & { progress?: number })[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<BadgeAward[]>([]);
  const [earnedCertificates, setEarnedCertificates] = useState<CertificateRecord[]>([]);

  const highlightedCertificateId = searchParams.get('highlight');
  const defaultTab = searchParams.get('tab') || 'learning';


  const fetchProfileAndCourseData = useCallback(async (fbUser: FirebaseUser) => {
    setPageLoading(true);
    try {
      const userDocRef = doc(db, "users", fbUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      const defaultName = fbUser.displayName || fbUser.email?.split('@')[0] || "Student User";
      const defaultAvatar = fbUser.photoURL || `https://placehold.co/100x100.png?text=${defaultName[0]?.toUpperCase()}`;
      const defaultRole: AppUserRole = "student";
      const defaultDataAiHint = `${defaultRole} avatar`;

      let firestoreUserStats = { coursesEnrolled: 0, coursesCompleted: 0, certificatesEarned: 0 };

      const certificatesFromFirestore = await getCertificatesForUser(fbUser.uid);
      setEarnedCertificates(certificatesFromFirestore);
      const approvedCertsCount = certificatesFromFirestore.filter(c => c.status === 'approved').length;

      if (userDocSnap.exists()) {
        const dbUser = userDocSnap.data();
        firestoreUserStats = dbUser.stats || firestoreUserStats;
        firestoreUserStats.certificatesEarned = approvedCertsCount; // Override with fresh count

        setProfileData({
          id: fbUser.uid,
          name: dbUser.name || defaultName,
          email: dbUser.email || fbUser.email || "No email",
          avatarUrl: dbUser.avatarUrl || defaultAvatar,
          role: (dbUser.role || defaultRole) as AppUserRole,
          joinedDate: dbUser.createdAt ? format(new Date(dbUser.createdAt.seconds * 1000), "MMMM d, yyyy") : "Not available",
          stats: firestoreUserStats,
          dataAiHint: dbUser.dataAiHint || `${dbUser.role || defaultRole} avatar`
        });
      } else {
         firestoreUserStats.certificatesEarned = approvedCertsCount;
         const basicProfile = {
            id: fbUser.uid,
            name: defaultName,
            email: fbUser.email || "No email",
            avatarUrl: defaultAvatar,
            role: defaultRole,
            joinedDate: "Not available",
            stats: firestoreUserStats,
            dataAiHint: defaultDataAiHint
         };
         setProfileData(basicProfile);
      }

      const allAvailableCourses = await getAllCourses(true);
      setLearningCourses(allAvailableCourses.slice(0, 3).map(c => ({...c, progress: Math.floor(Math.random() * 70) + 10 })));

      const badgesFromFirestore = await getEarnedBadgesForUser(fbUser.uid);
      setEarnedBadges(badgesFromFirestore);

    } catch (error) {
      console.error("Error fetching profile or course data:", error);
      toast({title: "Error", description: "Could not load profile or course data from Firestore.", variant: "destructive"});
    } finally {
      setPageLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    if (firebaseUser && !authIsLoading) {
      fetchProfileAndCourseData(firebaseUser);
    } else if (!authIsLoading && !firebaseUser) {
        setPageLoading(false);
    }
  }, [firebaseUser, authIsLoading, fetchProfileAndCourseData]);

  const handleCopyVerificationLink = (certificateId: string) => {
    const url = `${window.location.origin}/verify/${certificateId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied!",
      description: "The verification link has been copied to your clipboard."
    });
  };


  if (authIsLoading || pageLoading) {
    return <ProfilePageSkeleton />;
  }

  if (!profileData || !profileData.stats) {
    return (
        <DashboardLayout role="student">
            <div className="text-center p-10">Could not load profile information. Please try again later or ensure you are logged in.</div>
        </DashboardLayout>
    );
  }


  const tabItems = [
    { value: "learning", label: "My Learning", icon: BookOpenIcon },
    { value: "badges", label: "Badges", icon: AwardIcon },
    { value: "certificates", label: "Certificates", icon: FileTextIcon },
    { value: "orders", label: "Order History", icon: ShoppingCart },
    { value: "settings", label: "Settings", icon: Settings },
  ];

  const placeholderContentTabItems = [
    { value: "orders", title: "Order History", icon: ShoppingCart, message: "You have no past orders." },
    { value: "settings", title: "Account Settings", icon: Settings, message: "Account settings will be available here." },
  ];


  return (
    <DashboardLayout role="student">
      <div className="animate-fade-in space-y-8">
        <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight animate-slide-in-up" style={{ animationDelay: '50ms'}}>My Profile</h1>

        <Card className="shadow-xl border-border/60 rounded-xl overflow-hidden bg-card animate-slide-in-up hover:shadow-2xl transition-all-smooth" style={{ animationDelay: '100ms'}}>
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
              <Avatar className="h-28 w-28 md:h-32 md:w-32 border-4 border-primary/20 shadow-md">
                <AvatarImage src={profileData.avatarUrl} alt={profileData.name} data-ai-hint={profileData.dataAiHint || "student avatar"}/>
                <AvatarFallback className="text-4xl bg-muted text-muted-foreground">{profileData.name.split(" ").map(n => n[0]).join("").toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-grow text-center md:text-left space-y-1">
                <h2 className="text-2xl md:text-3xl font-semibold text-foreground">{profileData.name}</h2>
                <div className="flex items-center justify-center md:justify-start text-muted-foreground text-sm">
                  <Mail className="h-4 w-4 mr-2 text-primary" />
                  <span>{profileData.email}</span>
                </div>
                <div className="flex items-center justify-center md:justify-start text-muted-foreground text-sm">
                  <CalendarDays className="h-4 w-4 mr-2 text-primary" />
                  <span>Joined: {profileData.joinedDate}</span>
                </div>
                <Button variant="outline" size="sm" className="mt-4 text-xs rounded-md" disabled>
                  <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Profile
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-x-6 gap-y-2 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-border/60 md:pl-6 mt-4 md:mt-0 text-center w-full md:w-auto">
                <div>
                  <p className="text-2xl font-semibold text-primary">{profileData.stats.coursesEnrolled}</p>
                  <p className="text-xs text-muted-foreground">Enrolled</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-green-600">{profileData.stats.coursesCompleted}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-yellow-500">{profileData.stats.certificatesEarned}</p>
                  <p className="text-xs text-muted-foreground">Badges</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue={defaultTab} className="w-full animate-slide-in-up" style={{ animationDelay: '150ms'}}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1 bg-muted p-1.5 rounded-lg shadow-sm">
            {tabItems.map(tab => (
                 <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="text-xs sm:text-sm py-2.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md rounded-md flex items-center justify-center gap-1.5 transition-all-smooth"
                  >
                    {tab.icon && <tab.icon className="h-4 w-4"/>}
                    {tab.label}
                </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="learning" className="mt-6">
            <Card className="shadow-lg border-border/70 bg-card rounded-xl animate-slide-in-up hover:shadow-xl transition-all-smooth" style={{ animationDelay: '200ms'}}>
              <CardHeader className="p-5 sm:p-6">
                <CardTitle className="text-xl font-semibold flex items-center text-foreground"><BarChartBig className="mr-2 h-5 w-5 text-primary" /> Continue Learning</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">Pick up where you left off.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {learningCourses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                    {learningCourses.map((course, index) => (
                        <div key={course.id} className="animate-slide-in-up" style={{ animationDelay: `${200 + index * 75}ms`}}>
                            <LessonCard course={course} />
                        </div>
                    ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <BookOpenIcon className="h-16 w-16 mx-auto mb-4 opacity-40"/>
                        <p className="text-md font-medium">You are not actively learning any courses.</p>
                        <Button asChild variant="link" className="text-primary text-sm mt-2"><Link href="/student/courses">Explore courses</Link></Button>
                    </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="badges" className="mt-6">
            <Card className="shadow-lg border-border/70 bg-card rounded-xl animate-slide-in-up hover:shadow-xl transition-all-smooth" style={{ animationDelay: '200ms'}}>
              <CardHeader className="p-5 sm:p-6">
                <CardTitle className="text-xl font-semibold flex items-center text-foreground">
                  <AwardIcon className="mr-2.5 h-5 w-5 text-primary"/> My Badges
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 min-h-[200px]">
                {earnedBadges.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {earnedBadges.map((badge) => (
                      <Card key={badge.id || badge.courseId} className="p-4 flex flex-col items-center text-center bg-muted/50">
                        <AwardIcon className="h-10 w-10 text-yellow-500 mb-2" />
                        <p className="font-semibold text-foreground">{badge.badgeName}</p>
                        <p className="text-xs text-muted-foreground">From: {badge.courseTitle}</p>
                        {badge.awardedDate && <p className="text-xs text-muted-foreground mt-1">Earned: {format(new Date(badge.awardedDate), "MMM d, yyyy")}</p>}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full py-10">
                    <AwardIcon className="h-16 w-16 mx-auto mb-5 opacity-30"/>
                    <p className="text-md">No badges earned yet. Complete courses to unlock them!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certificates" className="mt-6">
            <Card className="shadow-lg border-border/70 bg-card rounded-xl animate-slide-in-up hover:shadow-xl transition-all-smooth" style={{ animationDelay: '200ms'}}>
                <CardHeader className="p-5 sm:p-6">
                    <CardTitle className="text-xl font-semibold flex items-center text-foreground">
                    <FileTextIcon className="mr-2.5 h-5 w-5 text-primary"/> My Certificates
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 min-h-[200px]">
                    {earnedCertificates.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {earnedCertificates.map(cert => (
                            <Card key={cert.id} className={cn("p-4 flex flex-col items-center text-center bg-muted/50", highlightedCertificateId === cert.id && 'ring-2 ring-primary ring-offset-2 ring-offset-background')}>
                                <BadgeCheck className="h-10 w-10 text-green-600 mb-2" />
                                <p className="font-semibold text-foreground text-sm">{cert.courseTitle}</p>
                                <p className="text-xs text-muted-foreground">Issued: {format(new Date(cert.issuedDate), "MMM d, yyyy")}</p>
                                <div className="mt-3 flex items-center gap-2">
                                    <Button variant="outline" size="sm" asChild className="text-xs">
                                        <Link href={`/verify/${cert.id}`} target="_blank">
                                            <ExternalLink className="mr-1.5 h-3.5 w-3.5"/> Verify
                                        </Link>
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleCopyVerificationLink(cert.id!)} className="text-xs">
                                        <Share2 className="mr-1.5 h-3.5 w-3.5"/> Share
                                    </Button>
                                </div>
                            </Card>
                        ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full py-10">
                            <FileTextIcon className="h-16 w-16 mx-auto mb-5 opacity-30"/>
                            <p className="text-md">No certificates earned yet. Pass final quizzes to earn them!</p>
                        </div>
                    )}
                </CardContent>
            </Card>
          </TabsContent>

          {placeholderContentTabItems.map(tab => (
            <TabsContent key={tab.value} value={tab.value} className="mt-6">
                <Card className="shadow-lg border-border/70 bg-card rounded-xl animate-slide-in-up hover:shadow-xl transition-all-smooth" style={{ animationDelay: '200ms'}}>
                  <CardHeader  className="p-5 sm:p-6">
                      <CardTitle className="text-xl font-semibold flex items-center text-foreground">
                        {tab.icon && <tab.icon className="mr-2.5 h-5 w-5 text-primary"/>}
                        {tab.title}
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 min-h-[200px] flex flex-col items-center justify-center text-center text-muted-foreground">
                      {tab.icon && <tab.icon className="h-16 w-16 mx-auto mb-5 opacity-30"/>}
                      <p className="text-md">{tab.message}</p>
                      {tab.value === 'settings' && <Button size="sm" className="mt-4 text-sm rounded-md" disabled>Go to Full Settings Page</Button>}
                  </CardContent>
                </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

export default function StudentProfilePage() {
    return (
        <Suspense fallback={<ProfilePageSkeleton />}>
            <StudentProfilePageContent />
        </Suspense>
    )
}
