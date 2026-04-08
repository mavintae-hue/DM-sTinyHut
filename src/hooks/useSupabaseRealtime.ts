"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

export type RollRequest = {
  playerName: string;
  actionName: string;
  rollType: "hit_normal" | "hit_adv" | "hit_disadv" | "damage_normal" | "damage_crit" | "custom";
  formula: string; // e.g. "1d20+5", "2d6+3"
  modifier: number;
  themeColor?: string;
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

export function useSupabaseRealtime(roomId: string, playerName: string, playerAvatar: string | null) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [logs, setLogs] = useState<RollResult[]>([]);
  const [activePlayers, setActivePlayers] = useState<ActivePlayer[]>([]);

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
        broadcast: { self: true },
        presence: { key: playerName },
      },
    });

    roomChannel
      .on("broadcast", { event: "roll_request" }, (payload) => {
        console.log("Received roll request:", payload.payload);
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
          console.log("Connected to room:", roomId);
          await roomChannel.track({ online_at: new Date().toISOString(), avatar_url: playerAvatar });
        }
      });

    setChannel(roomChannel);

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [roomId, playerName, playerAvatar]);

  const sendRollRequest = async (request: RollRequest) => {
    if (!channel) return;
    
    await channel.send({
      type: "broadcast",
      event: "roll_request",
      payload: request,
    });
  };

  const saveRollResult = async (result: Omit<RollResult, "timestamp">) => {
    const { error } = await supabase.from("rolls_history").insert({
      room_id: roomId,
      player_name: result.playerName,
      action_name: result.actionName,
      roll_type: result.rollType,
      result_total: result.resultTotal,
      result_details: result.resultDetails,
    });

    if (error) {
      console.error("Error saving roll result:", error);
    }
  };

  return { logs, sendRollRequest, saveRollResult, channel, activePlayers };
}
