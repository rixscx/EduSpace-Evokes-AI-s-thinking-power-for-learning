
"use client";

import type { UserRole } from "@/types/platform";
import type React from "react";
import { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

interface AuthContextType {
  user: FirebaseUser | null;
  role: UserRole | null;
  loginUser: (role: UserRole) => void, 
  logout: () => void;
  isLoading: boolean;
  setRoleForContext: (role: UserRole) => void; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setRole(userData.role as UserRole); 
        } else {
          // User document doesn't exist. This is an anomaly for a logged-in user post-registration.
          // LoginForm should handle Firestore doc creation/updates primarily.
          // If doc is missing here, means something went wrong or it's a very new Firebase Auth user
          // not yet processed by our app's registration flow.
          console.error(`User document not found for authenticated user ${firebaseUser.uid}. Role will be null.`);
          setRole(null); 
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []); // Empty dependency array for stability, reacts only to auth state changes

  useEffect(() => {
    if (isLoading) {
      return; // Wait until authentication status and role are resolved
    }

    const homePath = "/"; // Typically student login
    const registerPathRoot = "/register";
    const adminLoginPath = "/admin/login";
    const teacherLoginPath = "/teacher/login";
    const studentLoginPath = "/student/login"; // Often same as homePath

    // Check if the current path is one of the primary public/authentication paths
    const isPublicAuthPath =
      pathname === homePath ||
      pathname.startsWith(registerPathRoot) || // Handles /register and /register?role=...
      pathname === adminLoginPath ||
      pathname === teacherLoginPath ||
      pathname === studentLoginPath;

    if (user && role) {
      // User is authenticated and has a defined role
      const userDashboardPath = `/${role}/dashboard`;
      const isOnTheirLoginPath = pathname === `/${role}/login`;
      // Special case for student role if their login page is the root path
      const isOnRootAndShouldBeStudentDashboard = role === 'student' && pathname === homePath;

      if (isOnTheirLoginPath || isOnRootAndShouldBeStudentDashboard) {
        // If user is on their own login page, or student on root, redirect to their dashboard
        router.push(userDashboardPath);
      } else if (pathname.startsWith(`/${role}/`)) {
        // User is already on a page that belongs to their role (e.g., /student/courses). Do nothing.
      } else if (!isPublicAuthPath) {
        // User is logged in, has a role, but is on a path that:
        // 1. Doesn't belong to their role (e.g., student trying to access /admin/users)
        // 2. Is NOT one of the defined public authentication paths.
        // This implies they are on a protected page of another role or an unknown page.
        router.push(userDashboardPath);
      }
      // If user is logged in and on a public auth path that isn't their own (e.g., student on /admin/login),
      // they are allowed to stay. They can use UI links to navigate or will be redirected if they attempt access.
    } else {
      // User is not authenticated (user is null or role is null)
      if (!isPublicAuthPath) {
        // If not on a public authentication path, redirect to the main login page
        router.push(homePath);
      }
    }
  }, [user, role, pathname, router, isLoading]);


  const loginUser = (loggedInRole: UserRole) => {
    setRole(loggedInRole); 
    // Immediate redirection is now primarily handled by LoginForm,
    // but this can be a fallback or used by other auth mechanisms if needed.
    router.push(`/${loggedInRole}/dashboard`);
  };
  
  const setRoleForContext = (newRole: UserRole) => {
    setRole(newRole);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      //setUser(null); // Handled by onAuthStateChanged
      //setRole(null); // Handled by onAuthStateChanged
      router.push("/"); // Redirect to home/main login page after logout
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
        // setIsLoading(false); //isLoading will be set to false by onAuthStateChanged
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loginUser, logout, isLoading, setRoleForContext }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
