import React, { useState, useEffect } from "react";
import { Loader2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/api";

export default function ManageResults() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState("");
  const [resultDate, setResultDate] = useState("");
  const [winningNumber, setWinningNumber] = useState("");
  const [loadingGames, setLoadingGames] = useState(true);
  const [posting, setPosting] = useState(false);
  const [results, setResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // Fetch all games
  useEffect(() => {
    let mounted = true;
    const fetchGames = async () => {
      setLoadingGames(true);
      try {
        const res = await api.get("/games");
        if (!mounted) return;
        setGames(res.data?.games || res.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch games");
      } finally {
        if (mounted) setLoadingGames(false);
      }
    };
    fetchGames();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch recent results (latest 20)
  const fetchRecentResults = async () => {
    setLoadingResults(true);
    try {
      const res = await api.get("/results/recent");
      setResults(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch results");
    } finally {
      setLoadingResults(false);
    }
  };

  useEffect(() => {
    fetchRecentResults();
  }, []);

  // Post a new result
  const handlePostResult = async () => {
    if (!selectedGame || !resultDate || !winningNumber) {
      toast.error("Please fill all fields");
      return;
    }
    if (!/^\d{1,2}$/.test(winningNumber)) {
      toast.error("Winning number must be 1 or 2 digits");
      return;
    }

    try {
      setPosting(true);
      const res = await api.post(`/results/${selectedGame}`, {
        date: resultDate,
        number: winningNumber,
      });

      toast.success("Result posted and chart updated!");

      if (res.data && res.data.result) {
        setResults((prev) => [res.data.result, ...prev].slice(0, 20));
      } else {
        fetchRecentResults();
      }

      // reset form
      setWinningNumber("");
      setResultDate("");
      setSelectedGame("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to post result");
    } finally {
      setPosting(false);
    }
  };

  // Delete a result
  const handleDeleteResult = async (gameId, resultId) => {
    if (!window.confirm("Are you sure you want to delete this result?")) return;
    try {
      await api.delete(`/results/${gameId}/${resultId}`);
      toast.success("Result deleted!");
      fetchRecentResults();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete result");
    }
  };

  const formatDeclaredAtFallback = (isoOrDate) => {
    if (!isoOrDate) return { date: "-", time: "-" };
    const d = new Date(isoOrDate);
    if (isNaN(d.getTime())) return { date: "-", time: "-" };
    
    const date = d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    
    const time = d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    
    return { date, time };
  };

  const formatGameTimeDisplay = (result) => {
    if (result.resultDateTimeFormatted) {
      // Split existing formatted date time if it contains time
      const parts = result.resultDateTimeFormatted.split(', ');
      if (parts.length === 2) {
        return { date: parts[0], time: parts[1] };
      }
      return { date: result.resultDateTimeFormatted, time: "" };
    }
    
    if (result.resultDate) {
      const date = new Date(result.resultDate);
      if (!isNaN(date.getTime())) {
        return { 
          date: date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
          time: result.resultTime || ""
        };
      }
    }
    
    return { date: "-", time: "" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-4 sm:mb-6">
          <h1 className="text-indigo-900 font-extrabold tracking-tight text-xl sm:text-2xl lg:text-3xl">
            Daily Results Manager
          </h1>
        </header>

        {/* Posting Form */}
        <section
          aria-labelledby="post-result"
          className="bg-white border border-indigo-100 shadow rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 mb-6 sm:mb-8"
        >
          <h2 id="post-result" className="text-indigo-800 font-semibold text-base sm:text-lg lg:text-xl mb-3 sm:mb-4">
            Post a New Result
          </h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePostResult();
            }}
            className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-12 sm:gap-3 items-end"
          >
            {/* Game Selector */}
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Select Game
              </label>
              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                className="w-full rounded-lg sm:rounded-xl border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                aria-label="Select game"
              >
                <option value="">{loadingGames ? "Loading..." : "Select Game"}</option>
                {games.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name} {g.resultTime ? `— ${g.resultTime}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Picker */}
            <div className="sm:col-span-1 lg:col-span-3">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Result Date
              </label>
              <input
                type="date"
                value={resultDate}
                onChange={(e) => setResultDate(e.target.value)}
                className="w-full rounded-lg sm:rounded-xl border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                aria-label="Result date"
              />
            </div>

            {/* Winning Number */}
            <div className="sm:col-span-1 lg:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Winning Number
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={winningNumber}
                onChange={(e) => setWinningNumber(e.target.value)}
                placeholder="e.g. 12"
                className="w-full rounded-lg sm:rounded-xl border px-3 py-2 text-center text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300"
                aria-label="Winning number"
              />
            </div>

            {/* Submit Button */}
            <div className="sm:col-span-2 lg:col-span-3 pt-1 sm:pt-0">
              <button
                type="submit"
                disabled={posting}
                className="w-full inline-flex items-center justify-center gap-1 sm:gap-2 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium shadow transition-colors"
              >
                {posting ? (
                  <>
                    <Loader2 className="animate-spin w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="sm:inline">Posting...</span>
                  </>
                ) : (
                  "Post Result"
                )}
              </button>
            </div>
          </form>

          {/* Loading Indicator */}
          <div className="mt-2 sm:mt-3 text-xs text-gray-500">
            {loadingGames && (
              <span className="inline-flex items-center text-indigo-500">
                <Loader2 className="animate-spin w-3 h-3 mr-1" />
                Loading games...
              </span>
            )}
          </div>
        </section>

        {/* Recent Results */}
        <section aria-labelledby="recent-results" className="mb-8 sm:mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
            <h2 id="recent-results" className="text-indigo-800 font-semibold text-base sm:text-lg lg:text-xl">
              Recent Results (All Games)
            </h2>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={fetchRecentResults}
                className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg sm:rounded-full border border-indigo-200 text-xs sm:text-sm bg-white hover:bg-indigo-50 transition-colors"
              >
                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="bg-white border border-indigo-100 shadow-sm rounded-xl sm:rounded-2xl overflow-hidden">
            {loadingResults ? (
              <div className="p-6 sm:p-8 flex items-center justify-center text-indigo-500">
                <Loader2 className="animate-spin w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                <span className="text-sm sm:text-base">Loading results...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 sm:p-6 text-center text-gray-500 text-sm sm:text-base">
                No results posted yet.
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-indigo-50">
                    <tr>
                      <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Game
                      </th>
                      <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Game Time
                      </th>
                      <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Number
                      </th>
                      <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Declared Time
                      </th>
                      <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-100">
                    {results.map((r) => {
                      const gameTimeParts = formatGameTimeDisplay(r);
                      const declaredParts = r.declaredTimeFormatted 
                        ? { date: r.declaredTimeFormatted, time: "" }
                        : (r.number && r.number.declaredAt ? formatDeclaredAtFallback(r.number.declaredAt) : { date: "-", time: "-" });
                      
                      return (
                        <tr key={r._id} className="hover:bg-indigo-50 transition-colors">
                          {/* Game Name */}
                          <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 align-middle">
                            <div className="text-xs sm:text-sm text-gray-800 font-medium whitespace-nowrap">
                              {r.gameName || "-"}
                            </div>
                          </td>

                          {/* Game Time - Stacked on mobile */}
                          <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 align-middle">
                            <div className="hidden sm:block text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                              {gameTimeParts.time 
                                ? `${gameTimeParts.date}, ${gameTimeParts.time}`
                                : gameTimeParts.date
                              }
                            </div>
                            <div className="sm:hidden">
                              <div className="text-xs text-gray-800 font-medium">{gameTimeParts.date}</div>
                              {gameTimeParts.time && (
                                <div className="text-xs text-gray-500 mt-0.5">{gameTimeParts.time}</div>
                              )}
                            </div>
                          </td>

                          {/* Winning Number */}
                          <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 align-middle">
                            <div className="text-xs sm:text-sm text-center font-semibold text-green-700">
                              {r.number?.value ?? "-"}
                            </div>
                          </td>

                          {/* Declared Time - Stacked on mobile */}
                          <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 align-middle">
                            <div className="hidden sm:block text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                              {declaredParts.time && declaredParts.time !== "-"
                                ? `${declaredParts.date}, ${declaredParts.time}`
                                : declaredParts.date
                              }
                            </div>
                            <div className="sm:hidden">
                              <div className="text-xs text-gray-800 font-medium">{declaredParts.date}</div>
                              {declaredParts.time && declaredParts.time !== "-" && (
                                <div className="text-xs text-gray-500 mt-0.5">{declaredParts.time}</div>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 align-middle text-center">
                            <button
                              onClick={() => handleDeleteResult(r.gameId, r._id)}
                              className="inline-flex items-center justify-center rounded-full p-1 sm:p-1.5 hover:bg-red-50 transition-colors"
                              title="Delete result"
                              aria-label={`Delete result for ${r.gameName}`}
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}