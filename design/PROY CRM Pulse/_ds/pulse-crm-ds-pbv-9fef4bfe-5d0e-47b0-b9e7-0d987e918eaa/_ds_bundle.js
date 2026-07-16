/* @ds-bundle: {"format":4,"namespace":"PulseCRMDSPBV_9fef4b","components":[{"name":"Avatar","sourcePath":"components/data/Avatar.jsx"},{"name":"Badge","sourcePath":"components/data/Badge.jsx"},{"name":"ProgressBar","sourcePath":"components/data/ProgressBar.jsx"},{"name":"StatCard","sourcePath":"components/data/StatCard.jsx"},{"name":"Tag","sourcePath":"components/data/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"IconButton","sourcePath":"components/forms/IconButton.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"Card","sourcePath":"components/layout/Card.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/data/Avatar.jsx":"c843aecf5762","components/data/Badge.jsx":"c8f4696bafd3","components/data/ProgressBar.jsx":"42e9fc03db3d","components/data/StatCard.jsx":"8e40ae95a3c6","components/data/Tag.jsx":"3da9f44975a2","components/feedback/Dialog.jsx":"4551147dd82c","components/feedback/Toast.jsx":"7cf03e9107df","components/feedback/Tooltip.jsx":"5e85d4671d1a","components/forms/Button.jsx":"bcfa626ca001","components/forms/Checkbox.jsx":"11575691e2bb","components/forms/IconButton.jsx":"5b944f1be9bd","components/forms/Input.jsx":"8493466af08a","components/forms/Select.jsx":"220f5f132cde","components/forms/Switch.jsx":"e523735a40ad","components/forms/Textarea.jsx":"28190eb03dfd","components/layout/Card.jsx":"6af43cc015c5","components/navigation/Tabs.jsx":"3a23b0034628","ui_kits/web-app/AppShell.jsx":"577515460a19","ui_kits/web-app/Contacts.jsx":"7de5d08be6dd","ui_kits/web-app/Dashboard.jsx":"080012dd9269","ui_kits/web-app/Pipeline.jsx":"d1ab68034ebb","ui_kits/web-app/data.jsx":"2019355b6d63","ui_kits/web-app/icons.jsx":"6021fbeea378"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.PulseCRMDSPBV_9fef4b = window.PulseCRMDSPBV_9fef4b || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/data/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.pls-avatar {
  --pls-av: 36px;
  position: relative; flex: none;
  width: var(--pls-av); height: var(--pls-av);
  border-radius: var(--radius-full);
  display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--font-sans); font-weight: 600; color: #fff;
  overflow: visible; user-select: none;
}
.pls-avatar__img, .pls-avatar__initials {
  width: 100%; height: 100%; border-radius: inherit;
  display: flex; align-items: center; justify-content: center;
  object-fit: cover;
}
.pls-avatar--xs { --pls-av: 24px; font-size: 10px; }
.pls-avatar--sm { --pls-av: 30px; font-size: 12px; }
.pls-avatar--md { --pls-av: 36px; font-size: 13px; }
.pls-avatar--lg { --pls-av: 44px; font-size: 16px; }
.pls-avatar--xl { --pls-av: 56px; font-size: 20px; }
.pls-avatar__status {
  position: absolute; bottom: 0; right: 0;
  width: 30%; height: 30%; min-width: 8px; min-height: 8px;
  border-radius: 50%; border: 2px solid var(--surface-card); box-sizing: content-box;
}
.pls-avatar__status--online { background: var(--success-solid); }
.pls-avatar__status--away { background: var(--warning-solid); }
.pls-avatar__status--offline { background: var(--slate-300); }
`;
if (typeof document !== 'undefined' && !document.getElementById('pls-avatar-css')) {
  const el = document.createElement('style');
  el.id = 'pls-avatar-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}
const PALETTE = ['#4f46e5', '#7c3aed', '#0ea5e9', '#059669', '#d97706', '#dc2626', '#db2777', '#0891b2'];
function colorFor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = h * 31 + name.charCodeAt(i) >>> 0;
  return PALETTE[h % PALETTE.length];
}
function initialsFor(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function Avatar({
  name = '',
  src,
  size = 'md',
  status,
  className = '',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `pls-avatar pls-avatar--${size} ${className}`,
    style: style,
    title: name
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    className: "pls-avatar__img",
    src: src,
    alt: name
  }) : /*#__PURE__*/React.createElement("span", {
    className: "pls-avatar__initials",
    style: {
      background: colorFor(name)
    }
  }, initialsFor(name)), status && /*#__PURE__*/React.createElement("span", {
    className: `pls-avatar__status pls-avatar__status--${status}`
  }));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/data/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.pls-badge {
  display: inline-flex; align-items: center; gap: 5px;
  height: 22px; padding: 0 8px;
  font-family: var(--font-sans); font-size: 12px; font-weight: 600; line-height: 1;
  border-radius: var(--radius-full); border: 1px solid transparent; white-space: nowrap;
}
.pls-badge__dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.pls-badge--neutral { background: var(--slate-100); color: var(--slate-700); }
.pls-badge--brand   { background: var(--brand-subtle); color: var(--indigo-700); }
.pls-badge--success { background: var(--success-bg); color: var(--success-fg); }
.pls-badge--warning { background: var(--warning-bg); color: var(--warning-fg); }
.pls-badge--danger  { background: var(--danger-bg); color: var(--danger-fg); }
.pls-badge--info    { background: var(--info-bg); color: var(--info-fg); }
.pls-badge--solid.pls-badge--brand   { background: var(--brand); color: #fff; }
.pls-badge--solid.pls-badge--success { background: var(--success-solid); color: #fff; }
.pls-badge--solid.pls-badge--danger  { background: var(--danger-solid); color: #fff; }
.pls-badge--outline { background: transparent; border-color: var(--border-strong); color: var(--text-secondary); }
`;
if (typeof document !== 'undefined' && !document.getElementById('pls-badge-css')) {
  const el = document.createElement('style');
  el.id = 'pls-badge-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}
function Badge({
  tone = 'neutral',
  variant = 'soft',
  dot = false,
  className = '',
  children,
  ...rest
}) {
  const cls = ['pls-badge', `pls-badge--${tone}`, variant === 'solid' && 'pls-badge--solid', variant === 'outline' && 'pls-badge--outline', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    className: "pls-badge__dot"
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Badge.jsx", error: String((e && e.message) || e) }); }

// components/data/ProgressBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.pls-progress { display: flex; flex-direction: column; gap: 6px; width: 100%; }
.pls-progress__head { display: flex; align-items: baseline; justify-content: space-between; }
.pls-progress__label { font: var(--label); color: var(--text-secondary); }
.pls-progress__value { font-family: var(--font-mono); font-size: 12px; font-weight: 500; color: var(--text-primary); }
.pls-progress__track {
  height: 8px; width: 100%; border-radius: var(--radius-full);
  background: var(--slate-100); overflow: hidden;
}
.pls-progress__track--sm { height: 6px; }
.pls-progress__fill {
  height: 100%; border-radius: inherit; background: var(--brand);
  transition: width var(--duration-slow) var(--ease-out);
}
.pls-progress__fill--success { background: var(--success-solid); }
.pls-progress__fill--warning { background: var(--warning-solid); }
.pls-progress__fill--danger { background: var(--danger-solid); }
.pls-progress__fill--accent { background: var(--accent); }
`;
if (typeof document !== 'undefined' && !document.getElementById('pls-progress-css')) {
  const el = document.createElement('style');
  el.id = 'pls-progress-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}
function ProgressBar({
  value = 0,
  max = 100,
  label,
  showValue = false,
  tone = 'brand',
  size = 'md',
  format,
  className = '',
  ...rest
}) {
  const pct = Math.max(0, Math.min(100, value / max * 100));
  const display = format ? format(value, max) : `${Math.round(pct)}%`;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `pls-progress ${className}`
  }, rest), (label || showValue) && /*#__PURE__*/React.createElement("div", {
    className: "pls-progress__head"
  }, label && /*#__PURE__*/React.createElement("span", {
    className: "pls-progress__label"
  }, label), showValue && /*#__PURE__*/React.createElement("span", {
    className: "pls-progress__value"
  }, display)), /*#__PURE__*/React.createElement("div", {
    className: `pls-progress__track ${size === 'sm' ? 'pls-progress__track--sm' : ''}`,
    role: "progressbar",
    "aria-valuenow": value,
    "aria-valuemin": 0,
    "aria-valuemax": max
  }, /*#__PURE__*/React.createElement("div", {
    className: `pls-progress__fill ${tone !== 'brand' ? `pls-progress__fill--${tone}` : ''}`,
    style: {
      width: `${pct}%`
    }
  })));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/data/StatCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.pls-stat {
  display: flex; flex-direction: column; gap: 8px;
  padding: 16px 18px;
  background: var(--surface-card);
  border: 1px solid var(--border-default); border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
}
.pls-stat__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.pls-stat__label { font: var(--label); color: var(--text-secondary); }
.pls-stat__icon { color: var(--text-muted); display: flex; }
.pls-stat__icon svg { width: 18px; height: 18px; }
.pls-stat__value {
  font-family: var(--font-sans); font-weight: 800; font-size: 28px; line-height: 1.1;
  letter-spacing: -0.02em; color: var(--text-primary); font-variant-numeric: tabular-nums;
}
.pls-stat__foot { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.pls-stat__delta { display: inline-flex; align-items: center; gap: 3px; font-weight: 600; }
.pls-stat__delta svg { width: 13px; height: 13px; }
.pls-stat__delta--up { color: var(--success-fg); }
.pls-stat__delta--down { color: var(--danger-fg); }
.pls-stat__note { color: var(--text-muted); }
`;
if (typeof document !== 'undefined' && !document.getElementById('pls-stat-css')) {
  const el = document.createElement('style');
  el.id = 'pls-stat-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}
function StatCard({
  label,
  value,
  delta,
  note,
  icon = null,
  className = '',
  ...rest
}) {
  const dir = delta == null ? null : delta >= 0 ? 'up' : 'down';
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `pls-stat ${className}`
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "pls-stat__head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pls-stat__label"
  }, label), icon && /*#__PURE__*/React.createElement("span", {
    className: "pls-stat__icon"
  }, icon)), /*#__PURE__*/React.createElement("div", {
    className: "pls-stat__value"
  }, value), (delta != null || note) && /*#__PURE__*/React.createElement("div", {
    className: "pls-stat__foot"
  }, delta != null && /*#__PURE__*/React.createElement("span", {
    className: `pls-stat__delta pls-stat__delta--${dir}`
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, dir === 'up' ? /*#__PURE__*/React.createElement("path", {
    d: "M7 17 17 7M9 7h8v8"
  }) : /*#__PURE__*/React.createElement("path", {
    d: "M7 7l10 10M9 17h8V9"
  })), Math.abs(delta), "%"), note && /*#__PURE__*/React.createElement("span", {
    className: "pls-stat__note"
  }, note)));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/data/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.pls-tag {
  display: inline-flex; align-items: center; gap: 6px;
  height: 24px; padding: 0 8px;
  font-family: var(--font-sans); font-size: 12px; font-weight: 500; line-height: 1;
  color: var(--text-secondary);
  background: var(--surface-card);
  border: 1px solid var(--border-default); border-radius: var(--radius-md);
}
.pls-tag__swatch { width: 8px; height: 8px; border-radius: 2px; flex: none; }
.pls-tag__remove {
  display: inline-flex; margin: 0 -3px 0 1px; padding: 0; border: none; background: none;
  color: var(--text-muted); cursor: pointer; border-radius: var(--radius-sm);
}
.pls-tag__remove:hover { color: var(--text-primary); background: var(--surface-sunken); }
.pls-tag__remove svg { width: 13px; height: 13px; }
`;
if (typeof document !== 'undefined' && !document.getElementById('pls-tag-css')) {
  const el = document.createElement('style');
  el.id = 'pls-tag-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}
function Tag({
  color,
  onRemove,
  className = '',
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `pls-tag ${className}`
  }, rest), color && /*#__PURE__*/React.createElement("span", {
    className: "pls-tag__swatch",
    style: {
      background: color
    }
  }), children, onRemove && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "pls-tag__remove",
    "aria-label": "Remove",
    onClick: onRemove
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  }))));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
const CSS = `
.pls-dialog__overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(15, 23, 42, 0.45);
  display: flex; align-items: center; justify-content: center; padding: 24px;
  animation: pls-dialog-fade var(--duration-base) var(--ease-standard);
}
@keyframes pls-dialog-fade { from { opacity: 0; } to { opacity: 1; } }
.pls-dialog {
  width: 100%; max-height: 90vh; display: flex; flex-direction: column;
  background: var(--surface-card); border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl); overflow: hidden;
  animation: pls-dialog-pop var(--duration-slow) var(--ease-out);
}
@keyframes pls-dialog-pop { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
.pls-dialog--sm { max-width: 400px; }
.pls-dialog--md { max-width: 520px; }
.pls-dialog--lg { max-width: 720px; }
.pls-dialog__header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 20px 22px 0;
}
.pls-dialog__titles { display: flex; flex-direction: column; gap: 3px; }
.pls-dialog__title { font: var(--heading); font-size: 18px; color: var(--text-primary); }
.pls-dialog__desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
.pls-dialog__close {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border: none; background: none; cursor: pointer;
  color: var(--text-muted); border-radius: var(--radius-md); margin: -4px -6px 0 0;
}
.pls-dialog__close:hover { background: var(--surface-sunken); color: var(--text-primary); }
.pls-dialog__close svg { width: 17px; height: 17px; }
.pls-dialog__body { padding: 16px 22px; overflow-y: auto; font-size: 14px; color: var(--text-secondary); line-height: 1.55; }
.pls-dialog__footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 14px 22px 20px;
}
`;
if (typeof document !== 'undefined' && !document.getElementById('pls-dialog-css')) {
  const el = document.createElement('style');
  el.id = 'pls-dialog-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}
function Dialog({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  children,
  className = ''
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = e => e.key === 'Escape' && onClose && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "pls-dialog__overlay",
    onMouseDown: e => e.target === e.currentTarget && onClose && onClose()
  }, /*#__PURE__*/React.createElement("div", {
    className: `pls-dialog pls-dialog--${size} ${className}`,
    role: "dialog",
    "aria-modal": "true",
    "aria-label": typeof title === 'string' ? title : undefined
  }, (title || onClose) && /*#__PURE__*/React.createElement("div", {
    className: "pls-dialog__header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pls-dialog__titles"
  }, title && /*#__PURE__*/React.createElement("span", {
    className: "pls-dialog__title"
  }, title), description && /*#__PURE__*/React.createElement("span", {
    className: "pls-dialog__desc"
  }, description)), onClose && /*#__PURE__*/React.createElement("button", {
    className: "pls-dialog__close",
    "aria-label": "Close",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "pls-dialog__body"
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    className: "pls-dialog__footer"
  }, footer)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.pls-toast {
  display: flex; align-items: flex-start; gap: 11px;
  width: 340px; padding: 13px 14px;
  background: var(--surface-card);
  border: 1px solid var(--border-default); border-left-width: 3px;
  border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);
}
.pls-toast--success { border-left-color: var(--success-solid); }
.pls-toast--danger  { border-left-color: var(--danger-solid); }
.pls-toast--warning { border-left-color: var(--warning-solid); }
.pls-toast--info    { border-left-color: var(--info-solid); }
.pls-toast__icon { flex: none; margin-top: 1px; display: flex; }
.pls-toast__icon svg { width: 18px; height: 18px; }
.pls-toast--success .pls-toast__icon { color: var(--success-solid); }
.pls-toast--danger  .pls-toast__icon { color: var(--danger-solid); }
.pls-toast--warning .pls-toast__icon { color: var(--warning-solid); }
.pls-toast--info    .pls-toast__icon { color: var(--info-solid); }
.pls-toast__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.pls-toast__title { font: var(--label); font-weight: 600; color: var(--text-primary); }
.pls-toast__desc { font-size: 12px; color: var(--text-secondary); line-height: 1.45; }
.pls-toast__close {
  flex: none; border: none; background: none; cursor: pointer; padding: 2px;
  color: var(--text-muted); border-radius: var(--radius-sm); margin: -2px -2px 0 0;
}
.pls-toast__close:hover { color: var(--text-primary); }
.pls-toast__close svg { width: 15px; height: 15px; }
`;
if (typeof document !== 'undefined' && !document.getElementById('pls-toast-css')) {
  const el = document.createElement('style');
  el.id = 'pls-toast-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}
const ICONS = {
  success: /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  }),
  danger: /*#__PURE__*/React.createElement("path", {
    d: "M12 8v5M12 16.5v.5M10.3 3.9 2.4 18a1.5 1.5 0 0 0 1.3 2.2h16.6a1.5 1.5 0 0 0 1.3-2.2L13.7 3.9a1.5 1.5 0 0 0-2.6 0Z"
  }),
  warning: /*#__PURE__*/React.createElement("path", {
    d: "M12 8v5M12 16.5v.5M10.3 3.9 2.4 18a1.5 1.5 0 0 0 1.3 2.2h16.6a1.5 1.5 0 0 0 1.3-2.2L13.7 3.9a1.5 1.5 0 0 0-2.6 0Z"
  }),
  info: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 11v5M12 8v.5"
  }))
};
function Toast({
  tone = 'info',
  title,
  description,
  onClose,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `pls-toast pls-toast--${tone} ${className}`,
    role: "status"
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "pls-toast__icon"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, ICONS[tone])), /*#__PURE__*/React.createElement("div", {
    className: "pls-toast__body"
  }, title && /*#__PURE__*/React.createElement("span", {
    className: "pls-toast__title"
  }, title), description && /*#__PURE__*/React.createElement("span", {
    className: "pls-toast__desc"
  }, description)), onClose && /*#__PURE__*/React.createElement("button", {
    className: "pls-toast__close",
    "aria-label": "Dismiss",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  }))));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.pls-tooltip { position: relative; display: inline-flex; }
.pls-tooltip__bubble {
  position: absolute; z-index: 900; pointer-events: none;
  background: var(--slate-900); color: #fff;
  font-family: var(--font-sans); font-size: 12px; font-weight: 500; line-height: 1.4;
  padding: 6px 9px; border-radius: var(--radius-md); box-shadow: var(--shadow-md);
  white-space: nowrap; max-width: 240px;
  opacity: 0; transform: translateY(2px);
  transition: opacity var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard);
}
.pls-tooltip:hover .pls-tooltip__bubble,
.pls-tooltip:focus-within .pls-tooltip__bubble { opacity: 1; transform: translateY(0); }
.pls-tooltip__bubble--top { bottom: 100%; left: 50%; transform: translate(-50%, 2px); margin-bottom: 7px; }
.pls-tooltip:hover .pls-tooltip__bubble--top,
.pls-tooltip:focus-within .pls-tooltip__bubble--top { transform: translate(-50%, 0); }
.pls-tooltip__bubble--bottom { top: 100%; left: 50%; transform: translate(-50%, -2px); margin-top: 7px; }
.pls-tooltip:hover .pls-tooltip__bubble--bottom,
.pls-tooltip:focus-within .pls-tooltip__bubble--bottom { transform: translate(-50%, 0); }
.pls-tooltip__bubble--right { left: 100%; top: 50%; transform: translate(-2px, -50%); margin-left: 7px; }
.pls-tooltip:hover .pls-tooltip__bubble--right,
.pls-tooltip:focus-within .pls-tooltip__bubble--right { transform: translate(0, -50%); }
`;
if (typeof document !== 'undefined' && !document.getElementById('pls-tooltip-css')) {
  const el = document.createElement('style');
  el.id = 'pls-tooltip-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}
function Tooltip({
  label,
  side = 'top',
  className = '',
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `pls-tooltip ${className}`
  }, rest), children, /*#__PURE__*/React.createElement("span", {
    className: `pls-tooltip__bubble pls-tooltip__bubble--${side}`,
    role: "tooltip"
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.pls-btn {
  --pls-h: 36px; --pls-px: 14px; --pls-fs: 14px;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: var(--pls-h); padding: 0 var(--pls-px);
  font-family: var(--font-sans); font-size: var(--pls-fs); font-weight: 600;
  line-height: 1; white-space: nowrap;
  border: 1px solid transparent; border-radius: var(--radius-md);
  cursor: pointer; user-select: none;
  transition: background var(--duration-fast) var(--ease-standard),
              border-color var(--duration-fast) var(--ease-standard),
              box-shadow var(--duration-fast) var(--ease-standard),
              transform var(--duration-fast) var(--ease-standard);
}
.pls-btn:focus-visible { outline: none; box-shadow: var(--ring); }
.pls-btn:active:not(:disabled) { transform: translateY(0.5px); }
.pls-btn:disabled { opacity: .5; cursor: not-allowed; }
.pls-btn--sm { --pls-h: 30px; --pls-px: 11px; --pls-fs: 13px; }
.pls-btn--lg { --pls-h: 44px; --pls-px: 20px; --pls-fs: 15px; }
.pls-btn--full { width: 100%; }

.pls-btn--primary { background: var(--brand); color: var(--brand-fg); }
.pls-btn--primary:hover:not(:disabled) { background: var(--brand-hover); }
.pls-btn--primary:active:not(:disabled) { background: var(--brand-active); }

.pls-btn--secondary { background: var(--surface-card); color: var(--text-primary); border-color: var(--border-strong); box-shadow: var(--shadow-xs); }
.pls-btn--secondary:hover:not(:disabled) { background: var(--surface-hover); border-color: var(--slate-400); }

.pls-btn--ghost { background: transparent; color: var(--text-secondary); }
.pls-btn--ghost:hover:not(:disabled) { background: var(--surface-sunken); color: var(--text-primary); }

.pls-btn--danger { background: var(--danger-solid); color: #fff; }
.pls-btn--danger:hover:not(:disabled) { background: var(--red-700); }
.pls-btn--danger:focus-visible { box-shadow: var(--ring-danger); }

.pls-btn svg { width: 1.15em; height: 1.15em; flex: none; }
`;
if (typeof document !== 'undefined' && !document.getElementById('pls-btn-css')) {
  const el = document.createElement('style');
  el.id = 'pls-btn-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}
function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  iconLeft = null,
  iconRight = null,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const cls = ['pls-btn', `pls-btn--${variant}`, size !== 'md' && `pls-btn--${size}`, fullWidth && 'pls-btn--full', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    className: cls
  }, rest), iconLeft, children != null && /*#__PURE__*/React.createElement("span", null, children), iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.pls-check { display: inline-flex; align-items: flex-start; gap: 9px; cursor: pointer; font-family: var(--font-sans); }
.pls-check--disabled { cursor: not-allowed; opacity: .55; }
.pls-check__box {
  flex: none; width: 18px; height: 18px; margin-top: 1px;
  border: 1.5px solid var(--border-strong); border-radius: var(--radius-sm);
  background: var(--surface-card);
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff;
  transition: background var(--duration-fast) var(--ease-standard),
              border-color var(--duration-fast) var(--ease-standard),
              box-shadow var(--duration-fast) var(--ease-standard);
}
.pls-check:hover .pls-check__box { border-color: var(--slate-400); }
.pls-check input { position: absolute; opacity: 0; width: 0; height: 0; }
.pls-check input:checked + .pls-check__box { background: var(--brand); border-color: var(--brand); }
.pls-check input:focus-visible + .pls-check__box { box-shadow: var(--ring); }
.pls-check__box svg { width: 13px; height: 13px; opacity: 0; transition: opacity var(--duration-fast); }
.pls-check input:checked + .pls-check__box svg { opacity: 1; }
.pls-check__text { display: flex; flex-direction: column; gap: 1px; }
.pls-check__label { font-size: 14px; color: var(--text-primary); line-height: 1.35; }
.pls-check__desc { font-size: 12px; color: var(--text-muted); }
`;
if (typeof document !== 'undefined' && !document.getElementById('pls-check-css')) {
  const el = document.createElement('style');
  el.id = 'pls-check-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}
function Checkbox({
  label,
  description,
  disabled = false,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    className: `pls-check ${disabled ? 'pls-check--disabled' : ''} ${className}`
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    disabled: disabled
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "pls-check__box"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "3.5",
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  }))), (label || description) && /*#__PURE__*/React.createElement("span", {
    className: "pls-check__text"
  }, label && /*#__PURE__*/React.createElement("span", {
    className: "pls-check__label"
  }, label), description && /*#__PURE__*/React.createElement("span", {
    className: "pls-check__desc"
  }, description)));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.pls-iconbtn {
  --pls-sz: 36px;
  display: inline-flex; align-items: center; justify-content: center;
  width: var(--pls-sz); height: var(--pls-sz);
  border: 1px solid transparent; border-radius: var(--radius-md);
  background: transparent; color: var(--text-secondary);
  cursor: pointer; padding: 0;
  transition: background var(--duration-fast) var(--ease-standard),
              color var(--duration-fast) var(--ease-standard),
              border-color var(--duration-fast) var(--ease-standard),
              box-shadow var(--duration-fast) var(--ease-standard);
}
.pls-iconbtn:hover:not(:disabled) { background: var(--surface-sunken); color: var(--text-primary); }
.pls-iconbtn:focus-visible { outline: none; box-shadow: var(--ring); }
.pls-iconbtn:disabled { opacity: .5; cursor: not-allowed; }
.pls-iconbtn--sm { --pls-sz: 30px; }
.pls-iconbtn--lg { --pls-sz: 44px; }
.pls-iconbtn--solid { background: var(--brand); color: var(--brand-fg); }
.pls-iconbtn--solid:hover:not(:disabled) { background: var(--brand-hover); color: #fff; }
.pls-iconbtn--outline { border-color: var(--border-strong); color: var(--text-secondary); box-shadow: var(--shadow-xs); }
.pls-iconbtn--outline:hover:not(:disabled) { background: var(--surface-hover); border-color: var(--slate-400); }
.pls-iconbtn svg { width: 1.2em; height: 1.2em; font-size: 18px; }
`;
if (typeof document !== 'undefined' && !document.getElementById('pls-iconbtn-css')) {
  const el = document.createElement('style');
  el.id = 'pls-iconbtn-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}
function IconButton({
  variant = 'ghost',
  size = 'md',
  'aria-label': ariaLabel,
  className = '',
  children,
  ...rest
}) {
  const cls = ['pls-iconbtn', variant !== 'ghost' && `pls-iconbtn--${variant}`, size !== 'md' && `pls-iconbtn--${size}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    "aria-label": ariaLabel,
    className: cls
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.pls-field { display: flex; flex-direction: column; gap: 6px; }
.pls-field__label { font: var(--label); color: var(--text-primary); }
.pls-field__label .req { color: var(--danger-solid); margin-left: 2px; }
.pls-field__hint { font: var(--caption); color: var(--text-muted); }
.pls-field__hint--error { color: var(--danger-fg); }

.pls-input {
  display: flex; align-items: center; gap: 8px;
  height: 38px; padding: 0 12px;
  background: var(--surface-card);
  border: 1px solid var(--border-strong); border-radius: var(--radius-md);
  color: var(--text-primary);
  box-shadow: var(--shadow-xs);
  transition: border-color var(--duration-fast) var(--ease-standard),
              box-shadow var(--duration-fast) var(--ease-standard);
}
.pls-input:focus-within { border-color: var(--border-focus); box-shadow: var(--ring); }
.pls-input--error { border-color: var(--danger-solid); }
.pls-input--error:focus-within { box-shadow: var(--ring-danger); }
.pls-input--sm { height: 32px; padding: 0 10px; }
.pls-input--disabled { background: var(--surface-sunken); opacity: .7; cursor: not-allowed; }
.pls-input input {
  flex: 1; min-width: 0; border: none; outline: none; background: transparent;
  font-family: var(--font-sans); font-size: 14px; color: inherit; padding: 0;
}
.pls-input input::placeholder { color: var(--text-muted); }
.pls-input__affix { color: var(--text-muted); display: inline-flex; align-items: center; font-size: 14px; }
.pls-input__affix svg { width: 16px; height: 16px; }
`;
if (typeof document !== 'undefined' && !document.getElementById('pls-input-css')) {
  const el = document.createElement('style');
  el.id = 'pls-input-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}
function Input({
  label,
  hint,
  error,
  required = false,
  size = 'md',
  prefix = null,
  suffix = null,
  disabled = false,
  id,
  className = '',
  ...rest
}) {
  const fieldId = id || (label ? `pls-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const boxCls = ['pls-input', size === 'sm' && 'pls-input--sm', error && 'pls-input--error', disabled && 'pls-input--disabled'].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: `pls-field ${className}`
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "pls-field__label",
    htmlFor: fieldId
  }, label, required && /*#__PURE__*/React.createElement("span", {
    className: "req"
  }, "*")), /*#__PURE__*/React.createElement("div", {
    className: boxCls
  }, prefix && /*#__PURE__*/React.createElement("span", {
    className: "pls-input__affix"
  }, prefix), /*#__PURE__*/React.createElement("input", _extends({
    id: fieldId,
    disabled: disabled,
    "aria-invalid": !!error
  }, rest)), suffix && /*#__PURE__*/React.createElement("span", {
    className: "pls-input__affix"
  }, suffix)), (error || hint) && /*#__PURE__*/React.createElement("span", {
    className: `pls-field__hint ${error ? 'pls-field__hint--error' : ''}`
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.pls-select-field { display: flex; flex-direction: column; gap: 6px; }
.pls-select-field__label { font: var(--label); color: var(--text-primary); }
.pls-select-wrap { position: relative; display: flex; }
.pls-select {
  appearance: none; -webkit-appearance: none;
  width: 100%; height: 38px; padding: 0 34px 0 12px;
  background: var(--surface-card);
  border: 1px solid var(--border-strong); border-radius: var(--radius-md);
  font-family: var(--font-sans); font-size: 14px; color: var(--text-primary);
  box-shadow: var(--shadow-xs); cursor: pointer;
  transition: border-color var(--duration-fast) var(--ease-standard),
              box-shadow var(--duration-fast) var(--ease-standard);
}
.pls-select:focus-visible { outline: none; border-color: var(--border-focus); box-shadow: var(--ring); }
.pls-select:disabled { background: var(--surface-sunken); opacity: .7; cursor: not-allowed; }
.pls-select--sm { height: 32px; padding: 0 32px 0 10px; }
.pls-select-wrap__chev {
  position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
  pointer-events: none; color: var(--text-muted); display: flex;
}
`;
if (typeof document !== 'undefined' && !document.getElementById('pls-select-css')) {
  const el = document.createElement('style');
  el.id = 'pls-select-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}
function Select({
  label,
  size = 'md',
  options = [],
  placeholder,
  id,
  className = '',
  children,
  ...rest
}) {
  const fieldId = id || (label ? `pls-sel-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return /*#__PURE__*/React.createElement("div", {
    className: `pls-select-field ${className}`
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "pls-select-field__label",
    htmlFor: fieldId
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "pls-select-wrap"
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: fieldId,
    className: `pls-select ${size === 'sm' ? 'pls-select--sm' : ''}`
  }, rest), placeholder && /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, placeholder), options.map(o => {
    const opt = typeof o === 'string' ? {
      value: o,
      label: o
    } : o;
    return /*#__PURE__*/React.createElement("option", {
      key: opt.value,
      value: opt.value
    }, opt.label);
  }), children), /*#__PURE__*/React.createElement("span", {
    className: "pls-select-wrap__chev"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  })))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.pls-switch { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; font-family: var(--font-sans); }
.pls-switch--disabled { cursor: not-allowed; opacity: .55; }
.pls-switch input { position: absolute; opacity: 0; width: 0; height: 0; }
.pls-switch__track {
  position: relative; flex: none; width: 36px; height: 20px;
  background: var(--slate-300); border-radius: var(--radius-full);
  transition: background var(--duration-base) var(--ease-standard);
}
.pls-switch__track::after {
  content: ''; position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px; border-radius: 50%;
  background: #fff; box-shadow: var(--shadow-sm);
  transition: transform var(--duration-base) var(--ease-out);
}
.pls-switch input:checked + .pls-switch__track { background: var(--brand); }
.pls-switch input:checked + .pls-switch__track::after { transform: translateX(16px); }
.pls-switch input:focus-visible + .pls-switch__track { box-shadow: var(--ring); }
.pls-switch__label { font-size: 14px; color: var(--text-primary); }
`;
if (typeof document !== 'undefined' && !document.getElementById('pls-switch-css')) {
  const el = document.createElement('style');
  el.id = 'pls-switch-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}
function Switch({
  label,
  disabled = false,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    className: `pls-switch ${disabled ? 'pls-switch--disabled' : ''} ${className}`
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    role: "switch",
    disabled: disabled
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "pls-switch__track"
  }), label && /*#__PURE__*/React.createElement("span", {
    className: "pls-switch__label"
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.pls-ta-field { display: flex; flex-direction: column; gap: 6px; }
.pls-ta-field__label { font: var(--label); color: var(--text-primary); }
.pls-ta-field__hint { font: var(--caption); color: var(--text-muted); }
.pls-ta-field__hint--error { color: var(--danger-fg); }
.pls-textarea {
  width: 100%; min-height: 84px; padding: 10px 12px; resize: vertical;
  background: var(--surface-card);
  border: 1px solid var(--border-strong); border-radius: var(--radius-md);
  font-family: var(--font-sans); font-size: 14px; line-height: 1.5; color: var(--text-primary);
  box-shadow: var(--shadow-xs);
  transition: border-color var(--duration-fast) var(--ease-standard),
              box-shadow var(--duration-fast) var(--ease-standard);
}
.pls-textarea::placeholder { color: var(--text-muted); }
.pls-textarea:focus-visible { outline: none; border-color: var(--border-focus); box-shadow: var(--ring); }
.pls-textarea--error { border-color: var(--danger-solid); }
.pls-textarea:disabled { background: var(--surface-sunken); opacity: .7; cursor: not-allowed; }
`;
if (typeof document !== 'undefined' && !document.getElementById('pls-textarea-css')) {
  const el = document.createElement('style');
  el.id = 'pls-textarea-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}
function Textarea({
  label,
  hint,
  error,
  id,
  className = '',
  ...rest
}) {
  const fieldId = id || (label ? `pls-ta-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return /*#__PURE__*/React.createElement("div", {
    className: `pls-ta-field ${className}`
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "pls-ta-field__label",
    htmlFor: fieldId
  }, label), /*#__PURE__*/React.createElement("textarea", _extends({
    id: fieldId,
    className: `pls-textarea ${error ? 'pls-textarea--error' : ''}`,
    "aria-invalid": !!error
  }, rest)), (error || hint) && /*#__PURE__*/React.createElement("span", {
    className: `pls-ta-field__hint ${error ? 'pls-ta-field__hint--error' : ''}`
  }, error || hint));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/layout/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.pls-card {
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
  overflow: hidden;
}
.pls-card--raised { box-shadow: var(--shadow-md); border-color: var(--border-subtle); }
.pls-card--flat { box-shadow: none; }
.pls-card__header {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 14px 18px; border-bottom: 1px solid var(--border-subtle);
}
.pls-card__titles { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.pls-card__title { font: var(--title); color: var(--text-primary); }
.pls-card__subtitle { font: var(--caption); color: var(--text-muted); }
.pls-card__actions { display: flex; align-items: center; gap: 8px; flex: none; }
.pls-card__body { padding: 18px; }
.pls-card__body--flush { padding: 0; }
.pls-card__footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 12px 18px; border-top: 1px solid var(--border-subtle);
  background: var(--surface-page);
}
`;
if (typeof document !== 'undefined' && !document.getElementById('pls-card-css')) {
  const el = document.createElement('style');
  el.id = 'pls-card-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}
function Card({
  title,
  subtitle,
  actions,
  footer,
  elevation = 'default',
  flush = false,
  className = '',
  children,
  ...rest
}) {
  const cls = ['pls-card', elevation === 'raised' && 'pls-card--raised', elevation === 'flat' && 'pls-card--flat', className].filter(Boolean).join(' ');
  const hasHeader = title || subtitle || actions;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), hasHeader && /*#__PURE__*/React.createElement("div", {
    className: "pls-card__header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pls-card__titles"
  }, title && /*#__PURE__*/React.createElement("span", {
    className: "pls-card__title"
  }, title), subtitle && /*#__PURE__*/React.createElement("span", {
    className: "pls-card__subtitle"
  }, subtitle)), actions && /*#__PURE__*/React.createElement("div", {
    className: "pls-card__actions"
  }, actions)), /*#__PURE__*/React.createElement("div", {
    className: `pls-card__body ${flush ? 'pls-card__body--flush' : ''}`
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    className: "pls-card__footer"
  }, footer));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Card.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.pls-tabs { display: flex; align-items: stretch; gap: 2px; border-bottom: 1px solid var(--border-default); }
.pls-tab {
  position: relative; display: inline-flex; align-items: center; gap: 7px;
  padding: 10px 12px; margin-bottom: -1px;
  font-family: var(--font-sans); font-size: 14px; font-weight: 600;
  color: var(--text-secondary); background: none; border: none; cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color var(--duration-fast) var(--ease-standard);
}
.pls-tab:hover { color: var(--text-primary); }
.pls-tab--active { color: var(--brand); border-bottom-color: var(--brand); }
.pls-tab:focus-visible { outline: none; box-shadow: var(--ring); border-radius: var(--radius-sm); }
.pls-tab__count {
  font-size: 11px; font-weight: 600; line-height: 1; padding: 2px 6px;
  border-radius: var(--radius-full); background: var(--slate-100); color: var(--text-secondary);
}
.pls-tab--active .pls-tab__count { background: var(--brand-subtle); color: var(--indigo-700); }
`;
if (typeof document !== 'undefined' && !document.getElementById('pls-tabs-css')) {
  const el = document.createElement('style');
  el.id = 'pls-tabs-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}
function Tabs({
  tabs = [],
  value,
  defaultValue,
  onChange,
  className = '',
  ...rest
}) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue ?? (tabs[0] && (tabs[0].value ?? tabs[0])));
  const active = isControlled ? value : internal;
  function select(v) {
    if (!isControlled) setInternal(v);
    onChange && onChange(v);
  }
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `pls-tabs ${className}`,
    role: "tablist"
  }, rest), tabs.map(t => {
    const tab = typeof t === 'string' ? {
      value: t,
      label: t
    } : t;
    const isActive = tab.value === active;
    return /*#__PURE__*/React.createElement("button", {
      key: tab.value,
      role: "tab",
      "aria-selected": isActive,
      className: `pls-tab ${isActive ? 'pls-tab--active' : ''}`,
      onClick: () => select(tab.value)
    }, tab.icon, tab.label, tab.count != null && /*#__PURE__*/React.createElement("span", {
      className: "pls-tab__count"
    }, tab.count));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/AppShell.jsx
try { (() => {
const {
  Avatar,
  IconButton
} = window.PulseCRMDSPBV_9fef4b;
const Icon = window.PulseIcon;
const SHELL_CSS = `
.app { display: grid; grid-template-columns: var(--sidebar-width) 1fr; height: 100vh; background: var(--surface-page); overflow: hidden; }
.side { display: flex; flex-direction: column; background: var(--surface-card); border-right: 1px solid var(--border-default); }
.side__brand { display: flex; align-items: center; gap: 9px; height: var(--topbar-height); padding: 0 18px; border-bottom: 1px solid var(--border-subtle); }
.side__word { font-weight: 800; font-size: 19px; letter-spacing: -.03em; color: var(--slate-900); }
.side__word b { color: var(--brand); }
.side__nav { flex: 1; padding: 12px 12px; display: flex; flex-direction: column; gap: 2px; }
.side__group { font: var(--overline); text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); padding: 14px 10px 6px; }
.navitem { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: var(--radius-md); color: var(--text-secondary); font-size: 14px; font-weight: 500; cursor: pointer; border: none; background: none; width: 100%; text-align: left; transition: background var(--duration-fast), color var(--duration-fast); }
.navitem:hover { background: var(--surface-sunken); color: var(--text-primary); }
.navitem--active { background: var(--brand-subtle); color: var(--indigo-700); font-weight: 600; }
.navitem__count { margin-left: auto; font-size: 11px; font-weight: 600; color: var(--text-muted); background: var(--surface-sunken); padding: 1px 7px; border-radius: var(--radius-full); }
.navitem--active .navitem__count { background: var(--indigo-100); color: var(--indigo-700); }
.side__foot { border-top: 1px solid var(--border-subtle); padding: 10px 12px; }
.side__user { display: flex; align-items: center; gap: 10px; padding: 6px; border-radius: var(--radius-md); cursor: pointer; }
.side__user:hover { background: var(--surface-sunken); }
.side__user__txt { display: flex; flex-direction: column; min-width: 0; }
.side__user__name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.side__user__role { font-size: 11px; color: var(--text-muted); }
.main { display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
.top { display: flex; align-items: center; gap: 14px; height: var(--topbar-height); padding: 0 22px; background: var(--surface-card); border-bottom: 1px solid var(--border-default); flex: none; }
.top__title { font: var(--heading); font-size: 19px; }
.top__search { display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 11px; background: var(--surface-page); border: 1px solid var(--border-default); border-radius: var(--radius-md); color: var(--text-muted); width: 260px; }
.top__search input { border: none; background: none; outline: none; font-size: 13px; color: var(--text-primary); width: 100%; }
.top__spacer { flex: 1; }
.top__actions { display: flex; align-items: center; gap: 8px; }
.content { flex: 1; overflow-y: auto; padding: 24px; }
.content__inner { max-width: var(--content-max); margin: 0 auto; }
`;
if (!document.getElementById('pls-shell-css')) {
  const el = document.createElement('style');
  el.id = 'pls-shell-css';
  el.textContent = SHELL_CSS;
  document.head.appendChild(el);
}
const NAV = [{
  key: 'dashboard',
  label: 'Dashboard',
  icon: 'dashboard'
}, {
  key: 'contacts',
  label: 'Contacts',
  icon: 'users',
  count: 1284
}, {
  key: 'pipeline',
  label: 'Pipeline',
  icon: 'pipeline',
  count: 84
}, {
  key: 'inbox',
  label: 'Inbox',
  icon: 'inbox',
  count: 6
}, {
  key: 'reports',
  label: 'Reports',
  icon: 'reports'
}];
function AppShell({
  active,
  onNavigate,
  title,
  actions,
  user,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement("aside", {
    className: "side"
  }, /*#__PURE__*/React.createElement("div", {
    className: "side__brand"
  }, /*#__PURE__*/React.createElement(Icon.pulse, null), /*#__PURE__*/React.createElement("span", {
    className: "side__word"
  }, "Pulse", /*#__PURE__*/React.createElement("b", null, "."))), /*#__PURE__*/React.createElement("nav", {
    className: "side__nav"
  }, /*#__PURE__*/React.createElement("div", {
    className: "side__group"
  }, "Workspace"), NAV.map(n => {
    const I = Icon[n.icon];
    return /*#__PURE__*/React.createElement("button", {
      key: n.key,
      className: `navitem ${active === n.key ? 'navitem--active' : ''}`,
      onClick: () => onNavigate(n.key)
    }, /*#__PURE__*/React.createElement(I, {
      size: 18
    }), n.label, n.count != null && /*#__PURE__*/React.createElement("span", {
      className: "navitem__count"
    }, n.count > 999 ? '1.2k' : n.count));
  }), /*#__PURE__*/React.createElement("div", {
    className: "side__group"
  }, "Account"), /*#__PURE__*/React.createElement("button", {
    className: "navitem"
  }, /*#__PURE__*/React.createElement(Icon.settings, {
    size: 18
  }), "Settings")), /*#__PURE__*/React.createElement("div", {
    className: "side__foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "side__user"
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: user.name,
    size: "sm",
    status: "online"
  }), /*#__PURE__*/React.createElement("div", {
    className: "side__user__txt"
  }, /*#__PURE__*/React.createElement("span", {
    className: "side__user__name"
  }, user.name), /*#__PURE__*/React.createElement("span", {
    className: "side__user__role"
  }, user.role))))), /*#__PURE__*/React.createElement("div", {
    className: "main"
  }, /*#__PURE__*/React.createElement("header", {
    className: "top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "top__title"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "top__spacer"
  }), /*#__PURE__*/React.createElement("div", {
    className: "top__search"
  }, /*#__PURE__*/React.createElement(Icon.search, {
    size: 16
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Search contacts, deals\u2026"
  })), /*#__PURE__*/React.createElement("div", {
    className: "top__actions"
  }, /*#__PURE__*/React.createElement(IconButton, {
    "aria-label": "Notifications"
  }, /*#__PURE__*/React.createElement(Icon.bell, {
    size: 18
  })), actions)), /*#__PURE__*/React.createElement("div", {
    className: "content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "content__inner"
  }, children))));
}

// Brand mark as an icon-compatible component
Icon.pulse = ({
  size = 26
}) => /*#__PURE__*/React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "var(--brand)",
  strokeWidth: "2.4",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "M2 12h4l2.5-7 4 15 3-11 2 3H22"
}));
window.AppShell = AppShell;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Contacts.jsx
try { (() => {
const {
  Card,
  Tabs,
  Input,
  Button,
  Checkbox,
  Badge,
  Tag,
  Avatar,
  IconButton
} = window.PulseCRMDSPBV_9fef4b;
const CONTACTS_CSS = `
.ct { display: flex; flex-direction: column; gap: 16px; }
.ct__toolbar { display: flex; align-items: center; gap: 10px; }
.ct__toolbar .grow { flex: 1; }
.ct__search { width: 280px; }
.ctable { width: 100%; border-collapse: collapse; font-size: 13px; }
.ctable thead th { text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); padding: 10px 14px; border-bottom: 1px solid var(--border-default); background: var(--surface-page); }
.ctable tbody td { padding: 11px 14px; border-bottom: 1px solid var(--border-subtle); vertical-align: middle; color: var(--text-secondary); }
.ctable tbody tr:last-child td { border-bottom: none; }
.ctable tbody tr:hover { background: var(--surface-hover); }
.ctable th.chk, .ctable td.chk { width: 40px; padding-right: 0; }
.ct__person { display: flex; align-items: center; gap: 10px; }
.ct__person__txt { display: flex; flex-direction: column; }
.ct__person__name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.ct__person__title { font-size: 12px; color: var(--text-muted); }
.ct__company { display: flex; align-items: center; gap: 8px; font-weight: 500; color: var(--text-primary); }
.ct__tags { display: flex; gap: 5px; flex-wrap: wrap; }
.ct__owner { display: flex; align-items: center; gap: 7px; color: var(--text-primary); }
.ct__last { font-variant-numeric: tabular-nums; color: var(--text-muted); }
.ct__rowact { opacity: 0; transition: opacity var(--duration-fast); }
.ctable tbody tr:hover .ct__rowact { opacity: 1; }
`;
if (!document.getElementById('pls-contacts-css')) {
  const el = document.createElement('style');
  el.id = 'pls-contacts-css';
  el.textContent = CONTACTS_CSS;
  document.head.appendChild(el);
}
const STATUS = {
  lead: {
    tone: 'neutral',
    label: 'Lead'
  },
  qualified: {
    tone: 'brand',
    label: 'Qualified'
  },
  proposal: {
    tone: 'info',
    label: 'Proposal'
  },
  negotiation: {
    tone: 'warning',
    label: 'Negotiation'
  },
  won: {
    tone: 'success',
    label: 'Won'
  },
  lost: {
    tone: 'danger',
    label: 'Lost'
  }
};
const TAG_COLOR = {
  Enterprise: '#7c3aed',
  Champion: '#10b981',
  Inbound: '#0ea5e9',
  Renewal: '#d97706',
  Warm: '#dc2626',
  Trial: '#0891b2',
  SMB: '#64748b'
};
function Contacts({
  onOpenNew
}) {
  const D = window.PulseData;
  const Icon = window.PulseIcon;
  const [tab, setTab] = React.useState('all');
  const [sel, setSel] = React.useState({});
  const rows = D.contacts;
  const selCount = Object.values(sel).filter(Boolean).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "ct"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ct__toolbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ct__search"
  }, /*#__PURE__*/React.createElement(Input, {
    size: "sm",
    prefix: /*#__PURE__*/React.createElement(Icon.search, {
      size: 16
    }),
    placeholder: "Search contacts\u2026"
  })), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    iconLeft: /*#__PURE__*/React.createElement(Icon.filter, {
      size: 15
    })
  }, "Filters"), /*#__PURE__*/React.createElement("div", {
    className: "grow"
  }), selCount > 0 && /*#__PURE__*/React.createElement(Badge, {
    tone: "brand"
  }, selCount, " selected"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "primary",
    iconLeft: /*#__PURE__*/React.createElement(Icon.plus, {
      size: 16
    }),
    onClick: onOpenNew
  }, "New contact")), /*#__PURE__*/React.createElement(Card, {
    flush: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 14px 0'
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    tabs: [{
      value: 'all',
      label: 'All',
      count: 1284
    }, {
      value: 'mine',
      label: 'My contacts',
      count: 214
    }, {
      value: 'recent',
      label: 'Recently added'
    }],
    value: tab,
    onChange: setTab
  })), /*#__PURE__*/React.createElement("table", {
    className: "ctable"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "chk"
  }, /*#__PURE__*/React.createElement(Checkbox, {
    "aria-label": "Select all"
  })), /*#__PURE__*/React.createElement("th", null, "Name"), /*#__PURE__*/React.createElement("th", null, "Company"), /*#__PURE__*/React.createElement("th", null, "Status"), /*#__PURE__*/React.createElement("th", null, "Tags"), /*#__PURE__*/React.createElement("th", null, "Owner"), /*#__PURE__*/React.createElement("th", null, "Last activity"), /*#__PURE__*/React.createElement("th", null))), /*#__PURE__*/React.createElement("tbody", null, rows.map((c, i) => {
    const st = STATUS[c.status];
    return /*#__PURE__*/React.createElement("tr", {
      key: i
    }, /*#__PURE__*/React.createElement("td", {
      className: "chk"
    }, /*#__PURE__*/React.createElement(Checkbox, {
      "aria-label": `Select ${c.name}`,
      checked: !!sel[i],
      onChange: e => setSel(s => ({
        ...s,
        [i]: e.target.checked
      }))
    })), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
      className: "ct__person"
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: c.name,
      size: "sm"
    }), /*#__PURE__*/React.createElement("div", {
      className: "ct__person__txt"
    }, /*#__PURE__*/React.createElement("span", {
      className: "ct__person__name"
    }, c.name), /*#__PURE__*/React.createElement("span", {
      className: "ct__person__title"
    }, c.title)))), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
      className: "ct__company"
    }, /*#__PURE__*/React.createElement(Icon.building, {
      size: 15,
      style: {
        color: 'var(--text-muted)'
      }
    }), c.company)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Badge, {
      tone: st.tone,
      dot: true
    }, st.label)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
      className: "ct__tags"
    }, c.tags.map(t => /*#__PURE__*/React.createElement(Tag, {
      key: t,
      color: TAG_COLOR[t] || '#64748b'
    }, t)))), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
      className: "ct__owner"
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: c.owner,
      size: "xs"
    }), c.owner)), /*#__PURE__*/React.createElement("td", {
      className: "ct__last"
    }, c.last), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
      className: "ct__rowact"
    }, /*#__PURE__*/React.createElement(IconButton, {
      size: "sm",
      "aria-label": "More actions"
    }, /*#__PURE__*/React.createElement(Icon.more, {
      size: 16
    })))));
  })))));
}
window.Contacts = Contacts;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Contacts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Dashboard.jsx
try { (() => {
const {
  StatCard,
  Card,
  ProgressBar,
  Avatar,
  Badge,
  Button
} = window.PulseCRMDSPBV_9fef4b;
const DASH_CSS = `
.dash { display: flex; flex-direction: column; gap: 20px; }
.dash__stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.dash__cols { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; align-items: start; }
.stagebar { display: flex; flex-direction: column; gap: 16px; }
.stagebar__row { display: flex; flex-direction: column; gap: 7px; }
.stagebar__head { display: flex; align-items: baseline; justify-content: space-between; }
.stagebar__label { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--text-primary); }
.stagebar__dot { width: 9px; height: 9px; border-radius: 3px; }
.stagebar__count { font-size: 12px; color: var(--text-muted); font-weight: 500; }
.stagebar__val { font-family: var(--font-mono); font-size: 13px; font-weight: 500; color: var(--text-primary); }
.stagebar__track { height: 10px; border-radius: var(--radius-full); background: var(--slate-100); overflow: hidden; }
.stagebar__fill { height: 100%; border-radius: inherit; }
.tasks { display: flex; flex-direction: column; }
.task { display: flex; align-items: center; gap: 11px; padding: 11px 0; border-bottom: 1px solid var(--border-subtle); }
.task:last-child { border-bottom: none; }
.task__check { flex: none; width: 18px; height: 18px; border-radius: var(--radius-sm); border: 1.5px solid var(--border-strong); display: flex; align-items: center; justify-content: center; color: #fff; }
.task__check--done { background: var(--success-solid); border-color: var(--success-solid); }
.task__text { flex: 1; font-size: 13px; color: var(--text-primary); }
.task__text--done { color: var(--text-muted); text-decoration: line-through; }
.activity { display: flex; flex-direction: column; }
.act { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border-subtle); }
.act:last-child { border-bottom: none; }
.act__icon { flex: none; width: 32px; height: 32px; border-radius: var(--radius-md); background: var(--surface-sunken); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; }
.act__text { flex: 1; font-size: 13px; color: var(--text-secondary); line-height: 1.4; }
.act__text b { color: var(--text-primary); font-weight: 600; }
.act__when { font-size: 12px; color: var(--text-muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
`;
if (!document.getElementById('pls-dash-css')) {
  const el = document.createElement('style');
  el.id = 'pls-dash-css';
  el.textContent = DASH_CSS;
  document.head.appendChild(el);
}
function Dashboard() {
  const D = window.PulseData;
  const Icon = window.PulseIcon;
  const maxStage = Math.max(...D.stages.map(s => s.value));
  const fmt = n => '$' + Math.round(n / 1000) + 'K';
  return /*#__PURE__*/React.createElement("div", {
    className: "dash"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dash__stats"
  }, D.stats.map(s => /*#__PURE__*/React.createElement(StatCard, {
    key: s.label,
    label: s.label,
    value: s.value,
    delta: s.delta,
    note: s.note,
    icon: /*#__PURE__*/React.createElement(Icon.trending, {
      size: 18
    })
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dash__cols"
  }, /*#__PURE__*/React.createElement(Card, {
    title: "Pipeline by stage",
    subtitle: "$1.28M across 104 open deals",
    actions: /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "ghost",
      iconRight: /*#__PURE__*/React.createElement(Icon.chevronRight, {
        size: 15
      })
    }, "View pipeline")
  }, /*#__PURE__*/React.createElement("div", {
    className: "stagebar"
  }, D.stages.map(s => /*#__PURE__*/React.createElement("div", {
    className: "stagebar__row",
    key: s.key
  }, /*#__PURE__*/React.createElement("div", {
    className: "stagebar__head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "stagebar__label"
  }, /*#__PURE__*/React.createElement("span", {
    className: "stagebar__dot",
    style: {
      background: s.color
    }
  }), s.label, /*#__PURE__*/React.createElement("span", {
    className: "stagebar__count"
  }, "\xB7 ", s.count, " deals")), /*#__PURE__*/React.createElement("span", {
    className: "stagebar__val"
  }, fmt(s.value))), /*#__PURE__*/React.createElement("div", {
    className: "stagebar__track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stagebar__fill",
    style: {
      width: s.value / maxStage * 100 + '%',
      background: s.color
    }
  })))))), /*#__PURE__*/React.createElement(Card, {
    title: "My tasks",
    subtitle: "5 open",
    actions: /*#__PURE__*/React.createElement(Badge, {
      tone: "warning"
    }, "2 due today")
  }, /*#__PURE__*/React.createElement("div", {
    className: "tasks"
  }, D.tasks.map((t, i) => /*#__PURE__*/React.createElement("div", {
    className: "task",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: `task__check ${t.done ? 'task__check--done' : ''}`
  }, t.done && /*#__PURE__*/React.createElement(Icon.check, {
    size: 12
  })), /*#__PURE__*/React.createElement("span", {
    className: `task__text ${t.done ? 'task__text--done' : ''}`
  }, t.text), /*#__PURE__*/React.createElement(Badge, {
    tone: t.tone
  }, t.due)))))), /*#__PURE__*/React.createElement(Card, {
    title: "Recent activity",
    subtitle: "Your team, last few hours",
    actions: /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "ghost"
    }, "View all")
  }, /*#__PURE__*/React.createElement("div", {
    className: "activity"
  }, D.activity.map((a, i) => {
    const I = Icon[a.icon];
    return /*#__PURE__*/React.createElement("div", {
      className: "act",
      key: i
    }, /*#__PURE__*/React.createElement("span", {
      className: "act__icon"
    }, /*#__PURE__*/React.createElement(I, {
      size: 16
    })), /*#__PURE__*/React.createElement("span", {
      className: "act__text"
    }, /*#__PURE__*/React.createElement("b", null, a.who), " ", a.text), /*#__PURE__*/React.createElement("span", {
      className: "act__when"
    }, a.when));
  }))));
}
window.Dashboard = Dashboard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Dashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Pipeline.jsx
try { (() => {
const {
  Badge,
  Avatar,
  Button,
  IconButton
} = window.PulseCRMDSPBV_9fef4b;
const PIPE_CSS = `
.pipe { display: flex; flex-direction: column; gap: 16px; height: 100%; }
.pipe__toolbar { display: flex; align-items: center; gap: 10px; }
.pipe__toolbar .grow { flex: 1; }
.board { display: grid; grid-template-columns: repeat(5, minmax(220px, 1fr)); gap: 14px; align-items: start; }
.col { display: flex; flex-direction: column; gap: 10px; background: var(--surface-sunken); border-radius: var(--radius-lg); padding: 10px; }
.col__head { display: flex; align-items: center; gap: 8px; padding: 2px 4px; }
.col__dot { width: 9px; height: 9px; border-radius: 3px; }
.col__name { font-size: 13px; font-weight: 700; color: var(--text-primary); }
.col__count { font-size: 11px; font-weight: 600; color: var(--text-muted); background: var(--surface-card); padding: 1px 7px; border-radius: var(--radius-full); }
.col__sum { margin-left: auto; font-family: var(--font-mono); font-size: 12px; font-weight: 500; color: var(--text-secondary); }
.dcard { background: var(--surface-card); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 12px; box-shadow: var(--shadow-xs); cursor: grab; display: flex; flex-direction: column; gap: 9px; transition: box-shadow var(--duration-fast), border-color var(--duration-fast); }
.dcard:hover { box-shadow: var(--shadow-md); border-color: var(--border-strong); }
.dcard__top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.dcard__company { font-size: 13px; font-weight: 700; color: var(--text-primary); }
.dcard__name { font-size: 12px; color: var(--text-muted); margin-top: 1px; }
.dcard__mid { display: flex; align-items: baseline; gap: 8px; }
.dcard__value { font-family: var(--font-mono); font-size: 16px; font-weight: 600; color: var(--text-primary); }
.dcard__foot { display: flex; align-items: center; justify-content: space-between; }
.dcard__days { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-muted); }
.col__add { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border: 1px dashed var(--border-strong); border-radius: var(--radius-md); color: var(--text-muted); font-size: 12px; font-weight: 600; cursor: pointer; background: none; }
.col__add:hover { color: var(--text-primary); border-color: var(--slate-400); background: var(--surface-card); }
`;
if (!document.getElementById('pls-pipe-css')) {
  const el = document.createElement('style');
  el.id = 'pls-pipe-css';
  el.textContent = PIPE_CSS;
  document.head.appendChild(el);
}
function DealCard({
  deal
}) {
  const Icon = window.PulseIcon;
  return /*#__PURE__*/React.createElement("div", {
    className: "dcard"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dcard__top"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "dcard__company"
  }, deal.company), /*#__PURE__*/React.createElement("div", {
    className: "dcard__name"
  }, deal.name)), deal.hot && /*#__PURE__*/React.createElement(Badge, {
    tone: "danger",
    variant: "soft"
  }, "Hot")), /*#__PURE__*/React.createElement("div", {
    className: "dcard__mid"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dcard__value"
  }, deal.value)), /*#__PURE__*/React.createElement("div", {
    className: "dcard__foot"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dcard__days"
  }, /*#__PURE__*/React.createElement(Icon.clock, {
    size: 13
  }), deal.days === 0 ? 'Closed' : `${deal.days}d in stage`), /*#__PURE__*/React.createElement(Avatar, {
    name: deal.owner,
    size: "xs"
  })));
}
function Pipeline({
  onOpenNew
}) {
  const D = window.PulseData;
  const Icon = window.PulseIcon;
  const fmt = n => '$' + Math.round(n / 1000) + 'K';
  return /*#__PURE__*/React.createElement("div", {
    className: "pipe"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pipe__toolbar"
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    iconLeft: /*#__PURE__*/React.createElement(Icon.filter, {
      size: 15
    })
  }, "All owners"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    iconRight: /*#__PURE__*/React.createElement(Icon.chevronDown, {
      size: 15
    })
  }, "This quarter"), /*#__PURE__*/React.createElement("div", {
    className: "grow"
  }), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "primary",
    iconLeft: /*#__PURE__*/React.createElement(Icon.plus, {
      size: 16
    }),
    onClick: onOpenNew
  }, "New deal")), /*#__PURE__*/React.createElement("div", {
    className: "board"
  }, D.stages.map(s => {
    const deals = D.deals[s.key] || [];
    return /*#__PURE__*/React.createElement("div", {
      className: "col",
      key: s.key
    }, /*#__PURE__*/React.createElement("div", {
      className: "col__head"
    }, /*#__PURE__*/React.createElement("span", {
      className: "col__dot",
      style: {
        background: s.color
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "col__name"
    }, s.label), /*#__PURE__*/React.createElement("span", {
      className: "col__count"
    }, deals.length), /*#__PURE__*/React.createElement("span", {
      className: "col__sum"
    }, fmt(deals.reduce((a, d) => a + parseFloat(d.value.replace(/[^0-9.]/g, '')) * 1000, 0)))), deals.map((d, i) => /*#__PURE__*/React.createElement(DealCard, {
      key: i,
      deal: d
    })), /*#__PURE__*/React.createElement("button", {
      className: "col__add",
      onClick: onOpenNew
    }, /*#__PURE__*/React.createElement(Icon.plus, {
      size: 14
    }), "Add deal"));
  })));
}
window.Pipeline = Pipeline;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Pipeline.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/data.jsx
try { (() => {
/* Pulse CRM — sample data for the web-app UI kit. */

window.PulseData = {
  user: {
    name: 'Ana Márquez',
    role: 'Account Executive',
    email: 'ana@pulsecrm.io'
  },
  stats: [{
    label: 'Pipeline value',
    value: '$1.28M',
    delta: 12,
    note: 'vs last month'
  }, {
    label: 'Deals won (MTD)',
    value: '$284K',
    delta: 8,
    note: '18 deals'
  }, {
    label: 'Win rate',
    value: '42.6%',
    delta: -3,
    note: 'vs last quarter'
  }, {
    label: 'Avg. deal size',
    value: '$15.9K',
    delta: 5,
    note: 'vs last month'
  }],
  stages: [{
    key: 'lead',
    label: 'Lead',
    value: 420000,
    count: 38,
    color: 'var(--slate-400)'
  }, {
    key: 'qualified',
    label: 'Qualified',
    value: 356000,
    count: 24,
    color: 'var(--sky-500)'
  }, {
    key: 'proposal',
    label: 'Proposal',
    value: 288000,
    count: 15,
    color: 'var(--indigo-500)'
  }, {
    key: 'negotiation',
    label: 'Negotiation',
    value: 164000,
    count: 9,
    color: 'var(--violet-500)'
  }, {
    key: 'won',
    label: 'Won',
    value: 284000,
    count: 18,
    color: 'var(--green-500)'
  }],
  activity: [{
    who: 'Jon Tran',
    icon: 'mail',
    text: 'emailed Priya Shah at Northwind',
    when: '12m ago'
  }, {
    who: 'Ana Márquez',
    icon: 'check',
    text: 'moved Acme renewal to Proposal',
    when: '48m ago'
  }, {
    who: 'Lena Ortiz',
    icon: 'phone',
    text: 'logged a call with Globex',
    when: '2h ago'
  }, {
    who: 'Marcus Webb',
    icon: 'note',
    text: 'added a note to Initech deal',
    when: '3h ago'
  }, {
    who: 'Ana Márquez',
    icon: 'calendar',
    text: 'booked a demo with Umbrella Co',
    when: '5h ago'
  }],
  tasks: [{
    text: 'Follow up with Northwind on pricing',
    due: 'Today',
    tone: 'warning',
    done: false
  }, {
    text: 'Send proposal to Acme Inc.',
    due: 'Today',
    tone: 'warning',
    done: false
  }, {
    text: 'Prep demo deck for Umbrella Co',
    due: 'Tomorrow',
    tone: 'neutral',
    done: false
  }, {
    text: 'Call back Globex procurement',
    due: 'Overdue',
    tone: 'danger',
    done: false
  }, {
    text: 'Log notes from Initech kickoff',
    due: 'Done',
    tone: 'success',
    done: true
  }],
  contacts: [{
    name: 'Priya Shah',
    title: 'VP Engineering',
    company: 'Northwind',
    status: 'qualified',
    tags: ['Enterprise', 'Champion'],
    owner: 'Jon Tran',
    last: '2h ago',
    email: 'priya@northwind.com'
  }, {
    name: 'David Kim',
    title: 'Head of Ops',
    company: 'Globex',
    status: 'lead',
    tags: ['Inbound'],
    owner: 'Lena Ortiz',
    last: '1d ago',
    email: 'dkim@globex.com'
  }, {
    name: 'Sara Boone',
    title: 'CFO',
    company: 'Acme Inc.',
    status: 'proposal',
    tags: ['Enterprise'],
    owner: 'Ana Márquez',
    last: '3h ago',
    email: 'sara@acme.com'
  }, {
    name: 'Tom Reyes',
    title: 'IT Director',
    company: 'Initech',
    status: 'negotiation',
    tags: ['Renewal'],
    owner: 'Marcus Webb',
    last: '5h ago',
    email: 'tom@initech.com'
  }, {
    name: 'Mia Chen',
    title: 'Procurement',
    company: 'Umbrella Co',
    status: 'qualified',
    tags: ['Warm'],
    owner: 'Ana Márquez',
    last: '1h ago',
    email: 'mia@umbrella.co'
  }, {
    name: 'Owen Park',
    title: 'CTO',
    company: 'Soylent',
    status: 'lead',
    tags: ['Inbound', 'Trial'],
    owner: 'Jon Tran',
    last: '2d ago',
    email: 'owen@soylent.com'
  }, {
    name: 'Grace Liu',
    title: 'COO',
    company: 'Hooli',
    status: 'won',
    tags: ['Enterprise', 'Champion'],
    owner: 'Lena Ortiz',
    last: '4h ago',
    email: 'grace@hooli.com'
  }, {
    name: 'Ben Fox',
    title: 'Founder',
    company: 'Vandelay',
    status: 'lost',
    tags: ['SMB'],
    owner: 'Marcus Webb',
    last: '1w ago',
    email: 'ben@vandelay.com'
  }],
  deals: {
    lead: [{
      company: 'Globex',
      name: 'Platform trial',
      value: '$18K',
      owner: 'Lena Ortiz',
      days: 3
    }, {
      company: 'Soylent',
      name: 'Team plan',
      value: '$9K',
      owner: 'Jon Tran',
      days: 1
    }, {
      company: 'Wayne Ent.',
      name: 'Expansion',
      value: '$42K',
      owner: 'Ana Márquez',
      days: 6
    }],
    qualified: [{
      company: 'Northwind',
      name: 'Enterprise seats',
      value: '$64K',
      owner: 'Jon Tran',
      days: 2
    }, {
      company: 'Umbrella Co',
      name: 'Annual contract',
      value: '$31K',
      owner: 'Ana Márquez',
      days: 4
    }],
    proposal: [{
      company: 'Acme Inc.',
      name: 'Renewal + upsell',
      value: '$84K',
      owner: 'Ana Márquez',
      days: 5,
      hot: true
    }, {
      company: 'Stark Ind.',
      name: 'New logo',
      value: '$52K',
      owner: 'Lena Ortiz',
      days: 8
    }],
    negotiation: [{
      company: 'Initech',
      name: 'Multi-year',
      value: '$120K',
      owner: 'Marcus Webb',
      days: 11,
      hot: true
    }],
    won: [{
      company: 'Hooli',
      name: 'Enterprise',
      value: '$96K',
      owner: 'Lena Ortiz',
      days: 0
    }, {
      company: 'Pied Piper',
      name: 'Growth plan',
      value: '$28K',
      owner: 'Jon Tran',
      days: 0
    }]
  }
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/icons.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Pulse CRM — icon set.
   Lucide-style line glyphs (2px stroke, 24 grid, currentColor).
   In production, use the `lucide` package / CDN; these are inlined
   so the click-through kit has zero runtime icon-injection. */

function Svg({
  size = 18,
  sw = 2,
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: sw,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, rest), children);
}
const Icon = {
  dashboard: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "7",
    height: "9",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "3",
    width: "7",
    height: "5",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "12",
    width: "7",
    height: "9",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "16",
    width: "7",
    height: "5",
    rx: "1"
  })),
  users: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("path", {
    d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "7",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
  })),
  pipeline: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "5",
    height: "18",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "10",
    y: "3",
    width: "5",
    height: "12",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "17",
    y: "3",
    width: "4",
    height: "8",
    rx: "1"
  })),
  inbox: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("path", {
    d: "M22 12h-6l-2 3h-4l-2-3H2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
  })),
  reports: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("path", {
    d: "M3 3v18h18"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "7",
    y: "12",
    width: "3",
    height: "5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "12",
    y: "8",
    width: "3",
    height: "9"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "17",
    y: "5",
    width: "3",
    height: "12"
  })),
  search: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.3-4.3"
  })),
  bell: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("path", {
    d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10.3 21a1.94 1.94 0 0 0 3.4 0"
  })),
  plus: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("path", {
    d: "M12 5v14M5 12h14"
  })),
  more: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "12",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "5",
    cy: "12",
    r: "1"
  })),
  chevronDown: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  })),
  chevronRight: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("path", {
    d: "m9 18 6-6-6-6"
  })),
  filter: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("path", {
    d: "M22 3H2l8 9.46V19l4 2v-8.54z"
  })),
  phone: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("path", {
    d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"
  })),
  mail: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "4",
    width: "20",
    height: "16",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m22 7-10 6L2 7"
  })),
  calendar: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "18",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 2v4M8 2v4M3 10h18"
  })),
  check: p => /*#__PURE__*/React.createElement(Svg, _extends({}, p, {
    sw: p.sw ?? 2.4
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  })),
  trending: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("path", {
    d: "M3 17l6-6 4 4 8-8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 7h7v7"
  })),
  building: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "2",
    width: "16",
    height: "20",
    rx: "1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"
  })),
  settings: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
  })),
  arrowUpRight: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("path", {
    d: "M7 17 17 7M7 7h10v10"
  })),
  dollar: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("path", {
    d: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
  })),
  clock: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 7v5l3 2"
  })),
  note: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("path", {
    d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 2v6h6M9 13h6M9 17h4"
  })),
  logout: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("path", {
    d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
  })),
  star: p => /*#__PURE__*/React.createElement(Svg, p, /*#__PURE__*/React.createElement("path", {
    d: "m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01z"
  }))
};
window.PulseIcon = Icon;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/icons.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
