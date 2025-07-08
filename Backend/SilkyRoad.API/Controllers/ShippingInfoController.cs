using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SilkyRoad.API.Data;
using SilkyRoad.API.Models;
using System.Security.Claims;

namespace SilkyRoad.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ShippingInfoController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ShippingInfoController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/ShippingInfo
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ShippingInfo>>> GetShippingInfos()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var infos = await _context.ShippingInfos.Where(x => x.UserId == userId).ToListAsync();
            return infos;
        }

        // POST: api/ShippingInfo
        [HttpPost]
        public async Task<IActionResult> AddShippingInfo([FromBody] ShippingInfo info)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            info.UserId = userId;
            _context.ShippingInfos.Add(info);
            await _context.SaveChangesAsync();
            return Ok(info);
        }

        // PUT: api/ShippingInfo/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateShippingInfo(int id, [FromBody] ShippingInfo info)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var existing = await _context.ShippingInfos.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
            if (existing == null) return NotFound();
            existing.FirstName = info.FirstName;
            existing.LastName = info.LastName;
            existing.Email = info.Email;
            existing.Phone = info.Phone;
            existing.Address = info.Address;
            existing.City = info.City;
            existing.State = info.State;
            existing.ZipCode = info.ZipCode;
            existing.Country = info.Country;
            await _context.SaveChangesAsync();
            return Ok(existing);
        }

        // DELETE: api/ShippingInfo/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteShippingInfo(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var info = await _context.ShippingInfos.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
            if (info == null) return NotFound();
            _context.ShippingInfos.Remove(info);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
} 