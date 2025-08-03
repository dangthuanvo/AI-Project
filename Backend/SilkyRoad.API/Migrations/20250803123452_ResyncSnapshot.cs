using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SilkyRoad.API.Migrations
{
    /// <inheritdoc />
    public partial class ResyncSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UserVoucherId",
                table: "PendingOrderInfos",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UserVoucherId",
                table: "PendingOrderInfos");
        }
    }
}
