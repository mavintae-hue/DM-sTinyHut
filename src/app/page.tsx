"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import HistoryLog from "@/components/HistoryLog";
import QuickRoller from "@/components/QuickRoller";
import BeyondDashboard from "@/components/character-sheet/BeyondDashboard";

// Load DiceCanvas dynamically to prevent SSR issues with the 3D physics engine
const DiceCanvas = dynamic(() => import("@/components/DiceCanvas"), { ssr: false });
import { useSupabaseRealtime, RollRequest } from "@/hooks/useSupabaseRealtime";
import { rollDice, setDiceTheme, getDiceInitStatus } from "@/lib/diceManager";
import { LogIn, Users, Trash2, Palette, UserPlus, ChevronLeft, Paintbrush, Globe, Sparkles } from "lucide-react";

export const DICE_COLORS = [
  { name: "Void Black", hex: "#1a1a1a" },
  { name: "Blood Ruby", hex: "#9b111e" },
  { name: "Amethyst", hex: "#9966cc" },
  { name: "Emerald", hex: "#50c878" },
  { name: "Neon Cyan", hex: "#00ffff" },
  { name: "Plasma Pink", hex: "#ff1493" },
  { name: "Sunfire", hex: "#ff4500" },
  { name: "Toxic Yellow", hex: "#bcff00" },
  { name: "Ghost Pearl", hex: "#f8f8ff" },
  { name: "Royal Sapphire", hex: "#0f52ba" },
];

export const DICE_STYLES = [
  { id: "solid", name: "Solid Color", icon: "💎" },
  { id: "rainbow", name: "Rainbow", icon: "🌈" },
  { id: "magic", name: "Magic Dice", icon: "✨" },
  { id: "mechanic", name: "Mechanic", icon: "⚙️" },
];

export const DICE_THEMES = [
  { id: "default", name: "Classic", icon: "🎲" },
  { id: "diceOfRolling", name: "Rolling", icon: "💎" },
  { id: "gemstone", name: "Gemstone", icon: "🔮" },
  { id: "rock", name: "Pebble", icon: "⛰️" },
  { id: "wooden", name: "Forest", icon: "🌳" },
  { id: "rust", name: "Ancient", icon: "🏚️" },
  { id: "smooth", name: "Glass", icon: "🧊" },
  { id: "blueGreenMetal", name: "Metal", icon: "🛠️" },
];

export const BG_PRESETS = [
  { name: "Windmill Valley", url: "/bg-fantasy.png" },
  { name: "Atmosphere 1", url: "/backgrounds/bg1.avif" },
  { name: "Atmosphere 2", url: "/backgrounds/bg2.avif" },
  { name: "Atmosphere 3", url: "/backgrounds/bg3.jpg" },
  { name: "Atmosphere 4", url: "/backgrounds/bg4.jpg" },
  { name: "Atmosphere 5", url: "/backgrounds/bg5.jpg" },
  { name: "Atmosphere 6", url: "/backgrounds/bg6.jpg" },
  { name: "Atmosphere 7", url: "/backgrounds/bg7.jpg" },
  { name: "Atmosphere 8", url: "/backgrounds/bg8.jpg" },
  { name: "Atmosphere 9", url: "/backgrounds/bg9.avif" },
  { name: "Atmosphere 10", url: "/backgrounds/bg10.avif" },
  { name: "Atmosphere 11", url: "/backgrounds/bg11.avif" },
  { name: "Atmosphere 12", url: "/backgrounds/bg12.avif" },
  { name: "Default Dark", url: "" },
];

export const FONT_PRESETS = [
  { name: "Golden Legend", color: "#ECC94B" },
  { name: "Silver Moonlight", color: "#E2E8F0" },
  { name: "Blood Oath", color: "#C53030" },
  { name: "Emerald Soul", color: "#48BB78" },
  { name: "Arcane Blue", color: "#4299E1" },
  { name: "Pure White", color: "#FFFFFF" },
];

const _CRIT_MSGS = ["เช็ดเย้ โหดวะ", "DM มี Slivery Barb ไหม?", "ดวงกูหมดละ", "เตรียมรับ Damage นะคร้าบบ", "แกไม่รอดแน่"];
const _FAIL_MSGS = ["เห้ออออออ", "เออไม่ต้องตีมันโดนหรอก", "ตีโดนเพื่อนไหม", "จบบบบบบบ"];

export default function Home() {
  const [themeColor, setThemeColor] = useState("#9b111e");
  const [diceTheme, setDiceThemeState] = useState("default");
  const [bgTheme, setBgTheme] = useState(BG_PRESETS[0].url);
  const [fontTheme, setFontTheme] = useState(FONT_PRESETS[0].color);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [splashAnimation, setSplashAnimation] = useState<{ type: "crit" | "fail", message: string, playerName?: string, playerAvatar?: string | null } | null>(null);
  const lastProcessedLogTimestamp = useRef<string | null>(null);
  const [showRollLog, setShowRollLog] = useState(true);
  const [diceStatus, setDiceStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  const [roomId, setRoomId] = useState("");
  const [roomUuid, setRoomUuid] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  // Player States
  const [playerName, setPlayerName] = useState("");
  const [playerAvatar, setPlayerAvatar] = useState<string | null>(null);
  const [playerData, setPlayerData] = useState<any>(null);
  const [roomPlayers, setRoomPlayers] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);

  // UI Controls
  const [showNewPlayer, setShowNewPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerFile, setNewPlayerFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [savedRooms, setSavedRooms] = useState<{ id: string, name: string }[]>([]);

  // Realtime hook — always pass roomUuid so channel connects as soon as room is known
  const { logs, saveRollResult, activePlayers } = useSupabaseRealtime(
    roomUuid || "",
    playerName,
    playerAvatar
  );

  const fetchMetadata = useCallback(async () => {
    const { data: roomData } = await supabase.from("rooms").select("id, name");
    if (roomData) setSavedRooms(roomData);
  }, []);

  useEffect(() => { fetchMetadata(); }, [fetchMetadata]);

  // Auto-fetch players when room changes
  useEffect(() => {
    if (roomUuid) {
      const fetchPlayers = async () => {
        const { data } = await supabase.from("players").select("*").eq("room_id", roomUuid);
        if (data) {
          console.log("[fetchPlayers] Data received:", data);
          setRoomPlayers(data);
        }
      };
      fetchPlayers();
    }
  }, [roomUuid]);

  const fetchActions = useCallback(async (activeUuid: string, targetPlayer: string) => {
    const { data } = await supabase
      .from("actions")
      .select("*")
      .eq("room_id", activeUuid)
      .eq("owner_name", targetPlayer);

    if (data) {
      setActions(data.map(d => ({
        id: d.id,
        name: d.name,
        range: d.attack_range,
        hitBonus: d.hit_bonus,
        damageDice: d.damage_dice,
        notes: d.notes
      })));
    }
  }, []);

  const handleSelectPlayer = (player: any) => {
    setPlayerName(player.name);
    setPlayerAvatar(player.avatar_url);
    if (player.dice_color) {
        setThemeColor(player.dice_color);
    }
    if (player.dice_theme) {
        setDiceThemeState(player.dice_theme);
    }
    setDiceTheme(player.dice_color || "#9b111e", player.dice_theme || "default");
    if (player.bg_theme) setBgTheme(player.bg_theme);
    if (player.font_theme) setFontTheme(player.font_theme);
    console.log("[handleSelectPlayer] Selecting:", player);
    setPlayerData(player);
    setJoined(true);
    if (roomUuid) fetchActions(roomUuid, player.name);
  };

  const handleDeletePlayer = async (e: React.MouseEvent, pId: string, pName: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to banish ${pName} forever?`)) return;
    
    const { error } = await supabase.from("players").delete().eq("id", pId);
    if (!error) {
      setRoomPlayers(roomPlayers.filter(p => p.id !== pId));
    } else {
      alert("Failed to banish hero: " + error.message);
    }
  };

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim() || !roomUuid) return;
    setIsUploading(true);
    let uploadedUrl = null;

    if (newPlayerFile) {
      const fileExt = newPlayerFile.name.split('.').pop();
      const fileName = `${roomUuid}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, newPlayerFile);
      if (!uploadError) {
        uploadedUrl = supabase.storage.from("avatars").getPublicUrl(fileName).data.publicUrl;
      }
    }

    const { data, error } = await supabase.from("players").insert({
      room_id: roomUuid,
      name: newPlayerName,
      avatar_url: uploadedUrl
    }).select().single();

    setIsUploading(false);
    if (!error && data) {
      handleSelectPlayer(data);
      setShowNewPlayer(false);
    }
  };

  const handleImportActions = async (parsedCharacter: any, options?: any) => {
    if (!roomUuid) return;

    const opt = options || { importStats: true, importProficiencies: true, importActions: true };
    const updatePayload: any = { 
        class_level: parsedCharacter.classLevel,
        name: parsedCharacter.name 
    };

    if (opt.importStats) {
      updatePayload.ac = parsedCharacter.ac;
      updatePayload.hp_current = parsedCharacter.hpCurrent;
      updatePayload.hp_max = parsedCharacter.hpMax;
      updatePayload.initiative = parsedCharacter.initiative;
      updatePayload.speed = parsedCharacter.speed;
      updatePayload.ability_scores = parsedCharacter.abilityScores;
    }

    if (opt.importProficiencies) {
      updatePayload.proficiency_bonus = parsedCharacter.proficiencyBonus;
      updatePayload.skills = parsedCharacter.skills;
      updatePayload.saves = parsedCharacter.saves;
      updatePayload.senses = parsedCharacter.senses;
    }

    const { data: updatedPlayer, error: playerError } = await supabase.from("players")
      .update(updatePayload)
      .eq("id", playerData.id)
      .select()
      .single();

    if (!playerError && updatedPlayer) {
      setPlayerData(updatedPlayer);
      setPlayerName(updatedPlayer.name);
    }

    if (opt.importActions) {
      const { data: existingActions } = await supabase
        .from("actions")
        .select("id, name")
        .eq("room_id", roomUuid)
        .eq("owner_name", playerName);

      const existingActionMap = new Map((existingActions || []).map((a: any) => [a.name, a.id]));

      for (const a of parsedCharacter.actions) {
        if (existingActionMap.has(a.name)) {
          await supabase.from("actions").update({
            attack_range: a.range,
            hit_bonus: a.hitBonus,
            damage_dice: a.damageDice,
            notes: a.notes || undefined
          }).eq("id", existingActionMap.get(a.name));
        } else {
          await supabase.from("actions").insert({
            room_id: roomUuid,
            owner_name: playerName,
            name: a.name,
            attack_range: a.range,
            hit_bonus: a.hitBonus,
            damage_dice: a.damageDice,
            notes: a.notes || undefined
          });
        }
      }
      fetchActions(roomUuid, playerName);
    }
  };

  const handleUpdatePlayer = async (updates: any) => {
    if (!playerData?.id) return;
    const prevData = { ...playerData };
    setPlayerData({ ...playerData, ...updates });

    const { data, error } = await supabase
      .from("players")
      .update(updates)
      .eq("id", playerData.id)
      .select()
      .single();

    if (error) {
      console.warn("DB update issue (likely missing columns like dice_theme):", error.message);
      // We don't revert local state anymore to keep UI snappy even if some settings don't persist
    } else if (data) {
      setPlayerData((prev: any) => ({ ...prev, ...data }));
      if (updates.name) setPlayerName(data.name);
    }
  };

  const handleRoll = (label: string, mod: number, type: 'normal' | 'adv' | 'dis', isDamage = false, formulaUrl?: string) => {
    // Use simple notation — diceManager handles adv/disadv via rollType, not formula notation
    let formula = formulaUrl || `1d20`;
    let rollType: RollRequest['rollType'] = 'custom';

    if (!isDamage) {
      if (type === 'adv') {
        rollType = 'hit_adv';
      } else if (type === 'dis') {
        rollType = 'hit_disadv';
      } else {
        rollType = 'hit_normal';
      }
    } else {
      rollType = type === 'adv' ? 'damage_crit' : 'damage_normal';
      formula = formulaUrl || '1d6'; // damage rolls use the actual formula passed in
    }

    let finalLabel = label;
    if (type === 'adv') finalLabel += " (Advantage)";
    if (type === 'dis') finalLabel += " (Disadvantage)";

    const request: RollRequest = {
      playerName,
      actionName: finalLabel,
      rollType,
      formula,
      modifier: mod,
      themeColor: themeColor || '#9b111e',
      diceTheme: diceTheme || 'default',
    };

    // Roll locally with 3D dice
    rollDice(
      request,
      () => playerName,
      (res) => saveRollResult({ ...res, resultDetails: { ...res.resultDetails, player_avatar: playerAvatar } })
    );
  };

  const handleQuickRoll = (request: RollRequest) => {
    const req = { ...request, themeColor, diceTheme };
    rollDice(req, () => playerName, (res) => saveRollResult({ ...res, resultDetails: { ...res.resultDetails, player_avatar: playerAvatar } }));
  };

  const handleUpdateHp = async (current: number) => {
    if (!roomUuid) return;
    setPlayerData({ ...playerData, hp_current: current });
    await supabase.from("players").update({ hp_current: current }).eq("room_id", roomUuid).eq("name", playerName);
  };

  const handleUpdateAvatar = async (input: string | File) => {
    if (!roomUuid) return;
    let finalUrl = "";

    if (typeof input === "string") {
      finalUrl = input;
    } else {
      setIsUploading(true);
      const fileExt = input.name.split('.').pop();
      const fileName = `${roomUuid}-avatar-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, input);
      if (!uploadError) {
        finalUrl = supabase.storage.from("avatars").getPublicUrl(fileName).data.publicUrl;
      }
      setIsUploading(false);
    }

    if (!finalUrl) return;
    setPlayerAvatar(finalUrl);
    setPlayerData({ ...playerData, avatar_url: finalUrl });
    await supabase.from("players").update({ avatar_url: finalUrl }).eq("room_id", roomUuid).eq("name", playerName);
  };

  const handleUpdateAction = async (updatedAction: any) => {
    setActions(actions.map(a => a.id === updatedAction.id ? updatedAction : a));
    await supabase.from("actions").update({
      name: updatedAction.name,
      attack_range: updatedAction.range,
      hit_bonus: updatedAction.hitBonus,
      damage_dice: updatedAction.damageDice,
      notes: updatedAction.notes
    }).eq("id", updatedAction.id);
  };

  const handleDeleteAction = async (id: string) => {
    setActions(actions.filter(a => a.id !== id));
    await supabase.from("actions").delete().eq("id", id);
  };

  const handleAddCustomAction = async (newAction: any) => {
    const { data } = await supabase.from("actions").insert({
      room_id: roomUuid,
      owner_name: playerName,
      name: newAction.name,
      attack_range: newAction.range,
      hit_bonus: newAction.hitBonus,
      damage_dice: newAction.damageDice,
      notes: newAction.notes
    }).select().single();
    if (data && roomUuid) fetchActions(roomUuid, playerName);
  };

  const triggerSplash = (type: "crit" | "fail", pName?: string, pAvatar?: string | null) => {
    const msg = type === "crit" ? _CRIT_MSGS[Math.floor(Math.random() * _CRIT_MSGS.length)] : _FAIL_MSGS[Math.floor(Math.random() * _FAIL_MSGS.length)];
    setSplashAnimation({ type, message: msg, playerName: pName, playerAvatar: pAvatar });
    setTimeout(() => setSplashAnimation(null), 4000);
  };

  useEffect(() => {
    const checkStatus = () => {
      const current = getDiceInitStatus();
      if (current !== diceStatus) setDiceStatus(current);
    };
    const interval = setInterval(checkStatus, 1500);
    return () => clearInterval(interval);
  }, [diceStatus]);

  useEffect(() => {
    if (logs.length > 0) {
      const latestLog = logs[0];
      if (latestLog.timestamp !== lastProcessedLogTimestamp.current) {
        lastProcessedLogTimestamp.current = latestLog.timestamp;
        if (latestLog.resultDetails.isNat20) triggerSplash("crit", latestLog.playerName, latestLog.resultDetails.player_avatar);
        else if (latestLog.resultDetails.isNat1) triggerSplash("fail", latestLog.playerName, latestLog.resultDetails.player_avatar);
      }
    }
  }, [logs]);

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) return;
    let activeUuid = "";
    const { data: existing } = await supabase.from("rooms").select("id").eq("name", roomId).single();
    if (existing) {
      activeUuid = existing.id;
    } else {
      const { data: created } = await supabase.from("rooms").insert({ name: roomId }).select().single();
      if (created) activeUuid = created.id;
    }
    setRoomUuid(activeUuid);
    setJoined(false);
    setPlayerData(null);
    setPlayerName("");
    const { data: players } = await supabase.from("players").select("*").eq("room_id", activeUuid);
    if (players) setRoomPlayers(players);
  };

  if (!roomUuid) {
    return (
      <main className="min-h-screen p-8 bg-cover bg-center bg-no-repeat relative overflow-hidden flex flex-col bg-fixed" style={{ backgroundImage: "url('/bg-fantasy.png')" }}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
        <header className="relative z-10 flex flex-col items-center max-w-7xl mx-auto w-full mb-20 mt-10 text-center">
          <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 mb-6 group hover:scale-105 transition-transform duration-500 shadow-2xl">
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/722.png" alt="Evil DM" className="w-24 h-24" />
          </div>
          <div>
            <h1 className="text-5xl font-black text-white uppercase tracking-tighter mb-2 drop-shadow-2xl">EVIL DM&apos;s Tiny Hut</h1>
            <p className="text-xs font-bold text-gold uppercase tracking-[0.5em] opacity-40">Digital Archives & Multidimensional Realms</p>
          </div>
        </header>

        <div className="relative z-10 max-w-7xl mx-auto w-full flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {savedRooms.map(r => (
              <div key={r.id} className="group relative bg-white/5 hover:bg-white/10 border border-white/10 p-8 rounded-[2.5rem] transition-all cursor-pointer overflow-hidden"
                onClick={() => {
                  setRoomId(r.name);
                  setRoomUuid(r.id);
                  setJoined(false);
                  setPlayerData(null);
                }}>
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); if (confirm(`Erase realm ${r.name}?`)) { supabase.from("rooms").delete().eq("id", r.id).then(() => fetchMetadata()); } }} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-16 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Globe className="w-8 h-8 text-gold/40" />
                </div>
                <h4 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">{r.name}</h4>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ancient Kingdom</p>
                <div className="mt-8 flex items-center gap-2 text-gold font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  ENTER REALM <Sparkles className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 max-w-xl mx-auto w-full mt-20 mb-10">
          <form onSubmit={handleJoinRoom} className="bg-black/20 backdrop-blur-3xl border border-white/10 p-2 rounded-[2rem] flex items-center gap-2">
            <input required type="text" className="flex-1 bg-transparent border-none rounded-2xl px-6 py-4 text-white outline-none placeholder:text-white/20" value={roomId} onChange={e => setRoomId(e.target.value)} placeholder="Enter Realm Essence Name..." />
            <button type="submit" className="bg-gold text-darker font-black px-8 py-4 rounded-[1.5rem] shadow-lg shadow-gold/20 hover:scale-105 active:scale-95 transition-all uppercase text-xs">Begin Journey</button>
          </form>
        </div>
      </main>
    );
  }

  if (!joined) {
    return (
      <main className="min-h-screen p-8 flex flex-col items-center justify-center bg-[#050505]">
        <button onClick={() => setRoomUuid(null)} className="absolute top-8 left-8 text-gray-400 flex items-center gap-2"><ChevronLeft className="w-4 h-4" /> BACK</button>
        <div className="w-full max-w-4xl">
          <h2 className="text-4xl font-black text-white text-center mb-10 uppercase tracking-tighter">Choose Your Fate</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {roomPlayers.map(p => (
              <div key={p.id} className="relative group">
                <button 
                  onClick={() => handleSelectPlayer(p)} 
                  className="w-full flex flex-col items-center gap-4 p-6 bg-white/5 border border-white/5 rounded-3xl hover:border-gold transition-all"
                >
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10">
                    <img src={p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} className="w-full h-full object-cover" alt="" />
                  </div>
                  <span className="font-bold text-white">{p.name}</span>
                </button>
                <button 
                  onClick={(e) => handleDeletePlayer(e, p.id, p.name)}
                  className="absolute top-2 right-2 p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  title="Delete Character"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button onClick={() => setShowNewPlayer(true)} className="flex flex-col items-center justify-center gap-4 p-6 bg-white/5 border-2 border-dashed border-white/5 rounded-3xl hover:border-gold">
              <UserPlus className="w-10 h-10 text-gray-600" />
              <span className="font-bold text-gray-600">NEW PLAYER</span>
            </button>
          </div>
        </div>
        {showNewPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
            <div className="bg-card p-10 rounded-[3rem] w-full max-w-md border border-white/10 shadow-2xl">
              <h3 className="text-2xl font-black text-white mb-8">SUMMON HERO</h3>
              <form onSubmit={handleCreatePlayer} className="space-y-6">
                <input required type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} placeholder="Hero Name..." />
                <button disabled={isUploading} type="submit" className="w-full bg-gold font-black py-4 rounded-2xl text-darker">{isUploading ? "SUMMONING..." : "ENTER REALM"}</button>
                <button type="button" onClick={() => setShowNewPlayer(false)} className="w-full text-gray-500 font-bold text-sm">CANCEL</button>
              </form>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="h-screen flex relative overflow-hidden bg-fixed bg-cover bg-center transition-all duration-1000" style={{ backgroundImage: bgTheme ? `url('${bgTheme}')` : 'none', color: fontTheme }}>
      <div className="absolute inset-0 bg-black/40 pointer-events-none z-0 backdrop-brightness-[1.1]"></div>

      <div className="flex-1 flex flex-col h-full relative transition-all duration-500 ease-in-out overflow-hidden">
        <header className="p-2 md:p-4 flex justify-between items-center relative z-10 w-full max-w-[1700px] mx-auto shrink-0">
          <div className="flex items-center gap-4">
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/722.png" alt="Tinyhut" className="w-12 h-12" />
            <h1 className="text-2xl font-black uppercase tracking-tighter italic">{roomId}</h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden xl:flex items-center gap-3 mr-4">
              {activePlayers.map(p => (
                <div key={p.name} className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-full pr-3 group hover:border-gold/50 transition-colors">
                  <img src={p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} className="w-8 h-8 rounded-full border border-white/10" alt="" />
                  <span className={`text-[10px] font-bold ${p.name === playerName ? 'text-gold' : 'text-white'}`}>{p.name}</span>
                </div>
              ))}
            </div>
            {/* Roll Log toggle button */}
            <button
              onClick={() => setShowRollLog(!showRollLog)}
              className={`p-2.5 rounded-xl transition-colors border text-xs font-black flex items-center gap-1.5 ${
                showRollLog ? 'bg-gold/10 text-gold border-gold/30' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
              }`}
              title="Toggle Roll Log"
            >
              <span>🎲</span>
              <span className="hidden sm:inline">LOG</span>
              {logs.length > 0 && <span className="bg-gold text-darker rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-black">{logs.length > 9 ? '9+' : logs.length}</span>}
            </button>
            <div 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-lg transition-all duration-500 group relative z-50`}
              style={{ 
                backgroundColor: diceStatus === 'ready' ? 'rgba(72, 187, 120, 0.1)' : diceStatus === 'loading' ? 'rgba(236, 201, 75, 0.1)' : diceStatus === 'error' ? 'rgba(245, 101, 101, 0.1)' : 'rgba(74, 85, 104, 0.1)',
                borderColor: diceStatus === 'ready' ? '#48BB78' : diceStatus === 'loading' ? '#ECC94B' : diceStatus === 'error' ? '#F56565' : '#4A5568'
              }}
            >
              <div 
                className={`w-2 h-2 rounded-full animate-pulse`}
                style={{ backgroundColor: diceStatus === 'ready' ? '#48BB78' : diceStatus === 'loading' ? '#ECC94B' : diceStatus === 'error' ? '#F56565' : '#4A5568' }}
              />
              <span 
                className={`text-[9px] font-black tracking-widest uppercase`}
                style={{ color: diceStatus === 'ready' ? '#48BB78' : diceStatus === 'loading' ? '#ECC94B' : diceStatus === 'error' ? '#F56565' : '#4A5568' }}
              >
                3D: {diceStatus === 'ready' ? 'READY' : diceStatus === 'loading' ? 'LOADING' : diceStatus === 'error' ? 'INIT ERROR' : 'IDLE'}
              </span>

              {/* Tooltip on hover */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/95 text-[8px] font-black p-3 rounded-xl border border-white/10 pointer-events-none z-[100] shadow-2xl">
                {diceStatus === 'ready' && "PHYSICS ENGINE ACTIVE - DICE WILL ROLL"}
                {diceStatus === 'loading' && "FETCHING 3D ASSETS FROM REALM..."}
                {diceStatus === 'error' && "WEBGL ERROR - CHECK HARDWARE ACCELERATION"}
                {diceStatus === 'idle' && "WAITING FOR ENGINE INITIALIZATION..."}
              </div>
            </div>

            <button onClick={() => setShowThemePicker(!showThemePicker)} className="p-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/5"><Paintbrush className="w-5 h-5" /></button>
            <button onClick={() => setShowColorPicker(!showColorPicker)} className="p-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/5"><Palette className="w-5 h-5" /></button>
          </div>
        </header>

        {showThemePicker && (
          <div className="fixed top-24 right-8 z-[100] bg-black/95 backdrop-blur-3xl border border-white/10 p-6 rounded-[2.5rem] shadow-2xl w-80 animate-in slide-in-from-top-4 duration-300">
             <h3 className="text-xs font-black text-rose-400 mb-4 tracking-widest uppercase">World Settings</h3>
             <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
               {BG_PRESETS.map(bg => (
                <button key={bg.name} onClick={() => setBgTheme(bg.url)} className={`h-20 rounded-2xl border-2 overflow-hidden transition-all hover:scale-105 ${bgTheme === bg.url ? 'border-gold shadow-lg shadow-gold/20' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                   {bg.url ? <img src={bg.url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-white/5 flex items-center justify-center text-[8px] font-black">BLACK VOID</div>}
                </button>
               ))}
             </div>
             <div className="mt-8 pt-6 border-t border-white/5">
                <div className="flex flex-wrap gap-2.5">
                  {FONT_PRESETS.map(f => <button key={f.name} onClick={() => setFontTheme(f.color)} className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${fontTheme === f.color ? 'border-white scale-110 shadow-lg' : 'border-white/10'}`} style={{ backgroundColor: f.color }} />)}
                </div>
             </div>
          </div>
        )}

        {showColorPicker && (
          <div className="fixed top-24 right-8 z-[100] bg-black/95 backdrop-blur-3xl border border-white/10 p-6 rounded-[2.5rem] shadow-2xl w-80 animate-in slide-in-from-top-4 duration-300 max-h-[85vh] overflow-y-auto custom-scrollbar">
             <h3 className="text-xs font-black text-cyan-400 mb-4 tracking-widest uppercase">Dice Sorcery</h3>
             
             <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 mb-3 uppercase tracking-wider">Surface Theme</p>
                  <div className="grid grid-cols-4 gap-2">
                    {DICE_THEMES.map(t => (
                      <button 
                        key={t.id} 
                        onClick={() => {
                          setDiceThemeState(t.id);
                          setDiceTheme(themeColor, t.id);
                          handleUpdatePlayer({ dice_theme: t.id });
                        }}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${
                          diceTheme === t.id 
                            ? 'border-cyan-400 bg-cyan-400/10 text-white' 
                            : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/20'
                        }`}
                      >
                        <span className="text-base mb-1">{t.icon}</span>
                        <span className="text-[8px] font-black uppercase text-center leading-none">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-gray-500 mb-3 uppercase tracking-wider">Color Style</p>
                  <div className="grid grid-cols-2 gap-2">
                    {DICE_STYLES.map(s => (
                      <button 
                        key={s.id} 
                        onClick={() => {
                          const val = s.id === "solid" ? (themeColor.startsWith('#') ? themeColor : DICE_COLORS[1].hex) : s.id;
                          setThemeColor(val);
                          setDiceTheme(val, diceTheme);
                          handleUpdatePlayer({ dice_color: val });
                        }}
                        className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                          (s.id === "solid" ? themeColor.startsWith('#') : themeColor === s.id) 
                            ? 'border-gold bg-gold/10 text-white' 
                            : 'border-white/5 bg-white/5 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        <span className="text-lg">{s.icon}</span>
                        <span className="text-[9px] font-black uppercase">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {themeColor.startsWith('#') && (
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[10px] font-bold text-gray-500 mb-3 uppercase tracking-wider">Color Palette</p>
                    <div className="grid grid-cols-5 gap-2">
                        {DICE_COLORS.map(c => (
                        <button 
                            key={c.name} 
                            onClick={() => {
                                setThemeColor(c.hex);
                                setDiceTheme(c.hex, diceTheme);
                                handleUpdatePlayer({ dice_color: c.hex });
                            }} 
                            className={`h-8 rounded-lg border-2 transition-all hover:scale-110 ${themeColor === c.hex ? 'border-white scale-110 shadow-lg' : 'border-white/10'}`} 
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                        />
                        ))}
                    </div>
                  </div>
                )}
             </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 md:p-4 custom-scrollbar">
          <div className="w-full max-w-[1700px] mx-auto">
            <BeyondDashboard
              key={playerData.id}
              player={playerData}
              actions={actions}
              playerName={playerName}
              onRoll={handleRoll}
              onAddCustomAction={handleAddCustomAction}
              onUpdateAction={handleUpdateAction}
              onDeleteAction={handleDeleteAction}
              onImportActions={handleImportActions}
              onUpdateHp={handleUpdateHp}
              onUpdateAvatar={handleUpdateAvatar}
              onUpdatePlayer={handleUpdatePlayer}
            />
          </div>
        </div>

        {/* QuickRoller - now inline at bottom of content area */}
        <div className="p-2 md:p-4 border-t border-white/5 bg-black/20 shrink-0">
          <div className="w-full max-w-[1700px] mx-auto">
            <QuickRoller playerName={playerName} onRoll={handleQuickRoll} />
          </div>
        </div>
      </div>

      {/* Persistent Roll Log sidebar - toggleable, internal scroll */}
      {showRollLog && (
        <aside className="flex w-[280px] lg:w-[320px] bg-[#080808]/95 backdrop-blur-3xl border-l border-white/5 flex-col z-20 h-screen overflow-hidden shrink-0 transition-all duration-300">
          <HistoryLog logs={logs} />
        </aside>
      )}

      {splashAnimation && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-none animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md"></div>
          <div className="relative flex flex-col items-center animate-in zoom-in spin-in-1 duration-1000">
            <div className="relative mb-6">
              <div className={`absolute -inset-12 rounded-full blur-3xl opacity-40 ${splashAnimation.type === 'crit' ? 'bg-gold animate-pulse' : 'bg-red-600'}`}></div>
              <img src={splashAnimation.playerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${splashAnimation.playerName}`} className="w-48 h-48 rounded-[3rem] border-4 border-white/20 relative z-10 shadow-2xl object-cover bg-dark" alt="" />
              <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 px-8 py-3 rounded-2xl font-black text-2xl z-20 shadow-2xl ${splashAnimation.type === 'crit' ? 'bg-gold text-darker' : 'bg-red-600 text-white'}`}>
                {splashAnimation.type === 'crit' ? 'NATURAL 20!' : 'NATURAL 1...'}
              </div>
            </div>
            <p className="text-4xl font-black text-white italic drop-shadow-2xl text-center max-w-2xl px-6 leading-tight tracking-tighter mb-2">{splashAnimation.message}</p>
            <p className="text-gold font-bold uppercase tracking-[0.4em] mt-4 text-sm opacity-80">{splashAnimation.playerName}</p>
          </div>
        </div>
      )}

      <DiceCanvas themeColor={themeColor} diceTheme={diceTheme} />
    </main>
  );
}
