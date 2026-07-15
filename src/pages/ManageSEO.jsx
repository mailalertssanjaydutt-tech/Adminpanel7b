import React, { useState, useEffect } from "react";
const siteOptions = [
  { label: "24x7sattaking", value: "24x7sattaking.com" },
  { label: "24x7satta", value: "24x7satta.com" },
  { label: "A7 Satta", value: "7asatta.com" },
  { label: "7B Satta", value: "7bsatta.com" },
  { label: "Lucky Satta 7", value: "lucky-satta7.com" },
  { label: "E Satta", value: "e-satta.com" },
];
import api from "../utils/api";

export default function ManageSEO() {
  const staticRoutes = [
    { label: "Home", value: "/home" },
    { label: "Charts", value: "/charts" },
    { label: "Yearly Chart", value: "/yearly-chart/satta-king-result" },
    { label: "Contact", value: "/contact" },
    { label: "Disclaimer", value: "/disclaimer" },
    { label: "Privacy Policy", value: "/privacy-policy" },
    { label: "Terms & Conditions", value: "/terms-and-conditions" },
    { label: "01-100 ki Family", value: "/01-100-ki-family" },
  ];
  const [page, setPage] = useState("");
  const [site, setSite] = useState(siteOptions[0].value);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [canonical, setCanonical] = useState("");
  const [focusKeywords, setFocusKeywords] = useState("");
  const [status, setStatus] = useState("");
  const [customPage, setCustomPage] = useState("");
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  // Fetch games for dropdown
  useEffect(() => {
    async function fetchGames() {
      try {
        const res = await api.get("/games");
        setGames(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        setGames([]);
      }
    }
    fetchGames();
  }, []);

  // Update customPage when game or year changes
  useEffect(() => {
    if (selectedGame && selectedYear) {
      const game = games.find((g) => g._id === selectedGame);
      if (game) {
        const slug = game.name.toLowerCase().replace(/\s+/g, "-");
        setCustomPage(`/chart-${selectedYear}/${slug}-satta-king-result`);
        setPage(`/chart-${selectedYear}/${slug}-satta-king-result`);
      }
    }
  }, [selectedGame, selectedYear, games]);
  const [robots, setRobots] = useState("");
  const [author, setAuthor] = useState("");
  const [publisher, setPublisher] = useState("");

  // Fetch SEO data for a page
  const fetchSEO = async (pagePath, siteValue = site) => {
    try {
      const { data } = await api.get(
        `/seo/get?page=${encodeURIComponent(pagePath)}&site=${encodeURIComponent(siteValue)}`,
      );
      if (data) {
        setMetaTitle(typeof data.metaTitle === "string" ? data.metaTitle : "");
        setMetaDescription(
          typeof data.metaDescription === "string" ? data.metaDescription : "",
        );
        setCanonical(typeof data.canonical === "string" ? data.canonical : "");
        setFocusKeywords(
          Array.isArray(data.focusKeywords)
            ? data.focusKeywords.join(", ")
            : typeof data.focusKeywords === "string"
              ? data.focusKeywords
              : "",
        );
        setRobots(typeof data.robots === "string" ? data.robots : "");
        setAuthor(typeof data.author === "string" ? data.author : "");
        setPublisher(typeof data.publisher === "string" ? data.publisher : "");
      } else {
        setMetaTitle("");
        setMetaDescription("");
        setCanonical("");
        setFocusKeywords("");
        setRobots("");
        setAuthor("");
        setPublisher("");
      }
    } catch {
      setMetaTitle("");
      setMetaDescription("");
      setCanonical("");
      setFocusKeywords("");
      setRobots("");
      setAuthor("");
      setPublisher("");
    }
  };

  // Always fetch SEO when page or site changes, and clear fields if site changes
  useEffect(() => {
    if (page && site) {
      fetchSEO(page, site);
    } else {
      setMetaTitle("");
      setMetaDescription("");
      setCanonical("");
      setFocusKeywords("");
      setRobots("");
      setAuthor("");
      setPublisher("");
    }
    // eslint-disable-next-line
  }, [page, site]);

  const [saving, setSaving] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [debug, setDebug] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    setMissingFields([]);
    setDebug("");
    let missing = [];
    if (!metaTitle) missing.push("Meta Title");
    if (!metaDescription) missing.push("Meta Description");
    if (!canonical) missing.push("Canonical URL");
    if (!focusKeywords) missing.push("Focus Keywords");
    if (!robots) missing.push("Robots Tag");
    if (!author) missing.push("Author");
    if (!publisher) missing.push("Publisher");
    if (missing.length > 0) {
      setMissingFields(missing);
      setStatus("Please fill all required fields.");
      return;
    }
    setSaving(true);
    let seoPage = page;
    // If using chart dropdowns, prefer customPage if set
    if (customPage && customPage.startsWith("/chart-")) {
      seoPage = customPage;
    }
    try {
      const resp = await api.post("/seo/set", {
        site,
        page: seoPage,
        metaTitle,
        metaDescription,
        canonical,
        focusKeywords: focusKeywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        robots,
        author,
        publisher,
      });
      setStatus("Saved!");
      setDebug(JSON.stringify(resp.data, null, 2));
    } catch (err) {
      setStatus("Error saving SEO data");
      setDebug(
        err?.response
          ? JSON.stringify(err.response.data, null, 2)
          : String(err),
      );
    }
    setSaving(false);
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Manage SEO</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-semibold">Select Site/Domain</label>
          <select
            className="w-full border p-2 rounded mb-2"
            value={site}
            onChange={(e) => {
              setSite(e.target.value);
              // Clear page to force re-fetch and avoid showing wrong SEO data
              setPage("");
              setCustomPage("");
              setSelectedGame("");
            }}
          >
            {siteOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.value})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-semibold">Select a Static Page</label>
          <select
            className="w-full border p-2 rounded mb-2"
            value={staticRoutes.some((r) => r.value === page) ? page : ""}
            onChange={(e) => {
              setPage(e.target.value);
              setCustomPage("");
            }}
          >
            <option value="">-- Choose a page --</option>
            {staticRoutes.map((route) => (
              <option key={route.value} value={route.value}>
                {route.label} ({route.value})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-semibold mb-1">
            SEO for Chart Page (No manual URL needed)
          </label>
          <div className="flex gap-2 mb-2">
            <select
              className="border p-2 rounded w-2/3"
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
            >
              <option value="">Select Game</option>
              {games.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.name}
                </option>
              ))}
            </select>
            <select
              className="border p-2 rounded w-1/3"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {Array.from({ length: 11 }, (_, i) => 2020 + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={customPage}
            readOnly
            className="w-full border p-2 rounded bg-gray-100 text-gray-700"
          />
        </div>
        <div>
          <label className="block font-semibold">Meta Title</label>
          <input
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="block font-semibold">Meta Description</label>
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="block font-semibold">Canonical URL</label>
          <input
            value={canonical}
            onChange={(e) => setCanonical(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="block font-semibold">
            Focus Keywords (comma separated)
          </label>
          <input
            value={focusKeywords}
            onChange={(e) => setFocusKeywords(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="block font-semibold">Robots Tag</label>
          <input
            value={robots}
            onChange={(e) => setRobots(e.target.value)}
            className="w-full border p-2 rounded"
            placeholder="e.g. index, follow"
          />
        </div>
        <div>
          <label className="block font-semibold">Author</label>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="block font-semibold">Publisher</label>
          <input
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center justify-center min-w-[80px]"
          disabled={saving}
        >
          {saving ? (
            <span className="loader mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : null}
          {saving ? "Saving..." : "Save"}
        </button>
        {status && (
          <div
            className={
              status === "Saved!" ? "mt-2 text-green-600" : "mt-2 text-red-600"
            }
          >
            {status}
          </div>
        )}
        {missingFields.length > 0 && (
          <div className="mt-2 text-red-500 text-sm">
            Missing: {missingFields.join(", ")}
          </div>
        )}
        {debug && (
          <pre className="mt-2 p-2 bg-gray-100 text-xs text-gray-700 rounded overflow-x-auto max-h-40">
            {debug}
          </pre>
        )}
      </form>
    </div>
  );
}

