"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  Plus,
  Search,
  LogOut,
  MessageSquare,
  X,
  Loader2,
  SlidersHorizontal,
  Calendar,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  KeyRound,
  Sun,
  Moon
} from "lucide-react";
import { useTheme } from "next-themes";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import faculties from "@/lib/faculties.json";

export default function Dashboard() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("priority");
  const [sortOrder, setSortOrder] = useState("desc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive">("active");
  const [inactivePage, setInactivePage] = useState(1);
  const [totalInactiveCount, setTotalInactiveCount] = useState(0);

  const lastFetchedRef = useRef<any>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setInactivePage(1);
  }, [debouncedSearch, priorityFilter]);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDiscussion, setNewDiscussion] = useState(true);
  const [newPriority, setNewPriority] = useState(5);
  const [taggedFaculty, setTaggedFaculty] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        router.push("/");
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const fetchThreads = async () => {
    setLoading(true);
    try {
      let url = `/api/threads?status=${statusFilter}&sortBy=${sortBy}&sortOrder=${sortOrder}&search=${encodeURIComponent(debouncedSearch)}`;
      if (statusFilter === "inactive") {
        url += `&priority=${priorityFilter}&limit=5&page=${inactivePage}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        if (statusFilter === "inactive") {
          setThreads(data.threads || []);
          setTotalInactiveCount(data.totalCount || 0);
        } else {
          setThreads(data.threads || (Array.isArray(data) ? data : []));
          setTotalInactiveCount(0);
        }
        lastFetchedRef.current = { statusFilter, sortBy, sortOrder, debouncedSearch, inactivePage, priorityFilter };
      } else {
        toast.error(data.error || "Failed to load threads");
      }
    } catch (err) {
      toast.error("Error fetching discussions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const last = lastFetchedRef.current;
    const hasParamsChanged =
      last.statusFilter !== statusFilter ||
      last.sortBy !== sortBy ||
      last.sortOrder !== sortOrder ||
      last.debouncedSearch !== debouncedSearch ||
      last.inactivePage !== inactivePage ||
      (statusFilter === "inactive" && last.priorityFilter !== priorityFilter);

    if (hasParamsChanged) {
      fetchThreads();
    }
  }, [user, statusFilter, inactivePage, sortBy, sortOrder, debouncedSearch, priorityFilter]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      router.push("/");
    } catch (err) {
      toast.error("Logout failed");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setUpdatingPassword(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        toast.error("User session not found. Please log in again.");
        return;
      }
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      toast.success("Password updated successfully!");
      setIsPasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      if (err.code === "auth/wrong-password") {
        toast.error("Incorrect current password");
      } else {
        toast.error(err.message || "Failed to update password");
      }
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          discussion: newDiscussion,
          priority: newPriority,
          email: user?.email,
          uid: user?.uid,
          taggedFaculty: taggedFaculty
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Thread created successfully!");
        setIsModalOpen(false);
        setNewTitle("");
        setNewDescription("");
        setNewDiscussion(true);
        setNewPriority(5);
        setTaggedFaculty([]);
        fetchThreads();
      } else {
        toast.error(data.error || "Failed to create thread");
      }
    } catch (err) {
      toast.error("Error creating thread");
    } finally {
      setCreating(false);
    }
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 8) return "High";
    if (priority >= 4) return "Medium";
    return "Low";
  };

  const handleSortByDate = () => {
    if (sortBy === "createdAt") {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy("createdAt");
      setSortOrder("desc");
    }
  };

  const filteredThreads = statusFilter === "active"
    ? threads.filter((thread) => {
      if (priorityFilter === "all") return true;
      const label = getPriorityLabel(thread.priority).toLowerCase();
      return label === priorityFilter;
    })
    : threads;

  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <main className="flex flex-1 w-full">
        <div className="hidden md:flex bg-primary px-18 justify-center items-center">
          <div className="flex flex-col">
            <div className="inline-flex max-w-fit items-center justify-center py-2.5 px-1.5 bg-white rounded-xl shadow-lg shadow-primary/10 mb-3 border border-border/50">
              <Image src="/logo.png" alt="Logo" width={175} height={175} />
            </div>
            <h1 className="text-5xl font-bold leading-13 text-white">
              RMS<br />Discussion<br />Portal
            </h1>
            <p className="text-sm font-semibold text-white mt-1">
              @{user.email.split('@')[0]}
            </p>
            <div className="flex flex-col gap-2 mt-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPasswordModalOpen(true)}
                className="border-2 border-white text-white hover:text-white bg-white/10 h-11 px-5 max-w-fit hover:bg-white/3"
              >
                <KeyRound className="w-4 h-4 mr-2" />
                Change Password
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-2 border-white text-white hover:text-white bg-white/10 h-11 px-5 max-w-fit hover:bg-white/3"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <header className="border-b border-border mb-2 bg-card px-6 py-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-primary">
                RMS Discussion Portal
              </h1>
              <p className="text-xs font-semibold text-muted-foreground">
                Discussion Portal • @{user.email.split('@')[0]}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="border-border px-3 py-4 bg-card text-foreground hover:bg-background"
                title="Toggle Theme"
              >
                {mounted && theme === "dark" ? (
                  <Sun className="w-4 h-4 text-amber-500" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500" />
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsPasswordModalOpen(true)}
                className="border-border px-3 py-4 bg-card text-foreground hover:bg-background"
                title="Change Password"
              >
                <KeyRound className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="border-border px-3 py-4 bg-card text-foreground hover:bg-background"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </header>
          <div className="flex px-6 flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search threads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-card border-border w-full"
              />
            </div>

            <Button onClick={() => setIsModalOpen(true)} className="h-10 shadow-none bg-primary text-primary-foreground hover:bg-primary/95 shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              New Thread
            </Button>
          </div>

          <div className="flex px-6 flex-col sm:flex-row items-center justify-between gap-4 mt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground mr-1.5">Priority:</span>
              <button
                type="button"
                onClick={() => setPriorityFilter("all")}
                className={`px-3 py-1 cursor-pointer text-xs font-semibold rounded-sm border transition-all ${priorityFilter === "all"
                  ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/10"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setPriorityFilter("high")}
                className={`px-3 py-1 cursor-pointer text-xs font-semibold rounded-sm border transition-all ${priorityFilter === "high"
                  ? "bg-red-500/10 border-red-500/25 text-red-500 hover:bg-red-500/20"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
              >
                High
              </button>
              <button
                type="button"
                onClick={() => setPriorityFilter("medium")}
                className={`px-3 py-1 cursor-pointer text-xs font-semibold rounded-sm border transition-all ${priorityFilter === "medium"
                  ? "bg-amber-500/10 border-amber-500/25 text-amber-500 hover:bg-amber-500/20"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
              >
                Medium
              </button>
              <button
                type="button"
                onClick={() => setPriorityFilter("low")}
                className={`px-3 py-1 cursor-pointer text-xs font-semibold rounded-sm border transition-all ${priorityFilter === "low"
                  ? "bg-blue-500/10 border-blue-500/25 text-blue-500 hover:bg-blue-500/20"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
              >
                Low
              </button>
            </div>

            <div className="flex items-center gap-2 sm:ml-auto">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter(statusFilter === "active" ? "inactive" : "active");
                  setInactivePage(1);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold cursor-pointer rounded-md border flex items-center gap-1.5 transition-all shadow-none ${statusFilter === "inactive"
                  ? "bg-neutral-800 border-neutral-700 text-white dark:bg-neutral-200 dark:border-neutral-300 dark:text-neutral-900"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
              >
                {statusFilter === "inactive" ? "> Show Active Threads" : "> View Inactive Threads"}
              </button>
            </div>
          </div>

          <div className="bg-card mx-6 border border-border rounded-lg overflow-hidden">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">
                  {statusFilter === "inactive" ? "Loading inactive discussions..." : "Loading active discussions..."}
                </p>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-center px-4">
                <MessageSquare className="w-12 h-12 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {statusFilter === "inactive" ? "No inactive threads found" : "No active threads found"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    {search ? "Try adjusting your search keywords." : "Start a new collaboration discussion thread."}
                  </p>
                </div>
                {!search && statusFilter === "active" && (
                  <Button onClick={() => setIsModalOpen(true)} size="sm" className="mt-2">
                    Create Thread
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground font-semibold">
                      <th className="px-6 py-3.5">Title</th>
                      <th className="px-6 py-3.5">Description</th>
                      <th
                        className="px-6 py-3.5 cursor-pointer select-none hover:bg-muted/60 transition-colors"
                        onClick={handleSortByDate}
                      >
                        <div className="flex items-center gap-1">
                          Date Created
                          {sortBy === "createdAt" ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-primary" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/60" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3.5 text-right">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredThreads.map((thread) => {
                      const currentUserUsername = user?.email ? user.email.split("@")[0] : "";
                      const isCurrentUserTagged = Array.isArray(thread.taggedFaculty)
                        ? thread.taggedFaculty.includes(currentUserUsername)
                        : thread.taggedFaculty === currentUserUsername;
                      return (
                        <tr
                          key={thread.id}
                          onClick={() => router.push(`/dashboard/thread/${thread.id}`)}
                          className={`cursor-pointer transition-colors duration-150 ${isCurrentUserTagged
                            ? "bg-primary/5 hover:bg-primary/10"
                            : "hover:bg-muted/30"
                            }`}
                        >
                          <td className="px-6 py-4 font-bold text-sm text-foreground max-w-xs">
                            <div className="flex flex-col gap-1">
                              <span className="truncate block">{thread.title}</span>
                              {((Array.isArray(thread.taggedFaculty) && thread.taggedFaculty.length > 0) ||
                                (!Array.isArray(thread.taggedFaculty) && thread.taggedFaculty)) && (
                                  <div className="flex flex-wrap gap-1">
                                    {Array.isArray(thread.taggedFaculty) ? (
                                      thread.taggedFaculty.map((faculty: string) => (
                                        <span
                                          key={faculty}
                                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${faculty === currentUserUsername
                                            ? "bg-primary/20 text-primary border border-primary/30"
                                            : "bg-muted text-muted-foreground border border-border"
                                            }`}
                                        >
                                          @{faculty}
                                        </span>
                                      ))
                                    ) : (
                                      <span
                                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${thread.taggedFaculty === currentUserUsername
                                          ? "bg-primary/20 text-primary border border-primary/30"
                                          : "bg-muted text-muted-foreground border border-border"
                                          }`}
                                      >
                                        @{thread.taggedFaculty}
                                      </span>
                                    )}
                                  </div>
                                )}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-xs text-muted-foreground max-w-sm">
                            <div className="truncate">
                              {thread.description || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                              {new Date(thread.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Badge level={thread.priority}>
                              {getPriorityLabel(thread.priority)}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {statusFilter === "inactive" && Math.ceil(totalInactiveCount / 5) > 1 && (
              <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  Showing {Math.min((inactivePage - 1) * 5 + 1, totalInactiveCount)}-{Math.min(inactivePage * 5, totalInactiveCount)} of {totalInactiveCount} inactive threads
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInactivePage((p) => Math.max(p - 1, 1))}
                    disabled={inactivePage === 1 || loading}
                    className="border-border text-foreground hover:bg-muted"
                  >
                    Previous
                  </Button>
                  <span className="text-xs font-semibold text-foreground px-2">
                    Page {inactivePage} of {Math.ceil(totalInactiveCount / 5)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInactivePage((p) => Math.min(p + 1, Math.ceil(totalInactiveCount / 5)))}
                    disabled={inactivePage === Math.ceil(totalInactiveCount / 5) || loading}
                    className="border-border text-foreground hover:bg-muted"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Start New Discussion</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateThread} className="p-6 flex flex-col gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground" htmlFor="thread-title">
                  Discussion Title <span className="text-primary">*</span>
                </label>
                <Input
                  id="thread-title"
                  placeholder="e.g. Research Journal Publication Review"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  disabled={creating}
                  className="bg-background border-border h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground" htmlFor="thread-desc">
                  Description
                </label>
                <textarea
                  id="thread-desc"
                  placeholder="Provide context or guidelines for the discussion..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  disabled={creating}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm shadow-none transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 border-border"
                />
              </div>

              <div className="flex items-center justify-between border-t border-b border-border/60 py-3 my-1">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-foreground">Discussion Chat</span>
                  <span className="text-[10px] text-muted-foreground">Allow users to message and converse</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNewDiscussion(!newDiscussion)}
                  disabled={creating}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${newDiscussion ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-800"
                    }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${newDiscussion ? "translate-x-5" : "translate-x-0"
                      }`}
                  />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Priority Level
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPriority(2)}
                    disabled={creating}
                    className={`flex-1 py-2 text-xs font-bold rounded-md border transition-all ${newPriority === 2
                      ? "bg-blue-500/10 border-blue-500/25 text-blue-500 shadow-none"
                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                      }`}
                  >
                    Low
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPriority(5)}
                    disabled={creating}
                    className={`flex-1 py-2 text-xs font-bold rounded-md border transition-all ${newPriority === 5
                      ? "bg-amber-500/10 border-amber-500/25 text-amber-500 shadow-none"
                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                      }`}
                  >
                    Medium
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPriority(9)}
                    disabled={creating}
                    className={`flex-1 py-2 text-xs font-bold rounded-md border transition-all ${newPriority === 9
                      ? "bg-red-500/10 border-red-500/25 text-red-500 shadow-none"
                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                      }`}
                  >
                    High
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Tag Faculty
                </label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {faculties.map((f: any) => {
                    const isSelected = taggedFaculty.includes(f.username);
                    return (
                      <button
                        key={f.username}
                        type="button"
                        disabled={creating}
                        onClick={() => {
                          if (isSelected) {
                            setTaggedFaculty(taggedFaculty.filter((u) => u !== f.username));
                          } else {
                            setTaggedFaculty([...taggedFaculty, f.username]);
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer ${isSelected
                          ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/10"
                          : "bg-card border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          }`}
                      >
                        {f.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={creating}
                  className="border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="bg-primary text-primary-foreground hover:bg-primary/95"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Thread"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Change Password</h3>
              </div>
              <button
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="p-6 flex flex-col gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground" htmlFor="current-password">
                  Current Password <span className="text-primary">*</span>
                </label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={updatingPassword}
                  className="bg-background border-border h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground" htmlFor="new-password">
                  New Password <span className="text-primary">*</span>
                </label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password (min. 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={updatingPassword}
                  className="bg-background border-border h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground" htmlFor="confirm-password">
                  Confirm New Password <span className="text-primary">*</span>
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={updatingPassword}
                  className="bg-background border-border h-10"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  disabled={updatingPassword}
                  className="border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updatingPassword}
                  className="bg-primary text-primary-foreground hover:bg-primary/95"
                >
                  {updatingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
