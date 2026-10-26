/**
 * RichTextEditor – Pixel-accurate Google Blogger WYSIWYG editor.
 * Features:
 * - Google Blogger toolbar with dropdown menus that NEVER get clipped
 * - Accurate caret/cursor selection preservation (insert images/videos/emojis in the middle of content!)
 * - Image Insertion:
 *     1. Upload from computer (file picker)
 *     2. By URL
 *     3. Drag & drop image files onto editor
 *     4. Copy & paste (Cmd+V / Ctrl+V) screenshots & images directly
 * - Video Insertion:
 *     1. Upload from computer (mp4/webm)
 *     2. YouTube embed
 * - Emoji picker (28 common emojis)
 * - Heading/Paragraph format dropdown
 * - Font family & size dropdowns
 * - Alignment dropdown (Left, Center, Right, Justify)
 * - Text color & background highlighter pickers
 * - Link modal with "Open in new window"
 * - Compose / HTML view toggle
 */
import React, { useRef, useEffect, useCallback, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

type ExecCmd =
  | 'bold' | 'italic' | 'underline' | 'strikeThrough'
  | 'insertUnorderedList' | 'insertOrderedList'
  | 'formatBlock' | 'justifyLeft' | 'justifyCenter' | 'justifyRight' | 'justifyFull'
  | 'createLink' | 'unlink' | 'insertImage' | 'insertHTML' | 'insertHorizontalRule'
  | 'undo' | 'redo' | 'removeFormat' | 'fontSize' | 'fontName' | 'foreColor' | 'hiliteColor'
  | 'indent' | 'outdent';

function exec(cmd: ExecCmd, value?: string) {
  document.execCommand(cmd, false, value);
}

interface ActiveState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  insertUnorderedList: boolean;
  insertOrderedList: boolean;
  justifyLeft: boolean;
  justifyCenter: boolean;
  justifyRight: boolean;
  justifyFull: boolean;
}

function getActiveState(): ActiveState {
  try {
    return {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      insertOrderedList: document.queryCommandState('insertOrderedList'),
      justifyLeft: document.queryCommandState('justifyLeft'),
      justifyCenter: document.queryCommandState('justifyCenter'),
      justifyRight: document.queryCommandState('justifyRight'),
      justifyFull: document.queryCommandState('justifyFull'),
    };
  } catch {
    return {
      bold: false,
      italic: false,
      underline: false,
      strikeThrough: false,
      insertUnorderedList: false,
      insertOrderedList: false,
      justifyLeft: false,
      justifyCenter: false,
      justifyRight: false,
      justifyFull: false,
    };
  }
}

function getCurrentHeading(): string {
  try {
    const val = document.queryCommandValue('formatBlock');
    if (val) {
      const v = val.toLowerCase().replace(/<|>/g, '');
      if (['h1', 'h2', 'h3', 'h4', 'p', 'div', 'pre', 'blockquote'].includes(v)) return v;
    }
    const sel = window.getSelection();
    if (sel && sel.anchorNode) {
      let node: Node | null = sel.anchorNode;
      while (node && node !== document.body) {
        if (node instanceof HTMLElement) {
          const tag = node.tagName.toLowerCase();
          if (['h1', 'h2', 'h3', 'h4', 'p', 'div', 'pre', 'blockquote'].includes(tag)) return tag;
        }
        node = node.parentNode;
      }
    }
  } catch {}
  return 'p';
}

const COMMON_EMOJIS = ['😀', '😃', '😄', '😁', '😊', '😍', '🤩', '😎', '🔥', '💡', '📌', '✨', '⭐', '🚀', '🏡', '🏢', '💼', '📈', '📊', '💰', '👍', '👏', '🎯', '📍', '✅', '❤️', '🎉', '🏆'];

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing your article...',
  minHeight = 800,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const hiliteInputRef = useRef<HTMLInputElement>(null);
  const innerChange = useRef(false);

  // Selection preservation ref so inserts happen at exact caret position
  const savedSelectionRef = useRef<Range | null>(null);

  const [active, setActive] = useState<ActiveState>(() => getActiveState());
  const [heading, setHeading] = useState<string>('p');
  const [fontFamily, setFontFamily] = useState<string>('Roboto');
  const [fontSize, setFontSize] = useState<string>('3');
  const [mode, setMode] = useState<'compose' | 'html'>('compose');

  // Dropdown menus
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Link modal
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkNewTab, setLinkNewTab] = useState(true);

  // YouTube modal
  const [ytModalOpen, setYtModalOpen] = useState(false);
  const [ytUrl, setYtUrl] = useState('');

  // Save current caret position whenever cursor moves or selection changes
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedSelectionRef.current = range.cloneRange();
      }
    }
  }, []);

  // Restore caret position before inserting HTML
  const restoreSelection = useCallback(() => {
    if (savedSelectionRef.current && editorRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRef.current);
      }
    }
  }, []);

  // Sync external HTML value into editor
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (innerChange.current) {
      innerChange.current = false;
      return;
    }
    if (el.innerHTML !== value) {
      el.innerHTML = value || '';
    }
  }, [value]);

  // Sync active states on selection change & save selection
  const syncState = useCallback(() => {
    setActive(getActiveState());
    setHeading(getCurrentHeading());
    saveSelection();
  }, [saveSelection]);

  useEffect(() => {
    document.addEventListener('selectionchange', syncState);
    return () => document.removeEventListener('selectionchange', syncState);
  }, [syncState]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.blogger-dropdown-container')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  const emit = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    innerChange.current = true;
    onChange(el.innerHTML);
    syncState();
  }, [onChange, syncState]);

  const fmt = (cmd: ExecCmd, val?: string) => {
    if (mode === 'html') return;
    editorRef.current?.focus();
    restoreSelection();
    exec(cmd, val);
    emit();
  };

  // Insert HTML node precisely at the current caret position
  const insertHtmlAtCaret = (html: string) => {
    editorRef.current?.focus();
    restoreSelection();

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      range.deleteContents();

      const temp = document.createElement('div');
      temp.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node: Node | null;
      let lastNode: Node | null = null;
      while ((node = temp.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);

      if (lastNode) {
        const nextRange = document.createRange();
        nextRange.setStartAfter(lastNode);
        nextRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(nextRange);
        savedSelectionRef.current = nextRange.cloneRange();
      }
    } else if (editorRef.current) {
      editorRef.current.innerHTML += html;
    }
    emit();
  };

  // Image Upload handler (from computer)
  const handleLocalImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imgHtml = `<p><img src="${reader.result}" alt="${file.name}" style="max-width:100%;height:auto;border-radius:4px;margin:16px 0;display:block;" /></p><p><br></p>`;
      insertHtmlAtCaret(imgHtml);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    setOpenDropdown(null);
  };

  // Image by URL
  const handleImageUrl = () => {
    const url = window.prompt('Paste image URL (e.g. https://images.unsplash.com/...):');
    if (url && url.trim()) {
      const imgHtml = `<p><img src="${url.trim()}" alt="Blog Image" style="max-width:100%;height:auto;border-radius:4px;margin:16px 0;display:block;" /></p><p><br></p>`;
      insertHtmlAtCaret(imgHtml);
    }
    setOpenDropdown(null);
  };

  // Video Upload handler (from computer)
  const handleLocalVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const videoHtml = `<p><video controls src="${reader.result}" style="max-width:100%;border-radius:6px;margin:16px 0;display:block;"></video></p><p><br></p>`;
      insertHtmlAtCaret(videoHtml);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    setOpenDropdown(null);
  };

  // YouTube Embed
  const handleYouTubeEmbed = () => {
    if (!ytUrl.trim()) return;
    let videoId = '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = ytUrl.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    } else {
      videoId = ytUrl.trim();
    }
    const embedHtml = `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:18px 0;border-radius:8px;"><iframe src="https://www.youtube.com/embed/${videoId}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div><p><br></p>`;
    insertHtmlAtCaret(embedHtml);
    setYtUrl('');
    setYtModalOpen(false);
  };

  // Link Insertion
  const handleOpenLinkModal = () => {
    saveSelection();
    const sel = window.getSelection();
    setLinkText(sel ? sel.toString() : '');
    setLinkUrl('');
    setLinkModalOpen(true);
  };

  const handleApplyLink = () => {
    if (!linkUrl.trim()) return;
    const target = linkNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
    const text = linkText.trim() || linkUrl.trim();
    const linkHtml = `<a href="${linkUrl.trim()}"${target} style="color:#0c6253;text-decoration:underline;">${text}</a>`;
    insertHtmlAtCaret(linkHtml);
    setLinkModalOpen(false);
  };

  // Emoji insert at caret
  const handleInsertEmoji = (emoji: string) => {
    insertHtmlAtCaret(` ${emoji} `);
    setOpenDropdown(null);
  };

  // Drag and drop image file onto editor
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && files[0].type.startsWith('image/')) {
      e.preventDefault();
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const imgHtml = `<p><img src="${reader.result}" alt="${file.name}" style="max-width:100%;height:auto;border-radius:4px;margin:16px 0;display:block;" /></p><p><br></p>`;
        insertHtmlAtCaret(imgHtml);
      };
      reader.readAsDataURL(file);
    }
  };

  // Paste image directly from clipboard (Cmd+V / Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const imgHtml = `<p><img src="${reader.result}" alt="${file.name}" style="max-width:100%;height:auto;border-radius:4px;margin:16px 0;display:block;" /></p><p><br></p>`;
            insertHtmlAtCaret(imgHtml);
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }
  };

  const toggleDropdown = (name: string) => {
    saveSelection();
    setOpenDropdown(prev => prev === name ? null : name);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: '#f8f9fa', overflow: 'hidden' }}>

      {/* Hidden file & color inputs */}
      <input type="file" ref={imageFileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleLocalImage} />
      <input type="file" ref={videoFileInputRef} accept="video/*" style={{ display: 'none' }} onChange={handleLocalVideo} />
      <input type="color" ref={colorInputRef} style={{ display: 'none' }} onChange={(e) => fmt('foreColor', e.target.value)} />
      <input type="color" ref={hiliteInputRef} defaultValue="#fff59d" style={{ display: 'none' }} onChange={(e) => fmt('hiliteColor', e.target.value)} />

      {/* ── Google Blogger Toolbar (overflow: visible so dropdowns NEVER get clipped!) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '2px',
          padding: '4px 12px',
          background: '#ffffff',
          borderBottom: '1px solid #e0e0e0',
          position: 'relative',
          zIndex: 100,
          overflow: 'visible',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >

        {/* 1. Mode Switcher (Compose / HTML view) */}
        <div className="blogger-dropdown-container" style={{ position: 'relative' }}>
          <button
            type="button"
            className="blogger-btn"
            title="Compose / HTML view"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
            onClick={(e) => { e.stopPropagation(); toggleDropdown('mode'); }}
            style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}
          >
            <i className={mode === 'compose' ? 'fas fa-pen' : 'fas fa-code'} style={{ fontSize: '13px' }} />
            <i className="fas fa-caret-down" style={{ fontSize: '10px', color: '#5f6368' }} />
          </button>
          {openDropdown === 'mode' && (
            <div className="blogger-dropdown-menu" style={{ minWidth: '150px' }}>
              <div
                className={`blogger-menu-item ${mode === 'compose' ? 'selected' : ''}`}
                onClick={() => { setMode('compose'); setOpenDropdown(null); }}
              >
                <i className="fas fa-pen" style={{ width: '18px' }} /> Compose view
              </div>
              <div
                className={`blogger-menu-item ${mode === 'html' ? 'selected' : ''}`}
                onClick={() => { setMode('html'); setOpenDropdown(null); }}
              >
                <i className="fas fa-code" style={{ width: '18px' }} /> HTML view
              </div>
            </div>
          )}
        </div>

        <div className="blogger-sep" />

        {/* 2. Undo / Redo */}
        <button type="button" className="blogger-btn" title="Undo (Ctrl+Z)" onMouseDown={(e) => { e.preventDefault(); fmt('undo'); }}>
          <i className="fas fa-undo" />
        </button>
        <button type="button" className="blogger-btn" title="Redo (Ctrl+Y)" onMouseDown={(e) => { e.preventDefault(); fmt('redo'); }}>
          <i className="fas fa-redo" />
        </button>

        <div className="blogger-sep" />

        {/* 3. Font Family Dropdown */}
        <div className="blogger-dropdown-container" style={{ position: 'relative' }}>
          <button
            type="button"
            className="blogger-btn"
            title="Font type"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
            onClick={(e) => { e.stopPropagation(); toggleDropdown('fontFamily'); }}
            style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 6px' }}
          >
            <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'serif' }}>A</span>
            <i className="fas fa-caret-down" style={{ fontSize: '10px', color: '#5f6368' }} />
          </button>
          {openDropdown === 'fontFamily' && (
            <div className="blogger-dropdown-menu" style={{ minWidth: '160px' }}>
              {['Default (Roboto)', 'Arial', 'Courier', 'Georgia', 'Helvetica', 'Times New Roman', 'Trebuchet', 'Verdana'].map(f => (
                <div
                  key={f}
                  className={`blogger-menu-item ${fontFamily === f ? 'selected' : ''}`}
                  onClick={() => {
                    const clean = f.split(' ')[0];
                    fmt('fontName', clean);
                    setFontFamily(clean);
                    setOpenDropdown(null);
                  }}
                  style={{ fontFamily: f.split(' ')[0] }}
                >
                  {f}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Font Size Dropdown */}
        <div className="blogger-dropdown-container" style={{ position: 'relative' }}>
          <button
            type="button"
            className="blogger-btn"
            title="Font size"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
            onClick={(e) => { e.stopPropagation(); toggleDropdown('fontSize'); }}
            style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 6px' }}
          >
            <span style={{ fontSize: '14px', fontWeight: 700 }}>T</span>
            <i className="fas fa-caret-down" style={{ fontSize: '10px', color: '#5f6368' }} />
          </button>
          {openDropdown === 'fontSize' && (
            <div className="blogger-dropdown-menu" style={{ minWidth: '130px' }}>
              {[
                { label: 'Smallest', val: '1' },
                { label: 'Small', val: '2' },
                { label: 'Normal', val: '3' },
                { label: 'Medium', val: '4' },
                { label: 'Large', val: '5' },
                { label: 'Largest', val: '6' },
              ].map(sz => (
                <div
                  key={sz.val}
                  className={`blogger-menu-item ${fontSize === sz.val ? 'selected' : ''}`}
                  onClick={() => {
                    fmt('fontSize', sz.val);
                    setFontSize(sz.val);
                    setOpenDropdown(null);
                  }}
                >
                  {sz.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Heading / Paragraph Format Dropdown */}
        <div className="blogger-dropdown-container" style={{ position: 'relative' }}>
          <button
            type="button"
            className="blogger-btn"
            title="Paragraph format"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
            onClick={(e) => { e.stopPropagation(); toggleDropdown('heading'); }}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', padding: '4px 8px' }}
          >
            <span>
              {heading === 'h1' ? 'Major heading' : heading === 'h2' ? 'Heading' : heading === 'h3' ? 'Subheading' : heading === 'h4' ? 'Minor heading' : heading === 'blockquote' ? 'Quote' : 'Paragraph'}
            </span>
            <i className="fas fa-caret-down" style={{ fontSize: '10px', color: '#5f6368' }} />
          </button>
          {openDropdown === 'heading' && (
            <div className="blogger-dropdown-menu" style={{ minWidth: '170px' }}>
              {[
                { label: 'Major heading', tag: 'h1', size: '20px', weight: 700 },
                { label: 'Heading', tag: 'h2', size: '17px', weight: 700 },
                { label: 'Subheading', tag: 'h3', size: '15px', weight: 600 },
                { label: 'Minor heading', tag: 'h4', size: '14px', weight: 600 },
                { label: 'Paragraph', tag: 'p', size: '13px', weight: 400 },
                { label: 'Normal', tag: 'div', size: '13px', weight: 400 },
              ].map(h => (
                <div
                  key={h.tag}
                  className={`blogger-menu-item ${heading === h.tag ? 'selected' : ''}`}
                  onClick={() => {
                    editorRef.current?.focus();
                    restoreSelection();
                    exec('formatBlock', `<${h.tag}>`);
                    setHeading(h.tag);
                    emit();
                    setOpenDropdown(null);
                  }}
                  style={{ fontSize: h.size, fontWeight: h.weight }}
                >
                  {h.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="blogger-sep" />

        {/* 6. Formatting: Bold, Italic, Underline, Strike */}
        <button
          type="button"
          className={`blogger-btn ${active.bold ? 'active' : ''}`}
          title="Bold (Ctrl+B)"
          onMouseDown={(e) => { e.preventDefault(); fmt('bold'); }}
        >
          <i className="fas fa-bold" />
        </button>
        <button
          type="button"
          className={`blogger-btn ${active.italic ? 'active' : ''}`}
          title="Italic (Ctrl+I)"
          onMouseDown={(e) => { e.preventDefault(); fmt('italic'); }}
        >
          <i className="fas fa-italic" />
        </button>
        <button
          type="button"
          className={`blogger-btn ${active.underline ? 'active' : ''}`}
          title="Underline (Ctrl+U)"
          onMouseDown={(e) => { e.preventDefault(); fmt('underline'); }}
        >
          <i className="fas fa-underline" />
        </button>
        <button
          type="button"
          className={`blogger-btn ${active.strikeThrough ? 'active' : ''}`}
          title="Strikethrough"
          onMouseDown={(e) => { e.preventDefault(); fmt('strikeThrough'); }}
        >
          <i className="fas fa-strikethrough" />
        </button>

        {/* 7. Text Color */}
        <button
          type="button"
          className="blogger-btn"
          title="Text color"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => colorInputRef.current?.click()}
          style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
        >
          <span style={{ fontSize: '13px', fontWeight: 800, lineHeight: 1 }}>A</span>
          <span style={{ width: '13px', height: '3px', background: '#e65100', marginTop: '1px', borderRadius: '1px' }}></span>
        </button>

        {/* 8. Text Background Highlighter */}
        <button
          type="button"
          className="blogger-btn"
          title="Text background color"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => hiliteInputRef.current?.click()}
          style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
        >
          <i className="fas fa-highlighter" style={{ fontSize: '11px', lineHeight: 1 }} />
          <span style={{ width: '13px', height: '3px', background: '#ffd54f', marginTop: '1px', borderRadius: '1px' }}></span>
        </button>

        <div className="blogger-sep" />

        {/* 9. Insert Link */}
        <button
          type="button"
          className="blogger-btn"
          title="Insert or edit link (Ctrl+K)"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={handleOpenLinkModal}
        >
          <i className="fas fa-link" />
        </button>

        {/* 10. INSERT IMAGE DROPDOWN (Working click & select!) */}
        <div className="blogger-dropdown-container" style={{ position: 'relative' }}>
          <button
            type="button"
            className={`blogger-btn ${openDropdown === 'image' ? 'active' : ''}`}
            title="Insert image"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
            onClick={(e) => { e.stopPropagation(); toggleDropdown('image'); }}
            style={{ display: 'flex', alignItems: 'center', gap: '3px' }}
          >
            <i className="far fa-image" />
            <i className="fas fa-caret-down" style={{ fontSize: '10px', color: '#5f6368' }} />
          </button>
          {openDropdown === 'image' && (
            <div className="blogger-dropdown-menu" style={{ minWidth: '220px' }}>
              <div
                className="blogger-menu-item"
                onClick={() => {
                  saveSelection();
                  imageFileInputRef.current?.click();
                }}
              >
                <i className="fas fa-cloud-upload-alt" style={{ width: '22px', color: '#e65100', fontSize: '15px' }} />
                <span>Upload from computer</span>
              </div>
              <div
                className="blogger-menu-item"
                onClick={() => {
                  saveSelection();
                  handleImageUrl();
                }}
              >
                <i className="fas fa-link" style={{ width: '22px', color: '#5f6368' }} />
                <span>By URL</span>
              </div>
            </div>
          )}
        </div>

        {/* 11. INSERT VIDEO DROPDOWN */}
        <div className="blogger-dropdown-container" style={{ position: 'relative' }}>
          <button
            type="button"
            className={`blogger-btn ${openDropdown === 'video' ? 'active' : ''}`}
            title="Insert video"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
            onClick={(e) => { e.stopPropagation(); toggleDropdown('video'); }}
            style={{ display: 'flex', alignItems: 'center', gap: '3px' }}
          >
            <i className="fas fa-film" />
            <i className="fas fa-caret-down" style={{ fontSize: '10px', color: '#5f6368' }} />
          </button>
          {openDropdown === 'video' && (
            <div className="blogger-dropdown-menu" style={{ minWidth: '220px' }}>
              <div
                className="blogger-menu-item"
                onClick={() => {
                  saveSelection();
                  videoFileInputRef.current?.click();
                }}
              >
                <i className="fas fa-cloud-upload-alt" style={{ width: '22px', color: '#e65100', fontSize: '15px' }} />
                <span>Upload from computer</span>
              </div>
              <div
                className="blogger-menu-item"
                onClick={() => {
                  saveSelection();
                  setYtModalOpen(true);
                  setOpenDropdown(null);
                }}
              >
                <i className="fab fa-youtube" style={{ width: '22px', color: '#e53935', fontSize: '15px' }} />
                <span>YouTube</span>
              </div>
            </div>
          )}
        </div>

        {/* 12. Insert Special Characters / Emoji */}
        <div className="blogger-dropdown-container" style={{ position: 'relative' }}>
          <button
            type="button"
            className={`blogger-btn ${openDropdown === 'emoji' ? 'active' : ''}`}
            title="Insert special characters & emojis"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
            onClick={(e) => { e.stopPropagation(); toggleDropdown('emoji'); }}
          >
            <i className="far fa-smile" />
          </button>
          {openDropdown === 'emoji' && (
            <div className="blogger-dropdown-menu" style={{ minWidth: '260px', padding: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#5f6368', marginBottom: '8px' }}>EMOJIS & ICONS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                {COMMON_EMOJIS.map(em => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => handleInsertEmoji(em)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '4px', borderRadius: '4px' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f3f4'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="blogger-sep" />

        {/* 13. Alignment Dropdown */}
        <div className="blogger-dropdown-container" style={{ position: 'relative' }}>
          <button
            type="button"
            className={`blogger-btn ${openDropdown === 'align' ? 'active' : ''}`}
            title="Alignment"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
            onClick={(e) => { e.stopPropagation(); toggleDropdown('align'); }}
            style={{ display: 'flex', alignItems: 'center', gap: '3px' }}
          >
            <i className="fas fa-align-left" />
            <i className="fas fa-caret-down" style={{ fontSize: '10px', color: '#5f6368' }} />
          </button>
          {openDropdown === 'align' && (
            <div className="blogger-dropdown-menu" style={{ minWidth: '150px' }}>
              <div className={`blogger-menu-item ${active.justifyLeft ? 'selected' : ''}`} onClick={() => { fmt('justifyLeft'); setOpenDropdown(null); }}>
                <i className="fas fa-align-left" style={{ width: '20px' }} /> Left align
              </div>
              <div className={`blogger-menu-item ${active.justifyCenter ? 'selected' : ''}`} onClick={() => { fmt('justifyCenter'); setOpenDropdown(null); }}>
                <i className="fas fa-align-center" style={{ width: '20px' }} /> Center align
              </div>
              <div className={`blogger-menu-item ${active.justifyRight ? 'selected' : ''}`} onClick={() => { fmt('justifyRight'); setOpenDropdown(null); }}>
                <i className="fas fa-align-right" style={{ width: '20px' }} /> Right align
              </div>
              <div className={`blogger-menu-item ${active.justifyFull ? 'selected' : ''}`} onClick={() => { fmt('justifyFull'); setOpenDropdown(null); }}>
                <i className="fas fa-align-justify" style={{ width: '20px' }} /> Justify
              </div>
            </div>
          )}
        </div>

        {/* 14. Indent / Outdent */}
        <button type="button" className="blogger-btn" title="Decrease indent" onMouseDown={(e) => { e.preventDefault(); fmt('outdent'); }}>
          <i className="fas fa-outdent" />
        </button>
        <button type="button" className="blogger-btn" title="Increase indent" onMouseDown={(e) => { e.preventDefault(); fmt('indent'); }}>
          <i className="fas fa-indent" />
        </button>

        <div className="blogger-sep" />

        {/* 15. Lists */}
        <button
          type="button"
          className={`blogger-btn ${active.insertUnorderedList ? 'active' : ''}`}
          title="Bulleted list"
          onMouseDown={(e) => { e.preventDefault(); fmt('insertUnorderedList'); }}
        >
          <i className="fas fa-list-ul" />
        </button>
        <button
          type="button"
          className={`blogger-btn ${active.insertOrderedList ? 'active' : ''}`}
          title="Numbered list"
          onMouseDown={(e) => { e.preventDefault(); fmt('insertOrderedList'); }}
        >
          <i className="fas fa-list-ol" />
        </button>

        {/* 16. Quote & Jump Break / Divider */}
        <button
          type="button"
          className="blogger-btn"
          title="Quote text"
          onMouseDown={(e) => { e.preventDefault(); fmt('formatBlock', '<blockquote>'); }}
        >
          <i className="fas fa-quote-right" />
        </button>
        <button
          type="button"
          className="blogger-btn"
          title="Insert horizontal line"
          onMouseDown={(e) => { e.preventDefault(); fmt('insertHorizontalRule'); }}
        >
          <i className="fas fa-minus" />
        </button>

        <div className="blogger-sep" />

        {/* 17. Text Direction (LTR / RTL) */}
        <button
          type="button"
          className="blogger-btn"
          title="Left to right / Right to left direction"
          onClick={() => {
            if (editorRef.current) {
              const current = editorRef.current.dir;
              editorRef.current.dir = current === 'rtl' ? 'ltr' : 'rtl';
            }
          }}
        >
          <i className="fas fa-paragraph" />
        </button>

        {/* 18. Clear Formatting */}
        <button
          type="button"
          className="blogger-btn"
          title="Clear formatting"
          onMouseDown={(e) => { e.preventDefault(); fmt('removeFormat'); }}
        >
          <i className="fas fa-remove-format" />
        </button>

      </div>

      {/* ── Document Canvas ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          justifyContent: 'center',
          padding: '24px 20px 80px 20px',
          background: '#f8f9fa',
          cursor: 'text',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && mode === 'compose') {
            editorRef.current?.focus();
          }
        }}
      >
        {/* Google White Document Paper Sheet */}
        <div
          style={{
            width: '100%',
            maxWidth: '860px',
            minHeight: `${minHeight}px`,
            background: '#ffffff',
            borderRadius: '2px',
            boxShadow: '0 1px 3px rgba(60,64,67,0.12), 0 1px 2px rgba(60,64,67,0.06)',
            padding: '48px 60px 100px 60px',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            cursor: 'default',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && mode === 'compose') {
              editorRef.current?.focus();
            }
          }}
        >
          {mode === 'compose' ? (
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={emit}
              onBlur={emit}
              onKeyUp={syncState}
              onMouseUp={syncState}
              onDrop={handleDrop}
              onPaste={handlePaste}
              data-placeholder={placeholder}
              style={{
                flex: 1,
                minHeight: `${minHeight - 140}px`,
                outline: 'none',
                fontSize: '15px',
                lineHeight: '1.75',
                color: '#202124',
                fontFamily: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
                cursor: 'text',
              }}
            />
          ) : (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="<!-- Write or paste raw HTML here -->"
              style={{
                flex: 1,
                width: '100%',
                minHeight: `${minHeight - 140}px`,
                border: 'none',
                outline: 'none',
                fontFamily: "'Fira Code', 'Courier New', monospace",
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#1f2937',
                background: 'transparent',
                resize: 'none',
              }}
            />
          )}
        </div>
      </div>

      {/* ── Link Modal ── */}
      {linkModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10005, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '24px 28px', width: '440px', maxWidth: '90vw', boxShadow: '0 12px 36px rgba(0,0,0,0.25)' }}>
            <h4 style={{ fontSize: '18px', fontWeight: 600, color: '#202124', margin: '0 0 16px 0' }}>Insert link</h4>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5f6368', marginBottom: '4px' }}>Text to display</label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Text"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #dadce0', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5f6368', marginBottom: '4px' }}>Web address (URL)</label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #dadce0', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#3c4043', cursor: 'pointer' }}>
                <input type="checkbox" checked={linkNewTab} onChange={(e) => setLinkNewTab(e.target.checked)} />
                Open this link in a new window
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                style={{ padding: '8px 16px', background: 'none', border: '1px solid #dadce0', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', color: '#5f6368', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyLink}
                disabled={!linkUrl.trim()}
                style={{ padding: '8px 18px', background: linkUrl.trim() ? '#e65100' : '#dadce0', border: 'none', borderRadius: '4px', cursor: linkUrl.trim() ? 'pointer' : 'not-allowed', fontSize: '13px', color: '#fff', fontWeight: 600 }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── YouTube Modal ── */}
      {ytModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10005, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '24px 28px', width: '460px', maxWidth: '90vw', boxShadow: '0 12px 36px rgba(0,0,0,0.25)' }}>
            <h4 style={{ fontSize: '18px', fontWeight: 600, color: '#202124', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fab fa-youtube" style={{ color: '#e53935' }} /> Insert YouTube Video
            </h4>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5f6368', marginBottom: '6px' }}>YouTube Video URL</label>
              <input
                type="text"
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #dadce0', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setYtModalOpen(false)}
                style={{ padding: '8px 16px', background: 'none', border: '1px solid #dadce0', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', color: '#5f6368', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleYouTubeEmbed}
                disabled={!ytUrl.trim()}
                style={{ padding: '8px 18px', background: ytUrl.trim() ? '#e53935' : '#dadce0', border: 'none', borderRadius: '4px', cursor: ytUrl.trim() ? 'pointer' : 'not-allowed', fontSize: '13px', color: '#fff', fontWeight: 600 }}
              >
                Insert Video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Blogger Styles ── */}
      <style>{`
        .blogger-btn {
          height: 32px;
          min-width: 30px;
          padding: 0 6px;
          border: 1px solid transparent;
          border-radius: 4px;
          background: transparent;
          color: #444746;
          cursor: pointer;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background 0.12s ease;
          outline: none;
        }
        .blogger-btn:hover {
          background: #f1f3f4;
          color: #202124;
        }
        .blogger-btn.active {
          background: #ffe0b2;
          color: #e65100;
          border: 1px solid #ffb74d;
        }
        .blogger-sep {
          width: 1px;
          height: 18px;
          background: #dadce0;
          margin: 0 4px;
          flex-shrink: 0;
        }
        .blogger-dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 4px;
          background: #ffffff;
          border: 1px solid #dadce0;
          border-radius: 4px;
          box-shadow: 0 4px 16px rgba(60,64,67,0.25);
          z-index: 1000;
          padding: 6px 0;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        .blogger-menu-item {
          padding: 8px 16px;
          font-size: 13px;
          color: #3c4043;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: background 0.12s;
          white-space: nowrap;
        }
        .blogger-menu-item:hover {
          background: #f1f3f4;
          color: #202124;
        }
        .blogger-menu-item.selected {
          background: #fff3e0;
          color: #e65100;
          font-weight: 600;
        }
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #9aa0a6;
          pointer-events: none;
        }
        [contenteditable] h1 { font-size: 2.2em; font-weight: 700; margin: 0.8em 0 0.3em; color: #202124; }
        [contenteditable] h2 { font-size: 1.7em; font-weight: 700; margin: 0.7em 0 0.3em; color: #202124; }
        [contenteditable] h3 { font-size: 1.35em; font-weight: 600; margin: 0.6em 0 0.25em; color: #3c4043; }
        [contenteditable] h4 { font-size: 1.15em; font-weight: 600; margin: 0.5em 0 0.2em; color: #3c4043; }
        [contenteditable] blockquote {
          border-left: 3px solid #e65100;
          margin: 1.2em 0;
          padding: 8px 18px;
          background: #fff8e1;
          color: #5d4037;
          font-style: italic;
        }
        [contenteditable] a { color: #e65100; text-decoration: underline; }
        [contenteditable] img { max-width: 100%; height: auto; border-radius: 4px; display: block; margin: 16px 0; }
        [contenteditable] hr { border: none; border-top: 1px solid #dadce0; margin: 24px 0; }
        [contenteditable] ul, [contenteditable] ol { padding-left: 2em; margin: 0.6em 0; }
        [contenteditable] li { margin: 0.3em 0; }
        [contenteditable] p { margin: 0.5em 0; }
      `}</style>
    </div>
  );
}
