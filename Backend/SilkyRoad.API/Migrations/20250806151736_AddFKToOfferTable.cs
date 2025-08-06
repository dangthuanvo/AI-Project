using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SilkyRoad.API.Migrations
{
    /// <inheritdoc />
    public partial class AddFKToOfferTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "SellerId",
                table: "BargainOffers",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "BuyerId",
                table: "BargainOffers",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_BargainOffers_BuyerId",
                table: "BargainOffers",
                column: "BuyerId");

            migrationBuilder.CreateIndex(
                name: "IX_BargainOffers_SellerId",
                table: "BargainOffers",
                column: "SellerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_BargainOffers_BuyerId",
                table: "BargainOffers");

            migrationBuilder.DropIndex(
                name: "IX_BargainOffers_SellerId",
                table: "BargainOffers");

            migrationBuilder.AlterColumn<string>(
                name: "SellerId",
                table: "BargainOffers",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AlterColumn<string>(
                name: "BuyerId",
                table: "BargainOffers",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");
        }
    }
}
