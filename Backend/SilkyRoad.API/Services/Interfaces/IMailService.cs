using System.Threading.Tasks;

namespace SilkyRoad.API.Services.Interfaces
{
    public interface IMailService
    {
        Task SendEmailAsync(string toEmail, string subject, string body, bool isHtml = true);
    }
} 