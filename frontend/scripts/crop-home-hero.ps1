$srcPath = "C:\Users\admin\.cursor\projects\d-desktop-dromoney\assets\c__Users_admin_AppData_Roaming_Cursor_User_workspaceStorage_84762036731ad0c9b0a7088131db2c9f_images_image-097ab82a-1410-4a40-afe5-d5dd79bb1cf2.png"
$outPath = "d:\desktop\dromoney\frontend\src\assets\home-hero-person.png"

Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($srcPath)
Write-Host "Source: $($img.Width)x$($img.Height)"

# Crop right-side person from home banner (below header)
$cropX = [int]($img.Width * 0.52)
$cropY = [int]($img.Height * 0.22)
$cropW = [int]($img.Width * 0.48)
$cropH = [int]($img.Height * 0.78)

$bmp = New-Object System.Drawing.Bitmap $cropW, $cropH
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$srcRect = New-Object System.Drawing.Rectangle $cropX, $cropY, $cropW, $cropH
$destRect = New-Object System.Drawing.Rectangle 0, 0, $cropW, $cropH
$g.DrawImage($img, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
$img.Dispose()

Write-Host "Saved: $outPath"
