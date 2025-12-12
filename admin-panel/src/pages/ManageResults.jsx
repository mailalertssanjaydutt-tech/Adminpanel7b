import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
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

  useEffect(() => {
    let mounted = true;
    const fetchGames = async () => {
      setLoadingGames(true);
      try {
        const res = await api.get("/games");
        if (!mounted) return;
        // setGames(res.data?.games || res.data || []);

        const list = res.data?.games || res.data || [];

// Helper: convert "HH:MM" → Date
const toDate = (time) => new Date(`1970-01-01T${time}`);

// Helper: convert "HH:MM" → "hh:mm AM/PM"
const to12Hour = (time) => {
  const [hour, minute] = time.split(":").map(Number);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hr = hour % 12 || 12; 
  return `${hr}:${minute.toString().padStart(2, "0")} ${ampm}`;
};

// Sort list by time
list.sort((a, b) => toDate(a.resultTime) - toDate(b.resultTime));

// Convert resultTime to 12-hour format
list.forEach(item => {
  item.resultTime12 = to12Hour(item.resultTime);
});     

setGames(list);

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

  const formatGameTimeDisplay = (result) => {
    if (result.resultDateTimeFormatted) {
      const parts = result.resultDateTimeFormatted.split(', ');
      if (parts.length === 2) return { date: parts[0], time: parts[1] };
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
          time: result.resultTime || "",
        };
      }
    }

    return { date: "-", time: "" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-4 sm:mb-6">
          <h1 className="text-indigo-900 font-extrabold tracking-tight text-xl sm:text-2xl lg:text-3xl">
            Daily Results Manager
          </h1>
        </header>

        <section className="bg-white border border-indigo-100 shadow rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 mb-6 sm:mb-8">
          <h2 className="text-indigo-800 font-semibold text-base sm:text-lg lg:text-xl mb-3 sm:mb-4">
            Post a New Result
          </h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePostResult();
            }}
            className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-12 sm:gap-3 items-end"
          >
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Select Game
              </label>
              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">{loadingGames ? "Loading..." : "Select Game"}</option>
                {games.map((g) => (
                  <option key={g._id} value={g._id}>
                  {g.name} {g.resultTime12 ? `— ${g.resultTime12}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-1 lg:col-span-3">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Result Date
              </label>
              <input
                type="date"
                value={resultDate}
                onChange={(e) => setResultDate(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

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
                className="w-full rounded-lg border px-3 py-2 text-center text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 pt-1 sm:pt-0">
              <button
                type="submit"
                disabled={posting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 text-xs sm:text-sm font-medium shadow"
              >
                {posting ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4" /> Posting...
                  </>
                ) : (
                  "Post Result"
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Recent Results (Without Declared Time & Without Actions) */}
        <section className="mb-8 sm:mb-10">
          <h2 className="text-indigo-800 font-semibold text-base sm:text-lg lg:text-xl mb-4">
            Recent Results (All Games)
          </h2>

          <div className="bg-white border border-indigo-100 shadow-sm rounded-xl sm:rounded-2xl overflow-hidden">
            {loadingResults ? (
              <div className="p-6 flex items-center justify-center text-indigo-500">
                <Loader2 className="animate-spin w-5 h-5 mr-2" /> Loading results...
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No results posted yet.</div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-indigo-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Game
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Game Time
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Number
                      </th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-100">
                    {results.map((r) => {
                      const gameTime = formatGameTimeDisplay(r);

                      return (
                        <tr key={r._id} className="hover:bg-indigo-50 transition-colors">
                          <td className="px-4 py-2 text-xs sm:text-sm text-gray-800 font-medium">{r.gameName || "-"}</td>
                          <td className="px-4 py-2 text-xs sm:text-sm text-gray-700">{gameTime.time ? `${gameTime.date}, ${gameTime.time}` : gameTime.date}</td>
                          <td className="px-4 py-2 text-xs sm:text-sm font-semibold text-green-700 text-center">{r.number?.value ?? "-"}</td>
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
