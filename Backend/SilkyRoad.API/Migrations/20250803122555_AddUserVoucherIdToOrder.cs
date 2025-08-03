using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SilkyRoad.API.Migrations
{
    /// <inheritdoc />
    public partial class AddUserVoucherIdToOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UserVoucherId",
                table: "Orders",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_UserVoucherId",
                table: "Orders",
                column: "UserVoucherId");

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_UserVouchers_UserVoucherId",
                table: "Orders",
                column: "UserVoucherId",
                principalTable: "UserVouchers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Orders_UserVouchers_UserVoucherId",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_UserVoucherId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "UserVoucherId",
                table: "Orders");
        }
    }
}
