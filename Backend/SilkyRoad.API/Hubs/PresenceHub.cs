using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System;

namespace SilkyRoad.API.Hubs
{
    public class Pet
    {
        public string Type { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public double X { get; set; }
        public double Y { get; set; }
        public double TargetX { get; set; }
        public double TargetY { get; set; }
        public string Facing { get; set; } = "down";
        public bool IsFollowing { get; set; } = true;
        public bool IsWalking { get; set; } = false;
        public string Color { get; set; } = "#8B4513";
        public int Size { get; set; } = 24;
    }

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
        public Pet? Pet { get; set; }
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
            
            // Check if state changed
            var stateChanged = !PlayerStates.TryGetValue(userId, out var existingState) || 
                              !AreStatesEqual(existingState, state);
            
            // Check if pet state changed (more sensitive for pets)
            var petStateChanged = HasPetStateChanged(existingState, state);
            
            if (stateChanged || petStateChanged)
            {
                PlayerStates[userId] = state;
                
                // Always broadcast player state updates immediately for real-time feel
                Clients.Others.SendAsync("PlayerStateUpdated", state);
                
                // Broadcast all states less frequently for full sync
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
            var basicEqual = state1.X == state2.X && 
                           state1.Y == state2.Y && 
                           state1.Facing == state2.Facing && 
                           state1.IsWalking == state2.IsWalking;
            
            // Compare pet states
            if (state1.Pet == null && state2.Pet == null)
                return basicEqual;
            
            if (state1.Pet == null || state2.Pet == null)
                return false;
            
            var petEqual = state1.Pet.X == state2.Pet.X &&
                          state1.Pet.Y == state2.Pet.Y &&
                          state1.Pet.Facing == state2.Pet.Facing &&
                          state1.Pet.IsFollowing == state2.Pet.IsFollowing;
            
            return basicEqual && petEqual;
        }

        private static bool HasPetStateChanged(PlayerState? oldState, PlayerState newState)
        {
            // If no old state, consider it changed
            if (oldState == null) return newState.Pet != null;
            
            // If pet existence changed
            if ((oldState.Pet == null) != (newState.Pet == null))
                return true;
            
            // If both have no pets, no change
            if (oldState.Pet == null && newState.Pet == null)
                return false;
            
            // Compare pet positions with lower threshold for smoother updates
            if (oldState.Pet != null && newState.Pet != null)
            {
                var deltaX = Math.Abs(oldState.Pet.X - newState.Pet.X);
                var deltaY = Math.Abs(oldState.Pet.Y - newState.Pet.Y);
                
                // Update if pet moved more than 0.5 pixels or facing/walking changed
                return deltaX > 0.5 || deltaY > 0.5 || 
                       oldState.Pet.Facing != newState.Pet.Facing ||
                       oldState.Pet.IsFollowing != newState.Pet.IsFollowing ||
                       oldState.Pet.IsWalking != newState.Pet.IsWalking;
            }
            
            return false;
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