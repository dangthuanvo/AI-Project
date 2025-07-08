using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using SilkyRoad.API.DTOs;
using SilkyRoad.API.Models;
using SilkyRoad.API.Services;
using SilkyRoad.API.Services.Interfaces;

namespace SilkyRoad.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly JwtService _jwtService;
        private readonly IMailService _mailService;

        public AuthController(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            JwtService jwtService,
            IMailService mailService)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _jwtService = jwtService;
            _mailService = mailService;
        }

        [HttpPost("register")]
        public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
        {
            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return BadRequest(new { message = "User with this email already exists." });
            }

            var user = new ApplicationUser
            {
                UserName = request.Email,
                Email = request.Email,
                FirstName = request.FirstName,
                LastName = request.LastName,
                Address = request.Address,
                CreatedAt = DateTime.UtcNow
            };

            var result = await _userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                return BadRequest(new { message = "Failed to create user.", errors = result.Errors });
            }

            if (!await _roleManager.RoleExistsAsync(request.Role))
            {
                await _roleManager.CreateAsync(new IdentityRole(request.Role));
            }

            await _userManager.AddToRoleAsync(user, request.Role);

            var token = await _jwtService.GenerateTokenAsync(user);
            var roles = await _userManager.GetRolesAsync(user);

            // Send welcome email
            await _mailService.SendEmailAsync(user.Email!, "Welcome to Silky Road!", $"<h1>Welcome, {user.FirstName}!</h1><p>Thank you for registering at Silky Road.</p>");

            return Ok(new AuthResponse
            {
                Token = token,
                UserId = user.Id,
                Email = user.Email ?? "",
                FirstName = user.FirstName,
                LastName = user.LastName,
                Roles = roles.ToList(),
                ExpiresAt = DateTime.UtcNow.AddMinutes(60),
                Avatar = string.IsNullOrEmpty(user.Avatar) ? "/user-avatar.png" : user.Avatar,
                Color = user.Color
            });
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
        {
            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                return BadRequest(new { message = "Invalid email or password." });
            }

            var isPasswordValid = await _userManager.CheckPasswordAsync(user, request.Password);
            if (!isPasswordValid)
            {
                return BadRequest(new { message = "Invalid email or password." });
            }

            if (!user.IsActive)
            {
                return BadRequest(new { message = "Account is deactivated." });
            }

            user.LastLoginAt = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);

            var token = await _jwtService.GenerateTokenAsync(user);
            var roles = await _userManager.GetRolesAsync(user);

            return Ok(new AuthResponse
            {
                Token = token,
                UserId = user.Id,
                Email = user.Email ?? "",
                FirstName = user.FirstName,
                LastName = user.LastName,
                Roles = roles.ToList(),
                ExpiresAt = DateTime.UtcNow.AddMinutes(60),
                Avatar = string.IsNullOrEmpty(user.Avatar) ? "/user-avatar.png" : user.Avatar,
                Color = user.Color
            });
        }

        [Authorize]
        [HttpGet("profile")]
        public async Task<ActionResult<object>> GetProfile()
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (userId == null)
            {
                return Unauthorized();
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound();
            }

            var roles = await _userManager.GetRolesAsync(user);

            return Ok(new
            {
                user.Id,
                user.Email,
                user.FirstName,
                user.LastName,
                user.Address,
                user.CreatedAt,
                user.LastLoginAt,
                user.IsActive,
                Roles = roles.ToList(),
                Avatar = string.IsNullOrEmpty(user.Avatar) ? "/user-avatar.png" : user.Avatar,
                Color = user.Color
            });
        }

        [Authorize]
        [HttpPut("profile")]
        public async Task<ActionResult<object>> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (userId == null)
            {
                return Unauthorized();
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound();
            }

            user.FirstName = request.FirstName ?? user.FirstName;
            user.LastName = request.LastName ?? user.LastName;
            user.Color = request.Color ?? user.Color;
            user.Avatar = request.Avatar ?? user.Avatar;

            await _userManager.UpdateAsync(user);

            var roles = await _userManager.GetRolesAsync(user);

            return Ok(new
            {
                user.Id,
                user.Email,
                user.FirstName,
                user.LastName,
                user.Address,
                user.CreatedAt,
                user.LastLoginAt,
                user.IsActive,
                Roles = roles.ToList(),
                Avatar = string.IsNullOrEmpty(user.Avatar) ? "/user-avatar.png" : user.Avatar,
                Color = user.Color
            });
        }

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (userId == null)
            {
                return Unauthorized();
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound();
            }

            var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
            if (!result.Succeeded)
            {
                var errorDescriptions = result.Errors.Select(e => e.Description).ToList();
                if (result.Errors.Any(e => e.Code == "PasswordMismatch"))
                {
                    return BadRequest(new { message = "Incorrect old password." });
                }
                if (result.Errors.Any(e => e.Code == "PasswordReuseNotAllowed" || e.Description.Contains("must be different")))
                {
                    return BadRequest(new { message = "There is no change in your password." });
                }
                return BadRequest(new { message = string.Join(" ", errorDescriptions), errors = result.Errors });
            }

            return Ok(new { message = "Password changed successfully." });
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                // Do not reveal that the user does not exist
                return Ok(new { message = "If the email exists, a new password has been sent." });
            }

            // Generate a new password matching the password constraints
            var newPassword = GenerateSecurePassword();
            var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
            var result = await _userManager.ResetPasswordAsync(user, resetToken, newPassword);
            if (!result.Succeeded)
            {
                return BadRequest(new { message = "Failed to reset password.", errors = result.Errors });
            }

            // Send the new password to the user's email
            await _mailService.SendEmailAsync(user.Email!, "Your New Password", $"<p>Your new password is: <b>{newPassword}</b></p><p>Please log in and change it immediately.</p>");

            return Ok(new { message = "If the email exists, a new password has been sent." });
        }

        public class ForgotPasswordRequest
        {
            public string Email { get; set; } = string.Empty;
        }

        // Helper to generate a secure password matching the default policy
        private string GenerateSecurePassword()
        {
            const int length = 10;
            const string upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            const string lower = "abcdefghijklmnopqrstuvwxyz";
            const string digits = "0123456789";
            const string special = "!@#$%^&*()_+-=[]{}|;:,.<>?";
            var rand = new Random();
            string password =
                upper[rand.Next(upper.Length)].ToString() +
                lower[rand.Next(lower.Length)].ToString() +
                digits[rand.Next(digits.Length)].ToString() +
                special[rand.Next(special.Length)].ToString();
            string all = upper + lower + digits + special;
            for (int i = 4; i < length; i++)
                password += all[rand.Next(all.Length)];
            // Shuffle password
            return new string(password.ToCharArray().OrderBy(x => rand.Next()).ToArray());
        }
    }

    public class UpdateProfileRequest
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Color { get; set; }
        public string? Avatar { get; set; }
    }
} 