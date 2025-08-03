#!/bin/sh

UPLOAD_ROOT="/app/wwwroot/uploads"
SEED_ROOT="/app/seed/uploads"

# Function to seed if the target dir is empty
seed_dir() {
  SRC=$1
  DEST=$2
  TYPE=$3

  if [ ! -d "$DEST" ] || [ -z "$(ls -A $DEST 2>/dev/null)" ]; then
    echo "📂 Seeding $TYPE from $SRC to $DEST..."
    mkdir -p "$DEST"
    cp -r "$SRC/"* "$DEST/"
    echo "✅ Done seeding $TYPE."
  else
    echo "🟢 $TYPE already present — skipping seed."
  fi
}

# ✅ Seed both folders
seed_dir "$SEED_ROOT/images" "$UPLOAD_ROOT/images" "images"
seed_dir "$SEED_ROOT/musics" "$UPLOAD_ROOT/musics" "musics"

# Start your app
echo "🚀 Starting backend..."
dotnet SilkyRoad.API.dll
