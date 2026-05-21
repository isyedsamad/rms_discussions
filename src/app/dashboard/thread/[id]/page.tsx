"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Send,
  Calendar,
  MessageSquare,
  Loader2,
  User,
  Layers,
  Clock,
  Trash,
  Sun,
  Moon
} from "lucide-react";
import { useTheme } from "next-themes";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

export default function ThreadDetail() {
  const router = useRouter();
  const params = useParams();
  const threadId = params.id as string;

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [thread, setThread] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showActivityPopup, setShowActivityPopup] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const prevChatsLengthRef = useRef(0);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastChatsLengthRef = useRef(0);
  const userSentMessageRef = useRef(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sending && thread && thread.discussion && !loading) {
      inputRef.current?.focus();
    }
  }, [sending, loading, thread?.discussion]);

  const handleContinueChatting = () => {
    lastActivityRef.current = Date.now();
    setShowActivityPopup(false);
    fetchThread(true);
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/threads/${threadId}/messages`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          senderId: user.uid,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setThread((prev: any) => ({
          ...prev,
          chats: (prev.chats || []).filter((chat: any) => chat.id !== messageId),
        }));
        toast.success("Message deleted");
      } else {
        toast.error(data.error || "Failed to delete message");
      }
    } catch (err) {
      toast.error("Error deleting message");
    } finally {
      setMessageToDelete(null);
      lastActivityRef.current = Date.now();
    }
  };

  const handleToggleStatus = async () => {
    if (updatingStatus) return;
    const newStatus = thread.status === "inactive" ? "active" : "inactive";
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          closedBy: newStatus === "inactive" ? {
            uid: user.uid,
            email: user.email,
          } : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setThread((prev: any) => ({
          ...prev,
          status: newStatus,
          closedBy: newStatus === "inactive" ? {
            uid: user.uid,
            email: user.email,
          } : null,
        }));
      } else {
        toast.error(data.error || "Failed to update thread status");
      }
    } catch (err) {
      toast.error("Error updating thread status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getFormattedDateSeparator = (timestampStr: string, prevTimestampStr?: string) => {
    const date = new Date(timestampStr);
    const dateString = date.toDateString();
    if (prevTimestampStr) {
      const prevDateString = new Date(prevTimestampStr).toDateString();
      if (dateString === prevDateString) {
        return null;
      }
    }
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    if (dateString === today) {
      return "Today";
    }
    if (dateString === yesterday) {
      return "Yesterday";
    }
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  useEffect(() => {
    const currentLength = thread?.chats?.length ?? 0;
    if (currentLength > prevChatsLengthRef.current) {
      lastActivityRef.current = Date.now();
    }
    prevChatsLengthRef.current = currentLength;
  }, [thread?.chats]);

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

  const fetchThread = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/threads/${threadId}`);
      const data = await res.json();
      if (res.ok) {
        setThread(data);
      } else {
        toast.error(data.error || "Failed to load thread details");
      }
    } catch (err) {
      toast.error("Error fetching thread details");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (user && threadId) {
      fetchThread();
    }
  }, [user, threadId]);

  useEffect(() => {
    if (!user || !threadId || !thread?.discussion || showActivityPopup) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= 60000) {
        setShowActivityPopup(true);
      } else {
        fetchThread(true);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [user, threadId, thread, showActivityPopup]);

  useEffect(() => {
    if (!thread?.chats) return;
    const newLength = thread.chats.length;
    const oldLength = lastChatsLengthRef.current;
    if (oldLength === 0 && newLength > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "auto" });
    } else if (newLength > oldLength) {
      const chatContainer = chatContainerRef.current;
      if (chatContainer) {
        const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 400;
        if (userSentMessageRef.current || isAtBottom) {
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }
      userSentMessageRef.current = false;
    }
    lastChatsLengthRef.current = newLength;
  }, [thread?.chats]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (messageToDelete) {
          setMessageToDelete(null);
        } else if (showActivityPopup) {
          setShowActivityPopup(false);
        } else {
          router.push("/dashboard");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, messageToDelete, showActivityPopup]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/threads/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: user.email,
          senderId: user.uid,
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("");
        userSentMessageRef.current = true;
        setThread((prev: any) => ({
          ...prev,
          chats: [...(prev.chats || []), data],
        }));
      } else {
        toast.error(data.error || "Failed to send message");
      }
    } catch (err) {
      toast.error("Error sending message");
    } finally {
      setSending(false);
    }
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 8) return "High";
    if (priority >= 4) return "Medium";
    return "Low";
  };

  if (authLoading || (loading && !thread)) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !thread) return null;

  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
      <main className="flex flex-1 w-full h-full overflow-hidden">
        <aside className="hidden md:flex bg-primary px-10 py-10 justify-center items-start w-82 shrink-0 h-full overflow-y-auto">
          <div className="flex flex-col w-full">
            <div className="inline-flex max-w-fit items-center justify-center py-2.5 px-1.5 bg-white rounded-xl shadow-lg shadow-primary/10 mb-5 border border-border/50">
              <Image src="/logo.png" alt="Logo" width={140} height={140} />
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 text-white/80 hover:text-white mb-5 text-xs font-semibold transition-colors group w-fit"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Back to Threads
            </button>
            <h1 className="text-2xl font-bold leading-tight text-white mb-2 break-words">
              {thread.title}
            </h1>
            <div className="w-full h-px bg-white/15 my-3" />
            <div className="mb-6">
              <span className="text-[10px] bg-white px-1.5 pt-0.5 pb-0 rounded w-fit font-semibold uppercase tracking-wider text-primary block mb-1">
                Description
              </span>
              <p className="text-sm font-medium text-white leading-normal break-words">
                {thread.description || "No description provided."}
              </p>
            </div>
            <div className="mb-6">
              <span className="text-[10px] bg-white px-1.5 pt-0.5 pb-0 rounded w-fit font-semibold uppercase tracking-wider text-primary block mb-1">
                Created On
              </span>
              <div className="flex items-center font-medium gap-1.5 text-sm text-white">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                {new Date(thread.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
            <div className="mb-4">
              <span className="text-[10px] bg-white px-1.5 pt-0.5 pb-0 rounded w-fit font-semibold uppercase tracking-wider text-primary block mb-1">
                Created By
              </span>
              <div className="flex items-center font-medium gap-1.5 text-sm text-white">
                <span className="truncate">
                  @{thread.createdBy?.email.split('@')[0] || "Unknown"}
                </span>
              </div>
            </div>
            {((Array.isArray(thread.taggedFaculty) && thread.taggedFaculty.length > 0) ||
              (!Array.isArray(thread.taggedFaculty) && thread.taggedFaculty)) && (
                <div className="mb-4">
                  <span className="text-[10px] bg-white px-1.5 pt-0.5 pb-0 rounded w-fit font-semibold uppercase tracking-wider text-primary block mb-1">
                    Tagged Faculty
                  </span>
                  <div className="flex flex-col gap-1 text-sm text-white font-medium">
                    {Array.isArray(thread.taggedFaculty) ? (
                      thread.taggedFaculty.map((faculty: string) => (
                        <span key={faculty} className="truncate block">
                          @{faculty}
                        </span>
                      ))
                    ) : (
                      <span className="truncate block">
                        @{thread.taggedFaculty}
                      </span>
                    )}
                  </div>
                </div>
              )}
            {thread.status === "inactive" && (
              <div className="mb-4">
                <span className="text-[10px] bg-white px-1.5 pt-0.5 pb-0 rounded w-fit font-semibold uppercase tracking-wider text-primary block mb-1">
                  Closed By
                </span>
                <div className="flex items-center font-medium gap-1.5 text-sm text-white">
                  <span className="truncate">
                    @{thread.closedBy?.email?.split('@')[0] || "Unknown"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </aside>
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push("/dashboard")}
                className="md:hidden border-border text-foreground hover:bg-muted"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-4 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
                    {thread.title} <Badge level={thread.priority} className="text-[10px] py-0.5">
                      {getPriorityLabel(thread.priority)}
                    </Badge>
                  </h2>
                  <p className="text-xs font-medium text-muted-foreground">
                    {thread.chats?.length ?? 0}{" "}
                    {thread.chats?.length === 1 ? "message" : "messages"} •{" "}
                    {thread.discussion ? "Discussion Active" : "Discussion Disabled"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 ml-auto pl-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="border-border bg-card text-foreground hover:bg-background"
                title="Toggle Theme"
              >
                {mounted && theme === "dark" ? (
                  <Sun className="w-4 h-4 text-amber-500" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500" />
                )}
              </Button>
              <span className={`text-xs font-bold uppercase tracking-wider ${thread.status !== "inactive" ? "text-green-500" : "text-muted-foreground"}`}>
                {thread.status !== "inactive" ? "Open" : "Closed"}
              </span>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={updatingStatus}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${thread.status !== "inactive" ? "bg-green-500" : "bg-neutral-200 dark:bg-neutral-800"}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${thread.status !== "inactive" ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
            </div>
          </header>
          <div className="flex-1 flex flex-col overflow-hidden">
            {thread.discussion ? (
              <>
                <div
                  ref={chatContainerRef}
                  className="flex-1 py-6 px-8 overflow-y-auto space-y-1 bg-neutral-50 dark:bg-neutral-900/50 sidebar-scrollbar"
                >
                  {thread.chats && thread.chats.length > 0 ? (
                    thread.chats.map((chat: any, index: number) => {
                      const prevChat = index > 0 ? thread.chats[index - 1] : null;
                      const nextChat = index < thread.chats.length - 1 ? thread.chats[index + 1] : null;
                      const isSelf = chat.senderId === user.uid;

                      const isPrevSelf = prevChat && prevChat.senderId === chat.senderId;
                      const isNextSelf = nextChat && nextChat.senderId === chat.senderId;

                      const isPrevGrouped = isPrevSelf && (new Date(chat.timestamp).getTime() - new Date(prevChat.timestamp).getTime() < 180000);
                      const isNextGrouped = isNextSelf && (new Date(nextChat.timestamp).getTime() - new Date(chat.timestamp).getTime() < 180000);

                      const isGroupStart = !isPrevGrouped;
                      const isGroupEnd = !isNextGrouped;

                      const dateSeparator = getFormattedDateSeparator(chat.timestamp, prevChat?.timestamp);

                      let borderRadiusClass = "";
                      if (isSelf) {
                        if (isGroupStart && isGroupEnd) {
                          borderRadiusClass = "rounded-md rounded-tr-none";
                        } else if (isGroupStart) {
                          borderRadiusClass = "rounded-md rounded-tr-none rounded-br-sm";
                        } else if (isGroupEnd) {
                          borderRadiusClass = "rounded-md rounded-tr-sm rounded-br-none";
                        } else {
                          borderRadiusClass = "rounded-md rounded-tr-sm rounded-br-sm";
                        }
                      } else {
                        if (isGroupStart && isGroupEnd) {
                          borderRadiusClass = "rounded-md rounded-tl-none";
                        } else if (isGroupStart) {
                          borderRadiusClass = "rounded-md rounded-tl-none rounded-bl-sm";
                        } else if (isGroupEnd) {
                          borderRadiusClass = "rounded-md rounded-tl-sm rounded-bl-none";
                        } else {
                          borderRadiusClass = "rounded-md rounded-tl-sm rounded-bl-sm";
                        }
                      }

                      return (
                        <div key={chat.id} className="flex flex-col w-full">
                          {dateSeparator && (
                            <div className="flex items-center justify-center my-4 select-none">
                              <div className="h-px bg-border flex-1" />
                              <span className="px-3 py-1 text-[10px] font-semibold text-muted-foreground bg-muted rounded-full border border-border mx-4">
                                {dateSeparator}
                              </span>
                              <div className="h-px bg-border flex-1" />
                            </div>
                          )}

                          <div
                            className={`flex flex-col max-w-[72%] ${isSelf ? "ml-auto items-end" : "mr-auto items-start"
                              } ${isGroupStart ? "mt-4" : "mt-0.5"}`}
                          >
                            {isGroupStart && (
                              <span className="text-[11px] text-primary font-semibold px-1 mb-0.5">
                                {isSelf ? "You" : '@' + chat.sender.split('@')[0]}
                              </span>
                            )}
                            <div className={`flex items-center gap-2 group w-full ${isSelf ? "justify-end" : "justify-start"}`}>
                              {isSelf && (
                                <button
                                  type="button"
                                  onClick={() => setMessageToDelete(chat.id)}
                                  className="md:opacity-0 opacity-40 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-full bg-muted text-red-500 hover:text-destructive cursor-pointer shrink-0"
                                  title="Delete message"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <div
                                className={`rounded-lg px-4 py-2.5 text-sm shadow-none leading-relaxed ${isSelf
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-card border border-border text-foreground"
                                  } ${borderRadiusClass}`}
                              >
                                <p className="break-words">{chat.message}</p>
                                <span
                                  className={`block text-[9px] text-left font-medium ${isSelf ? "text-primary-foreground/70" : "text-muted-foreground"
                                    }`}
                                >
                                  {new Date(chat.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-3 py-20">
                      <MessageSquare className="w-12 h-12 text-muted-foreground/30 animate-bounce" />
                      <div>
                        <p className="text-sm font-semibold">No messages yet</p>
                        <p className="text-xs mt-1">
                          Be the first to post a message in this discussion thread!
                        </p>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <form
                  onSubmit={handleSendMessage}
                  className="px-4 py-3 border-t border-border bg-card flex gap-3 items-center shrink-0"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      lastActivityRef.current = Date.now();
                    }}
                    disabled={sending}
                    className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-foreground"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!message.trim() || sending}
                    className="rounded-full bg-primary text-primary-foreground hover:bg-primary/95 shrink-0 w-10 h-10"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground gap-3 p-6">
                <MessageSquare className="w-14 h-14 text-muted-foreground/25" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Discussions are disabled
                  </p>
                  <p className="text-xs max-w-xs mt-1">
                    The creator of this thread disabled the messaging chat
                    feature for this discussion topic.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showActivityPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">No Activity Found</h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              We have paused live updates to save bandwidth because no new messages have arrived in the last minute. Would you like to continue chatting or go back?
            </p>
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/dashboard")}
              >
                Go Back
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleContinueChatting}
              >
                Continue Chatting
              </Button>
            </div>
          </div>
        </div>
      )}

      {messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Trash className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Delete Message</h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Are you sure you want to delete this message? This action is permanent and cannot be undone.
            </p>
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setMessageToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleDeleteMessage(messageToDelete)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
