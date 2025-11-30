import React, { useEffect, useState, useMemo } from "react";
import { Trash2, Edit, PlusCircle, Search, GripVertical } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import api from "../utils/api";

export default function GroupAdminPanel() {
  const [groups, setGroups] = useState([]);
  const [allGames, setAllGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ id: null, name: "", selectedGames: [] });
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAllGames();
    fetchGroups();
  }, []);

  const fetchAllGames = async () => {
    try {
      const res = await api.get("/games");
      setAllGames(Array.isArray(res.data) ? res.data : res.data.games || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load games");
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await api.get("/group/all");
      setGroups(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || form.selectedGames.length === 0) {
      toast.error("Please provide a group name and select at least one game.");
      return;
    }

    try {
      if (form.id) {
        await api.put(`/group/${form.id}`, {
          name: form.name,
          games: form.selectedGames,
        });
        toast.success("Group updated successfully!");
      } else {
        await api.post("/group/create", {
          name: form.name,
          games: form.selectedGames,
        });
        toast.success("Group created successfully!");
      }

      setForm({ id: null, name: "", selectedGames: [] });
      fetchGroups();
    } catch (err) {
      console.error(err);
      toast.error("Error saving group. Try again.");
    }
  };

  const handleEdit = (group) => {
    setForm({
      id: group._id,
      name: group.name,
      selectedGames: group.games.map((g) => g._id),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this group?")) return;
    try {
      await api.delete(`/group/${id}`);
      toast.success("Group deleted successfully!");
      fetchGroups();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete group");
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(form.selectedGames);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setForm({ ...form, selectedGames: items });
  };

  // Fixed remove game function with proper event handling
  const handleRemoveGame = (gameId, e) => {
    e.stopPropagation(); // Prevent drag events from interfering
    e.preventDefault(); // Prevent any default behavior
    
    const newSelection = form.selectedGames.filter((id) => id !== gameId);
    setForm({
      ...form,
      selectedGames: newSelection,
    });
  };

  const filteredGroups = useMemo(() => {
    return groups.filter((g) =>
      g.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [groups, search]);

  if (loading) return <div className="p-4 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/40 to-white py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <Toaster position="top-right" reverseOrder={false} />
        
        {/* Header */}
        <header className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-indigo-900">
            Group Management
          </h1>
        </header>

        {/* Form */}
        <div className="bg-white border border-indigo-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-indigo-800 mb-3 sm:mb-4">
            {form.id ? "Edit Group" : "Create New Group"}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-1 lg:grid-cols-2 sm:gap-4 lg:gap-6">
            {/* Group Name */}
            <div className="flex flex-col">
              <label className="font-medium text-sm sm:text-base text-gray-700 mb-1 sm:mb-2">
                Group Name
              </label>
              <input
                type="text"
                className="border border-gray-300 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Enter group name"
              />
            </div>

            {/* Select & Drag Games */}
            <div className="flex flex-col">
              <label className="font-medium text-sm sm:text-base text-gray-700 mb-1 sm:mb-2">
                Select & Order Games
              </label>
              
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="games" isDropDisabled={false}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="border border-gray-300 rounded-lg sm:rounded-xl p-2 bg-gray-50 min-h-[100px] max-h-48 sm:max-h-56 overflow-y-auto"
                    >
                      {form.selectedGames.length === 0 && (
                        <p className="text-gray-400 text-xs sm:text-sm text-center py-6">
                          No games selected. Use the dropdown below to add games.
                        </p>
                      )}

                      {form.selectedGames.map((gameId, index) => {
                        const game = allGames.find((g) => g._id === gameId);
                        if (!game) return null;
                        return (
                          <Draggable
                            key={gameId}
                            draggableId={gameId}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center p-2 mb-2 bg-white border border-gray-200 rounded-lg shadow-sm transition-colors ${
                                  snapshot.isDragging ? 'bg-indigo-50 border-indigo-300' : ''
                                }`}
                              >
                                {/* Drag handle - separated from the content */}
                                <div 
                                  {...provided.dragHandleProps}
                                  className="flex items-center justify-center p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing mr-2"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                
                                {/* Game name */}
                                <span className="text-xs sm:text-sm truncate flex-1">
                                  {index + 1}. {game.name}
                                </span>
                                
                                {/* Remove button - with proper event handling */}
                                <button
                                  type="button"
                                  className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                                  onClick={(e) => handleRemoveGame(gameId, e)}
                                  onMouseDown={(e) => e.stopPropagation()} // Prevent drag on mouse down
                                  onTouchStart={(e) => e.stopPropagation()} // Prevent drag on touch start
                                >
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {/* Add game dropdown */}
              <select
                className="mt-2 border border-gray-300 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full"
                onChange={(e) => {
                  const gameId = e.target.value;
                  if (gameId && !form.selectedGames.includes(gameId)) {
                    setForm({
                      ...form,
                      selectedGames: [...form.selectedGames, gameId],
                    });
                  }
                  e.target.value = ""; // Reset selection
                }}
              >
                <option value="">-- Add Game --</option>
                {allGames
                  .filter(game => !form.selectedGames.includes(game._id))
                  .map((game) => (
                    <option key={game._id} value={game._id}>
                      {game.name}
                    </option>
                  ))
                }
              </select>
            </div>

            {/* Submit Button */}
            <div className="sm:col-span-1 lg:col-span-2 pt-2">
              <button
                type="submit"
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 sm:px-6 py-2 rounded-lg sm:rounded-xl font-medium text-sm sm:text-base flex items-center justify-center gap-1 sm:gap-2 transition-colors"
              >
                <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                {form.id ? "Update Group" : "Create Group"}
              </button>
            </div>
          </form>
        </div>

        {/* Search */}
        <div className="mb-4 flex items-center bg-white border border-indigo-100 rounded-lg sm:rounded-xl px-3 py-2 shadow-sm">
          <Search className="w-4 h-4 text-gray-500 mr-2" />
          <input
            type="text"
            placeholder="Search groups..."
            className="flex-1 text-sm sm:text-base focus:outline-none w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Groups Table */}
        <div className="bg-white border border-indigo-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm">
          <h2 className="text-lg sm:text-xl font-semibold text-indigo-800 mb-3 sm:mb-4">
            Existing Groups
          </h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-indigo-50">
                <tr>
                  <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Group Name
                  </th>
                  <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Games
                  </th>
                  <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <tr key={group._id} className="hover:bg-indigo-50/50 transition-colors">
                      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 align-middle">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">
                          {group.name}
                        </div>
                      </td>
                      
                      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 align-middle">
                        <div className="text-xs sm:text-sm text-gray-700">
                          {group.games.map((g, index) => (
                            <div key={g._id} className="mb-1 last:mb-0">
                              <span className="text-gray-500 text-xs mr-1">{index + 1}.</span>
                              {g.name}
                            </div>
                          ))}
                        </div>
                      </td>
                      
                      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 align-middle">
                        <div className="flex items-center justify-center gap-1 sm:gap-2">
                          <button
                            onClick={() => handleEdit(group)}
                            className="inline-flex items-center bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm transition-colors"
                          >
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(group._id)}
                            className="inline-flex items-center bg-red-100 hover:bg-red-200 text-red-700 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm transition-colors"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td 
                      className="px-2 sm:px-3 lg:px-4 py-4 sm:py-6 text-center text-gray-500 text-sm sm:text-base" 
                      colSpan={3}
                    >
                      {search ? "No groups match your search." : "No groups created yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}