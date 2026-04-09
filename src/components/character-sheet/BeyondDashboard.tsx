"use client";

import { useState, useEffect } from "react";
import StatHexagon from "./StatHexagon";
import CombatBox from "./CombatBox";
import SkillRow from "./SkillRow";
import RollContextMenu from "./RollContextMenu";
import { Plus, Import, Search, Shield, Zap, Footprints, Heart, Wand2, Sword, Info } from "lucide-react";
import ActionDashboard from "../ActionDashboard";

interface BeyondDashboardProps {
  player: any;
  actions: any[];
  playerName: string;
  onRoll: (label: string, mod: number, type: 'normal' | 'adv' | 'dis', isDamage?: boolean, formula?: string) => void;
  onAddCustomAction: (action: any) => void;
  onUpdateAction: (action: any) => void;
  onDeleteAction: (id: string) => void;
  onImportActions: (actions: any[]) => void;
  onUpdateHp: (current: number) => void;
}

export default function BeyondDashboard({
  player,
  actions,
  playerName,
  onRoll,
  onAddCustomAction,
  onUpdateAction,
  onDeleteAction,
  onImportActions,
  onUpdateHp
}: BeyondDashboardProps) {
  const [activeTab, setActiveTab] = useState<'actions' | 'spells' | 'features'>('actions');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, label: string, onSelect: (type: 'normal' | 'adv' | 'dis') => void } | null>(null);

  // Ability Modifiers Calculation
  const getMod = (score: number) => Math.floor((score - 10) / 2);

  // Listener for custom roll context menu event
  useEffect(() => {
    const handleOpenMenu = (e: any) => {
      setContextMenu({
        x: e.detail.x,
        y: e.detail.y,
        label: e.detail.label,
        onSelect: e.detail.onSelect
      });
    };
    window.addEventListener('open-roll-menu', handleOpenMenu);
    return () => window.removeEventListener('open-roll-menu', handleOpenMenu);
  }, []);

  if (!player) return null;

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between p-8 bg-[#151515]/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <img 
              src={player.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} 
              className="relative w-20 h-20 rounded-full border-2 border-white/10 object-cover bg-darker shadow-inner"
              alt="Avatar"
            />
            <div className="absolute -bottom-1 -right-1 bg-darker border border-white/10 px-2 py-0.5 rounded-full text-[10px] font-bold text-gray-400">
              LVL {player.class_level?.match(/\d+/)?.[0] || '??'}
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter mb-1">{player.name}</h1>
            <p className="text-sm font-bold text-cyan-400 uppercase tracking-widest opacity-80">{player.class_level || 'Adventurer'}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
            <CombatBox 
                label="Armor Class" 
                value={player.ac || 10} 
                subValue="Shield Ready" 
                accent="cyan" 
            />
            <CombatBox 
                label="Initiative" 
                value={player.initiative >= 0 ? `+${player.initiative}` : player.initiative} 
                onRoll={(type) => onRoll('Initiative', player.initiative || 0, type)}
                accent="gold" 
            />
            <CombatBox 
                label="Speed" 
                value={player.speed || '30 ft.'} 
                accent="cyan" 
            />
            <div className="relative group flex flex-col items-center justify-center p-4 bg-[#1a1a1a] border border-red-500/30 rounded-2xl shadow-xl min-w-[140px] h-24">
                <span className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-1 text-red-400">Hit Points</span>
                <div className="flex items-baseline gap-1">
                    <input 
                        type="number" 
                        value={player.hp_current} 
                        onChange={(e) => onUpdateHp(parseInt(e.target.value))}
                        className="bg-transparent text-3xl font-black tracking-tighter w-16 text-center outline-none focus:text-white transition-colors"
                    />
                    <span className="text-xl font-bold opacity-30">/ {player.hp_max}</span>
                </div>
                <div className="absolute bottom-0 left-0 h-1 bg-red-500/40 rounded-full transition-all duration-500" style={{ width: `${(player.hp_current / player.hp_max) * 100}%` }} />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stats & Saves */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-[#151515]/60 backdrop-blur-md border border-white/5 rounded-[2rem] p-6 shadow-xl">
             <div className="grid grid-cols-2 gap-x-2 gap-y-4 justify-items-center">
                <StatHexagon label="STR" score={player.ability_scores?.str || 10} modifier={getMod(player.ability_scores?.str || 10)} onRoll={onRoll} />
                <StatHexagon label="DEX" score={player.ability_scores?.dex || 10} modifier={getMod(player.ability_scores?.dex || 10)} onRoll={onRoll} />
                <StatHexagon label="CON" score={player.ability_scores?.con || 10} modifier={getMod(player.ability_scores?.con || 10)} onRoll={onRoll} />
                <StatHexagon label="INT" score={player.ability_scores?.int || 10} modifier={getMod(player.ability_scores?.int || 10)} onRoll={onRoll} />
                <StatHexagon label="WIS" score={player.ability_scores?.wis || 10} modifier={getMod(player.ability_scores?.wis || 10)} onRoll={onRoll} />
                <StatHexagon label="CHA" score={player.ability_scores?.cha || 10} modifier={getMod(player.ability_scores?.cha || 10)} onRoll={onRoll} />
             </div>
          </div>

          <div className="bg-[#151515]/60 border border-white/5 rounded-[2rem] p-6 shadow-xl">
             <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 ml-2">Saving Throws</h3>
             <div className="space-y-1">
                {(player.saves || []).map((save: any, i: number) => (
                    <SkillRow key={i} name={save.name} modifier={save.modifier} isProficient={save.isProficient} type="save" onRoll={onRoll} />
                ))}
             </div>
          </div>
        </div>

        {/* Middle Column: Skills & Senses */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#151515]/60 border border-white/5 rounded-[2rem] p-6 shadow-xl h-full">
             <div className="flex justify-between items-center mb-4 ml-2">
                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Skills</h3>
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">PB: +{player.proficiency_bonus}</span>
             </div>
             <div className="space-y-1 max-h-[700px] overflow-y-auto custom-scrollbar pr-2">
                {(player.skills || []).map((skill: any, i: number) => (
                    <SkillRow key={i} name={skill.name} modifier={skill.modifier} isProficient={skill.isProficient} type="skill" onRoll={onRoll} />
                ))}
             </div>
          </div>
        </div>

        {/* Right Column: Actions Dashboard */}
        <div className="lg:col-span-5 space-y-6">
           <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 w-fit mb-4">
              <button 
                onClick={() => setActiveTab('actions')}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'actions' ? 'bg-gold text-darker shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                <Sword className="w-4 h-4" /> ACTIONS
              </button>
              <button 
                onClick={() => setActiveTab('spells')}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'spells' ? 'bg-cyan-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                <Wand2 className="w-4 h-4" /> SPELLS
              </button>
              <button 
                onClick={() => setActiveTab('features')}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'features' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <Info className="w-4 h-4" /> FEATURES
              </button>
           </div>

           {activeTab === 'actions' && (
              <ActionDashboard 
                actions={actions}
                playerName={playerName}
                onRoll={(req) => onRoll(req.actionName, 0, req.rollType.includes('adv') ? 'adv' : req.rollType.includes('dis') ? 'dis' : 'normal', false, req.formula)}
                onAddCustomAction={onAddCustomAction}
                onUpdateAction={onUpdateAction}
                onDeleteAction={onDeleteAction}
                onImportActions={onImportActions}
              />
           )}

           {activeTab === 'spells' && (
              <div className="bg-[#151515]/60 border border-white/5 rounded-[2rem] p-10 text-center space-y-4">
                  <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto border border-cyan-500/20">
                    <Wand2 className="w-10 h-10 text-cyan-400" />
                  </div>
                  <h4 className="text-xl font-bold text-white">Spellcasting Book</h4>
                  <p className="text-sm text-gray-500 max-w-xs mx-auto">Your spells are being transcribed from the ancient scrolls. Check back soon!</p>
              </div>
           )}
        </div>
      </div>

      {contextMenu && (
        <RollContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          label={contextMenu.label}
          onSelect={contextMenu.onSelect}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
