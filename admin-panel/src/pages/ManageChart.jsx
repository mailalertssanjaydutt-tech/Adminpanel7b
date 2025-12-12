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
        const data = Array.from({ length: days }, () => ({ value: "" }));

        if (res.data?.numbers) {
          res.data.numbers.forEach((n, i) => {
            if (i < days) data[i] = n || { value: "" };
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
        day: index + 1,
        value: valueObj.value,
      });
      toast.success("Saved");

      setEditingIndex(null);
      const updated = [...chartData];
      updated[index] = { value: valueObj.value };
      setChartData(updated);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update day");
    } finally {
      setSavingDay(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/40 to-white py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-4 sm:mb-6">
          <h1 className="text-indigo-900 font-extrabold text-xl sm:text-2xl lg:text-3xl">
            Manage Monthly Chart
          </h1>
        </header>

        <section className="bg-white border border-indigo-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12 items-end">
            <div className="lg:col-span-5">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Select Game
              </label>
              <select
                className="w-full rounded-lg border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
              >
                <option value="">{loadingGames ? "Loading games..." : "Select Game"}</option>
                {games.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name} {g.resultTime ? `— ${g.resultTime}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-4 flex items-center justify-center gap-2">
              <button
                onClick={prevMonth}
                className="rounded-lg p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-xs sm:text-sm font-medium text-center">
                <span className="text-gray-600 text-xs block">Month</span>
                <div className="font-semibold text-indigo-800">{month}/{year}</div>
              </div>
              <button
                onClick={nextMonth}
                className="rounded-lg p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="lg:col-span-3 flex flex-col sm:flex-row gap-2 justify-end">
              <label className={`inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-white text-xs sm:text-sm cursor-pointer transition-colors ${fileLoading || !selectedGame ? "bg-gray-400" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                <UploadCloud className="w-4 h-4" />
                <span>{fileLoading ? "Uploading..." : "Import Excel"}</span>
                <input type="file" accept=".xlsx,.xls" className="hidden" disabled={fileLoading || !selectedGame} />
              </label>
            </div>
          </div>

          <div className="mt-2 text-xs text-gray-600">
            {selectedGame && resultTime && <span><strong className="text-indigo-800">Result Time:</strong> {resultTime}</span>}
          </div>
        </section>

        <section>
          <div className="bg-white border border-indigo-100 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
            {loadingChart ? (
              <div className="p-6 flex items-center justify-center text-indigo-500">
                <Loader2 className="animate-spin w-5 h-5 mr-2" />
                Loading chart...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-indigo-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Day</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Number</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {chartData.map((numObj, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50">
                        <td className="px-3 py-2 text-xs sm:text-sm font-medium text-gray-800">{idx + 1}</td>

                        <td className="px-3 py-2">
                          {editingIndex === idx ? (
                            <div className="flex gap-1 items-center">
                              <input
                                autoFocus
                                className="w-16 rounded border px-2 py-1 text-center text-sm focus:ring-1 focus:ring-indigo-300"
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
                                  if (e.key === "Enter") handleSaveDay(idx, chartData[idx]);
                                  else if (e.key === "Escape") setEditingIndex(null);
                                }}
                              />
                              <button
                                onClick={() => handleSaveDay(idx, chartData[idx])}
                                className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                              >
                                {savingDay ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => setEditingIndex(null)}
                                className="p-1 rounded bg-gray-100 hover:bg-gray-200"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold text-sm ${numObj.value ? "text-emerald-700" : "text-gray-400"}`}>
                                {numObj.value || "-"}
                              </span>
                              <button
                                onClick={() => setEditingIndex(idx)}
                                className="p-1 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
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
