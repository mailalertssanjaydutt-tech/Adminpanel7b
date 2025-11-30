// src/components/ManageChart.jsx
import React, { useState, useEffect } from "react";
import {
  Loader2,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/api";

/**
 * ManageChart
 * Responsive version with indigo theme (matches Results page).
 */
export default function ManageChart() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState("");
  const [resultTime, setResultTime] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [chartData, setChartData] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [savingDay, setSavingDay] = useState(false);

  const getDaysInMonth = (y, m) => new Date(y, m, 0).getDate();

  // ---------------------------
  // Fetch games
  // ---------------------------
  useEffect(() => {
    let mounted = true;
    const fetchGames = async () => {
      setLoadingGames(true);
      try {
        const res = await api.get("/games");
        if (!mounted) return;
        setGames(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch games");
        setGames([]);
      } finally {
        if (mounted) setLoadingGames(false);
      }
    };
    fetchGames();
    return () => (mounted = false);
  }, []);

  // ---------------------------
  // Fetch chart when selection changes
  // ---------------------------
  useEffect(() => {
    if (!selectedGame) {
      setChartData([]);
      setResultTime("");
      return;
    }

    const fetchChart = async () => {
      setLoadingChart(true);
      try {
        const res = await api.get(`/charts/${selectedGame}`, {
          params: { year, month },
        });

        const game = games.find((g) => g._id === selectedGame);
        setResultTime(game?.resultTime || "");

        const days = getDaysInMonth(year, month);
        const data = Array.from({ length: days }, () => ({ value: "", declaredAt: null }));

        if (res.data?.numbers) {
          res.data.numbers.forEach((n, i) => {
            if (i < days) data[i] = n || { value: "", declaredAt: null };
          });
        }

        setChartData(data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load chart");
      } finally {
        setLoadingChart(false);
      }
    };

    fetchChart();
  }, [selectedGame, year, month, games]);

  // ---------------------------
  // Save a single day
  // ---------------------------
  const handleSaveDay = async (index, valueObj) => {
    if (!selectedGame) return;
    if (valueObj.value !== "" && !/^\d{1,2}$/.test(String(valueObj.value))) {
      toast.error("Only 1-2 digit numbers allowed");
      return;
    }

    try {
      setSavingDay(true);
      await api.patch(`/charts/${selectedGame}/day`, {
        year,
        month,
        day: index + 1, // server expects 1..31
        value: valueObj.value,
      });
      toast.success("Saved");

      setEditingIndex(null);
      const updated = [...chartData];
      updated[index] = { value: valueObj.value, declaredAt: new Date().toISOString() };
      setChartData(updated);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update day");
    } finally {
      setSavingDay(false);
    }
  };

  const handleDeleteDay = async (index) => {
    if (!selectedGame) return;
    if (!window.confirm(`Clear day ${index + 1}?`)) return;

    try {
      await api.delete(`/charts/${selectedGame}/day`, {
        data: { year, month, day: index + 1 },
      });
      const updated = [...chartData];
      updated[index] = { value: "", declaredAt: null };
      setChartData(updated);
      toast.success(`Day ${index + 1} cleared`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete day");
    }
  };

  const handleDeleteChart = async () => {
    if (!selectedGame) return;
    if (!window.confirm("Delete entire chart? This cannot be undone.")) return;

    try {
      await api.delete(`/charts/${selectedGame}`, { params: { year, month } });
      setChartData(Array.from({ length: getDaysInMonth(year, month) }, () => ({ value: "", declaredAt: null })));
      toast.success("Chart deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete chart");
    }
  };

  // ---------------------------
  // Excel upload
  // ---------------------------
  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileLoading(true);
    try {
      const formData = new FormData();
      formData.append("excelFile", file);

      await api.post(`/chart/upload/${selectedGame}/${year}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Excel imported successfully!");
      // re-fetch
      const res = await api.get(`/charts/${selectedGame}`, { params: { year, month } });
      const days = getDaysInMonth(year, month);
      const updated = Array.from({ length: days }, () => ({ value: "", declaredAt: null }));
      if (res.data?.numbers) {
        res.data.numbers.forEach((n, idx) => {
          if (idx < days) updated[idx] = n || { value: "", declaredAt: null };
        });
      }
      setChartData(updated);
    } catch (err) {
      console.error(err);
      toast.error("Excel upload failed");
    } finally {
      setFileLoading(false);
    }
  };

  // ---------------------------
  // Month navigation
  // ---------------------------
  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else setMonth((m) => m + 1);
  };

  // ---------------------------
  // Format declaredAt for stacked display
  // ---------------------------
  const formatDeclaredAt = (declaredAt) => {
    if (!declaredAt) return { date: "-", time: "-" };
    const dt = new Date(declaredAt);
    if (isNaN(dt.getTime())) return { date: "-", time: "-" };
    
    const date = dt.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    
    const time = dt.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    
    return { date, time };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/40 to-white py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-4 sm:mb-6">
          <h1 className="text-indigo-900 font-extrabold text-xl sm:text-2xl lg:text-3xl">
            Manage Monthly Chart
          </h1>
        </header>

        {/* Controls */}
        <section className="bg-white border border-indigo-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12 items-end">
            {/* Game selector */}
            <div className="lg:col-span-5">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Select Game
              </label>
              <select
                className="w-full rounded-lg border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                aria-label="Select game"
              >
                <option value="">{loadingGames ? "Loading games..." : "Select Game"}</option>
                {games.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name} {g.resultTime ? `— ${g.resultTime}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Month nav */}
            <div className="lg:col-span-4 flex items-center justify-center gap-2">
              <button
                onClick={prevMonth}
                className="rounded-lg p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
              <div className="text-xs sm:text-sm font-medium min-w-[70px] sm:min-w-[80px] text-center">
                <span className="text-gray-600 text-xs block">Month</span>
                <div className="font-semibold text-indigo-800">{month}/{year}</div>
              </div>
              <button
                onClick={nextMonth}
                className="rounded-lg p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Upload & Delete */}
            <div className="lg:col-span-3 flex flex-col sm:flex-row gap-2 justify-end">
              <label className={`inline-flex items-center justify-center gap-1 px-2 sm:px-3 py-2 rounded-lg text-white text-xs sm:text-sm cursor-pointer transition-colors ${
                fileLoading || !selectedGame 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}>
                <UploadCloud className="w-3 h-3" />
                <span>{fileLoading ? "Uploading..." : "Import Excel"}</span>
                <input 
                  type="file" 
                  accept=".xlsx,.xls" 
                  className="hidden" 
                  disabled={fileLoading || !selectedGame} 
                  onChange={handleExcelUpload} 
                />
              </label>

              <button
                onClick={handleDeleteChart}
                disabled={!selectedGame}
                className="px-2 sm:px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs sm:text-sm transition-colors disabled:bg-gray-100 disabled:text-gray-400"
                title="Delete chart for selected month"
              >
                Delete Chart
              </button>
            </div>
          </div>

          {/* Result time small note */}
          <div className="mt-2 sm:mt-3 text-xs text-gray-600 flex items-center gap-3">
            {selectedGame && resultTime && (
              <span>
                <strong className="text-indigo-800">Result Time:</strong> {resultTime}
              </span>
            )}
            {loadingGames && (
              <span className="inline-flex items-center text-indigo-500">
                <Loader2 className="animate-spin w-3 h-3 mr-1" /> loading games...
              </span>
            )}
          </div>
        </section>

        {/* Chart area */}
        <section>
          <div className="bg-white border border-indigo-100 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
            {loadingChart ? (
              <div className="p-4 sm:p-6 flex items-center justify-center text-indigo-500">
                <Loader2 className="animate-spin w-4 h-4 sm:w-5 sm:h-5 mr-2" /> 
                <span className="text-sm sm:text-base">Loading chart...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-indigo-50">
                    <tr>
                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Day
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Number
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Declared At
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-100">
                    {chartData.map((numObj, idx) => {
                      const declaredAtParts = formatDeclaredAt(numObj.declaredAt);
                      
                      return (
                        <tr key={idx} className="hover:bg-indigo-50 transition-colors">
                          {/* Day */}
                          <td className="px-2 sm:px-3 py-2 align-middle">
                            <div className="text-xs sm:text-sm font-medium text-gray-800 whitespace-nowrap">
                              {idx + 1}
                            </div>
                          </td>

                          {/* Number */}
                          <td className="px-2 sm:px-3 py-2 align-middle">
                            {editingIndex === idx ? (
                              <div className="flex gap-1 items-center">
                                <input
                                  autoFocus
                                  className="w-12 sm:w-16 rounded border px-2 py-1 text-center text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
                                  value={numObj.value ?? ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (/^\d{0,2}$/.test(v)) {
                                      const updated = [...chartData];
                                      updated[idx] = { ...updated[idx], value: v };
                                      setChartData(updated);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveDay(idx, chartData[idx]);
                                    } else if (e.key === 'Escape') {
                                      setEditingIndex(null);
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => handleSaveDay(idx, chartData[idx])}
                                  disabled={savingDay}
                                  className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                                  aria-label={`Save day ${idx + 1}`}
                                >
                                  {savingDay ? <Loader2 className="animate-spin w-3 h-3" /> : <Save className="w-3 h-3" />}
                                </button>
                                <button
                                  onClick={() => setEditingIndex(null)}
                                  className="p-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-xs"
                                  aria-label="Cancel edit"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className={`font-semibold text-xs sm:text-sm ${numObj.value ? "text-emerald-700" : "text-gray-400"}`}>
                                  {numObj.value || "-"}
                                </span>
                                <button
                                  onClick={() => setEditingIndex(idx)}
                                  className="p-1 rounded hover:bg-indigo-100 text-indigo-600 transition-colors"
                                  aria-label={`Edit day ${idx + 1}`}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Declared At - Stacked on mobile */}
                          <td className="px-2 sm:px-3 py-2 align-middle">
                            <div className="hidden sm:block text-xs text-gray-600 whitespace-nowrap">
                              {numObj.declaredAt 
                                ? `${declaredAtParts.date}, ${declaredAtParts.time}`
                                : "-"
                              }
                            </div>
                            <div className="sm:hidden">
                              <div className="text-xs text-gray-800 font-medium">
                                {declaredAtParts.date}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {declaredAtParts.time}
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-2 sm:px-3 py-2 align-middle text-center">
                            <button
                              onClick={() => handleDeleteDay(idx)}
                              className="inline-flex items-center justify-center p-1 rounded hover:bg-red-50 transition-colors"
                              title={`Clear day ${idx + 1}`}
                              aria-label={`Clear day ${idx + 1}`}
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
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