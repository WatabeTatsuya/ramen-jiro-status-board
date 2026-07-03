Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "icons"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$yellow = [System.Drawing.Color]::FromArgb(255, 0xf5, 0xc5, 0x18)
$jiroRed = [System.Drawing.Color]::FromArgb(255, 0xcf, 0x36, 0x27)
$black = [System.Drawing.Color]::FromArgb(255, 0x1a, 0x1a, 0x1a)

function New-Icon {
    param(
        [int]$Size,
        [string]$Path,
        [bool]$Opaque = $true
    )

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # background
    $bgBrush = New-Object System.Drawing.SolidBrush($yellow)
    $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)

    # red circle (kept within safe zone for maskable icons: ~72% of full size, centered)
    $circleD = [int]($Size * 0.72)
    $circleOffset = [int](($Size - $circleD) / 2)
    $redBrush = New-Object System.Drawing.SolidBrush($jiroRed)
    $g.FillEllipse($redBrush, $circleOffset, $circleOffset, $circleD, $circleD)

    # text "二郎"
    $fontSize = [float]($Size * 0.30)
    $font = New-Object System.Drawing.Font("Yu Gothic", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $blackBrush = New-Object System.Drawing.SolidBrush($black)
    $text = "二郎"
    $textSize = $g.MeasureString($text, $font)
    $x = ($Size - $textSize.Width) / 2
    $y = ($Size - $textSize.Height) / 2
    $g.DrawString($text, $font, $blackBrush, $x, $y)

    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose()
    $bmp.Dispose()
    $bgBrush.Dispose()
    $redBrush.Dispose()
    $blackBrush.Dispose()
    $font.Dispose()
}

New-Icon -Size 192 -Path (Join-Path $outDir "icon-192.png")
New-Icon -Size 512 -Path (Join-Path $outDir "icon-512.png")
New-Icon -Size 180 -Path (Join-Path $outDir "apple-touch-icon.png")
New-Icon -Size 32  -Path (Join-Path $outDir "favicon-32.png")

Write-Output "Icons generated in $outDir"
