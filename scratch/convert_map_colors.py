import os

def replace_in_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    orig_length = len(content)
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}. Original length: {orig_length}, New length: {len(content)}")

# Replacements for LiveMap.tsx
live_map_replacements = [
    # Leaflet colors
    ('#3b82f6', '#ef4444'), # selected flight marker color
    ('rgba(59,130,246', 'rgba(239,68,68'),
    ('color: "#a855f7"', 'color: "#ea580c"'),
    ('fillColor: "#c084fc"', 'fillColor: "#f97316"'),
    ('color: #c084fc', 'color: #ea580c'),
    ('rgba(168,85,247', 'rgba(234,88,12'),
    ('text-purple-400', 'text-orange-500'),
    ('border-purple-950/80', 'border-orange-950/80'),
    
    # Indigo panels (terrain detail card)
    ('border-indigo-950/90', 'border-red-950/90'),
    ('border-indigo-950/60', 'border-red-950/60'),
    ('border-indigo-950/50', 'border-red-950/50'),
    ('border-indigo-950/40', 'border-red-950/40'),
    ('border-indigo-950/30', 'border-red-950/30'),
    ('border-indigo-900/30', 'border-red-900/30'),
    ('bg-indigo-950/30', 'bg-red-950/30'),
    ('bg-indigo-950/10', 'bg-red-950/10'),
    ('text-indigo-400', 'text-red-400'),
    ('bg-slate-950/95', 'bg-[#0f0202]/95'),
    
    # Blue classes to Red
    ('border-blue-950', 'border-red-950'),
    ('border-blue-900', 'border-red-900'),
    ('border-blue-800', 'border-red-800'),
    ('bg-blue-950', 'bg-red-950'),
    ('bg-blue-500', 'bg-red-500'),
    ('bg-blue-400', 'bg-red-400'),
    ('text-blue-400', 'text-red-400'),
    ('text-blue-500', 'text-red-500'),
    ('text-blue-300', 'text-red-300'),
    ('hover:text-blue-400', 'hover:text-red-400'),
    ('hover:text-blue-300', 'hover:text-red-300'),
    ('hover:bg-blue-950', 'hover:bg-red-950'),
    
    # Hex backgrounds (blue-tinted dark colors) to blood-tinted dark colors
    ('bg-[#060b18]', 'bg-[#120202]'),
    ('bg-[#050b18]', 'bg-[#0f0202]'),
    ('bg-[#04091a]', 'bg-[#0d0202]'),
    ('bg-[#040817]', 'bg-[#0d0202]'),
    ('bg-[#02050f]', 'bg-[#050101]'),
    ('bg-[#030712]', 'bg-[#0c0303]'),
    ('bg-[#02050d]', 'bg-[#050101]'),
    ('bg-[#02050d]/95', 'bg-[#050101]/95'),
    ('border-blue-950/60 bg-[#030712]', 'border-red-950/60 bg-[#0c0303]'),
    
    # Teal maritime connections to Amber/Gold
    ('text-teal-400', 'text-amber-400'),
    ('text-teal-300', 'text-amber-300'),
    ('bg-teal-950/15', 'bg-amber-950/15'),
    ('border-teal-900/40', 'border-amber-900/40'),
    ('color = isRescue ? "#10b981" : "#14b8a6"', 'color = isRescue ? "#f59e0b" : "#d97706"'),
    ('rgba(16,185,129', 'rgba(245,158,11'),
    ('rgba(20,184,166', 'rgba(217,119,6'),
    ('color="#10b981"', 'color="#f59e0b"'), # polyline to ship
]

# Replacements for public-alarms/page.tsx
public_alarms_replacements = [
    # Navbar updates
    ('bg-gradient-to-tr from-blue-600 to-cyan-400', 'bg-gradient-to-tr from-red-600 to-orange-500'),
    ('group-hover:from-blue-400 group-hover:to-cyan-200', 'group-hover:from-red-400 group-hover:to-orange-300'),
    ('hover:text-blue-400', 'hover:text-red-400'),
    ('text-blue-400 font-semibold tracking-wide border-b border-blue-500/30', 'text-red-400 font-semibold tracking-wide border-b border-red-500/30'),
    ('bg-blue-950/40 border border-blue-900/50 text-blue-400', 'bg-red-950/40 border border-red-900/50 text-red-400'),
    ('bg-blue-400 animate-ping', 'bg-red-400 animate-ping'),
    ('border-blue-950/40 bg-[#030712]/55', 'border-red-950/40 bg-[#050101]/55'),
    ('selection:bg-blue-500/20 selection:text-blue-300', 'selection:bg-red-500/20 selection:text-red-300'),
    
    # Form elements
    ('border-blue-950/60 bg-[#050b18]/25', 'border-red-950/60 bg-[#120202]/25'),
    ('border-blue-950/80 rounded-lg p-3 text-sm text-slate-200 font-mono focus:outline-none focus:border-blue-500/50',
     'border-red-950/80 rounded-lg p-3 text-sm text-slate-200 font-mono focus:outline-none focus:border-red-500/50'),
    ('border-blue-500 bg-blue-950/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]',
     'border-red-500 bg-red-950/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]'),
    ('border-blue-900/80 bg-[#050b18]/45', 'border-red-900/80 bg-[#120202]/45'),
    ('border-blue-950/80 bg-slate-950/15 hover:border-blue-800/60 hover:bg-[#050b18]/10',
     'border-red-950/80 bg-slate-950/15 hover:border-red-800/60 hover:bg-[#120202]/10'),
    ('border-blue-950/65 shadow-md', 'border-red-950/65 shadow-md'),
    ('bg-blue-950/30 border border-blue-900/40 flex items-center justify-center text-blue-400',
     'bg-red-950/30 border border-red-900/40 flex items-center justify-center text-red-400'),
    ('focus:border-blue-500/50', 'focus:border-red-500/50'),
    ('border-blue-950/40', 'border-red-950/40'),
    ('text-blue-500 focus:ring-blue-500', 'text-red-500 focus:ring-red-500'),
    ('bg-slate-900/30 border-blue-950/40 text-slate-500', 'bg-slate-900/30 border-red-950/40 text-slate-500'),
    ('bg-blue-950/40 border-blue-800/80 text-blue-300 cursor-wait animate-pulse',
     'bg-red-950/40 border-red-800/80 text-red-300 cursor-wait animate-pulse'),
    ('bg-blue-600 border-blue-500 text-white hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/10',
     'bg-red-700 border-red-600 text-white hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/10'),
    
    # Verification console
    ('border border-blue-950/60 bg-[#050b18]/10', 'border border-red-950/60 bg-[#120202]/10'),
    ('border border-blue-950/60 bg-[#02050f]', 'border border-red-950/60 bg-[#050101]'),
    ('text-blue-400', 'text-red-400'),
    ('animate-spin text-blue-400', 'animate-spin text-red-400'),
    ('text-blue-400 animate-pulse', 'text-red-400 animate-pulse'),
    ('text-blue-400 text-[10px]', 'text-red-400 text-[10px]'),
    ('border border-blue-950/60 bg-[#050b18]/15', 'border border-red-950/60 bg-[#120202]/15'),
    ('border border-blue-950/20', 'border-red-950/20'),
    ('text-blue-300', 'text-red-300'),
]

# Replacements for web-alerts/page.tsx
web_alerts_replacements = [
    # Navbar updates
    ('bg-gradient-to-tr from-blue-600 to-cyan-400', 'bg-gradient-to-tr from-red-600 to-orange-500'),
    ('group-hover:from-blue-400 group-hover:to-cyan-200', 'group-hover:from-red-400 group-hover:to-orange-300'),
    ('hover:text-blue-400', 'hover:text-red-400'),
    ('text-blue-400 font-semibold tracking-wide border-b border-blue-500/30', 'text-red-400 font-semibold tracking-wide border-b border-red-500/30'),
    ('bg-blue-950/40 border border-blue-900/50', 'bg-red-950/40 border border-red-900/50'),
    ('bg-blue-400 animate-ping', 'bg-red-400 animate-ping'),
    ('border-blue-950/40 bg-[#030712]/55', 'border-red-950/40 bg-[#050101]/55'),
    ('selection:bg-blue-500/20 selection:text-blue-300', 'selection:bg-red-500/20 selection:text-red-300'),
    ('text-blue-400', 'text-red-400'),

    # Radar screen (rotating sweep canvas container)
    ('border-blue-950/60 bg-[#050b18]/25', 'border-red-950/60 bg-[#120202]/25'),
    ('border-blue-950/80 flex items-center justify-center bg-[#02050f]/80',
     'border-red-950/80 flex items-center justify-center bg-[#050101]/80'),
    ('border-blue-950/40', 'border-red-950/40'),
    ('border-blue-950/20', 'border-red-950/20'),
    ('border-blue-950/10', 'border-red-950/10'),
    ('border-blue-950/40', 'border-red-950/40'),
    ('border-r border-blue-500/30', 'border-r border-red-500/30'),
    ('bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]', 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]'),
    
    # Active Feed alerts list
    ('border-blue-950/60 bg-[#050b18]/25', 'border-red-950/60 bg-[#120202]/25'),
    ('border-blue-950/30', 'border-red-950/30'),
    ('border-blue-950/60 bg-[#050b18]/10', 'border-red-950/60 bg-[#120202]/10'),
    ('border-blue-950/60 bg-[#050b18]/25', 'border-red-950/60 bg-[#120202]/25'),
    ('hover:border-blue-800/40', 'hover:border-red-800/40'),
    ('hover:bg-[#070e24]/40', 'hover:bg-[#1a0505]/40'),
    ('border-blue-950/60 bg-slate-950/60', 'border-red-950/60 bg-slate-950/60'),
    ('border-blue-950/60 p-2 rounded', 'border-red-950/60 p-2 rounded'),
    ('bg-blue-950/30 border border-blue-900/40 text-blue-400 hover:bg-blue-950/60 hover:text-blue-300',
     'bg-red-950/30 border border-red-900/40 text-red-400 hover:bg-red-950/60 hover:text-red-300'),
]

# Run replacements
workspace_root = "/Users/tanujpathak/Desktop/WreckLink-main 2/WreckLinkHack/src"

replace_in_file(os.path.join(workspace_root, "components", "LiveMap.tsx"), live_map_replacements)
replace_in_file(os.path.join(workspace_root, "app", "public-alarms", "page.tsx"), public_alarms_replacements)
replace_in_file(os.path.join(workspace_root, "app", "web-alerts", "page.tsx"), web_alerts_replacements)

print("Replacement scripts completed.")
