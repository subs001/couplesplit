import React from 'react';
import { THEMES, AppThemeId } from '../theme';
import { X, Check, Moon, Sun, Palette, Sparkles } from 'lucide-react';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: AppThemeId;
  onSelectTheme: (theme: AppThemeId) => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                App Color Themes &amp; Dark Mode
              </h2>
              <p className="text-xs text-slate-500">
                Saved permanently on your phone and computer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 overflow-y-auto space-y-5">
          <p className="text-xs text-slate-600 font-medium">
            Choose your preferred color style. The selected theme will automatically stay active even when the app is restarted or reloaded.
          </p>

          {/* Light Themes */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light Themes</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEMES.filter((t) => t.mode === 'light').map((theme) => {
                const isSelected = currentTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      onSelectTheme(theme.id);
                    }}
                    className={`relative p-3.5 rounded-2xl border text-left transition-all group flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'shadow-md'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                    }`}
                    style={{
                      backgroundColor: theme.swatch.card,
                      borderColor: isSelected ? theme.swatch.accent : theme.swatch.border,
                      boxShadow: isSelected
                        ? `0 0 0 2px ${theme.swatch.accent}40, 0 4px 12px rgba(0,0,0,0.06)`
                        : undefined,
                    }}
                  >
                    <div>
                      {/* Header with Title and Mode pill */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Sun className="w-3.5 h-3.5" style={{ color: theme.swatch.accent }} />
                          <span 
                            className="font-bold text-sm tracking-tight text-slate-900"
                          >
                            {theme.name}
                          </span>
                        </div>

                        {isSelected && (
                          <span 
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                            style={{ backgroundColor: theme.swatch.accent }}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      <p 
                        className="text-[11px] leading-snug line-clamp-2 mb-3 text-slate-500"
                      >
                        {theme.tagline}
                      </p>
                    </div>

                    {/* Visual Theme Palette Swatch preview */}
                    <div 
                      className="p-2.5 rounded-xl flex items-center justify-between"
                      style={{
                        backgroundColor: theme.swatch.bg,
                        border: `1px solid ${theme.swatch.border}`,
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs" 
                          style={{ backgroundColor: theme.swatch.card }}
                          title="Surface"
                        />
                        <span 
                          className="w-3.5 h-3.5 rounded-full shadow-xs" 
                          style={{ backgroundColor: theme.swatch.accent }}
                          title="Accent"
                        />
                        <span 
                          className="w-3.5 h-3.5 rounded-full" 
                          style={{ backgroundColor: theme.swatch.border }}
                          title="Border"
                        />
                      </div>

                      <span 
                        className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: theme.swatch.card,
                          color: theme.swatch.accent,
                          border: `1px solid ${theme.swatch.border}`
                        }}
                      >
                        Light
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dark Themes */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-indigo-500" />
              <span>Dark Themes</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEMES.filter((t) => t.mode === 'dark').map((theme) => {
                const isSelected = currentTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      onSelectTheme(theme.id);
                    }}
                    className={`relative p-3.5 rounded-2xl border text-left transition-all group flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'shadow-md'
                        : 'border-slate-800 hover:border-slate-700 hover:shadow-xs'
                    }`}
                    style={{
                      backgroundColor: theme.swatch.card,
                      borderColor: isSelected ? theme.swatch.accent : theme.swatch.border,
                      boxShadow: isSelected
                        ? `0 0 0 2px ${theme.swatch.accent}40, 0 4px 12px rgba(0,0,0,0.3)`
                        : undefined,
                    }}
                  >
                    <div>
                      {/* Header with Title and Mode pill */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Moon className="w-3.5 h-3.5 text-slate-400" />
                          <span 
                            className="font-bold text-sm tracking-tight text-white"
                          >
                            {theme.name}
                          </span>
                        </div>

                        {isSelected && (
                          <span 
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                            style={{ backgroundColor: theme.swatch.accent }}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      <p 
                        className="text-[11px] leading-snug line-clamp-2 mb-3 text-slate-400"
                      >
                        {theme.tagline}
                      </p>
                    </div>

                    {/* Visual Theme Palette Swatch preview */}
                    <div 
                      className="p-2.5 rounded-xl flex items-center justify-between"
                      style={{
                        backgroundColor: theme.swatch.bg,
                        border: `1px solid ${theme.swatch.border}`,
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="w-3.5 h-3.5 rounded-full border border-white/10 shadow-xs" 
                          style={{ backgroundColor: theme.swatch.card }}
                          title="Surface"
                        />
                        <span 
                          className="w-3.5 h-3.5 rounded-full shadow-xs" 
                          style={{ backgroundColor: theme.swatch.accent }}
                          title="Accent"
                        />
                        <span 
                          className="w-3.5 h-3.5 rounded-full" 
                          style={{ backgroundColor: theme.swatch.border }}
                          title="Border"
                        />
                      </div>

                      <span 
                        className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: theme.swatch.card,
                          color: theme.swatch.accent,
                          border: `1px solid ${theme.swatch.border}`
                        }}
                      >
                        Dark
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            Applied instantly &amp; retained forever
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
