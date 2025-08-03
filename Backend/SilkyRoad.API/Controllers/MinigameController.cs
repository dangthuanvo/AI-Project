using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SilkyRoad.API.Data;
using SilkyRoad.API.Models;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SilkyRoad.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MinigameController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public MinigameController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost("reward-voucher")]
        public async Task<IActionResult> RewardVoucher([FromBody] MinigameRewardRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null)
                return Unauthorized();

            // Check if user already played this minigame today
            var today = DateTime.UtcNow.Date;
            var alreadyPlayed = _context.UserVouchers.Any(v =>
                v.UserId == userId &&
                v.MinigameId == request.MinigameId &&
                v.CreatedAt.Date == today
            );
            if (alreadyPlayed)
                return BadRequest("You have already played this minigame today. Come back tomorrow!");

            // Determine discount
            int discount = request.Difficulty switch
            {
                "easy" => 5,
                "medium" => 10,
                "hard" => 15,
                _ => 0
            };
            if (discount == 0)
                return BadRequest("Invalid difficulty");

            // Generate code
            string code = $"MG-{request.MinigameId.ToUpper()}-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";

            var voucher = new UserVoucher
            {
                UserId = userId,
                Code = code,
                DiscountPercent = discount,
                MinigameId = request.MinigameId,
                CreatedAt = DateTime.UtcNow,
                ExpiryDate = DateTime.UtcNow.AddDays(30),
                IsUsed = false
            };
            _context.UserVouchers.Add(voucher);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Congratulations! You have won a voucher!", voucher });
        }
    }

    public class MinigameRewardRequest
    {
        public string MinigameId { get; set; }
        public string Difficulty { get; set; }
    }
}
