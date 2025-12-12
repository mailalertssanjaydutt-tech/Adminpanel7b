import { useState, useEffect } from "react";
import { Edit2, PlusCircle, Loader2 } from "lucide-react";
import api from "../utils/api";
import toast from "react-hot-toast";

export default function Game() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState({ id: null, name: "", resultTime: "" });
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const fetchGames = async () => {
    setLoading(true);
    try {
      const res = await api.get("/games");
      setGames(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Error fetching games.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddGame = () => {
    setFormState({ id: null, name: "", resultTime: "" });
    setIsEditing(false);
    setShowForm(true);
  };

  const handleEditGame = (game) => {
    setFormState({
      id: game._id,
      name: game.name,
      resultTime: game.resultTime,
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (isEditing) {
        await api.put(`/games/${formState.id}`, formState);
        toast.success("Game updated successfully!");
      } else {
        await api.post("/games", formState);
        toast.success("Game created successfully!");
      }
      fetchGames();
      setShowForm(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Error saving game.");
    }
    setFormLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/40 to-white py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-indigo-900">
            Game Management
          </h1>
          {!showForm && (
            <button
              onClick={handleAddGame}
              className="flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 sm:px-5 py-2 rounded-lg sm:rounded-xl shadow-lg hover:scale-105 transition-transform font-medium text-xs sm:text-sm md:text-base w-full sm:w-auto justify-center"
            >
              <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              Add Game
            </button>
          )}
        </div>

        {!showForm && (
          <div className="rounded-xl sm:rounded-2xl shadow-lg bg-white overflow-hidden">
            {loading ? (
              <div className="p-6 sm:p-8 flex justify-center items-center text-indigo-500 gap-2">
                <Loader2 className="animate-spin w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-sm sm:text-base">Loading Games...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto text-gray-700">
                  <thead className="bg-indigo-50 text-left">
                    <tr>
                      <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold whitespace-nowrap">#</th>
                      <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold whitespace-nowrap">Game Name</th>
                      <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold whitespace-nowrap">Result Time</th>
                      <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-center whitespace-nowrap">Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {games.map((game, idx) => (
                      <tr key={game._id} className="border-b hover:bg-indigo-50/50 transition-colors">
                        <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm">{idx + 1}</td>
                        <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 font-medium text-xs sm:text-sm">{game.name}</td>
                        <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm">{game.resultTime}</td>
                        <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-center">
                          <button
                            onClick={() => handleEditGame(game)}
                            className="text-indigo-600 hover:text-indigo-800 transition-colors p-2 sm:p-3 hover:bg-indigo-100 rounded-xl"
                            title="Edit Game"
                          >
                            <Edit2 className="w-5 h-5 sm:w-6 sm:h-6" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {games.length === 0 && (
                  <div className="p-4 sm:p-6 text-center text-gray-500 text-sm sm:text-base">
                    No games found. Click "Add Game" to create one.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {showForm && (
          <div className="mt-4 sm:mt-6 w-full max-w-md mx-auto bg-white p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl shadow-xl border border-indigo-100">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 sm:mb-6 text-indigo-800">
              {isEditing ? "Edit Game" : "Add New Game"}
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
              <div>
                <label className="block mb-1 sm:mb-2 font-medium text-gray-700 text-sm sm:text-base">Game Name</label>
                <input
                  type="text"
                  name="name"
                  value={formState.name}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                  placeholder="Enter game name"
                />
              </div>

              <div>
                <label className="block mb-1 sm:mb-2 font-medium text-gray-700 text-sm sm:text-base">Result Time</label>
                <input
                  type="time"
                  name="resultTime"
                  value={formState.resultTime}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                />
              </div>

              <div className="flex justify-between gap-3 mt-4 sm:mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-200 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl hover:bg-gray-300 transition font-medium text-sm sm:text-base"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={formLoading}
                  className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium text-white text-sm sm:text-base
                    ${formLoading ? "bg-indigo-400 cursor-not-allowed" : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105 transform transition-all"}`}
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">Saving...</span>
                    </>
                  ) : isEditing ? (
                    "Update Game"
                  ) : (
                    "Create Game"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
