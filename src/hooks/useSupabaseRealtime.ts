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
  playerAvatar: string | null,
  onRollReceived?: (req: RollRequest) => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const roomIdRef = useRef<string>(roomId);
  const [logs, setLogs] = useState<RollResult[]>([]);
  const [activePlayers, setActivePlayers] = useState<ActivePlayer[]>([]);
  const onRollReceivedRef = useRef(onRollReceived);

  // Keep refs updated when values change
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  // Update ref when callback changes
  useEffect(() => {
    onRollReceivedRef.current = onRollReceived;
  }, [onRollReceived]);

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
        broadcast: { self: false }, // Don't broadcast to self to avoid echo
        presence: { key: playerName },
      },
    });

    roomChannel
      .on("broadcast", { event: "roll_request" }, (payload) => {
        const req = payload.payload as RollRequest;
        if (req && req.playerName !== playerName) {
            onRollReceivedRef.current?.(req);
        }
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
          const newDoc = payload.new;
          const newLog: RollResult = {
            playerName: newDoc.player_name,
            actionName: newDoc.action_name,
            rollType: newDoc.roll_type,
            resultTotal: newDoc.result_total,
            resultDetails: newDoc.result_details,
            timestamp: newDoc.created_at,
          };
          setLogs((prevLogs) => [newLog, ...prevLogs]);
        }
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          console.log("[Presence] Connected as:", playerName);
          await roomChannel.track({ online_at: new Date().toISOString(), avatar_url: playerAvatar });
        }
      });

    channelRef.current = roomChannel;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(roomChannel);
    };
  }, [roomId, playerName, playerAvatar]);

  const sendRollRequest = async (request: RollRequest) => {
    const ch = channelRef.current;
    if (!ch) {
      console.warn("[Realtime] Channel not ready yet, broadcast skipped");
      return;
    }
    
    await ch.send({
      type: "broadcast",
      event: "roll_request",
      payload: request,
    });
  };

  const saveRollResult = async (result: Omit<RollResult, "timestamp">) => {
    const currentRoomId = roomIdRef.current;
    if (!currentRoomId) {
      console.warn("[Realtime] saveRollResult: roomId is empty, skipping");
      return;
    }

    console.log("[Realtime] Saving roll result for room:", currentRoomId, "| action:", result.actionName);

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

  return { logs, sendRollRequest, saveRollResult, channel: channelRef.current, activePlayers };
}
