import React, { useState, useEffect, useRef } from "react";
import { toast, Toaster } from "react-hot-toast";
import { ArrowLeft, Trash2, MoreVertical } from "lucide-react";
import api from "../utils/api";

export default function AdminMessenger() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeConversation, setActiveConversation] = useState(null);
  const [reply, setReply] = useState("");
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const chatEndRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeConversation, conversations]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowDeleteMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await api.get("/contact");
      if (res.data.success) {
        setConversations(res.data.messages);
      } else {
        toast.error("Failed to fetch messages");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching messages");
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    if (!reply.trim()) {
      toast.error("Message cannot be empty");
      return;
    }
    try {
      const res = await api.post("/contact/reply", {
        email: activeConversation.email,
        subject: `Re: ${activeConversation.subject || "Your message"}`,
        reply,
      });

      if (res.data.success) {
        toast.success("Reply sent!");
        setConversations((prev) =>
          prev.map((conv) =>
            conv.email === activeConversation.email
              ? {
                  ...conv,
                  replies: [
                    ...(conv.replies || []),
                    { text: reply, sender: "admin", createdAt: new Date().toISOString() },
                  ],
                }
              : conv
          )
        );
        setActiveConversation((prev) => ({
          ...prev,
          replies: [...(prev.replies || []), { text: reply, sender: "admin", createdAt: new Date().toISOString() }]
        }))
        setReply("");
      } else {
        toast.error(res.data.error || "Failed to send reply");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error sending reply");
    }
  };

  const deleteConversation = async (conversationId, email) => {
    if (!window.confirm("Are you sure you want to delete this conversation? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await api.delete(`/contact/${conversationId}`);
      if (res.data.success) {
        toast.success("Conversation deleted successfully!");
        
        // Remove from conversations list
        setConversations(prev => prev.filter(conv => conv._id !== conversationId));
        
        // If the deleted conversation is currently active, close it
        if (activeConversation && activeConversation._id === conversationId) {
          setActiveConversation(null);
        }
        
        setShowDeleteMenu(false);
      } else {
        toast.error(res.data.error || "Failed to delete conversation");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting conversation");
    }
  };

  const deleteAllConversations = async () => {
    if (!window.confirm("Are you sure you want to delete ALL conversations? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await api.delete("/contact");
      if (res.data.success) {
        toast.success("All conversations deleted successfully!");
        setConversations([]);
        setActiveConversation(null);
        setShowDeleteMenu(false);
      } else {
        toast.error(res.data.error || "Failed to delete all conversations");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting all conversations");
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] md:h-screen bg-gray-100 relative">
      <Toaster position="top-right" />

      {/* Sidebar List */}
      <div 
        className={`w-full md:w-1/4 bg-white border-r overflow-y-auto absolute md:static inset-0 z-10 
          ${activeConversation ? "hidden md:block" : "block"}`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Conversations</h2>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowDeleteMenu(!showDeleteMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical size={20} className="text-gray-600" />
            </button>
            
            {showDeleteMenu && (
              <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-48">
                <button
                  onClick={() => deleteAllConversations()}
                  className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <Trash2 size={16} />
                  Delete All Chats
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <p className="p-4 text-center text-gray-500">Loading conversations...</p>
        ) : conversations.length === 0 ? (
          <p className="p-4 text-center text-gray-500">No conversations found.</p>
        ) : (
          conversations.map((conv) => {
            const lastMessage =
              (conv.replies && conv.replies.length > 0
                ? conv.replies[conv.replies.length - 1].text
                : conv.message) || "";
            return (
              <div
                key={conv._id}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 group relative ${
                  activeConversation?._id === conv._id ? "bg-gray-100" : ""
                }`}
                onClick={() => setActiveConversation(conv)}
              >
                {/* Delete button for individual conversation */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv._id, conv.email);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                  title="Delete conversation"
                >
                  <Trash2 size={16} />
                </button>

                <div className="flex justify-between items-start pr-8">
                  <p className="font-semibold truncate pr-2">{conv.fullName}</p>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(conv.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate mt-1 pr-8">{lastMessage}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Chat Pane */}
      <div 
        className={`w-full md:flex-1 flex flex-col h-full absolute md:static inset-0 z-20 bg-gray-50
          ${activeConversation ? "block" : "hidden md:flex"}`}
      >
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="p-3 md:p-4 border-b bg-white flex items-center justify-between shadow-sm">
              <div className="flex items-center">
                {/* Mobile Back Button */}
                <button 
                  onClick={() => setActiveConversation(null)}
                  className="mr-3 md:hidden p-1 hover:bg-gray-100 rounded-full"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h3 className="font-bold text-base md:text-lg">{activeConversation.fullName}</h3>
                  <p className="text-xs md:text-sm text-gray-500">{activeConversation.email}</p>
                </div>
              </div>

              {/* Delete current conversation button */}
              <button
                onClick={() => deleteConversation(activeConversation._id, activeConversation.email)}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete this conversation"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* Original user message */}
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-lg shadow max-w-[85%] md:max-w-xs break-words">
                  <p className="text-sm md:text-base">{activeConversation.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(activeConversation.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Replies */}
              {(activeConversation.replies || []).map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.sender === "admin" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`p-3 rounded-lg shadow max-w-[85%] md:max-w-xs break-words ${
                      msg.sender === "admin"
                        ? "bg-green-600 text-white"
                        : "bg-white"
                    }`}
                  >
                    <p className="text-sm md:text-base">{msg.text}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.sender === "admin" ? "text-gray-200" : "text-gray-400"
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}

              <div ref={chatEndRef}></div>
            </div>

            {/* Reply Box */}
            <div className="p-3 md:p-4 bg-white border-t flex space-x-2">
              <input
                type="text"
                placeholder="Type your reply..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                className="flex-1 p-2 border rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                onKeyDown={(e) => e.key === "Enter" && sendReply()}
              />
              <button
                onClick={sendReply}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 whitespace-nowrap"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 p-4 text-center">
            Select a conversation to view details
          </div>
        )}
      </div>
    </div>
  );
}