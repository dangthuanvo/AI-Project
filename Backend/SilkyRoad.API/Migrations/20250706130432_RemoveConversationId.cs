using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SilkyRoad.API.Migrations
{
    /// <inheritdoc />
    public partial class RemoveConversationId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop foreign key if it exists
            migrationBuilder.DropForeignKey(
                name: "FK_ChatMessages_ChatConversations_ChatConversationId",
                table: "ChatMessages");

            // Drop index if it exists
            migrationBuilder.DropIndex(
                name: "IX_ChatMessages_ChatConversationId",
                table: "ChatMessages");

            // Drop the column
            migrationBuilder.DropColumn(
                name: "ChatConversationId",
                table: "ChatMessages");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Re-add the column (nullable or not, as per your previous schema)
            migrationBuilder.AddColumn<int>(
                name: "ChatConversationId",
                table: "ChatMessages",
                type: "int",
                nullable: false,
                defaultValue: 0);

            // Re-create the index
            migrationBuilder.CreateIndex(
                name: "IX_ChatMessages_ChatConversationId",
                table: "ChatMessages",
                column: "ConversationId");

            // Re-create the foreign key
            migrationBuilder.AddForeignKey(
                name: "FK_ChatMessages_ChatConversations_ChatConversationId",
                table: "ChatMessages",
                column: "ConversationId",
                principalTable: "ChatConversations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
