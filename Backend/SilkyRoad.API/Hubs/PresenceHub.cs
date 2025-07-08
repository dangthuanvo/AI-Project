using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System;

namespace SilkyRoad.API.Hubs
{
    public class PlayerState
    {
        public string UserId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Avatar { get; set; } = string.Empty;
        public string Color { get; set; } = "#1976d2";
        public int X { get; set; }
        public int Y { get; set; }
        public string Facing { get; set; } = "down";
        public bool IsWalking { get; set; }
    }

    public class PresenceHub : Hub
    {
        // In-memory store for online users and their states
        private static ConcurrentDictionary<string, string> OnlineUsers = new();
        private static ConcurrentDictionary<string, PlayerState> PlayerStates = new();

        public override Task OnConnectedAsync()
        {
            var userId = Context.UserIdentifier ?? Context.ConnectionId;
            Console.WriteLine($"SignalR Connected: {userId}");
            OnlineUsers[userId] = Context.ConnectionId;
            Clients.All.SendAsync("UserOnline", userId);
            Clients.All.SendAsync("OnlineUsers", OnlineUsers.Keys);
            // Send all current player states to the new user
            Clients.Caller.SendAsync("AllPlayerStates", PlayerStates.Values);
            // Broadcast all player states to everyone
            Clients.All.SendAsync("AllPlayerStates", PlayerStates.Values);
            return base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.UserIdentifier ?? Context.ConnectionId;
            Console.WriteLine($"SignalR Disconnected: {userId}");
            OnlineUsers.TryRemove(userId, out _);
            PlayerStates.TryRemove(userId, out _);
            Clients.All.SendAsync("UserOffline", userId);
            Clients.All.SendAsync("OnlineUsers", OnlineUsers.Keys);
            Clients.All.SendAsync("PlayerLeft", userId);
            return base.OnDisconnectedAsync(exception);
        }

        public Task UpdatePlayerState(PlayerState state)
        {
            var userId = Context.UserIdentifier ?? Context.ConnectionId;
            state.UserId = userId;
            
            // Ensure user is in the online users list
            OnlineUsers[userId] = Context.ConnectionId;
            
            // Only update if state actually changed
            if (!PlayerStates.TryGetValue(userId, out var existingState) || 
                !AreStatesEqual(existingState, state))
            {
                PlayerStates[userId] = state;
                
                // Broadcast this player's state to all others
                Clients.Others.SendAsync("PlayerStateUpdated", state);
                
                // Only broadcast all states periodically or on significant changes
                if (ShouldBroadcastAllStates())
                {
                    Clients.All.SendAsync("AllPlayerStates", PlayerStates.Values);
                }
            }
            
            // Broadcast updated online users list less frequently
            if (ShouldUpdateOnlineUsers())
            {
                Clients.All.SendAsync("OnlineUsers", OnlineUsers.Keys);
            }
            
            return Task.CompletedTask;
        }

        private static bool AreStatesEqual(PlayerState state1, PlayerState state2)
        {
            return state1.X == state2.X && 
                   state1.Y == state2.Y && 
                   state1.Facing == state2.Facing && 
                   state1.IsWalking == state2.IsWalking;
        }

        private static DateTime lastAllStatesBroadcast = DateTime.MinValue;
        private static DateTime lastOnlineUsersUpdate = DateTime.MinValue;

        private static bool ShouldBroadcastAllStates()
        {
            var now = DateTime.UtcNow.AddHours(7);
            if ((now - lastAllStatesBroadcast).TotalSeconds >= 2) // Every 2 seconds
            {
                lastAllStatesBroadcast = now;
                return true;
            }
            return false;
        }

        private static bool ShouldUpdateOnlineUsers()
        {
            var now = DateTime.UtcNow.AddHours(7);
            if ((now - lastOnlineUsersUpdate).TotalSeconds >= 5) // Every 5 seconds
            {
                lastOnlineUsersUpdate = now;
                return true;
            }
            return false;
        }

        // Method to get current online users count (for debugging)
        public Task GetOnlineUsersCount()
        {
            var count = OnlineUsers.Count;
            var users = OnlineUsers.Keys.ToList();
            Console.WriteLine($"Current online users: {count} - {string.Join(", ", users)}");
            return Clients.Caller.SendAsync("OnlineUsersCount", count, users);
        }
    }
} 