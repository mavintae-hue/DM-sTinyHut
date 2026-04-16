"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

export type RollRequest = {
  playerName: string;
  actionName: string;
  rollType: "hit_normal" | "hit_adv" | "hit_disadv" | "damage_normal" | "damage_crit" | "custom";
  formula: string; // e.g. "1d20+5", "2d6+3"
  modifier: number;
  themeColor?: string;
  diceTheme?: string;
};

export type RollResult = {
  playerName: string;
  actionName: string;
  rollType: string;
  resultTotal: number;
  resultDetails: {
    rolls: number[];
    modifier: number;
    formula: string;
    isNat20?: boolean;
    isNat1?: boolean;
    player_avatar?: string | null;
  };
  timestamp: string;
};

export type ActivePlayer = { name: string, avatar: string | null };

export function useSupabaseRealtime(
  roomId: string, 
  playerName: string, 
  playerAvatar: string | null
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const roomIdRef = useRef<string>(roomId);
  const playerNameRef = useRef<string>(playerName);
  const playerAvatarRef = useRef<string | null>(playerAvatar);
  const [logs, setLogs] = useState<RollResult[]>([]);
  const [activePlayers, setActivePlayers] = useState<ActivePlayer[]>([]);

  // Keep refs updated when values change (no subscription rebuild!)
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { playerNameRef.current = playerName; }, [playerName]);
  useEffect(() => { playerNameRef.current = playerName; }, [playerName]);
  useEffect(() => { playerAvatarRef.current = playerAvatar; }, [playerAvatar]);

  // Update presence when playerName or avatar changes, WITHOUT rebuilding channel
  useEffect(() => {
    const ch = channelRef.current;
    if (!ch || !playerName) return;
    ch.track({ online_at: new Date().toISOString(), avatar_url: playerAvatar })
      .catch(err => console.warn("[Realtime] Presence update failed:", err));
  }, [playerName, playerAvatar]);

  // Channel subscription — only rebuild when roomId changes
  useEffect(() => {
    if (!roomId) return;

    // Load initial history
    const loadHistory = async () => {
      const { data, error } = await supabase
        .from("rolls_history")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (data && !error) {
        const formattedLogs = data.map((d) => ({
          playerName: d.player_name,
          actionName: d.action_name,
          rollType: d.roll_type,
          resultTotal: d.result_total,
          resultDetails: d.result_details,
          timestamp: d.created_at,
        }));
        setLogs(formattedLogs);
      }
    };

    loadHistory();

    const roomChannel = supabase.channel(`room:${roomId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: playerNameRef.current || "anonymous" },
      },
    });

    roomChannel
      .on("broadcast", { event: "roll_completed" }, (payload) => {
        const newLog = payload.payload as RollResult;
        console.log("[Realtime] DB Broadcast Received:", newLog);
        
        setLogs((prevLogs) => {
          // Deduplicate based on exact match to prevent bouncing
          const isDuplicate = prevLogs.some(log => 
            log.playerName === newLog.playerName &&
            log.actionName === newLog.actionName &&
            log.resultTotal === newLog.resultTotal &&
            Math.abs(new Date(log.timestamp).getTime() - new Date(newLog.timestamp).getTime()) < 5000
          );
          
          if (isDuplicate) return prevLogs;
          return [newLog, ...prevLogs];
        });
      })
      .on("presence", { event: "sync" }, () => {
        const newState = roomChannel.presenceState();
        const players: ActivePlayer[] = [];
        
        Object.keys(newState).forEach((key) => {
           const presenceArray = newState[key] as any[];
           if (presenceArray && presenceArray.length > 0) {
               players.push({
                  name: key,
                  avatar: presenceArray[0].avatar_url || null
               });
           }
        });
        
        setActivePlayers(players);
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "rolls_history",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log("[Realtime] DB Change Received:", payload.new);
          const newDoc = payload.new;
          const newLog: RollResult = {
            playerName: newDoc.player_name,
            actionName: newDoc.action_name,
            rollType: newDoc.roll_type,
            resultTotal: newDoc.result_total,
            resultDetails: newDoc.result_details,
            timestamp: newDoc.created_at,
          };
          
          setLogs((prevLogs) => {
            // Deduplicate: If an optimistic local log exists within ~5 seconds with the same exact values, skip it.
            const isDuplicate = prevLogs.some(log => 
              log.playerName === newLog.playerName &&
              log.actionName === newLog.actionName &&
              log.resultTotal === newLog.resultTotal &&
              Math.abs(new Date(log.timestamp).getTime() - new Date(newLog.timestamp).getTime()) < 5000
            );
            
            if (isDuplicate) return prevLogs;
            return [newLog, ...prevLogs];
          });
        }
      )
      .subscribe(async (status, err) => {
        if (status === "SUBSCRIBED") {
          console.log("[Realtime] ✓ Subscribed to room:", roomId);
          // Track presence on successful subscription
          const name = playerNameRef.current;
          const avatar = playerAvatarRef.current;
          if (name) {
            await roomChannel.track({ online_at: new Date().toISOString(), avatar_url: avatar });
          }
        } else if (status !== "CLOSED") {
          console.warn(`[Realtime] Subscription status: ${status}`, err || "");
        }
      });

    channelRef.current = roomChannel;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(roomChannel);
    };
  }, [roomId]); // ONLY roomId — player name/avatar changes don't rebuild

  const saveRollResult = async (result: Omit<RollResult, "timestamp">) => {
    const currentRoomId = roomIdRef.current;
    if (!currentRoomId) {
      console.warn("[Realtime] saveRollResult: roomId is empty, skipping");
      return;
    }

    console.log("[Realtime] Saving roll for room:", currentRoomId, "| action:", result.actionName);

    // OPTIMISTIC UPDATE: Instantly show on local UI
    const optimisticLog: RollResult = {
      ...result,
      timestamp: new Date().toISOString()
    };
    setLogs((prevLogs) => [optimisticLog, ...prevLogs]);

    // INSTANT BROADCAST TO OTHER PLAYERS
    const ch = channelRef.current;
    if (ch) {
       await ch.send({
         type: "broadcast",
         event: "roll_completed",
         payload: optimisticLog,
       });
    }

    const { error } = await supabase.from("rolls_history").insert({
      room_id: currentRoomId,
      player_name: result.playerName,
      action_name: result.actionName,
      roll_type: result.rollType,
      result_total: result.resultTotal,
      result_details: result.resultDetails,
    });

    if (error) {
      console.error("[Realtime] Error saving roll result:", error);
    }
  };

  return { logs, saveRollResult, activePlayers };
}
