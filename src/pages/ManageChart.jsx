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

  // ---------------- FETCH GAMES ----------------
  useEffect(() => {
    let mounted = true;
    const fetchGames = async () => {
      setLoadingGames(true);
      try {
        const res = await api.get("/games");
        if (mounted) setGames(Array.isArray(res.data) ? res.data : []);
      } catch {
        toast.error("Failed to fetch games");
      } finally {
        if (mounted) setLoadingGames(false);
      }
    };
    fetchGames();
    return () => (mounted = false);
  }, []);

  // ---------------- FETCH CHART ----------------
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
        const data = Array.from({ length: days }, () => ({
          value: "",
          declaredAt: null,
        }));

        if (res.data?.numbers) {
          res.data.numbers.forEach((n, i) => {
            if (i < days) data[i] = n || data[i];
          });
        }

        setChartData(data);
      } catch {
        toast.error("Failed to load chart");
      } finally {
        setLoadingChart(false);
      }
    };

    fetchChart();
  }, [selectedGame, year, month, games]);

  // ---------------- SAVE DAY ----------------
  const handleSaveDay = async (index, valueObj) => {
    if (!/^\d{1,2}$/.test(valueObj.value || "")) {
      toast.error("Only 1–2 digit numbers allowed");
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

      const updated = [...chartData];
      updated[index] = {
        value: valueObj.value,
        declaredAt: new Date().toISOString(),
      };
      setChartData(updated);
      setEditingIndex(null);
      toast.success("Saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSavingDay(false);
    }
  };

  // ---------------- DELETE DAY ----------------
  const handleDeleteDay = async (index) => {
    if (!window.confirm(`Clear day ${index + 1}?`)) return;

    try {
      await api.delete(`/charts/${selectedGame}/day`, {
        data: { year, month, day: index + 1 },
      });
      const updated = [...chartData];
      updated[index] = { value: "", declaredAt: null };
      setChartData(updated);
      toast.success("Day cleared");
    } catch {
      toast.error("Failed to clear day");
    }
  };

  // ---------------- DELETE CHART ----------------
  const handleDeleteChart = async () => {
    if (!window.confirm("Delete entire chart?")) return;
    try {
      await api.delete(`/charts/${selectedGame}`, {
        params: { year, month },
      });
      setChartData(
        Array.from({ length: getDaysInMonth(year, month) }, () => ({
          value: "",
          declaredAt: null,
        }))
      );
      toast.success("Chart deleted");
    } catch {
      toast.error("Failed to delete chart");
    }
  };

  // ---------------- EXCEL UPLOAD ----------------
  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setFileLoading(true);
      const formData = new FormData();
      formData.append("excelFile", file);

      await api.post(`/chart/upload/${selectedGame}/${year}`, formData);
      toast.success("Excel imported");

      const res = await api.get(`/charts/${selectedGame}`, {
        params: { year, month },
      });

      const days = getDaysInMonth(year, month);
      const updated = Array.from({ length: days }, () => ({
        value: "",
        declaredAt: null,
      }));

      if (res.data?.numbers) {
        res.data.numbers.forEach((n, i) => {
          if (i < days) updated[i] = n || updated[i];
        });
      }

      setChartData(updated);
    } catch {
      toast.error("Excel upload failed");
    } finally {
      setFileLoading(false);
      e.target.value = "";
    }
  };

  // ---------------- MONTH NAV ----------------
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
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/40 to-white py-6 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-extrabold text-indigo-900 mb-6">
          Manage Monthly Chart
        </h1>

        {/* CONTROLS */}
        <div className="bg-white p-6 rounded-2xl shadow mb-6 grid lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-5">
            <label className="text-sm font-medium">Select Game</label>
            <select
              className="w-full mt-1 rounded border px-3 py-2"
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
            >
              <option value="">
                {loadingGames ? "Loading..." : "Select game"}
              </option>
              {games.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.name} — {g.resultTime}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-4 flex justify-center items-center gap-2">
            <button onClick={prevMonth} className="p-2 bg-indigo-100 rounded">
              <ChevronLeft />
            </button>
            <div className="font-semibold">
              {month}/{year}
            </div>
            <button onClick={nextMonth} className="p-2 bg-indigo-100 rounded">
              <ChevronRight />
            </button>
          </div>

          <div className="lg:col-span-3 flex gap-2 justify-end">
            <label
              className={`px-3 py-2 rounded-lg text-white cursor-pointer ${
                fileLoading || !selectedGame
                  ? "bg-gray-400"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              <UploadCloud className="inline w-4 h-4 mr-1" />
              {fileLoading ? "Uploading..." : "Import Excel"}
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                disabled={!selectedGame}
              />
            </label>

            <button
              onClick={handleDeleteChart}
              className="px-3 py-2 rounded-lg bg-red-50 text-red-600"
            >
              Delete Chart
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {loadingChart ? (
            <div className="p-6 text-center text-indigo-600">
              <Loader2 className="animate-spin inline mr-2" /> Loading...
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-indigo-50 text-sm">
                <tr>
                  <th className="p-3 text-left">Day</th>
                  <th className="p-3 text-left">Number</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((d, i) => (
                  <tr key={i} className="border-t hover:bg-indigo-50">
                    <td className="p-3">{i + 1}</td>
                    <td className="p-3">
                      {editingIndex === i ? (
                        <input
                          className="border rounded px-2 py-1 w-16 text-center"
                          value={d.value}
                          onChange={(e) => {
                            if (/^\d{0,2}$/.test(e.target.value)) {
                              const updated = [...chartData];
                              updated[i].value = e.target.value;
                              setChartData(updated);
                            }
                          }}
                          onKeyDown={(e) =>
                            e.key === "Enter" &&
                            handleSaveDay(i, chartData[i])
                          }
                        />
                      ) : (
                        <span
                          className="font-semibold cursor-pointer"
                          onClick={() => setEditingIndex(i)}
                        >
                          {d.value || "-"}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleDeleteDay(i)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
