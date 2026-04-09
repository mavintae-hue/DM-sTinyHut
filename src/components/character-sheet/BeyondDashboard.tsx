"use client";

import { useState, useEffect } from "react";
import StatHexagon from "./StatHexagon";
import CombatBox from "./CombatBox";
import SkillRow from "./SkillRow";
import RollContextMenu from "./RollContextMenu";
import Portal from "../Portal";
import { Plus, Import, Search, Shield, Zap, Footprints, Heart, Wand2, Sword, Info, Edit3, Camera, Link, Image as ImageIcon, X, UploadCloud, Check } from "lucide-react";
import ActionDashboard from "../ActionDashboard";

interface BeyondDashboardProps {
  player: any;
  actions: any[];
  playerName: string;
  onRoll: (label: string, mod: number, type: 'normal' | 'adv' | 'dis', isDamage?: boolean, formula?: string) => void;
  onAddCustomAction: (action: any) => void;
  onUpdateAction: (action: any) => void;
  onDeleteAction: (id: string) => void;
  onImportActions: (character: any, options?: any) => void;
  onUpdateHp: (current: number) => void;
  onUpdateAvatar: (input: string | File) => void;
  onUpdatePlayer: (updates: any) => void;
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
  onUpdateHp,
  onUpdateAvatar,
  onUpdatePlayer
}: BeyondDashboardProps) {
  const [activeTab, setActiveTab] = useState<'actions' | 'spells' | 'features'>('actions');
  const [isEditMode, setIsEditMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, label: string, onSelect: (type: 'normal' | 'adv' | 'dis') => void } | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(player?.avatar_url || "");

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
    <div className="w-full max-w-[1700px] mx-auto space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between p-4 bg-[#151515]/80 backdrop-blur-xl border border-white/5 rounded-[2rem] shadow-2xl">
          <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer" onClick={() => setShowAvatarModal(true)}>
            <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-full blur opacity-25 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative w-14 h-14">
              <img
                src={player.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`}
                className="w-full h-full rounded-full border-2 border-white/10 object-cover bg-darker shadow-inner transition-transform group-hover:scale-95"
                alt="Avatar"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-darker border border-white/10 px-1.5 py-0.5 rounded-full text-[8px] font-bold text-gray-400">
              LVL {player.class_level?.match(/\d+/)?.[0] || '??'}
            </div>
          </div>
          <div>
            {isEditMode ? (
              <div className="space-y-2">
                <input 
                  className="text-4xl font-black text-white tracking-tighter bg-transparent border-b border-white/10 outline-none focus:border-gold w-full"
                  value={player.name}
                  onChange={(e) => onUpdatePlayer({ name: e.target.value })}
                />
                <input 
                  className="text-sm font-bold text-cyan-400 uppercase tracking-widest bg-transparent border-b border-white/10 outline-none focus:border-cyan-400 w-full"
                  value={player.class_level}
                  onChange={(e) => onUpdatePlayer({ class_level: e.target.value })}
                />
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-black text-white tracking-tighter mb-0.5">{player.name}</h1>
                <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest opacity-80">{player.class_level || 'Adventurer'}</p>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button 
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black transition-all ${isEditMode ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-gold text-darker shadow-lg shadow-gold/20 hover:scale-105 active:scale-95'}`}
          >
            {isEditMode ? <><Check className="w-4 h-4" /> FINISH EDITING</> : <><Edit3 className="w-4 h-4" /> EDIT CHARACTER</>}
          </button>
          <div className="w-px h-10 bg-white/5 mx-2 hidden md:block"></div>

          <CombatBox
            label="AC"
            value={player.ac || 10}
            accent="cyan"
            editable={isEditMode}
            onUpdate={(val) => onUpdatePlayer({ ac: parseInt(val as string) || 0 })}
          />
          <div className="flex flex-col items-center justify-center p-2.5 bg-[#1a1a1a] border border-cyan-400/30 rounded-xl shadow-xl min-w-[80px] h-[72px]">
            <span className="text-[8px] font-black opacity-50 uppercase tracking-widest mb-1">Prof Bonus</span>
            {isEditMode ? (
              <input
                type="number"
                className="bg-transparent text-2xl font-black tracking-tighter w-12 text-center outline-none focus:text-white border-b border-white/10 text-cyan-400"
                value={player.proficiency_bonus || 2}
                onChange={(e) => onUpdatePlayer({ proficiency_bonus: parseInt(e.target.value) || 0 })}
              />
            ) : (
              <span className="text-2xl font-black tracking-tighter text-cyan-400">+{player.proficiency_bonus || 2}</span>
            )}
          </div>
          <CombatBox
            label="Initiative"
            value={player.initiative >= 0 ? `+${player.initiative}` : player.initiative}
            onRoll={(type) => onRoll('Initiative', player.initiative || 0, type)}
            accent="gold"
            editable={isEditMode}
            onUpdate={(val) => onUpdatePlayer({ initiative: parseInt(val as string) || 0 })}
          />
          <CombatBox
            label="Speed"
            value={player.speed || '30 ft.'}
            accent="cyan"
            editable={isEditMode}
            onUpdate={(val) => onUpdatePlayer({ speed: val as string })}
          />
          <div className="relative group flex flex-col items-center justify-center p-3 bg-[#1a1a1a] border border-red-500/30 rounded-2xl shadow-xl min-w-[120px] h-20">
            <span className="text-[8px] font-black opacity-50 uppercase tracking-widest mb-1 text-red-400">Hit Points</span>
            <div className="flex items-baseline gap-1">
              <input
                type="number"
                value={player.hp_current}
                onChange={(e) => onUpdateHp(parseInt(e.target.value))}
                className="bg-transparent text-3xl font-black tracking-tighter w-16 text-center outline-none focus:text-white transition-colors"
              />
              <span className="text-xl font-bold opacity-30">/ </span>
              {isEditMode ? (
                <input 
                  type="number" 
                  value={player.hp_max} 
                  onChange={(e) => onUpdatePlayer({ hp_max: parseInt(e.target.value) || 0 })}
                  className="bg-transparent text-xl font-bold tracking-tighter w-16 text-center outline-none focus:text-white border-b border-white/10"
                />
              ) : (
                <span className="text-xl font-bold opacity-30">{player.hp_max}</span>
              )}
            </div>
            <div className="absolute bottom-0 left-0 h-1 bg-red-500/40 rounded-full transition-all duration-500" style={{ width: `${(player.hp_current / (player.hp_max || 1)) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Column: Stats & Saves */}
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-[#151515]/60 backdrop-blur-md border border-white/5 rounded-[1.5rem] p-4 shadow-xl">
            <div className="grid grid-cols-2 gap-x-2 gap-y-2 justify-items-center">
              <StatHexagon label="STR" score={player.ability_scores?.str || 10} modifier={getMod(player.ability_scores?.str || 10)} onRoll={onRoll} editable={isEditMode} onUpdate={(score) => onUpdatePlayer({ ability_scores: { ...player.ability_scores, str: score } })} />
              <StatHexagon label="DEX" score={player.ability_scores?.dex || 10} modifier={getMod(player.ability_scores?.dex || 10)} onRoll={onRoll} editable={isEditMode} onUpdate={(score) => onUpdatePlayer({ ability_scores: { ...player.ability_scores, dex: score } })} />
              <StatHexagon label="CON" score={player.ability_scores?.con || 10} modifier={getMod(player.ability_scores?.con || 10)} onRoll={onRoll} editable={isEditMode} onUpdate={(score) => onUpdatePlayer({ ability_scores: { ...player.ability_scores, con: score } })} />
              <StatHexagon label="INT" score={player.ability_scores?.int || 10} modifier={getMod(player.ability_scores?.int || 10)} onRoll={onRoll} editable={isEditMode} onUpdate={(score) => onUpdatePlayer({ ability_scores: { ...player.ability_scores, int: score } })} />
              <StatHexagon label="WIS" score={player.ability_scores?.wis || 10} modifier={getMod(player.ability_scores?.wis || 10)} onRoll={onRoll} editable={isEditMode} onUpdate={(score) => onUpdatePlayer({ ability_scores: { ...player.ability_scores, wis: score } })} />
              <StatHexagon label="CHA" score={player.ability_scores?.cha || 10} modifier={getMod(player.ability_scores?.cha || 10)} onRoll={onRoll} editable={isEditMode} onUpdate={(score) => onUpdatePlayer({ ability_scores: { ...player.ability_scores, cha: score } })} />
            </div>
          </div>
          <div className="bg-[#151515]/60 block border border-white/5 rounded-[1.5rem] p-4 shadow-xl">
            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2 ml-1">Saving Throws</h3>
            <div className="space-y-1">
              {(player.saves && player.saves.length === 6 ? player.saves : [
                { name: "Strength", modifier: getMod(player.ability_scores?.str || 10), isProficient: false },
                { name: "Dexterity", modifier: getMod(player.ability_scores?.dex || 10), isProficient: false },
                { name: "Constitution", modifier: getMod(player.ability_scores?.con || 10), isProficient: false },
                { name: "Intelligence", modifier: getMod(player.ability_scores?.int || 10), isProficient: false },
                { name: "Wisdom", modifier: getMod(player.ability_scores?.wis || 10), isProficient: false },
                { name: "Charisma", modifier: getMod(player.ability_scores?.cha || 10), isProficient: false }
              ]).map((save: any, i: number) => {
                const baseMod = getMod(player.ability_scores?.[save?.name?.toLowerCase()?.substring(0, 3)] || 10);
                const finalMod = save?.modifier !== undefined ? save.modifier : baseMod;
                
                return (
                  <SkillRow 
                    key={i} 
                    name={save?.name || "Unknown"} 
                    modifier={finalMod} 
                    isProficient={!!save?.isProficient} 
                    type="save" 
                    onRoll={onRoll} 
                    editable={isEditMode}
                    onUpdate={(updates) => {
                      const currentSaves = player.saves && player.saves.length === 6 ? [...player.saves] : [
                        { name: "Strength", modifier: getMod(player.ability_scores?.str || 10), isProficient: false },
                        { name: "Dexterity", modifier: getMod(player.ability_scores?.dex || 10), isProficient: false },
                        { name: "Constitution", modifier: getMod(player.ability_scores?.con || 10), isProficient: false },
                        { name: "Intelligence", modifier: getMod(player.ability_scores?.int || 10), isProficient: false },
                        { name: "Wisdom", modifier: getMod(player.ability_scores?.wis || 10), isProficient: false },
                        { name: "Charisma", modifier: getMod(player.ability_scores?.cha || 10), isProficient: false }
                      ];
                      currentSaves[i] = { ...currentSaves[i], ...updates };
                      onUpdatePlayer({ saves: currentSaves });
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Middle Column: Skills & Senses */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-[#151515]/60 border border-white/5 rounded-[1.5rem] p-4 shadow-xl max-h-[500px] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-2 ml-1 flex-shrink-0">
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Skills</h3>
              {isEditMode ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase">Prof Bonus:</span>
                  <input 
                    type="number"
                    className="w-10 bg-transparent text-[10px] font-bold text-cyan-400 border-b border-white/10 outline-none"
                    value={player.proficiency_bonus}
                    onChange={(e) => onUpdatePlayer({ proficiency_bonus: parseInt(e.target.value) || 0 })}
                  />
                </div>
              ) : (
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">PB: +{player.proficiency_bonus}</span>
              )}
            </div>
            <div className="space-y-1 overflow-y-auto custom-scrollbar pr-2 flex-1">
              {(player.skills || []).map((skill: any, i: number) => (
                <SkillRow 
                  key={i} 
                  name={skill.name} 
                  modifier={skill.modifier} 
                  isProficient={skill.isProficient} 
                  type="skill" 
                  onRoll={onRoll} 
                  editable={isEditMode}
                  onUpdate={(updates) => {
                    const newSkills = [...player.skills];
                    newSkills[i] = { ...newSkills[i], ...updates };
                    onUpdatePlayer({ skills: newSkills });
                  }}
                />
              ))}
            </div>
          </div>

          {/* Senses Panel */}
          {player.senses && Object.keys(player.senses).length > 0 && (
            <div className="bg-[#151515]/60 border border-white/5 rounded-[1.5rem] p-4 shadow-xl">
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 ml-2 flex items-center gap-2">
                <Search className="w-3 h-3" /> Senses
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/30 border border-white/5 p-3 rounded-2xl flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-white">{player.senses.passive_perception || 10}</span>
                  <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-1">Perception</span>
                </div>
                <div className="bg-black/30 border border-white/5 p-3 rounded-2xl flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-white">{player.senses.passive_investigation || 10}</span>
                  <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-1">Investigation</span>
                </div>
                <div className="bg-black/30 border border-white/5 p-3 rounded-2xl flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-white">{player.senses.passive_insight || 10}</span>
                  <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-1">Insight</span>
                </div>
                <div className="bg-black/30 border border-white/5 p-3 rounded-2xl flex flex-col items-center flex-1 justify-center text-center">
                  <span className="text-xs font-bold text-cyan-400 break-words">{player.senses.darkvision || 'Normal'}</span>
                  <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-1">Vision</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Actions Dashboard */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 w-fit mb-2">
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
              onRoll={(req) => onRoll(
                req.actionName,
                req.modifier,
                req.rollType.includes('adv') ? 'adv' : req.rollType.includes('dis') ? 'dis' : 'normal',
                req.rollType.includes('damage'),
                req.formula
              )}
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

      {/* Avatar Edit Modal */}
      {showAvatarModal && (
        <Portal>
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-[#111] border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Avatar Chamber</h3>
                <button onClick={() => setShowAvatarModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gold/20 shadow-2xl">
                    <img
                      src={avatarUrl.startsWith('http') ? avatarUrl : (avatarUrl ? '' : `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`)}
                      className="w-full h-full object-cover"
                      alt="Preview"
                    />
                    {/* Overlay for local preview would go here if we used URL.createObjectURL */}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Image Source</label>
                    <div className="flex flex-col gap-3">
                      <div className="relative">
                        <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/50" />
                        <input
                          type="text"
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          placeholder="Enter Image URL..."
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-gold outline-none transition-all"
                        />
                      </div>

                      <div className="relative">
                        <input
                          type="file"
                          id="avatar-upload-local"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              onUpdateAvatar(file);
                              setShowAvatarModal(false);
                            }
                          }}
                        />
                        <label htmlFor="avatar-upload-local" className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-4 cursor-pointer transition-all border-dashed">
                          <UploadCloud className="w-5 h-5 text-gray-400" />
                          <span className="text-xs font-bold text-gray-400">UPLOAD FROM COMPUTER</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-4">
                    <button
                      onClick={() => {
                        if (avatarUrl.startsWith('http')) {
                          onUpdateAvatar(avatarUrl);
                          setShowAvatarModal(false);
                        }
                      }}
                      className="w-full bg-gold text-darker font-black py-4 rounded-2xl shadow-lg shadow-gold/10 active:scale-95 transition-all disabled:opacity-50"
                      disabled={!avatarUrl.startsWith('http')}
                    >
                      SAVE URL ESSENCE
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
