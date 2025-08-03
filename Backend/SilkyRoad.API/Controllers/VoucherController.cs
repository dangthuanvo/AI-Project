using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SilkyRoad.API.Data;
using SilkyRoad.API.Models;
using System.Linq;
using System.Security.Claims;

namespace SilkyRoad.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class VoucherController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public VoucherController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/voucher/user-vouchers
        [HttpGet("user-vouchers")]
        public IActionResult GetUserVouchers()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null)
                return Unauthorized();

            var vouchers = _context.UserVouchers
                .Where(v => v.UserId == userId && !v.IsUsed)
                .OrderByDescending(v => v.CreatedAt)
                .Select(v => new
                {
                    v.Id,
                    v.Code,
                    v.DiscountPercent,
                    v.ExpiryDate,
                    Used = v.IsUsed,
                    MinigameId = v.MinigameId,
                    CreatedAt = v.CreatedAt
                })
                .ToList();

            return Ok(vouchers);
        }
    }
}
