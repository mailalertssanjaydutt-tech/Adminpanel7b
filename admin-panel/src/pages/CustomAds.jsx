import React, { useState, useEffect, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import api from "../utils/api";

export default function PremiumAdsEditor() {
  const [ads, setAds] = useState({ top: [], bottom: [] });
  const editorsRef = useRef({});

  // Normalize backend ad object to always have `id` (from _id or id)
  const normalizeAdsFromServer = (arr) =>
    arr.map((a) => {
      const id = a.id ?? a._id ?? undefined;
      return { ...a, id };
    });

  // Load ads from backend
  useEffect(() => {
    async function fetchAds() {
      try {
        const res = await api.get("/ads");
        const data = res.data;
        if (Array.isArray(data)) {
          const normalized = normalizeAdsFromServer(data);
          const top = normalized
            .filter((ad) => ad.position === "top")
            .sort((a, b) => a.order - b.order);

          const bottom = normalized
            .filter((ad) => ad.position === "bottom")
            .sort((a, b) => a.order - b.order);

          setAds({ top, bottom });
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchAds();
  }, []);

  // Keep editorsRef clean: remove refs that no longer exist in ads
  useEffect(() => {
    const idsNow = new Set();
    ["top", "bottom"].forEach((pos) =>
      (ads[pos] || []).forEach((ad) => idsNow.add(ad.id ?? ad._tempId))
    );

    Object.keys(editorsRef.current).forEach((k) => {
      if (!idsNow.has(k)) delete editorsRef.current[k];
    });
  }, [ads]);

  // Create a stable temp id for new items
  const makeTempId = (position) =>
    `tmp-${position}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const addAd = (position = "top") => {
    const tempId = makeTempId(position);
    setAds((prev) => ({
      ...prev,
      [position]: [
        ...prev[position],
        { id: undefined, _tempId: tempId, content: "", position, order: prev[position].length },
      ],
    }));
  };

  const removeAd = (position, identifier) => {
    setAds((prev) => ({
      ...prev,
      [position]: prev[position].filter((ad) => (ad.id ?? ad._tempId) !== identifier),
    }));
    delete editorsRef.current[identifier];
  };

  // Delete one ad from DB
  const deleteAdFromDB = async (id, position) => {
    if (!id) {
      alert("This ad is not saved yet. Removing locally.");
      return;
    }

    if (!confirm("Delete this ad permanently from database?")) return;

    try {
      await api.delete(`/ads/${id}`);

      setAds((prev) => ({
        ...prev,
        [position]: prev[position].filter((ad) => ad.id !== id),
      }));

      delete editorsRef.current[id];
      alert("Ad deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete ad.");
    }
  };

  // Save one section
  const handleSectionSave = async (position) => {
    if (handleSectionSave.saving) return;
    handleSectionSave.saving = true;

    try {
      const sectionAds = ads[position].map((ad, idx) => {
        const identifier = ad.id ?? ad._tempId;
        const editorEl = editorsRef.current[identifier];
        const contentFromEditor = editorEl ? editorEl.innerHTML : ad.content ?? "";
        return {
          id: ad.id ?? undefined,
          content: contentFromEditor,
          position: ad.position ?? position,
          order: idx,
        };
      });

      console.log(`[Saving ${position}] payload:`, sectionAds);

      const allEmpty = sectionAds.every((s) => !s.content || s.content.trim() === "");
      if (allEmpty && !confirm(`${position} ads are empty. Save anyway?`)) {
        handleSectionSave.saving = false;
        return;
      }

      const res = await api.post("/ads", sectionAds);
      console.log(`[Saving ${position}] response:`, res);

      const data = res.data ?? {};
      if (res.status >= 200 && res.status < 300 && (data.success === true || data.ads)) {
        // Prefer returned ads (res.data.ads) if present
        const returned = Array.isArray(data.ads) ? normalizeAdsFromServer(data.ads) : [];

        // If backend returned ads, use them; otherwise re-fetch as fallback
        if (returned.length > 0) {
          const top = returned
            .filter((ad) => ad.position === "top")
            .sort((a, b) => a.order - b.order);

          const bottom = returned
            .filter((ad) => ad.position === "bottom")
            .sort((a, b) => a.order - b.order);

          setAds({ top, bottom });
        } else {
          try {
            const fresh = await api.get("/ads");
            const payload = fresh.data;
            if (Array.isArray(payload)) {
              const normalized = normalizeAdsFromServer(payload);
              const top = normalized
                .filter((ad) => ad.position === "top")
                .sort((a, b) => a.order - b.order);

              const bottom = normalized
                .filter((ad) => ad.position === "bottom")
                .sort((a, b) => a.order - b.order);

              setAds({ top, bottom });
            }
          } catch (fetchErr) {
            console.warn("Saved but failed to refresh from server:", fetchErr);
          }
        }

        alert(`${position} Ads saved successfully!`);
      } else {
        const errMsg = data.error || data.message || `Server returned ${res.status}`;
        console.error(`[Saving ${position}] failed:`, errMsg);
        alert(`Failed to save ${position} ads: ${errMsg}`);
      }
    } catch (err) {
      console.error(`[Saving ${position}] exception:`, err);
      alert("Error saving ads. See console for details.");
    } finally {
      handleSectionSave.saving = false;
    }
  };

  const execCommand = (adIdentifier, command, value = null) => {
    const editor = editorsRef.current[adIdentifier];
    if (editor) {
      editor.focus();
      document.execCommand(command, false, value);
    }
  };

  // Resize last inserted image
  const resizeLastImage = (adIdentifier, width) => {
    const editor = editorsRef.current[adIdentifier];
    if (!editor) return;

    const images = editor.getElementsByTagName("img");
    if (images.length === 0) return alert("No image to resize");

    const img = images[images.length - 1];
    img.style.width = `${width}px`;
    img.style.height = "auto";
    img.style.maxWidth = "none";
  };

 const insertImage = (adIdentifier, file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const editor = editorsRef.current[adIdentifier];
    if (!editor) return;

    const link = prompt("Enter link URL for this image (optional):");

    const imgHTML = `<img src="${e.target.result}" 
                          style="width:200px;height:auto;max-width:none;" 
                          draggable="false" />`;

    editor.focus();

    if (link) {
      document.execCommand(
        "insertHTML",
        false,
        `<a href="${link}" target="_blank">${imgHTML}</a>`
      );
    } else {
      document.execCommand("insertHTML", false, imgHTML);
    }
  };
  reader.readAsDataURL(file);
};


  const toolbarButton = (label, onClick) => (
    <button
      onClick={onClick}
      className="px-2 py-1 border rounded hover:bg-gray-100 text-sm font-medium"
      title={label}
    >
      {label}
    </button>
  );

  const onDragEnd = (result, position) => {
    if (!result.destination) return;
    const items = Array.from(ads[position]);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setAds((prev) => ({ ...prev, [position]: items }));
  };

  // Normalize images and prevent native dragging for existing/pasted images
  useEffect(() => {
    const normalizeImgs = () => {
      Object.values(editorsRef.current).forEach((editor) => {
        if (!editor) return;
        const imgs = editor.getElementsByTagName("img");
        for (let i = 0; i < imgs.length; i++) {
          const img = imgs[i];
          img.setAttribute("draggable", "false");
          img.draggable = false;
          if (img.style.cursor === "move") img.style.cursor = "default";
          if (!img._noDragBound) {
            img.addEventListener("dragstart", (e) => e.preventDefault());
            img._noDragBound = true;
          }
        }
      });
    };

    // run once after any ads change (covers fetched HTML and new inserts)
    normalizeImgs();

    // observe DOM inside editors in case HTML is pasted or mutated later
    const observers = [];
    Object.values(editorsRef.current).forEach((editor) => {
      if (!editor) return;
      const obs = new MutationObserver(normalizeImgs);
      obs.observe(editor, { childList: true, subtree: true });
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [ads]);

  // Inject CSS fallback so rendered front-end also gets non-draggable images
  useEffect(() => {
    const css = `
      .content-editor img { -webkit-user-drag: none; user-drag: none; cursor: default !important; }
    `;
    const styleEl = document.createElement("style");
    styleEl.setAttribute("data-src", "premium-ads-editor-img-style");
    styleEl.appendChild(document.createTextNode(css));
    document.head.appendChild(styleEl);

    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  const renderAds = (position) => (
    <DragDropContext onDragEnd={(result) => onDragEnd(result, position)}>
      <Droppable droppableId={position}>
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {ads[position].map((ad, index) => {
              const safeId = ad.id ?? ad._tempId ?? `tmp-${position}-${index}`;
              const draggableId = `${safeId}-${position}-${index}`;

              return (
                <Draggable key={draggableId} draggableId={draggableId} index={index}>
                  {(provided) => (
                    <div
                      className="border p-4 rounded-lg shadow-sm space-y-3 mb-3"
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg">{position.toUpperCase()} Ad {index + 1}</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => removeAd(position, safeId)}
                            className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                          >
                            Remove
                          </button>

                          {ad.id && (
                            <button
                              onClick={() => deleteAdFromDB(ad.id, position)}
                              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                            >
                              Delete DB
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Toolbar: extended with requested tools (no background color) */}
                      <div className="flex flex-wrap gap-2 bg-gray-50 p-2 rounded">
                        {toolbarButton("B", () => execCommand(safeId, "bold"))}
                        {toolbarButton("I", () => execCommand(safeId, "italic"))}
                        {toolbarButton("U", () => execCommand(safeId, "underline"))}
                        {toolbarButton("S", () => execCommand(safeId, "strikeThrough"))}

                        {/* Font Size (1-7) */}
                        {toolbarButton("A+", () => {
                          const size = prompt("Enter font size (1 - 7):");
                          if (size) execCommand(safeId, "fontSize", size);
                        })}

                        {/* Text Color */}
                        {toolbarButton("Color", () => {
                          const color = prompt("Enter text color (name or hex):");
                          if (color) execCommand(safeId, "foreColor", color);
                        })}

                        {/* Emoji */}
                        {toolbarButton("😊", () => {
                          const emoji = prompt("Enter emoji (or paste):");
                          if (!emoji) return;
                          const editor = editorsRef.current[safeId];
                          if (!editor) return;
                          editor.focus();
                          document.execCommand("insertText", false, emoji);
                        })}

                        {/* Align */}
                        {toolbarButton("Left", () => execCommand(safeId, "justifyLeft"))}
                        {toolbarButton("Center", () => execCommand(safeId, "justifyCenter"))}
                        {toolbarButton("Right", () => execCommand(safeId, "justifyRight"))}
                        {toolbarButton("Justify", () => execCommand(safeId, "justifyFull"))}

                        {/* Lists */}
                        {toolbarButton("• List", () => execCommand(safeId, "insertUnorderedList"))}
                        {toolbarButton("1. List", () => execCommand(safeId, "insertOrderedList"))}

                        {/* Insert Link (text) */}
                        {toolbarButton("Link", () => {
                          const url = prompt("Enter link URL:");
                          if (!url) return;
                          execCommand(safeId, "createLink", url);
                        })}

                        {/* Remove Link */}
                        {toolbarButton("Unlink", () => execCommand(safeId, "unlink"))}

                        {/* Image Upload */}
                        {toolbarButton("Image", () =>
                          document.getElementById(`fileInput-${draggableId}`).click()
                        )}
                        <input
                          type="file"
                          id={`fileInput-${draggableId}`}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files[0]) insertImage(safeId, e.target.files[0]);
                            e.target.value = null;
                          }}
                        />

                        {/* Image size presets */}
                        {toolbarButton("Img100", () => resizeLastImage(safeId, 100))}
                        {toolbarButton("Img150", () => resizeLastImage(safeId, 150))}
                        {toolbarButton("Img200", () => resizeLastImage(safeId, 200))}

                        {/* Custom size */}
                        {toolbarButton("Custom", () => {
                          const size = prompt("Enter width in px:");
                          if (size) resizeLastImage(safeId, parseInt(size));
                        })}

                        {/* Add link to last image */}
                        {toolbarButton("Image Link", () => {
                          const editor = editorsRef.current[safeId];
                          if (!editor) return;
                          const imgs = editor.getElementsByTagName("img");
                          if (imgs.length === 0) return alert("No image found");
                          const url = prompt("Enter link for the last image:");
                          if (!url) return;
                          const img = imgs[imgs.length - 1];
                          const a = document.createElement("a");
                          a.href = url;
                          a.target = "_blank";
                          img.replaceWith(a);
                          a.appendChild(img);
                        })}

                        {/* Clear formatting */}
                        {toolbarButton("Clear", () => execCommand(safeId, "removeFormat"))}
                      </div>

                      {/* Content editor */}
                      <div
                        key={safeId}
                        ref={(el) => (editorsRef.current[safeId] = el)}
                        contentEditable
                        dangerouslySetInnerHTML={{ __html: ad.content }}
                        className="content-editor border p-3 rounded min-h-[150px] focus:outline-none"
                      />
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
  );

  return (
    <div className="p-6 space-y-6 relative">
      <div>
        <h2 className="text-xl font-bold mb-2">Top Ads</h2>
        {renderAds("top")}
        <button
          onClick={() => addAd("top")}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-semibold mb-4"
        >
          Add Top Ad
        </button>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">Bottom Ads</h2>
        {renderAds("bottom")}
        <button
          onClick={() => addAd("bottom")}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-semibold mb-4"
        >
          Add Bottom Ad
        </button>
      </div>

      {/* Save buttons */}
      <button
        onClick={() => handleSectionSave("top")}
        className="fixed bottom-24 right-6 bg-blue-600 text-white px-5 py-2 rounded-full shadow-lg"
      >
        Save Top Ads
      </button>

      <button
        onClick={() => handleSectionSave("bottom")}
        className="fixed bottom-6 right-6 bg-blue-600 text-white px-5 py-2 rounded-full shadow-lg"
      >
        Save Bottom Ads
      </button>
    </div>
  );
}
