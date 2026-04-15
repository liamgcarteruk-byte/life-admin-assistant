# ============================================
# CLEANUP SCRIPT - Remove 7 Unnecessary Files
# ============================================
# This script removes duplicate and old files
# Then commits the cleanup to git

Write-Host "🗑️  Starting cleanup..." -ForegroundColor Cyan
Write-Host ""

# Array of files to delete
$filesToDelete = @(
    "src\Dashboard_Phase2.4.jsx",
    "src\components\Dashboard.jsx",
    "src\components\SendersTab.jsx",
    "apps-script-phase-2.3-2.4-complete.js",
    "apps-script-main.backup-2026-04-15.js",
    "Life_Admin_Assistant_Build_Plan (1).docx",
    "SENDER_FILTERING_SETUP.md"
)

# Delete each file
foreach ($file in $filesToDelete) {
    $fullPath = "C:\Users\liamc\life-admin-assistant\$file"
    if (Test-Path $fullPath) {
        Remove-Item $fullPath -Force
        Write-Host "✅ Deleted: $file" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Not found (skipped): $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Running: git status" -ForegroundColor Cyan
Write-Host ""

# Show git status
cd C:\Users\liamc\life-admin-assistant
git status

Write-Host ""
Write-Host "Next step: Run this command to commit:" -ForegroundColor Cyan
Write-Host 'git add -A && git commit -m "cleanup: Remove duplicate and old files from root directory"' -ForegroundColor Yellow
