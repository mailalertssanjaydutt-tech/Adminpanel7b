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
  { label: "A1 Satta", value: "a1satta.vip" },
  { label: "A3 Satta", value: "a3satta.vip" },
  { label: "A7 Satta", value: "a7satta.vip" },
  { label: "B7 Satta", value: "b7satta.vip" },
];

export default function PremiumAdsEditor() {
  const [ads, setAds] = useState({ top: [], middle: [], bottom: [] });
  const [activeSection, setActiveSection] = useState("top");
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [site, setSite] = useState(siteOptions[0].value);
  const editorsRef = useRef({});
  const savedSelectionRef = useRef(null);
  const [selectedImageInfo, setSelectedImageInfo] = useState(null); // NEW: Track selected image

  // Modal states
  const [modalType, setModalType] = useState(null);
  const [modalMessage, setModalMessage] = useState("");
  const [modalInput, setModalInput] = useState("");
  const [modalCallback, setModalCallback] = useState(null);
  const [modalTitle, setModalTitle] = useState("");

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

  const normalizeAdsFromServer = (arr) =>
    arr.map((a) => ({
      ...a,
      id: a.id ?? a._id ?? undefined,
    }));

  // Function to clean HTML before saving - NEW: Removes visual styles but keeps link
  const cleanHtmlForSaving = (html) => {
    if (!html) return html;

    // Create a temporary div to parse the HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    // Remove outline styles from all images
    const images = tempDiv.querySelectorAll("img");
    images.forEach((img) => {
      img.style.outline = "";
      img.style.outlineOffset = "";
    });

    return tempDiv.innerHTML;
  };

  // Load ads
  useEffect(() => {
    async function fetchAds() {
      try {
        const res = await api.get(`/ads?site=${encodeURIComponent(site)}`);
        const data = res.data;
        if (Array.isArray(data)) {
          const normalized = normalizeAdsFromServer(data);
          setAds({
            top: normalized
              .filter((a) => a.position === "top")
              .sort((a, b) => a.order - b.order),
            middle: normalized
              .filter((a) => a.position === "middle")
              .sort((a, b) => a.order - b.order),
            bottom: normalized
              .filter((a) => a.position === "bottom")
              .sort((a, b) => a.order - b.order),
          });
        }
      } catch (err) {
        console.error(err);
        setAds({ top: [], middle: [], bottom: [] });
      }
    }
    fetchAds();
  }, [site]);

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
    setSelectedImageInfo(null); // Clear selected image
  };

  const deleteAdFromDB = async (id, position) => {
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
      setSelectedImageInfo(null); // Clear selected image
      showModal("message", "Success", "Ad deleted successfully!");
    } catch (err) {
      showModal("message", "Error", "Failed to delete ad.");
    }
  };

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

        // Clean HTML before saving - REMOVES VISUAL STYLES BUT KEEPS LINKS
        const cleanedContent = cleanHtmlForSaving(contentFromEditor);

        return {
          _id: ad.id ?? undefined,
          content: cleanedContent, // Use cleaned content
          position,
          order: idx,
          site,
        };
      });

      const allEmpty = sectionAds.every(
        (s) => !s.content || s.content.trim() === "",
      );

      if (allEmpty && sectionAds.length > 0) {
        showModal(
          "confirm",
          "Empty Ads",
          `${position} ads are empty. Save anyway?`,
          (confirmed) => {
            if (confirmed === "yes") performSave(sectionAds, position);
            else setIsSaving(false);
          },
        );
        return;
      }

      performSave(sectionAds, position);
    } catch (err) {
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
        showModal("message", "Success", `${position} ads saved successfully!`);
      }
    } catch (err) {
      showModal("message", "Error", "Error saving ads.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel.getRangeAt && sel.rangeCount) {
      savedSelectionRef.current = sel.getRangeAt(0);
    }
  };

  const restoreSelection = () => {
    if (savedSelectionRef.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    }
  };

  const execCommand = (adIdentifier, command, value = null) => {
    const editor = editorsRef.current[adIdentifier];
    if (editor) {
      editor.focus();
      document.execCommand(command, false, value);
    }
  };

  // Handle image click - NEW: Better image selection
  const handleImageClick = (e, adIdentifier) => {
    if (e.target.tagName === "IMG") {
      e.preventDefault();
      e.stopPropagation();

      // Clear previous selection
      const prevSelection = window.getSelection();
      prevSelection.removeAllRanges();

      // Create new range and select the image
      const range = document.createRange();
      range.selectNode(e.target);
      prevSelection.addRange(range);

      // Store selected image info
      setSelectedImageInfo({
        adIdentifier,
        imageElement: e.target,
        hasLink: e.target.parentNode.tagName === "A",
      });

      // Add visual feedback (but this will be removed before saving)
      document.querySelectorAll(".content-editor img").forEach((img) => {
        img.style.outline = "none";
      });
      e.target.style.outline = "2px solid #3b82f6";
      e.target.style.outlineOffset = "2px";
    }
  };

  const generateContactLink = (callback, adIdentifier) => {
    saveSelection();
    showModal(
      "platform",
      "Select Link Type",
      "Choose link type:",
      (platform) => {
        if (platform === "1") {
          showModal(
            "phone",
            "WhatsApp",
            "Enter number with country code:",
            (num) => {
              if (!num) return;
              restoreSelection();
              callback(`https://wa.me/${num.replace(/[^\d]/g, "")}`);
            },
          );
        } else if (platform === "2") {
          showModal(
            "username",
            "Telegram",
            "Enter username (without @):",
            (un) => {
              if (!un) return;
              restoreSelection();
              callback(`https://t.me/${un.trim()}`);
            },
          );
        } else if (platform === "3") {
          showModal("addLink", "Custom Link", "Paste full URL:", (url) => {
            if (!url) return;
            restoreSelection();
            callback(url.startsWith("http") ? url : `https://${url}`);
          });
        }
      },
    );
  };

  // Add link to existing image - FIXED VERSION
  const addLinkToExistingImage = (adIdentifier) => {
    const editor = editorsRef.current[adIdentifier];
    if (!editor) {
      showModal("message", "Error", "Editor not found.");
      return;
    }

    // First try to get from saved selection
    let imgElement = null;
    const selection = window.getSelection();

    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const startNode = range.startContainer;

      // Check if startNode is an image
      if (
        startNode.nodeType === Node.ELEMENT_NODE &&
        startNode.tagName === "IMG"
      ) {
        imgElement = startNode;
      }
      // Check if startNode's parent is an image
      else if (startNode.parentNode && startNode.parentNode.tagName === "IMG") {
        imgElement = startNode.parentNode;
      }
      // Check common ancestor
      else if (
        range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE &&
        range.commonAncestorContainer.tagName === "IMG"
      ) {
        imgElement = range.commonAncestorContainer;
      }
      // Check if common ancestor's parent is an image
      else if (
        range.commonAncestorContainer.parentNode &&
        range.commonAncestorContainer.parentNode.tagName === "IMG"
      ) {
        imgElement = range.commonAncestorContainer.parentNode;
      }
    }

    // If no image found in selection, use the stored selected image info
    if (
      !imgElement &&
      selectedImageInfo &&
      selectedImageInfo.adIdentifier === adIdentifier
    ) {
      imgElement = selectedImageInfo.imageElement;
    }

    // If still no image found, search for last clicked image
    if (!imgElement) {
      const images = editor.getElementsByTagName("img");
      if (images.length > 0) {
        // Try to find an image with the selected style
        const selectedImages = Array.from(images).filter(
          (img) => img.style.outline && img.style.outline.includes("3b82f6"),
        );
        imgElement =
          selectedImages.length > 0
            ? selectedImages[0]
            : images[images.length - 1];
      }
    }

    if (!imgElement) {
      showModal(
        "message",
        "No Image Selected",
        "Please click on an image first, then click 'Image Link' button.",
      );
      return;
    }

    // Check if image already has a link
    const hasExistingLink =
      imgElement.parentNode && imgElement.parentNode.tagName === "A";

    if (hasExistingLink) {
      showModal(
        "confirm",
        "Existing Link",
        "This image already has a link. Replace it?",
        (confirmed) => {
          if (confirmed === "yes") {
            selectPlatformForImageLink(imgElement, adIdentifier, true);
          }
        },
      );
    } else {
      selectPlatformForImageLink(imgElement, adIdentifier, false);
    }
  };

  // Helper function for image link platform selection
  const selectPlatformForImageLink = (
    imgElement,
    adIdentifier,
    isReplace = false,
  ) => {
    showModal(
      "platform",
      "Select Link Type",
      "Choose link type for the image:",
      (platform) => {
        if (!platform) return;

        if (platform === "1") {
          showModal(
            "phone",
            "WhatsApp",
            "Enter number with country code:",
            (num) => {
              if (!num) return;
              const link = `https://wa.me/${num.replace(/[^\d]/g, "")}`;
              applyLinkToImage(imgElement, link, isReplace, adIdentifier);
            },
          );
        } else if (platform === "2") {
          showModal(
            "username",
            "Telegram",
            "Enter username (without @):",
            (un) => {
              if (!un) return;
              const link = `https://t.me/${un.trim()}`;
              applyLinkToImage(imgElement, link, isReplace, adIdentifier);
            },
          );
        } else if (platform === "3") {
          showModal("addLink", "Custom Link", "Paste full URL:", (url) => {
            if (!url) return;
            const link = url.startsWith("http") ? url : `https://${url}`;
            applyLinkToImage(imgElement, link, isReplace, adIdentifier);
          });
        }
      },
    );
  };

  // Apply link to image element
  const applyLinkToImage = (
    imgElement,
    link,
    isReplace = false,
    adIdentifier,
  ) => {
    if (!imgElement || !link) return;

    const editor = editorsRef.current[adIdentifier];
    if (!editor) return;

    // Create anchor element
    const a = document.createElement("a");
    a.href = link;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.display = "inline-block";

    if (
      isReplace &&
      imgElement.parentNode &&
      imgElement.parentNode.tagName === "A"
    ) {
      // Replace existing link
      const existingLink = imgElement.parentNode;
      a.appendChild(imgElement);
      existingLink.parentNode.replaceChild(a, existingLink);
    } else {
      // Wrap image in new link
      imgElement.parentNode.insertBefore(a, imgElement);
      a.appendChild(imgElement);
    }

    // Update visual feedback (will be cleaned before saving)
    imgElement.style.outline = "2px solid #10b981";
    imgElement.style.outlineOffset = "2px";

    // Update selected image info
    setSelectedImageInfo({
      adIdentifier,
      imageElement: imgElement,
      hasLink: true,
    });

    // Focus the editor
    editor.focus();

    showModal("message", "Success", "Link added to image successfully!");
  };

  // Remove link from image
  const removeLinkFromImage = (adIdentifier) => {
    const editor = editorsRef.current[adIdentifier];
    if (!editor) return;

    let imgElement = null;
    let anchorElement = null;

    // First try to get from saved selection
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const startNode = range.startContainer;

      if (startNode.nodeType === Node.ELEMENT_NODE) {
        if (startNode.tagName === "IMG") {
          imgElement = startNode;
        } else if (
          startNode.tagName === "A" &&
          startNode.querySelector("img")
        ) {
          anchorElement = startNode;
          imgElement = startNode.querySelector("img");
        }
      }
    }

    // If no image found in selection, use the stored selected image info
    if (
      !imgElement &&
      selectedImageInfo &&
      selectedImageInfo.adIdentifier === adIdentifier
    ) {
      imgElement = selectedImageInfo.imageElement;
    }

    // Find the anchor element
    if (
      imgElement &&
      imgElement.parentNode &&
      imgElement.parentNode.tagName === "A"
    ) {
      anchorElement = imgElement.parentNode;
    }

    if (anchorElement && anchorElement.tagName === "A" && imgElement) {
      // Replace anchor with just the image
      anchorElement.parentNode.replaceChild(imgElement, anchorElement);

      // Update visual feedback (will be cleaned before saving)
      imgElement.style.outline = "2px solid #3b82f6";
      imgElement.style.outlineOffset = "2px";

      // Update selected image info
      setSelectedImageInfo({
        adIdentifier,
        imageElement: imgElement,
        hasLink: false,
      });

      editor.focus();
      showModal("message", "Success", "Link removed from image.");
    } else {
      showModal(
        "message",
        "No Linked Image",
        "No linked image found. Please select an image with a link.",
      );
    }
  };

  // SIMPLIFIED: Insert image without asking for link
  const insertImage = (adIdentifier, file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const editor = editorsRef.current[adIdentifier];
      if (!editor) return;

      editor.focus();

      // Create image element
      const img = document.createElement("img");
      img.src = e.target.result;
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.borderRadius = "4px";
      img.style.margin = "10px 0";
      img.style.display = "block";
      img.setAttribute("draggable", "false");

      // Add click handler
      img.onclick = (clickEvent) => handleImageClick(clickEvent, adIdentifier);

      // Add visual feedback (will be cleaned before saving)
      img.style.outline = "2px solid #3b82f6";
      img.style.outlineOffset = "2px";

      // Insert the element
      const selection = window.getSelection();
      let range;

      // If there is a valid selection, use it
      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Otherwise, create a new range at the end of the editor
        range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      range.insertNode(img);
      range.collapse(false);

      // Update selected image info
      setSelectedImageInfo({
        adIdentifier,
        imageElement: img,
        hasLink: false,
      });

      // Update selection
      editor.focus();
    };
    reader.readAsDataURL(file);
  };

  const resizeLastImage = (adIdentifier, width) => {
    const editor = editorsRef.current[adIdentifier];
    const images = editor?.getElementsByTagName("img");
    if (images?.length > 0) {
      images[images.length - 1].style.width = `${width}px`;
    }
  };

  const onDragEnd = (result, position) => {
    if (!result.destination) return;
    const items = Array.from(ads[position]);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setAds((prev) => ({ ...prev, [position]: items }));
  };

  const ToolbarButton = ({ icon: Icon, label, onClick, active = false }) => (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-all duration-200 flex flex-col items-center justify-center border ${
        active
          ? "bg-blue-100 text-blue-600 border-blue-200"
          : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
      } min-w-[60px] h-[60px] sm:h-[50px] sm:min-w-[50px]`}
      title={label}
    >
      <Icon className="w-5 h-5 mb-1" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );

  const renderAds = (position) => (
    <div className={activeSection === position ? "block" : "hidden md:block"}>
      <DragDropContext onDragEnd={(res) => onDragEnd(res, position)}>
        <Droppable droppableId={position}>
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`space-y-4 p-2 rounded-xl min-h-[200px] ${snapshot.isDraggingOver ? "bg-blue-50/50" : ""}`}
            >
              {ads[position].length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                  <FiEye className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No {position} ads yet.</p>
                </div>
              ) : (
                ads[position].map((ad, index) => {
                  const safeId = ad.id ?? ad._tempId;
                  const draggableId = `drag-${safeId}-${position}`;
                  return (
                    <Draggable
                      key={safeId}
                      draggableId={draggableId}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`bg-white rounded-xl shadow-sm border overflow-hidden ${snapshot.isDragging ? "shadow-lg ring-2 ring-blue-500" : ""}`}
                        >
                          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                            <div className="flex items-center space-x-3">
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-move p-2 hover:bg-gray-200 rounded-lg"
                              >
                                <FiMove className="w-4 h-4 text-gray-50" />
                              </div>
                              <h3 className="font-semibold text-gray-800 capitalize">
                                {position} Ad {index + 1}
                              </h3>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => removeAd(position, safeId)}
                                className="p-2 text-amber-600"
                              >
                                <FiX />
                              </button>
                              {ad.id && (
                                <button
                                  onClick={() =>
                                    deleteAdFromDB(ad.id, position)
                                  }
                                  className="p-2 text-red-600"
                                >
                                  <FiTrash2 />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="p-3 border-b bg-gray-50/30">
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
                                label="Under"
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
                                onClick={() =>
                                  showModal(
                                    "color",
                                    "Color",
                                    "Hex/Name:",
                                    (c) => execCommand(safeId, "foreColor", c),
                                  )
                                }
                              />
                              <ToolbarButton
                                icon={MdEmojiEmotions}
                                label="Emoji"
                                onClick={() =>
                                  showModal(
                                    "emoji",
                                    "Emoji",
                                    "Paste emoji:",
                                    (e) => execCommand(safeId, "insertText", e),
                                  )
                                }
                              />
                              <ToolbarButton
                                icon={FiLink}
                                label="Text Link"
                                onClick={() =>
                                  generateContactLink(
                                    (url) =>
                                      execCommand(safeId, "createLink", url),
                                    safeId,
                                  )
                                }
                              />
                              <ToolbarButton
                                icon={FiLink}
                                label="Image Link"
                                onClick={() => addLinkToExistingImage(safeId)}
                                title="Click an image first, then click this button"
                              />
                              <ToolbarButton
                                icon={FiTrash2}
                                label="Remove Link"
                                onClick={() => removeLinkFromImage(safeId)}
                                title="Remove link from selected image"
                              />
                              <ToolbarButton
                                icon={FiImage}
                                label="Image"
                                onClick={() =>
                                  document
                                    .getElementById(`file-${safeId}`)
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
                            </div>
                            <div className="mt-2 flex gap-2 items-center text-xs">
                              <span>Resize Last Image:</span>
                              {[100, 200, 300].map((s) => (
                                <button
                                  key={s}
                                  onClick={() => resizeLastImage(safeId, s)}
                                  className="px-2 py-1 bg-gray-200 rounded"
                                >
                                  {s}px
                                </button>
                              ))}
                            </div>
                            <input
                              type="file"
                              id={`file-${safeId}`}
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files[0]) {
                                  insertImage(safeId, e.target.files[0]);
                                  e.target.value = ""; // 👈 IMPORTANT
                                }
                              }}
                            />{" "}
                          </div>

                          <div
                            ref={(el) => (editorsRef.current[safeId] = el)}
                            contentEditable
                            dangerouslySetInnerHTML={{ __html: ad.content }}
                            className="content-editor min-h-[150px] p-4 focus:outline-none prose max-w-none"
                            onBlur={saveSelection}
                            onClick={(e) => handleImageClick(e, safeId)}
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Premium Ads Editor</h1>
          <select
            className="mt-2 p-2 border rounded"
            value={site}
            onChange={(e) => setSite(e.target.value)}
          >
            {siteOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="px-4 py-2 bg-white border rounded"
          >
            <FiEye className="inline mr-2" />
            Preview
          </button>
          <button
            onClick={() => handleSectionSave(activeSection)}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            <FiSave className="inline mr-2" />
            Save
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {["top", "middle", "bottom"].map((pos) => (
          <div key={pos} className="bg-white rounded-2xl shadow border p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold capitalize">{pos} Ads</h2>
              <button
                onClick={() => addAd(pos)}
                className="p-2 bg-green-50 text-green-600 rounded"
              >
                <FiPlus />
              </button>
            </div>
            {renderAds(pos)}
          </div>
        ))}
      </div>

      {modalType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-bold">{modalTitle}</h2>
              <button onClick={closeModal}>
                <FiX />
              </button>
            </div>
            <p className="mb-4 text-gray-600">{modalMessage}</p>
            {modalType === "platform" ? (
              <div className="space-y-2">
                <button
                  onClick={() => modalCallback("1")}
                  className="w-full p-2 bg-green-600 text-white rounded"
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => modalCallback("2")}
                  className="w-full p-2 bg-blue-500 text-white rounded"
                >
                  Telegram
                </button>
                <button
                  onClick={() => modalCallback("3")}
                  className="w-full p-2 bg-gray-700 text-white rounded"
                >
                  Custom Link
                </button>
              </div>
            ) : modalType === "confirm" ? (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    modalCallback("yes");
                    closeModal();
                  }}
                  className="flex-1 p-2 bg-red-600 text-white rounded"
                >
                  Yes
                </button>
                <button
                  onClick={closeModal}
                  className="flex-1 p-2 bg-gray-200 rounded"
                >
                  No
                </button>
              </div>
            ) : modalType === "message" ? (
              <button
                onClick={closeModal}
                className="w-full p-2 bg-blue-600 text-white rounded"
              >
                OK
              </button>
            ) : (
              <div className="space-y-4">
                <input
                  autoFocus
                  className="w-full p-2 border rounded"
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleModalSubmit()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleModalSubmit}
                    className="flex-1 p-2 bg-blue-600 text-white rounded"
                  >
                    Submit
                  </button>
                  <button
                    onClick={closeModal}
                    className="flex-1 p-2 bg-gray-200 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .content-editor img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 10px 0;
          cursor: pointer;
          transition: outline 0.2s ease;
        }
        .content-editor img:hover {
          outline: 2px solid #3b82f6 !important;
          outline-offset: 2px !important;
        }
        .content-editor a {
          color: #2563eb;
          text-decoration: underline;
          display: inline-block;
        }
        .content-editor a img {
          border: 1px solid #2563eb;
        }
        .content-editor:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}
