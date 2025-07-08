using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SilkyRoad.API.Migrations
{
    /// <inheritdoc />
    public partial class RemovePositionXUniqueConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Stores_PositionX",
                table: "Stores");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Stores_PositionX",
                table: "Stores",
                column: "PositionX",
                unique: true);
        }
    }
}
