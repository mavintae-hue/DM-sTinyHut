"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import ActionDashboard from "@/components/ActionDashboard";
import HistoryLog from "@/components/HistoryLog";
import DiceCanvas from "@/components/DiceCanvas";
import QuickRoller from "@/components/QuickRoller";
import { useSupabaseRealtime, RollRequest, RollResult, ActivePlayer } from "@/hooks/useSupabaseRealtime";
import { Dices, LogIn, Users, Settings2, X, Trash2, Palette, UserPlus, UploadCloud, ChevronLeft, Paintbrush, Check, Globe, Sparkles } from "lucide-react";

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
  const [bgTheme, setBgTheme] = useState(BG_PRESETS[0].url);
  const [fontTheme, setFontTheme] = useState(FONT_PRESETS[0].color);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [splashAnimation, setSplashAnimation] = useState<{type: "crit" | "fail", message: string, playerName?: string, playerAvatar?: string | null} | null>(null);
  const lastProcessedLogTimestamp = useRef<string | null>(null);
  
  const [roomId, setRoomId] = useState("");
  const [roomUuid, setRoomUuid] = useState("");
  const [joined, setJoined] = useState(false);
  
  // Player Lobby States
  const [playerName, setPlayerName] = useState("");
  const [playerAvatar, setPlayerAvatar] = useState<string | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<any[]>([]);
  const [showNewPlayer, setShowNewPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerFile, setNewPlayerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [actions, setActions] = useState<any[]>([]);
  
  const [savedRooms, setSavedRooms] = useState<string[]>([]);
  const [showManager, setShowManager] = useState(false);

  // We only initialize realtime hooks after joining
  const { logs, sendRollRequest, saveRollResult, channel, activePlayers } = useSupabaseRealtime(
    joined ? roomUuid : "",
    playerName,
    playerAvatar
  );

  // Persistent Theme Customization Sync
  useEffect(() => {
    if (joined && roomUuid && playerName) {
      const updatePlayerTheme = async () => {
         await supabase.from("players")
           .update({ 
             dice_color: themeColor,
             bg_theme: bgTheme,
             font_theme: fontTheme 
           })
           .eq("room_id", roomUuid)
           .eq("name", playerName);
      };
      updatePlayerTheme();
    }
  }, [themeColor, bgTheme, fontTheme, joined, roomUuid, playerName]);

  const fetchMetadata = async () => {
    const { data: roomData } = await supabase.from("rooms").select("name");
    if (roomData) setSavedRooms(Array.from(new Set(roomData.map((r: any) => r.name))));
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  const handleDeleteRoom = async (name: string) => {
    await supabase.from("rooms").delete().eq("name", name);
    fetchMetadata();
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) return;
    
    let activeRoomUuid = "";
    const { data: existingRooms } = await supabase.from("rooms").select("id").eq("name", roomId);
    if (existingRooms && existingRooms.length > 0) {
      activeRoomUuid = existingRooms[0].id;
    } else {
      const { data: newRoom } = await supabase.from("rooms").insert({ name: roomId }).select();
      if (newRoom && newRoom.length > 0) {
         activeRoomUuid = newRoom[0].id;
      }
    }
    setRoomUuid(activeRoomUuid);
    fetchRoomPlayers(activeRoomUuid);
  };

  const fetchRoomPlayers = async (activeUuid: string) => {
    const { data } = await supabase.from("players").select("*").eq("room_id", activeUuid);
    if (data) setRoomPlayers(data);
  };
  
  const handleSelectPlayer = async (player: any) => {
    setPlayerName(player.name);
    setPlayerAvatar(player.avatar_url);
    if (player.dice_color) {
      setThemeColor(player.dice_color);
    }
    if (player.bg_theme !== undefined) {
      setBgTheme(player.bg_theme);
    }
    if (player.font_theme) {
      setFontTheme(player.font_theme);
    }
    setJoined(true);
    fetchActions(roomUuid, player.name);
  };
  
  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    setIsUploading(true);
    
    let uploadedUrl = null;
    if (newPlayerFile) {
       const fileExt = newPlayerFile.name.split('.').pop();
       const fileName = `${roomUuid}-${Date.now()}.${fileExt}`;
       // Upload the file
       const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, newPlayerFile);
       if (!uploadError) {
         // Get public url
         const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
         uploadedUrl = publicUrlData.publicUrl;
       } else {
         console.error("Avatar upload failed", uploadError);
       }
    }
    
    const { data: newPlayer, error } = await supabase.from("players").insert({
       room_id: roomUuid,
       name: newPlayerName,
       avatar_url: uploadedUrl
    }).select();
    
    setIsUploading(false);
    if (!error && newPlayer && newPlayer.length > 0) {
       handleSelectPlayer(newPlayer[0]);
       setShowNewPlayer(false);
       setNewPlayerName("");
       setNewPlayerFile(null);
       setAvatarPreview(null);
    } else {
      alert("Error creating player. Name might already be taken in this room.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setNewPlayerFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAvatarPreview(null);
    }
  };

  const fetchActions = async (activeUuid: string, targetPlayer: string) => {
    const { data, error } = await supabase
      .from("actions")
      .select("*")
      .eq("room_id", activeUuid)
      .eq("owner_name", targetPlayer);
    
    if (!error && data && data.length > 0) {
      setActions(data.map(d => ({
        id: d.id,
        name: d.name,
        range: d.attack_range,
        hitBonus: d.hit_bonus,
        damageDice: d.damage_dice,
        notes: d.notes
      })));
    } else {
      // Fallback defaults for new players
      setActions([
        { id: "1", name: "Vicious Quarterstaff", range: "5 ft.", hitBonus: 5, damageDice: "1d6-1", notes: "+2d6 Simple, Versatile" },
        { id: "2", name: "Blind Sight Dagger", range: "20 (60)", hitBonus: 10, damageDice: "1d4+4", notes: "Finesse, Light" },
      ]);
    }
  };

  const handleAddCustomAction = async (newAction: any) => {
    const actionWithId = { ...newAction, id: Math.random().toString() };
    setActions([...actions, actionWithId]);

    await supabase.from("actions").insert({
      room_id: roomUuid,
      owner_name: playerName,
      name: newAction.name,
      attack_range: newAction.range,
      hit_bonus: newAction.hitBonus,
      damage_dice: newAction.damageDice,
      notes: newAction.notes
    });
  };

  const handleRoll = (request: RollRequest) => {
    sendRollRequest({ ...request, themeColor });
  };

  const playSynthSound = (type: "crit" | "fail") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      
      if (type === "crit") {
        // Epic Final Fantasy style Fanfare!
        // Arpeggio: C5 (523), E5 (659), G5 (783), C6 (1046) 
        const notes = [523.25, 659.25, 783.99, 1046.50];
        
        notes.forEach((freq, i) => {
           const osc = ctx.createOscillator();
           osc.type = "square";
           osc.frequency.setValueAtTime(freq, ctx.currentTime + (i * 0.1));
           
           const oscGain = ctx.createGain();
           oscGain.gain.setValueAtTime(0, ctx.currentTime);
           oscGain.gain.setValueAtTime(0.3, ctx.currentTime + (i * 0.1));
           if (i === notes.length - 1) {
              oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
              osc.start(ctx.currentTime + (i * 0.1));
              osc.stop(ctx.currentTime + 1.5);
           } else {
              oscGain.gain.setValueAtTime(0, ctx.currentTime + (i * 0.1) + 0.1);
              osc.start(ctx.currentTime + (i * 0.1));
              osc.stop(ctx.currentTime + (i * 0.1) + 0.1);
           }
           osc.connect(oscGain);
           oscGain.connect(gain);
        });
        
      } else {
        // Devastatingly sad womp drop
        const osc1 = ctx.createOscillator();
        osc1.type = "sawtooth";
        const osc2 = ctx.createOscillator();
        osc2.type = "square";
        
        // Pitch bend from 150hz down to 40hz
        osc1.frequency.setValueAtTime(150, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 1.5);
        osc2.frequency.setValueAtTime(148, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 1.5);
        
        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.4, ctx.currentTime);
        oscGain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 1.5);
        
        osc1.connect(oscGain);
        osc2.connect(oscGain);
        oscGain.connect(gain);
        
        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 1.5);
        osc2.stop(ctx.currentTime + 1.5);
      }
    } catch (e) {
      console.error("Audio playback error", e);
    }
  };

  const triggerSplash = (type: "crit" | "fail", pName?: string, pAvatar?: string | null) => {
    const msg = type === "crit" 
        ? _CRIT_MSGS[Math.floor(Math.random() * _CRIT_MSGS.length)]
        : _FAIL_MSGS[Math.floor(Math.random() * _FAIL_MSGS.length)];
        
    setSplashAnimation({ type, message: msg, playerName: pName, playerAvatar: pAvatar });
    
    // Play Native Browser Synthesizer instead of loading MP3 file
    playSynthSound(type);
    
    setTimeout(() => setSplashAnimation(null), 4000);
  };

  // Global Remote Splash Listener - Listen for new rolls in the history log
  useEffect(() => {
    if (logs.length > 0) {
      const latestLog = logs[0]; // Most recent log is first in the array
      if (latestLog.timestamp !== lastProcessedLogTimestamp.current) {
        lastProcessedLogTimestamp.current = latestLog.timestamp;
        
        // Detect Natural 20 or Natural 1 from any player (including self)
        if (latestLog.resultDetails.isNat20) {
           triggerSplash("crit", latestLog.playerName, latestLog.resultDetails.player_avatar);
        } else if (latestLog.resultDetails.isNat1) {
           triggerSplash("fail", latestLog.playerName, latestLog.resultDetails.player_avatar);
        }
      }
    }
  }, [logs]);

  const handleRollComplete = (result: Omit<RollResult, "timestamp">) => {
    // Inject the local player's avatar into the result details before saving
    // This ensures remote players see your face in the splash and history
    const resultWithAvatar = {
       ...result,
       resultDetails: {
          ...result.resultDetails,
          player_avatar: playerAvatar
       }
    };
    
    saveRollResult(resultWithAvatar);
    // Note: We no longer trigger splash here locally. 
    // The useEffect above will catch the log being added (realtime) 
    // and trigger it for everyone simultaneously.
  };

  if (!roomUuid) {
    // Step 1: Select Room (Login Screen)
    return (
      <main 
        className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative overflow-hidden" 
        style={{ backgroundImage: "url('/bg-fantasy.png')" }}
      >
        {/* Layer for atmosphere and readability */}
        <div className="absolute inset-0 bg-black/40 backdrop-brightness-[0.7]"></div>

        <div className="relative z-10 bg-black/40 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] shadow-[0_35px_100px_-15px_rgba(0,0,0,0.8)] w-full max-w-md animate-in fade-in zoom-in duration-1000">
          <div className="flex justify-center mb-10">
            <div className="bg-white/10 p-5 rounded-[2.5rem] backdrop-blur-md border border-white/20 shadow-2xl">
              <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/722.png" alt="Evil DM Tinyhut" className="w-24 h-24 drop-shadow-2xl object-contain animate-bounce-slow" />
            </div>
          </div>
          
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic drop-shadow-lg">Evil DM Tinyhut</h1>
            <p className="text-gold/60 text-xs font-mono tracking-[0.4em] uppercase mt-2">Dungeon Entrance</p>
          </div>

          <form onSubmit={handleJoinRoom} className="space-y-6">
            <div className="space-y-4">
              {/* Existing Portals Section */}
              {savedRooms.length > 0 && (
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-3 flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-gold" /> Active Portals
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                    {savedRooms.map(r => (
                      <button
                        key={"portal-" + r}
                        type="button"
                        onClick={() => setRoomId(r)}
                        className={`group flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${roomId === r ? 'bg-gold/10 border-gold shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'}`}
                      >
                        <div className={`p-2 rounded-xl border ${roomId === r ? 'bg-gold border-gold text-darker' : 'bg-white/5 border-white/10 text-gray-500 group-hover:text-white'}`}>
                          <Globe className="w-4 h-4" />
                        </div>
                        <span className={`text-sm font-bold truncate ${roomId === r ? 'text-gold' : 'text-gray-400 group-hover:text-white'}`}>
                          {r}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual Input Section */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-3">Enter Secret Realm ID</label>
                <div className="relative group">
                  <input 
                    required 
                    type="text" 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-lg text-white placeholder:text-gray-600 focus:border-gold focus:bg-dark transition-all outline-none shadow-inner" 
                    value={roomId} 
                    onChange={e => setRoomId(e.target.value)} 
                    placeholder="Realm Name..." 
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                    <Dices className="w-5 h-5 text-gold" />
                  </div>
                </div>
              </div>
            </div>
            
            <button type="submit" className="group w-full bg-gradient-to-br from-yellow-700 via-yellow-400 to-yellow-700 text-darker font-black py-5 rounded-2xl hover:scale-[1.03] active:scale-[0.97] transition-all shadow-[0_20px_40px_-15px_rgba(234,179,8,0.4)] flex items-center justify-center gap-3 uppercase tracking-tighter text-lg">
              <LogIn className="w-6 h-6 group-hover:translate-x-1 transition-transform" /> Begin Journey
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-white/5 text-center">
            <button 
               type="button" 
               onClick={() => setShowManager(true)}
               className="text-[10px] font-bold text-gray-400 hover:text-gold transition-colors flex items-center justify-center gap-2 mx-auto uppercase tracking-[0.3em]"
            >
               <Settings2 className="w-4 h-4" /> Realm Archives
            </button>
          </div>
        </div>

        {/* Manager Modal Overlay */}
        {showManager && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-card border border-border p-6 rounded-xl w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button type="button" onClick={() => setShowManager(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                 <X className="w-5 h-5"/>
              </button>
              <h2 className="text-xl font-bold mb-6 text-white text-center">Manage Ancient Profiles</h2>
              
              <div className="space-y-6">
                 <div>
                   <h3 className="text-sm text-gold font-bold mb-3 uppercase tracking-wider text-center">Stored Realms</h3>
                   {savedRooms.length === 0 ? <p className="text-sm text-gray-600 text-center">No scrolls of portals found.</p> : (
                     <div className="space-y-2">
                       {savedRooms.map(r => (
                         <div key={"room-" + r} className="flex justify-between items-center bg-dark/50 p-3 rounded-lg border border-border">
                           <span className="text-gold font-mono">{r}</span>
                           <button type="button" onClick={() => handleDeleteRoom(r)} className="p-2 text-gray-500 hover:text-red-500 transition-colors">
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  if (!joined) {
    // Step 2: Room Lobby (Player Selection/Creation)
    return (
      <main className="min-h-screen p-4 flex items-center justify-center relative">
        <button onClick={() => setRoomUuid("")} className="absolute top-8 left-8 text-gray-400 hover:text-white flex items-center gap-2">
           <ChevronLeft className="w-5 h-5" /> Back to Rooms
        </button>
        
        <div className="w-full max-w-4xl">
           <h2 className="text-3xl font-black text-white text-center mb-2 flex items-center justify-center gap-4">
              <Dices className="text-gold w-8 h-8"/> Room: <span className="text-gold font-mono">{roomId}</span>
           </h2>
           <p className="text-center text-gray-400 mb-10">Select your character to join the game.</p>
           
           {showNewPlayer ? (
             <div className="bg-card border border-border p-8 rounded-xl max-w-md mx-auto shadow-2xl animate-in zoom-in-95 fade-in duration-200">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-bold text-white flex items-center gap-2"><UserPlus className="text-gold"/> New Character</h3>
                   <button onClick={() => setShowNewPlayer(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5"/></button>
                </div>
                
                <form onSubmit={handleCreatePlayer} className="space-y-4">
                   <div>
                     <label className="block text-sm text-gray-400 mb-1">Character Name</label>
                     <input required autoFocus type="text" className="w-full bg-dark border border-border rounded p-3 text-white focus:border-gold outline-none" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} placeholder="e.g. Drizzt Do'Urden" />
                   </div>
                   <div>
                     <label className="block text-sm text-gray-400 mb-1">Avatar Image (Optional)</label>
                     <div className="w-full relative border-2 border-dashed border-border rounded-lg bg-dark p-2 flex flex-col items-center justify-center gap-2 hover:border-gold transition-colors cursor-pointer min-h-[140px] overflow-hidden" onClick={() => document.getElementById('avatarUpload')?.click()}>
                        {avatarPreview ? (
                           <img src={avatarPreview} alt="Preview" className="w-full h-full max-h-[120px] object-contain rounded pixel-sprite" />
                        ) : (
                           <>
                              <UploadCloud className="w-6 h-6 text-gray-500" />
                              <span className="text-sm text-gray-400 text-center">Click to select image</span>
                           </>
                        )}
                        <input id="avatarUpload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                     </div>
                   </div>
                   <button disabled={isUploading} type="submit" className={`w-full bg-gold text-darker font-bold py-3 rounded-md transition-colors flex items-center justify-center gap-2 mt-4 ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gold-hover'}`}>
                     {isUploading ? "Creating..." : "Create & Join"}
                   </button>
                </form>
             </div>
           ) : (
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {roomPlayers.map(p => (
                  <button 
                    key={p.id} 
                    onClick={() => handleSelectPlayer(p)}
                    className="flex flex-col items-center gap-3 group bg-card border border-border hover:border-gold transition-all duration-200 rounded-xl p-4 shadow-lg hover:-translate-y-1 hover:shadow-gold/20"
                  >
                     <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-darker bg-dark group-hover:border-gold relative shadow-inner">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-4xl text-gray-600 font-black">{p.name.charAt(0).toUpperCase()}</span>
                        )}
                     </div>
                     <span className="font-bold text-gray-200 group-hover:text-gold text-center truncate w-full">{p.name}</span>
                  </button>
                ))}
                
                <button 
                  onClick={() => setShowNewPlayer(true)}
                  className="flex flex-col items-center justify-center gap-3 bg-dark/50 border-2 border-dashed border-border hover:border-gold transition-all duration-200 rounded-xl p-4 text-gray-400 hover:text-gold h-full min-h-[160px]"
                >
                   <UserPlus className="w-10 h-10" />
                   <span className="font-bold">New Player</span>
                </button>
             </div>
           )}
        </div>
      </main>
    )
  }

  return (
    <main 
      className="min-h-screen p-4 md:p-8 relative pb-24 transition-all duration-1000 bg-cover bg-center bg-no-repeat"
      style={{ 
        backgroundImage: bgTheme ? `url('${bgTheme}')` : 'none',
        '--theme-font': fontTheme 
      } as React.CSSProperties}
    >
      {/* Dynamic Background Overlay for readability - Brightened */}
      <div className="absolute inset-0 bg-black/25 pointer-events-none z-0 backdrop-brightness-[1.05]"></div>

      <DiceCanvas channel={channel} playerName={playerName} themeColor={themeColor} onRollComplete={handleRollComplete} />
      
      <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end border-b border-border/30 pb-4 gap-4 relative z-10">
        <div>
        <div className="flex items-center gap-4">
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/722.png" alt="Evil DM" className="w-16 h-16 drop-shadow-2xl object-contain" />
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
              {roomId}
            </h1>
            <p className="text-sm text-gold/60 font-mono tracking-widest uppercase">Room Lobby Active</p>
            <p className="text-xs text-gray-500 mt-0.5">Playing as <span className="text-white font-bold">{playerName}</span></p>
          </div>
        </div>
        </div>

        <div className="flex flex-col gap-2 items-end">
           <div className="flex items-center gap-2 bg-dark/50 border border-border px-3 py-2 rounded-lg">
             <Users className="w-4 h-4 text-gray-400" />
             <div className="flex flex-wrap gap-3">
               {activePlayers.length === 0 ? (
                 <span className="text-sm text-gray-400">Only you</span>
               ) : activePlayers.map(p => (
                  <div key={p.name} className="flex items-center gap-2 bg-dark rounded-full pr-3 border border-border" title={p.name}>
                     {p.avatar ? (
                        <img src={p.avatar} alt={p.name} className="w-6 h-6 rounded-full object-cover border border-border ml-[-1px]" />
                     ) : (
                        <div className="w-6 h-6 rounded-full bg-border flex items-center justify-center ml-[-1px] text-[10px] font-bold text-gray-400">
                           {p.name.charAt(0).toUpperCase()}
                        </div>
                     )}
                     <span className={`text-xs ${p.name === playerName ? "text-gold font-bold" : "text-gray-300"}`}>
                        {p.name}
                     </span>
                  </div>
               ))}
             </div>
           </div>
           
           <div className="flex items-center gap-2">
             {/* Theme Picker */}
             <div className="relative">
               <button 
                 onClick={() => { setShowThemePicker(!showThemePicker); setShowColorPicker(false); }} 
                 className="flex items-center justify-center gap-2 bg-dark/50 hover:bg-dark border border-border px-3 py-2 rounded-lg text-sm text-gray-300 transition-all hover:border-gold hover:text-white"
                 title="Change Background & Font Theme"
               >
                 <Paintbrush className="w-4 h-4 text-gold" />
               </button>
               
               {showThemePicker && (
                  <div className="absolute top-12 right-0 z-[100] bg-card/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 w-80 animate-in fade-in zoom-in duration-300">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-black text-rose-400 uppercase tracking-widest">Atmosphere Settings</h3>
                      <button onClick={() => setShowThemePicker(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4"/></button>
                    </div>

                    <div className="space-y-6">
                      {/* Background Selection */}
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Background Realm</div>
                        <div className="grid grid-cols-2 gap-2">
                          {BG_PRESETS.map(bg => (
                            <button
                              key={bg.name}
                              onClick={() => setBgTheme(bg.url)}
                              className={`group relative h-16 rounded-lg overflow-hidden border-2 transition-all ${bgTheme === bg.url ? 'border-gold shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-white/5 hover:border-white/20'}`}
                            >
                              {bg.url ? (
                                <img src={bg.url} alt={bg.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                              ) : (
                                <div className="w-full h-full bg-dark flex items-center justify-center text-[8px] uppercase">No BG</div>
                              )}
                              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[8px] font-bold text-white uppercase tracking-tighter drop-shadow-md">{bg.name}</span>
                              </div>
                              {bgTheme === bg.url && <div className="absolute top-1 right-1 bg-gold rounded-full p-0.5"><Check className="w-2 h-2 text-darker" /></div>}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Font Color Selection */}
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Magic Font Theme</div>
                        <div className="grid grid-cols-3 gap-2">
                          {FONT_PRESETS.map(f => (
                            <button
                              key={f.name}
                              onClick={() => setFontTheme(f.color)}
                              className={`h-10 rounded-lg flex flex-col items-center justify-center gap-1 border-2 transition-all ${fontTheme === f.color ? 'border-gold bg-white/10' : 'border-white/5 hover:bg-white/5'}`}
                              style={{ color: f.color }}
                            >
                              <span className="text-[8px] font-black uppercase tracking-tighter leading-none">{f.name.split(' ')[0]}</span>
                              <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: f.color }}></div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
               )}
             </div>

             <div className="relative">
               <button 
                 onClick={() => { setShowColorPicker(!showColorPicker); setShowThemePicker(false); }} 
                 className="flex items-center justify-center gap-2 bg-dark/50 hover:bg-dark border border-border px-3 py-2 rounded-lg text-sm text-gray-300 transition-all hover:border-gold hover:text-white"
                 title="Select Dice Color"
               >
                 <Palette className="w-4 h-4 text-gold" />
                 <div className="w-3 h-3 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: themeColor }}></div>
               </button>
               
               {showColorPicker && (
                  <div className="absolute top-12 right-0 z-[100] bg-card/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 w-64 animate-in fade-in zoom-in duration-300">
                    <div className="mb-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dice Sorcery Colors</div>
                    <div className="grid grid-cols-2 gap-2">
                      {DICE_COLORS.map(c => (
                        <button
                          key={c.name}
                          onClick={() => { setThemeColor(c.hex); setShowColorPicker(false); }}
                          className={`text-left flex items-center gap-2 p-2 rounded-xl transition-all text-[10px] uppercase font-bold tracking-tight hover:bg-white/5 border ${themeColor === c.hex ? "border-gold bg-white/10 text-white" : "border-white/5 text-gray-400"}`}
                        >
                           <div className="w-3 h-3 rounded-full shrink-0 shadow-lg border border-black/50" style={{ backgroundColor: c.hex }}></div>
                           <span className="truncate">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
               )}
             </div>
           </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 items-start relative z-10 w-full xl:max-w-7xl mx-auto">
        <div className="flex-1 w-full overflow-hidden">
          <ActionDashboard 
            actions={actions} 
            playerName={playerName} 
            onRoll={handleRoll} 
            onAddCustomAction={handleAddCustomAction} 
          />
        </div>
        <div className="w-full lg:w-[500px] shrink-0">
          <HistoryLog logs={logs} />
        </div>
      </div>

      {splashAnimation && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center animate-in slide-in-from-bottom-12 fade-in duration-500 pointer-events-none p-4 fill-mode-forwards bg-black/40 backdrop-blur-[2px]">
          <div className="relative mb-8 transform-gpu animate-bounce">
             {splashAnimation.playerAvatar ? (
                <img src={splashAnimation.playerAvatar} alt={splashAnimation.playerName} className="w-48 h-48 md:w-64 md:h-64 rounded-3xl border-8 border-white/20 shadow-[0_0_100px_rgba(255,255,255,0.3)] object-cover pixel-sprite" />
             ) : (
                <div className="w-48 h-48 md:w-64 md:h-64 rounded-3xl border-8 border-white/20 bg-dark flex items-center justify-center shadow-2xl">
                   <span className="text-8xl text-gray-400 font-black">{splashAnimation.playerName?.charAt(0).toUpperCase()}</span>
                </div>
             )}
             <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full font-black text-2xl border-4 shadow-2xl ${splashAnimation.type === 'crit' ? 'bg-yellow-400 border-yellow-600 text-darker' : 'bg-red-600 border-red-800 text-white'}`}>
                {splashAnimation.playerName}
             </div>
          </div>

          <div className={`text-center p-8 md:p-14 rounded-[3rem] border-4 shadow-[0_0_100px_rgba(0,0,0,0.8)] bg-black/90 backdrop-blur-md transform-gpu rotate-2 ${splashAnimation.type === 'crit' ? 'border-yellow-400 shadow-yellow-500/80 animate-pulse' : 'border-red-600 shadow-red-600/80 skew-x-2'}`}>
            <h1 className={`text-6xl md:text-8xl lg:text-9xl font-black italic tracking-tighter uppercase ${splashAnimation.type === 'crit' ? 'text-transparent bg-clip-text bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 drop-shadow-2xl' : 'text-red-600 drop-shadow-[0_0_20px_rgba(255,0,0,1)]'}`}>
              {splashAnimation.type === 'crit' ? 'NATURAL 20!' : 'NATURAL 1!'}
            </h1>
            <p className={`mt-6 text-3xl md:text-5xl font-bold ${splashAnimation.type === 'crit' ? 'text-white drop-shadow-md' : 'text-gray-400'}`}>
              "{splashAnimation.message}"
            </p>
          </div>
        </div>
      )}

      {/* Developer Debug Buttons */}
      <div className="fixed bottom-4 right-4 z-[99] flex flex-col gap-2 opacity-30 hover:opacity-100 transition-opacity">
         <button onClick={() => triggerSplash("crit", playerName, playerAvatar)} className="bg-yellow-600 text-xs font-bold text-white px-3 py-1 rounded shadow-lg">Test Nat 20 (Self)</button>
         <button onClick={() => triggerSplash("fail", playerName, playerAvatar)} className="bg-red-800 text-xs font-bold text-white px-3 py-1 rounded shadow-lg">Test Nat 1 (Self)</button>
      </div>

      <QuickRoller playerName={playerName} onRoll={handleRoll} />
    </main>
  );
}
