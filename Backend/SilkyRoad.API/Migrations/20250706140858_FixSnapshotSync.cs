using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SilkyRoad.API.Migrations
{
    /// <inheritdoc />
    public partial class FixSnapshotSync : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ChatConversationId",
                table: "ChatMessages",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ChatMessages_ChatConversationId",
                table: "ChatMessages",
                column: "ChatConversationId");

            migrationBuilder.AddForeignKey(
                name: "FK_ChatMessages_ChatConversations_ChatConversationId",
                table: "ChatMessages",
                column: "ChatConversationId",
                principalTable: "ChatConversations",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ChatMessages_ChatConversations_ChatConversationId",
                table: "ChatMessages");

            migrationBuilder.DropIndex(
                name: "IX_ChatMessages_ChatConversationId",
                table: "ChatMessages");

            migrationBuilder.DropColumn(
                name: "ChatConversationId",
                table: "ChatMessages");
        }
    }
}
