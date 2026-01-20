import React, { useState, useEffect, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import api from "../utils/api";
import {
  FiBold,
  FiItalic,
  FiUnderline,
  FiType,
  FiLink,
  FiImage,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight,
  FiList,
  FiTrash2,
  FiSave,
  FiPlus,
  FiMove,
  FiX,
  FiEdit3,
  FiEye,
  FiMaximize,
  FiMinimize,
  FiUpload,
  FiDownload,
} from "react-icons/fi";
import {
  MdFormatColorText,
  MdFormatStrikethrough,
  MdEmojiEmotions,
  MdFormatAlignJustify,
  MdNumbers,
} from "react-icons/md";

const siteOptions = [
  { label: "24x7sattaking", value: "24x7sattaking.com" },
  { label: "24x7sattaking", value: "24x7sattaking.com" },
  { label: "A7 Satta", value: "7asatta.com" },
  { label: "7B Satta", value: "7bsatta.com" },
];

export default function PremiumAdsEditor() {
  const [ads, setAds] = useState({ top: [], middle: [], bottom: [] });
  const [activeSection, setActiveSection] = useState("top");
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [site, setSite] = useState(siteOptions[0].value);
  const editorsRef = useRef({});

  // Modal states
  const [modalType, setModalType] = useState(null); // 'platform', 'phone', 'username', 'addLink', 'emoji', 'color', 'message'
  const [modalMessage, setModalMessage] = useState("");
  const [modalInput, setModalInput] = useState("");
  const [modalCallback, setModalCallback] = useState(null);
  const [modalTitle, setModalTitle] = useState("");

  // Modal helpers
  const showModal = (type, title, message, callback = null) => {
    setModalType(type);
    setModalTitle(title);
    setModalMessage(message);
    setModalInput("");
    setModalCallback(() => callback);
  };

  const closeModal = () => {
    setModalType(null);
    setModalTitle("");
    setModalMessage("");
    setModalInput("");
    setModalCallback(null);
  };

  const handleModalSubmit = () => {
    if (modalCallback) {
      modalCallback(modalInput);
    }
    closeModal();
  };

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
        const res = await api.get(`/ads?site=${encodeURIComponent(site)}`);
        const data = res.data;
        if (Array.isArray(data)) {
          const normalized = normalizeAdsFromServer(data);

          const top = normalized
            .filter((a) => a.position === "top")
            .sort((a, b) => a.order - b.order);
          const middle = normalized
            .filter((a) => a.position === "middle")
            .sort((a, b) => a.order - b.order);
          const bottom = normalized
            .filter((a) => a.position === "bottom")
            .sort((a, b) => a.order - b.order);

          setAds({ top, middle, bottom });
        }
      } catch (err) {
        console.error(err);
        setAds({ top: [], middle: [], bottom: [] });
      }
    }
    fetchAds();
  }, [site]);

  // Keep editorsRef clean
  useEffect(() => {
    const idsNow = new Set();
    ["top", "middle", "bottom"].forEach((pos) =>
      (ads[pos] || []).forEach((ad) => idsNow.add(ad.id ?? ad._tempId)),
    );

    Object.keys(editorsRef.current).forEach((k) => {
      if (!idsNow.has(k)) delete editorsRef.current[k];
    });
  }, [ads]);

  // Create temp ID
  const makeTempId = (position) =>
    `tmp-${position}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const addAd = (position = "top") => {
    const tempId = makeTempId(position);
    setAds((prev) => ({
      ...prev,
      [position]: [
        ...prev[position],
        {
          id: undefined,
          _tempId: tempId,
          content: "",
          position,
          order: prev[position].length,
          site,
        },
      ],
    }));
  };

  const removeAd = (position, identifier) => {
    setAds((prev) => ({
      ...prev,
      [position]: prev[position].filter(
        (ad) => (ad.id ?? ad._tempId) !== identifier,
      ),
    }));
    delete editorsRef.current[identifier];
  };

  const deleteAdFromDB = async (id, position) => {
    if (!id) {
      removeAd(position, id);
      return;
    }

    showModal(
      "confirm",
      "Delete Ad",
      "Delete this ad permanently from database?",
      (confirmed) => {
        if (confirmed === "yes") {
          handleDeleteAd(id, position);
        }
      },
    );
  };

  const handleDeleteAd = async (id, position) => {
    try {
      await api.delete(`/ads/${id}`);
      setAds((prev) => ({
        ...prev,
        [position]: prev[position].filter((ad) => ad.id !== id),
      }));
      delete editorsRef.current[id];
      showModal("message", "Success", "Ad deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      showModal("message", "Error", "Failed to delete ad.");
    }
  };

  // Save one section
  const handleSectionSave = async (position) => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const sectionAds = ads[position].map((ad, idx) => {
        const identifier = ad.id ?? ad._tempId;
        const editorEl = editorsRef.current[identifier];
        const contentFromEditor = editorEl
          ? editorEl.innerHTML
          : (ad.content ?? "");

        return {
          _id: ad.id ?? undefined,
          content: contentFromEditor,
          position,
          order: idx,
          site,
        };
      });

      const allEmpty = sectionAds.every(
        (s) => !s.content || s.content.trim() === "",
      );

      if (allEmpty) {
        showModal(
          "confirm",
          "Empty Ads",
          `${position} ads are empty. Save anyway?`,
          (confirmed) => {
            if (confirmed === "yes") {
              performSave(sectionAds, position);
            } else {
              setIsSaving(false);
            }
          },
        );
        return;
      }

      performSave(sectionAds, position);
    } catch (err) {
      console.error("Save error:", err);
      showModal("message", "Error", "Error saving ads.");
      setIsSaving(false);
    }
  };

  const performSave = async (sectionAds, position) => {
    try {
      const res = await api.post(
        `/ads?site=${encodeURIComponent(site)}`,
        sectionAds,
      );
      const data = res.data ?? {};

      if (Array.isArray(data.ads)) {
        const normalized = normalizeAdsFromServer(data.ads);

        setAds((prev) => ({
          ...prev,
          [position]: normalized
            .filter((a) => a.position === position)
            .sort((a, b) => a.order - b.order),
        }));

        showModal(
          "message",
          "Success",
          `${position.charAt(0).toUpperCase() + position.slice(1)} ads saved successfully!`,
        );
      }
    } catch (err) {
      console.error("Save error:", err);
      showModal("message", "Error", "Error saving ads.");
    } finally {
      setIsSaving(false);
    }
  };
  // Editor commands
  const execCommand = (adIdentifier, command, value = null) => {
    const editor = editorsRef.current[adIdentifier];
    if (editor) {
      editor.focus();
      document.execCommand(command, false, value);
    }
  };

  // Store selection/range when modal might steal focus
  let savedSelection = null;

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      savedSelection = selection.getRangeAt(0);
      return true;
    }
    return false;
  };

  const restoreSelection = () => {
    if (savedSelection) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedSelection);
    }
  };

  // Generate WhatsApp or Telegram link from number/username
  const generateContactLink = (callback, adIdentifier) => {
    // Save the current selection before modal opens
    saveSelection();

    showModal(
      "platform",
      "Select Contact Platform",
      "Choose platform: (1) WhatsApp or (2) Telegram",
      (platform) => {
        if (platform === "1") {
          showModal(
            "phone",
            "WhatsApp Number",
            "Enter WhatsApp number (with country code, e.g., 911234567890):",
            (number) => {
              if (number && number.trim() !== "") {
                const link = `https://wa.me/${number.replace(/[^\d]/g, "")}`;
                // Restore selection before executing command
                restoreSelection();
                if (adIdentifier) {
                  const editor = editorsRef.current[adIdentifier];
                  if (editor) editor.focus();
                }
                callback(link);
              }
            },
          );
        } else if (platform === "2") {
          showModal(
            "username",
            "Telegram Username",
            "Enter Telegram username (without @):",
            (username) => {
              if (username && username.trim() !== "") {
                const link = `https://t.me/${username.trim()}`;
                // Restore selection before executing command
                restoreSelection();
                if (adIdentifier) {
                  const editor = editorsRef.current[adIdentifier];
                  if (editor) editor.focus();
                }
                callback(link);
              }
            },
          );
        }
      },
    );
  };

  const resizeLastImage = (adIdentifier, width) => {
    const editor = editorsRef.current[adIdentifier];
    if (!editor) return;

    const images = editor.getElementsByTagName("img");
    if (images.length === 0) {
      showModal("message", "No Image", "No image to resize");
      return;
    }

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

      showModal(
        "confirm",
        "Add Link",
        "Add link to this image?",
        (confirmed) => {
          let link = null;
          if (confirmed === "yes") {
            generateContactLink((generatedLink) => {
              link = generatedLink;
              insertImageWithLink(editor, e.target.result, link);
            }, adIdentifier);
          } else {
            insertImageWithLink(editor, e.target.result, null);
          }
        },
      );
    };
    reader.readAsDataURL(file);
  };

  const insertImageWithLink = (editor, imageSrc, link) => {
    const imgHTML = `<img src="${imageSrc}" 
                        style="width:200px;height:auto;max-width:none;border-radius:4px;" 
                        draggable="false" />`;

    editor.focus();

    if (link) {
      document.execCommand(
        "insertHTML",
        false,
        `<a href="${link}" target="_blank">${imgHTML}</a>`,
      );
    } else {
      document.execCommand("insertHTML", false, imgHTML);
    }
  };

  const onDragEnd = (result, position) => {
    if (!result.destination) return;
    const items = Array.from(ads[position]);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setAds((prev) => ({ ...prev, [position]: items }));
  };

  // Toolbar Button Component
  const ToolbarButton = ({ icon: Icon, label, onClick, active = false }) => (
    <button
      onClick={onClick}
      className={`
        p-2 rounded-lg transition-all duration-200 flex flex-col items-center justify-center
        ${
          active
            ? "bg-blue-100 text-blue-600 border border-blue-200"
            : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
        }
        min-w-[60px] h-[60px] sm:h-[50px] sm:min-w-[50px]
      `}
      title={label}
    >
      <Icon className="w-5 h-5 mb-1" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );

  // Render Ads Section
  const renderAds = (position) => (
    <div
      className={`transition-all duration-300 ${
        activeSection === position ? "block" : "hidden md:block"
      }`}
    >
      <DragDropContext onDragEnd={(result) => onDragEnd(result, position)}>
        <Droppable droppableId={position}>
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`
                space-y-4 p-2 rounded-xl
                ${snapshot.isDraggingOver ? "bg-blue-50/50" : "bg-transparent"}
                min-h-[200px]
              `}
            >
              {ads[position].length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                  <FiEye className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">
                    No {position} ads yet. Add your first one!
                  </p>
                </div>
              ) : (
                ads[position].map((ad, index) => {
                  const safeId =
                    ad.id ?? ad._tempId ?? `tmp-${position}-${index}`;
                  const draggableId = `${safeId}-${position}-${index}`;

                  return (
                    <Draggable
                      key={draggableId}
                      draggableId={draggableId}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`
                            bg-white rounded-xl shadow-sm border transition-all duration-200
                            ${
                              snapshot.isDragging
                                ? "shadow-lg scale-[1.02] ring-2 ring-blue-500"
                                : "hover:shadow-md"
                            }
                            overflow-hidden
                          `}
                        >
                          {/* Ad Header */}
                          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex items-center space-x-3">
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-move p-2 hover:bg-gray-100 rounded-lg"
                              >
                                <FiMove className="w-4 h-4 text-gray-500" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-800">
                                  {position.charAt(0).toUpperCase() +
                                    position.slice(1)}{" "}
                                  Ad {index + 1}
                                </h3>
                                <p className="text-xs text-gray-500">
                                  {ad.id ? `ID: ${ad.id}` : "Unsaved"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => removeAd(position, safeId)}
                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Remove locally"
                              >
                                <FiX className="w-4 h-4" />
                              </button>
                              {ad.id && (
                                <button
                                  onClick={() =>
                                    deleteAdFromDB(ad.id, position)
                                  }
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete from database"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Toolbar */}
                          <div className="p-3 border-b bg-gray-50/50">
                            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-2">
                              <ToolbarButton
                                icon={FiBold}
                                label="Bold"
                                onClick={() => execCommand(safeId, "bold")}
                              />
                              <ToolbarButton
                                icon={FiItalic}
                                label="Italic"
                                onClick={() => execCommand(safeId, "italic")}
                              />
                              <ToolbarButton
                                icon={FiUnderline}
                                label="Underline"
                                onClick={() => execCommand(safeId, "underline")}
                              />
                              <ToolbarButton
                                icon={MdFormatStrikethrough}
                                label="Strike"
                                onClick={() =>
                                  execCommand(safeId, "strikeThrough")
                                }
                              />
                              <ToolbarButton
                                icon={MdFormatColorText}
                                label="Color"
                                onClick={() => {
                                  showModal(
                                    "color",
                                    "Text Color",
                                    "Enter text color (name or hex):",
                                    (color) => {
                                      if (color)
                                        execCommand(safeId, "foreColor", color);
                                    },
                                  );
                                }}
                              />
                              <ToolbarButton
                                icon={MdEmojiEmotions}
                                label="Emoji"
                                onClick={() => {
                                  showModal(
                                    "emoji",
                                    "Add Emoji",
                                    "Enter emoji:",
                                    (emoji) => {
                                      if (emoji) {
                                        const editor =
                                          editorsRef.current[safeId];
                                        if (editor) {
                                          editor.focus();
                                          document.execCommand(
                                            "insertText",
                                            false,
                                            emoji,
                                          );
                                        }
                                      }
                                    },
                                  );
                                }}
                              />
                              <ToolbarButton
                                icon={FiLink}
                                label="Link"
                                onClick={() => {
                                  generateContactLink((url) => {
                                    if (url)
                                      execCommand(safeId, "createLink", url);
                                  }, safeId);
                                }}
                              />
                              <ToolbarButton
                                icon={FiImage}
                                label="Image"
                                onClick={() =>
                                  document
                                    .getElementById(`fileInput-${draggableId}`)
                                    .click()
                                }
                              />
                              <ToolbarButton
                                icon={FiAlignLeft}
                                label="Left"
                                onClick={() =>
                                  execCommand(safeId, "justifyLeft")
                                }
                              />
                              <ToolbarButton
                                icon={FiAlignCenter}
                                label="Center"
                                onClick={() =>
                                  execCommand(safeId, "justifyCenter")
                                }
                              />
                              <ToolbarButton
                                icon={FiAlignRight}
                                label="Right"
                                onClick={() =>
                                  execCommand(safeId, "justifyRight")
                                }
                              />
                              <ToolbarButton
                                icon={FiList}
                                label="List"
                                onClick={() =>
                                  execCommand(safeId, "insertUnorderedList")
                                }
                              />
                            </div>

                            {/* Image Size Controls */}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className="text-sm text-gray-600 font-medium">
                                Image Size:
                              </span>
                              {[100, 150, 200, 300].map((size) => (
                                <button
                                  key={size}
                                  onClick={() => resizeLastImage(safeId, size)}
                                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                                >
                                  {size}px
                                </button>
                              ))}
                            </div>

                            {/* Hidden file input */}
                            <input
                              type="file"
                              id={`fileInput-${draggableId}`}
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files[0])
                                  insertImage(safeId, e.target.files[0]);
                                e.target.value = null;
                              }}
                            />
                          </div>

                          {/* Content Editor */}
                          <div
                            ref={(el) => (editorsRef.current[safeId] = el)}
                            contentEditable
                            dangerouslySetInnerHTML={{ __html: ad.content }}
                            className="content-editor min-h-[200px] p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded-b-xl prose prose-sm max-w-none"
                            style={{
                              fontSize: "14px",
                              lineHeight: "1.6",
                            }}
                          />
                        </div>
                      )}
                    </Draggable>
                  );
                })
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Premium Ads Editor
            </h1>
            <p className="text-gray-600 mt-2">
              Manage and edit your premium advertisement content
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              value={site}
              onChange={(e) => {
                setSite(e.target.value);
                setAds({ top: [], middle: [], bottom: [] });
              }}
            >
              {siteOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.value})
                </option>
              ))}
            </select>
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <FiEye className="w-4 h-4" />
              {previewMode ? "Edit Mode" : "Preview"}
            </button>

            <button
              onClick={() => handleSectionSave(activeSection)}
              disabled={isSaving}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              <FiSave className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {["top", "middle", "bottom"].map((pos) => (
            <div key={pos} className="bg-white rounded-xl p-5 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    {pos.charAt(0).toUpperCase() + pos.slice(1)} Ads
                  </h3>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {ads[pos]?.length || 0}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  {pos === "top" && <FiUpload className="w-6 h-6" />}
                  {pos === "middle" && <FiMaximize className="w-6 h-6" />}
                  {pos === "bottom" && <FiDownload className="w-6 h-6" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {/* Mobile Section Tabs */}
        <div className="md:hidden mb-6">
          <div className="flex border-b border-gray-200">
            {["top", "middle", "bottom"].map((pos) => (
              <button
                key={pos}
                onClick={() => setActiveSection(pos)}
                className={`
                  flex-1 py-3 text-center text-sm font-medium transition-colors
                  ${
                    activeSection === pos
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }
                `}
              >
                {pos.charAt(0).toUpperCase() + pos.slice(1)}
                <span className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded-full">
                  {ads[pos]?.length || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {["top", "middle", "bottom"].map((position) => (
            <div
              key={position}
              className="bg-white rounded-2xl shadow-lg border overflow-hidden"
            >
              {/* Section Header */}
              <div className="p-5 border-b bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      {position === "top" && <FiUpload className="w-5 h-5" />}
                      {position === "middle" && (
                        <FiMaximize className="w-5 h-5" />
                      )}
                      {position === "bottom" && (
                        <FiDownload className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        {position.charAt(0).toUpperCase() + position.slice(1)}{" "}
                        Ads
                      </h2>
                      <p className="text-sm text-gray-500">
                        {ads[position]?.length || 0} ads in this section
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => addAd(position)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Add new ad"
                    >
                      <FiPlus className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleSectionSave(position)}
                      disabled={isSaving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                    >
                      <FiSave className="w-4 h-4" />
                      Save
                    </button>
                  </div>
                </div>
              </div>

              {/* Ads Content */}
              <div className="p-5">
                {renderAds(position)}

                {/* Add Button */}
                <button
                  onClick={() => addAd(position)}
                  className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50/30 transition-all duration-200 flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600"
                >
                  <FiPlus className="w-5 h-5" />
                  Add New {position.charAt(0).toUpperCase() +
                    position.slice(1)}{" "}
                  Ad
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Global Actions */}
        <div className="mt-8 p-6 bg-white rounded-2xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Global Actions
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                if (confirm("Save all sections?")) {
                  ["top", "middle", "bottom"].forEach((pos) =>
                    handleSectionSave(pos),
                  );
                }
              }}
              disabled={isSaving}
              className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              <FiSave className="w-4 h-4" />
              Save All Sections
            </button>

            <button
              onClick={() => {
                showModal(
                  "section",
                  "Add Ad",
                  "Enter section (top/middle/bottom):",
                  (position) => {
                    if (["top", "middle", "bottom"].includes(position)) {
                      addAd(position);
                    } else {
                      showModal(
                        "message",
                        "Invalid Section",
                        "Please enter: top, middle, or bottom",
                      );
                    }
                  },
                );
              }}
              className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <FiPlus className="w-4 h-4" />
              Quick Add Ad
            </button>
          </div>
        </div>
      </div>

      {/* Responsive CSS */}
      <style jsx global>{`
        .content-editor {
          min-height: 150px;
          font-family:
            -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            "Helvetica Neue", Arial, sans-serif;
        }

        .content-editor:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        .content-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 6px;
          margin: 4px;
          -webkit-user-drag: none;
          user-drag: none;
          cursor: default !important;
        }

        .content-editor a {
          color: #3b82f6;
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .content-editor {
            font-size: 16px !important;
            min-height: 120px;
          }
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
      `}</style>

      {/* Modal Component */}
      {modalType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">{modalTitle}</h2>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {modalType === "message" && (
                <div>
                  <p className="text-gray-700 mb-6">{modalMessage}</p>
                  <button
                    onClick={closeModal}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    OK
                  </button>
                </div>
              )}

              {modalType === "confirm" && (
                <div>
                  <p className="text-gray-700 mb-6">{modalMessage}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        if (modalCallback) modalCallback("yes");
                        closeModal();
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => {
                        if (modalCallback) modalCallback("no");
                        closeModal();
                      }}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      No
                    </button>
                  </div>
                </div>
              )}

              {(modalType === "platform" ||
                modalType === "phone" ||
                modalType === "username" ||
                modalType === "color" ||
                modalType === "emoji" ||
                modalType === "section") && (
                <div>
                  <p className="text-gray-700 mb-4">{modalMessage}</p>
                  {modalType === "platform" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (modalCallback) modalCallback("1");
                        }}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        WhatsApp (1)
                      </button>
                      <button
                        onClick={() => {
                          if (modalCallback) modalCallback("2");
                        }}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Telegram (2)
                      </button>
                    </div>
                  )}
                  {(modalType === "phone" ||
                    modalType === "username" ||
                    modalType === "color" ||
                    modalType === "emoji" ||
                    modalType === "section") && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={modalInput}
                        onChange={(e) => setModalInput(e.target.value)}
                        placeholder={modalMessage}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                        onKeyPress={(e) => {
                          if (e.key === "Enter") handleModalSubmit();
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleModalSubmit}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          OK
                        </button>
                        <button
                          onClick={closeModal}
                          className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
