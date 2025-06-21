
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Search, UserCheck, UserX, Edit, Trash2, Eye, Phone } from "lucide-react";
import type { User as AppUser } from "@/types/platform";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc, onSnapshot, query, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
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
import { Skeleton } from "@/components/ui/skeleton";

interface UserWithId extends AppUser {
  firebaseId: string; 
  phoneNumber?: string; 
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithId[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const usersCollectionRef = collection(db, "users");
    const q = query(usersCollectionRef, orderBy("name", "asc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersData = querySnapshot.docs.map(doc => ({
        firebaseId: doc.id,
        id: doc.data().uid || doc.id, // Use Firebase Auth UID if available, else Firestore doc ID
        name: doc.data().name || "N/A",
        email: doc.data().email || "N/A",
        phoneNumber: doc.data().phoneNumber || "", // Ensure phoneNumber exists
        role: doc.data().role || "student", // Default role if not specified
        avatarUrl: doc.data().avatarUrl,
        dataAiHint: doc.data().dataAiHint,
      } as UserWithId));
      setUsers(usersData);
      setFilteredUsers(usersData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching users: ", error);
      toast({ title: "Error Fetching Users", description: "Could not load user data from the database.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe(); 
  }, [toast]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = users.filter(user =>
      user.name.toLowerCase().includes(lowercasedFilter) ||
      user.email.toLowerCase().includes(lowercasedFilter) ||
      (user.phoneNumber && user.phoneNumber.toLowerCase().includes(lowercasedFilter)) || // Check if phoneNumber exists
      user.role.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredUsers(filteredData);
  }, [searchTerm, users]);

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      await deleteDoc(doc(db, "users", userId));
      toast({
        title: "User Profile Deleted from Firestore",
        description: `Profile for "${userName}" has been removed. This action is permanent and cannot be undone with Ctrl+Z for database records. Note: Deleting from Firebase Authentication requires backend logic.`,
        variant: "default", 
      });
      // No frontend undo for Firestore deletions
    } catch (error) {
      console.error("Error deleting user: ", error);
      toast({
        title: "Deletion Failed",
        description: `Could not delete profile for "${userName}".`,
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="animate-fade-in space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-slide-in-up" style={{ animationDelay: '50ms'}}>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground">User Management</h1>
            <p className="text-md text-muted-foreground mt-0.5">View, edit, or manage users on the platform.</p>
          </div>
          <Link href="/admin/users/add" passHref>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm h-9 rounded-md whitespace-nowrap">
              <PlusCircle className="mr-1.5 h-4 w-4" /> Add New User Profile
            </Button>
          </Link>
        </header>

        <Card className="shadow-sm border-border/80 rounded-lg animate-slide-in-up hover:shadow-md transition-all-smooth" style={{ animationDelay: '150ms'}}>
          <CardHeader className="p-4 sm:p-5 border-b border-border/70">
            <CardTitle className="text-lg font-semibold text-foreground">All Users</CardTitle>
            <CardDescription className="text-sm text-muted-foreground pt-0.5">
              A list of all user profiles stored in the database.
            </CardDescription>
            <div className="pt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, phone, or role..."
                  className="pl-9 h-9 rounded-md text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-3/5" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-7 w-7 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-medium text-muted-foreground">Name</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground hidden md:table-cell">Email</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground hidden lg:table-cell">Phone</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Role</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.firebaseId} className="hover:bg-muted/50 text-sm transition-colors duration-150 ease-in-out">
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatarUrl || `https://placehold.co/40x40.png?text=${user.name[0]?.toUpperCase() || 'U'}`} alt={user.name} data-ai-hint={user.dataAiHint}/>
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs">{user.name.split(" ").map(n => n[0]).join("").toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell py-2.5">{user.email}</TableCell>
                    <TableCell className="text-muted-foreground hidden lg:table-cell py-2.5">{user.phoneNumber || "N/A"}</TableCell>
                    <TableCell className="py-2.5">
                      <Badge
                        variant={user.role === 'admin' ? 'destructive' : user.role === 'teacher' ? 'secondary' : 'outline'}
                        className="capitalize text-xs font-normal rounded-full py-0.5 px-2"
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-2.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary h-7 w-7 rounded-full">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">User Actions for {user.name}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="shadow-lg border-border bg-card rounded-md w-48">
                          <DropdownMenuLabel className="text-xs px-2 py-1.5 text-muted-foreground">Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="cursor-pointer hover:bg-muted text-card-foreground text-xs px-2 py-1.5" asChild>
                            <Link href={`/admin/users/${user.firebaseId}/edit`}>
                               <Edit className="mr-2 h-3.5 w-3.5" /> Edit Profile
                            </Link>
                          </DropdownMenuItem>
                          {user.role === 'teacher' && (
                            <DropdownMenuItem className="cursor-pointer hover:bg-muted text-card-foreground text-xs px-2 py-1.5">
                               <UserCheck className="mr-2 h-3.5 w-3.5" /> View Courses
                            </DropdownMenuItem>
                          )}
                           {user.role === 'student' && (
                            <DropdownMenuItem className="cursor-pointer hover:bg-muted text-card-foreground text-xs px-2 py-1.5">
                               <UserCheck className="mr-2 h-3.5 w-3.5" /> View Progress
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer text-xs px-2 py-1.5"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Profile
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User Profile: {user.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the user's profile from Firestore. This action cannot be undone by Ctrl+Z for database records. Deleting the user from Firebase Authentication requires separate backend action.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user.firebaseId, user.name)} className="bg-destructive hover:bg-destructive/90">
                                  Confirm Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                 {filteredUsers.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10 text-sm">
                      No users found {searchTerm && "matching your search"}.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

